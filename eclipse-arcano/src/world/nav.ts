/**
 * Grafo de navegação da Vila de Brumafria (puro, sem three.js).
 *
 * Nós: ruas (amostradas a cada ~5 m), anel e centro da praça, portões (dentro e
 * fora), portas de todas as casas, pontos de trabalho/lazer das âncoras da vila
 * (mercado, forja, santuário, guaritas, jardim da Anciã) e INTERIORES (taverna,
 * arquivo) ligados pela porta. Arestas: ligações automáticas entre nós próximos
 * cuja reta não atravessa prédios (OBB inflada), a muralha (fora dos vãos dos
 * portões), as barracas ou o poço. Uso: `findPath(de, para)` com ids de âncora
 * (src/data/places.ts) ou coordenadas {x, z}; devolve pontos do mundo.
 */
import { PLACES, VILLAGE, VILLAGE_BUILDINGS, VILLAGE_STREETS, VILLAGE_FIELDS, VILLAGE_PENS, buildingToSite, type BuildingDef } from '../data/places';

export interface NavNode {
  id: string;
  x: number;
  z: number;
  /** Prédio cujo interior contém o nó (ou null = área externa). */
  inside: string | null;
}

export interface NavGraph {
  nodes: NavNode[];
  /** Lista de adjacência (índices). */
  adj: number[][];
  index: Map<string, number>;
}

interface Obb {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  c: number;
  s: number;
}

const VX = VILLAGE.x;
const VZ = VILLAGE.z;

/** Edifícios com interior navegável (fechados, entra-se pela porta). */
const INTERIOR_IDS = new Set(VILLAGE_BUILDINGS.filter((b) => b.interior).map((b) => b.id));
/** Construções abertas (oficina da forja, pavilhão do santuário): navega-se por dentro, entrando pela frente. */
const OPEN_IDS = new Set(['forja', 'santuario_vila']);

function obbOf(b: BuildingDef, inflate: number): Obb {
  // Mesma convenção da colisão: local = R(-yaw)·(p - centro)
  return { id: b.id, x: VX + b.x, z: VZ + b.z, hx: b.w / 2 + inflate, hz: b.d / 2 + inflate, c: Math.cos(b.yaw), s: Math.sin(b.yaw) };
}

/** Obstáculos da vila: prédios inteiros; nas barracas, só o balcão (o vendedor fica atrás). */
function villageObstacles(inflate: number): Obb[] {
  return VILLAGE_BUILDINGS.map((b) => {
    if (b.kind !== 'stall') return obbOf(b, inflate);
    const [cx, cz] = buildingToSite(b, 0, b.d / 2 - 0.35);
    return { id: b.id, x: VX + cx, z: VZ + cz, hx: (b.w - 0.3) / 2 + inflate, hz: 0.3 + inflate, c: Math.cos(b.yaw), s: Math.sin(b.yaw) };
  });
}

function insideAny(obbs: Obb[], x: number, z: number, except: string | null): boolean {
  for (const o of obbs) {
    if (o.id === except) continue;
    const [lx, lz] = toLocal(o, x, z);
    if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) return true;
  }
  return false;
}

function toLocal(o: Obb, x: number, z: number): [number, number] {
  const rx = x - o.x;
  const rz = z - o.z;
  return [rx * o.c - rz * o.s, rx * o.s + rz * o.c];
}

/** Segmento (a→b) cruza a OBB? (teste de lajes no espaço local). */
export function segHitsObb(o: Obb, ax: number, az: number, bx: number, bz: number): boolean {
  const [lax, laz] = toLocal(o, ax, az);
  const [lbx, lbz] = toLocal(o, bx, bz);
  let t0 = 0;
  let t1 = 1;
  const dx = lbx - lax;
  const dz = lbz - laz;
  for (const [p, d, h] of [
    [lax, dx, o.hx],
    [laz, dz, o.hz],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < -h || p > h) return false;
      continue;
    }
    let ta = (-h - p) / d;
    let tb = (h - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

function segSeg(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): boolean {
  const d1x = bx - ax;
  const d1z = bz - az;
  const d2x = dx - cx;
  const d2z = dz - cz;
  const den = d1x * d2z - d1z * d2x;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((cx - ax) * d2z - (cz - az) * d2x) / den;
  const u = ((cx - ax) * d1z - (cz - az) * d1x) / den;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Trechos da muralha (com os vãos dos portões leste/sul). */
function wallSegments(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const N = VILLAGE.wallSides;
  const R = VILLAGE.wallRadius;
  const gapHalf = VILLAGE.gateWidth / 2;
  for (let k = 0; k < N; k++) {
    const a0 = Math.PI / N + (k * 2 * Math.PI) / N;
    const a1 = Math.PI / N + ((k + 1) * 2 * Math.PI) / N;
    const ax = VX + Math.cos(a0) * R;
    const az = VZ + Math.sin(a0) * R;
    const bx = VX + Math.cos(a1) * R;
    const bz = VZ + Math.sin(a1) * R;
    const mid = (a0 + a1) / 2;
    const isGate = Math.abs(Math.cos(mid) - 1) < 1e-3 || Math.abs(mid - Math.PI / 2) < 1e-3;
    if (!isGate) {
      out.push([ax, az, bx, bz]);
      continue;
    }
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    out.push([ax, az, mx - ux * gapHalf, mz - uz * gapHalf]);
    out.push([mx + ux * gapHalf, mz + uz * gapHalf, bx, bz]);
  }
  return out;
}

let graph: NavGraph | null = null;

/** Constrói (uma vez) o grafo da vila. */
export function villageNav(): NavGraph {
  if (graph) return graph;
  const nodes: NavNode[] = [];
  const index = new Map<string, number>();
  const obbs = villageObstacles(0.45);
  const add = (id: string, x: number, z: number, inside: string | null = null) => {
    if (index.has(id)) return index.get(id)!;
    // nós externos dentro de obstáculos são descartados (exceto âncoras nomeadas)
    if (!inside && id.includes(':') && insideAny(obbs, x, z, null)) return -1;
    index.set(id, nodes.length);
    nodes.push({ id, x, z, inside });
    return nodes.length - 1;
  };
  // ruas
  for (const st of VILLAGE_STREETS) {
    for (let i = 0; i < st.points.length - 1; i++) {
      const [ax, az] = st.points[i];
      const [bx, bz] = st.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 5));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        add(`rua:${st.id}:${i}:${k}`, VX + ax + (bx - ax) * t, VZ + az + (bz - az) * t);
      }
    }
  }
  // praça
  add('praca_centro_nav', VX + 3.2, VZ + 3.2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    add(`praca:${i}`, VX + Math.cos(a) * 11.5, VZ + Math.sin(a) * 11.5);
    add(`praca_ext:${i}`, VX + Math.cos(a) * 17.5, VZ + Math.sin(a) * 17.5);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(`praca_int:${i}`, VX + Math.cos(a) * 5, VZ + Math.sin(a) * 5);
  }
  // âncoras externas e internas da vila (tags 'vila')
  for (const p of Object.values(PLACES)) {
    if (!p.tags.includes('vila')) continue;
    if (p.y !== undefined) continue;
    let inside: string | null = null;
    for (const bb of VILLAGE_BUILDINGS) {
      if (!INTERIOR_IDS.has(bb.id) && !OPEN_IDS.has(bb.id)) continue;
      const o = obbOf(bb, 0);
      const [lx, lz] = toLocal(o, p.x, p.z);
      if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) inside = bb.id;
    }
    add(p.id, p.x, p.z, inside);
  }
  // portas das casas (mesmo sem âncora específica)
  for (const b of VILLAGE_BUILDINGS) {
    if (b.kind === 'stall') continue;
    const [sx, sz] = buildingToSite(b, 0, b.d / 2 + 1.4);
    add(`porta:${b.id}`, VX + sx, VZ + sz);
    if (INTERIOR_IDS.has(b.id) || OPEN_IDS.has(b.id)) {
      const [ix, iz] = buildingToSite(b, 0, b.d / 2 - 1.4);
      add(`dentro:${b.id}`, VX + ix, VZ + iz, b.id);
      const [cx, cz] = buildingToSite(b, 0, 0);
      add(`centro:${b.id}`, VX + cx, VZ + cz, b.id);
    }
  }
  // cantos em volta de cada prédio (contornar casas)
  for (const b of VILLAGE_BUILDINGS) {
    if (b.kind === 'stall') continue;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const [cx, cz] = buildingToSite(b, sx * (b.w / 2 + 1.4), sz * (b.d / 2 + 1.4));
      add(`canto:${b.id}:${sx}:${sz}`, VX + cx, VZ + cz);
    }
  }
  // anel por fora da muralha (contornar a vila até as plantações do norte)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    add(`anel:${i}`, VX + Math.cos(a) * (VILLAGE.wallRadius + 9), VZ + Math.sin(a) * (VILLAGE.wallRadius + 9));
  }
  // fora dos muros: plantações e cercados ligam-se pelos portões
  for (const f of [...VILLAGE_FIELDS, ...VILLAGE_PENS]) add(`fora:${f.id}`, VX + f.x, VZ + f.z);

  // obstáculos
  const walls = wallSegments();
  const well = { x: VX, z: VZ, r: VILLAGE.wellRadius + 0.5 };
  const clear = (a: NavNode, b: NavNode): boolean => {
    // interior ↔ exterior só pela porta (aresta explícita)
    if (a.inside !== b.inside) return false;
    for (const o of obbs) {
      if (a.inside && o.id === a.inside) continue; // dentro do mesmo prédio
      if (segHitsObb(o, a.x, a.z, b.x, b.z)) return false;
    }
    for (const w of walls) if (segSeg(a.x, a.z, b.x, b.z, w[0], w[1], w[2], w[3])) return false;
    // poço
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((well.x - a.x) * dx + (well.z - a.z) * dz) / L2));
    if (Math.hypot(a.x + dx * t - well.x, a.z + dz * t - well.z) < well.r) return false;
    return true;
  };
  const adj: number[][] = nodes.map(() => []);
  const link = (i: number, j: number) => {
    if (i === j || adj[i].includes(j)) return;
    adj[i].push(j);
    adj[j].push(i);
  };
  const R = 18;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const far = a.id.startsWith('fora:') || b.id.startsWith('fora:') || (a.id.startsWith('anel:') && b.id.startsWith('anel:'));
      const maxD = far ? 40 : R;
      if (d > maxD) continue;
      if (clear(a, b)) link(i, j);
    }
  }
  // portas de interiores: dentro ↔ fora (atravessa o vão da porta)
  for (const id of [...INTERIOR_IDS, ...OPEN_IDS]) {
    const a = index.get(`dentro:${id}`);
    const b = index.get(`porta:${id}`);
    if (a !== undefined && b !== undefined) link(a, b);
  }
  graph = { nodes, adj, index };
  return graph;
}

/** Nó mais próximo com linha livre (cai para o mais próximo absoluto). */
export function nearestNode(x: number, z: number, inside: string | null = null): number {
  const g = villageNav();
  const obbs = obstaclesCache ?? (obstaclesCache = villageObstacles(0.3));
  // candidatos em ordem de distância; testa a linha de visão só até achar um livre
  const order: [number, number][] = [];
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    if (n.inside !== inside) continue;
    const dx = n.x - x;
    const dz = n.z - z;
    order.push([dx * dx + dz * dz, i]);
  }
  order.sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < Math.min(order.length, 24); k++) {
    const n = g.nodes[order[k][1]];
    let ok = true;
    for (const o of obbs) {
      if (inside && o.id === inside) continue;
      if (segHitsObb(o, x, z, n.x, n.z)) {
        ok = false;
        break;
      }
    }
    if (ok) return order[k][1];
  }
  if (order.length) return order[0][1];
  // nenhum nó no mesmo "lado" (interior/exterior): o mais próximo absoluto
  let any = 0;
  let anyD = Infinity;
  for (let i = 0; i < g.nodes.length; i++) {
    const d = Math.hypot(g.nodes[i].x - x, g.nodes[i].z - z);
    if (d < anyD) {
      anyD = d;
      any = i;
    }
  }
  return any;
}

let obstaclesCache: Obb[] | null = null;

function resolve(p: string | { x: number; z: number }): { idx: number; x: number; z: number } | null {
  const g = villageNav();
  if (typeof p === 'string') {
    const i = g.index.get(p) ?? g.index.get(`porta:${p}`);
    if (i === undefined) {
      const pl = PLACES[p];
      if (!pl) return null;
      return { idx: nearestNode(pl.x, pl.z), x: pl.x, z: pl.z };
    }
    return { idx: i, x: g.nodes[i].x, z: g.nodes[i].z };
  }
  // coordenada dentro de um interior?
  let inside: string | null = null;
  for (const b of VILLAGE_BUILDINGS) {
    if (!INTERIOR_IDS.has(b.id) && !OPEN_IDS.has(b.id)) continue;
    const o = obbOf(b, -0.3);
    const [lx, lz] = toLocal(o, p.x, p.z);
    if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) inside = b.id;
  }
  return { idx: nearestNode(p.x, p.z, inside), x: p.x, z: p.z };
}

// Estruturas reutilizadas pelo A* (sem alocar por consulta).
let gScore = new Float64Array(0);
let came = new Int32Array(0);
let closed = new Uint8Array(0);
let heapIdx = new Int32Array(0);
let heapF = new Float64Array(0);
const pathCache = new Map<string, { x: number; z: number }[] | null>();

/** A* com heap binário entre dois índices de nó. */
function astar(start: number, goal: number): number[] | null {
  const g = villageNav();
  const n = g.nodes.length;
  if (gScore.length !== n) {
    gScore = new Float64Array(n);
    came = new Int32Array(n);
    closed = new Uint8Array(n);
    heapIdx = new Int32Array(n * 8);
    heapF = new Float64Array(n * 8);
  }
  gScore.fill(Infinity);
  came.fill(-1);
  closed.fill(0);
  const gx = g.nodes[goal].x;
  const gz = g.nodes[goal].z;
  let size = 0;
  const push = (i: number, f: number) => {
    if (size >= heapIdx.length) return;
    let k = size++;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (heapF[parent] <= f) break;
      heapIdx[k] = heapIdx[parent];
      heapF[k] = heapF[parent];
      k = parent;
    }
    heapIdx[k] = i;
    heapF[k] = f;
  };
  const pop = (): number => {
    const top = heapIdx[0];
    const li = heapIdx[--size];
    const lf = heapF[size];
    let k = 0;
    for (;;) {
      let c = 2 * k + 1;
      if (c >= size) break;
      if (c + 1 < size && heapF[c + 1] < heapF[c]) c++;
      if (heapF[c] >= lf) break;
      heapIdx[k] = heapIdx[c];
      heapF[k] = heapF[c];
      k = c;
    }
    heapIdx[k] = li;
    heapF[k] = lf;
    return top;
  };
  gScore[start] = 0;
  push(start, 0);
  while (size > 0) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === goal) {
      const out: number[] = [];
      for (let i = cur; i !== -1; i = came[i]) out.push(i);
      return out.reverse();
    }
    closed[cur] = 1;
    const cn = g.nodes[cur];
    for (const nb of g.adj[cur]) {
      if (closed[nb]) continue;
      const nn = g.nodes[nb];
      const d = gScore[cur] + Math.sqrt((cn.x - nn.x) ** 2 + (cn.z - nn.z) ** 2);
      if (d < gScore[nb]) {
        came[nb] = cur;
        gScore[nb] = d;
        push(nb, d + Math.sqrt((nn.x - gx) ** 2 + (nn.z - gz) ** 2));
      }
    }
  }
  return null;
}

/**
 * Caminho pela vila (A*). `from`/`to`: id de âncora/nó ou coordenadas do mundo.
 * Retorna a lista de pontos (inclui origem e destino) ou null se não houver rota.
 * Consultas entre ids ficam em cache (o grafo é estático) — devolve cópia.
 */
export function findPath(from: string | { x: number; z: number }, to: string | { x: number; z: number }): { x: number; z: number }[] | null {
  const key = typeof from === 'string' && typeof to === 'string' ? `${from}>${to}` : null;
  if (key && pathCache.has(key)) {
    const c = pathCache.get(key)!;
    return c ? c.map((p) => ({ x: p.x, z: p.z })) : null;
  }
  const g = villageNav();
  const a = resolve(from);
  const b = resolve(to);
  if (!a || !b) return null;
  const ids = astar(a.idx, b.idx);
  let path: { x: number; z: number }[] | null = null;
  if (ids) {
    path = ids.map((i) => ({ x: g.nodes[i].x, z: g.nodes[i].z }));
    if (typeof from !== 'string') path.unshift({ x: a.x, z: a.z });
    if (typeof to !== 'string') path.push({ x: b.x, z: b.z });
  }
  if (key) {
    if (pathCache.size > 4000) pathCache.clear();
    pathCache.set(key, path ? path.map((p) => ({ x: p.x, z: p.z })) : null);
  }
  return path;
}

/** Obstáculos usados pelo grafo (para testes/depuração). */
export function navObstacles() {
  return { obbs: villageObstacles(0), walls: wallSegments() };
}
