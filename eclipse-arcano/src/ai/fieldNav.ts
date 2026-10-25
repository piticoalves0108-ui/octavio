/**
 * Navegação em campo aberto (fora da vila e do acampamento): A* numa grade local
 * de células de 1 m em volta do inimigo e do objetivo, com bloqueio consultado sob
 * demanda (colisores, água funda) e caminho alisado por linha de visada.
 *
 * Puro (sem three.js): recebe `blocked(x, z)` e devolve pontos do mundo. Buffers
 * reaproveitados entre chamadas (sem alocação por expansão); só o caminho final é
 * um array novo.
 */
import { FIELD_NAV } from '../data/enemies';

export type BlockedFn = (x: number, z: number) => boolean;

export interface FieldPathResult {
  /** Pontos do mundo (o primeiro é o início; o último, o objetivo ou o ponto mais perto dele). */
  points: { x: number; z: number }[];
  /** O objetivo ficou fora da grade ou inalcançável: o caminho leva ao ponto mais perto. */
  partial: boolean;
  /** Células expandidas (custo). */
  expanded: number;
}

const MAXN = FIELD_NAV.maxCells * FIELD_NAV.maxCells;
const g = new Float32Array(MAXN);
const came = new Int32Array(MAXN);
const state = new Uint8Array(MAXN); // 0 nunca visto, 1 aberto, 2 fechado
const blockCache = new Int8Array(MAXN); // -1 desconhecido, 0 livre, 1 bloqueado
const heap = new Int32Array(MAXN);
const heapF = new Float32Array(MAXN);
let heapN = 0;

function heapPush(i: number, f: number) {
  let k = heapN++;
  heap[k] = i;
  heapF[k] = f;
  while (k > 0) {
    const p = (k - 1) >> 1;
    if (heapF[p] <= heapF[k]) break;
    const ti = heap[p];
    const tf = heapF[p];
    heap[p] = heap[k];
    heapF[p] = heapF[k];
    heap[k] = ti;
    heapF[k] = tf;
    k = p;
  }
}

function heapPop(): number {
  const top = heap[0];
  heapN--;
  if (heapN > 0) {
    heap[0] = heap[heapN];
    heapF[0] = heapF[heapN];
    let k = 0;
    for (;;) {
      const l = k * 2 + 1;
      const r = l + 1;
      let m = k;
      if (l < heapN && heapF[l] < heapF[m]) m = l;
      if (r < heapN && heapF[r] < heapF[m]) m = r;
      if (m === k) break;
      const ti = heap[m];
      const tf = heapF[m];
      heap[m] = heap[k];
      heapF[m] = heapF[k];
      heap[k] = ti;
      heapF[k] = tf;
      k = m;
    }
  }
  return top;
}

const SQ2 = Math.SQRT2;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DZ = [0, 0, 1, -1, 1, -1, 1, -1];

/**
 * Caminho de (sx, sz) até (tx, tz). A grade cobre os dois pontos com folga, limitada
 * a `FIELD_NAV.maxCells` de lado; objetivo fora da grade → caminho parcial até a borda.
 * Sem rota com a folga normal (obstáculo maior que a grade), tenta de novo com folga 3×.
 */
export function findFieldPath(sx: number, sz: number, tx: number, tz: number, blocked: BlockedFn): FieldPathResult | null {
  const a = searchGrid(sx, sz, tx, tz, blocked, FIELD_NAV.margin);
  if (a && !a.partial) return a;
  const b = searchGrid(sx, sz, tx, tz, blocked, FIELD_NAV.margin * 3);
  if (!b) return a;
  if (!a || !b.partial) {
    b.expanded += a?.expanded ?? 0;
    return b;
  }
  // os dois parciais: fica com o que chega mais perto do objetivo
  const la = a.points[a.points.length - 1];
  const lb = b.points[b.points.length - 1];
  return Math.hypot(lb.x - tx, lb.z - tz) < Math.hypot(la.x - tx, la.z - tz) ? b : a;
}

function searchGrid(sx: number, sz: number, tx: number, tz: number, blocked: BlockedFn, M: number): FieldPathResult | null {
  const C = FIELD_NAV.cell;
  const maxSide = FIELD_NAV.maxCells;
  // grade: caixa dos dois pontos + margem, limitada ao tamanho máximo (centrada no início)
  let x0 = Math.min(sx, tx) - M;
  let z0 = Math.min(sz, tz) - M;
  let w = Math.ceil((Math.max(sx, tx) + M - x0) / C);
  let h = Math.ceil((Math.max(sz, tz) + M - z0) / C);
  // longe demais: janela do tamanho máximo com o início perto da borda, aberta na direção do objetivo
  if (w > maxSide) {
    w = maxSide;
    x0 = tx >= sx ? sx - M : sx + M - maxSide * C;
  }
  if (h > maxSide) {
    h = maxSide;
    z0 = tz >= sz ? sz - M : sz + M - maxSide * C;
  }
  const n = w * h;
  const cellOf = (x: number, z: number) => {
    const i = Math.min(w - 1, Math.max(0, Math.floor((x - x0) / C)));
    const j = Math.min(h - 1, Math.max(0, Math.floor((z - z0) / C)));
    return j * w + i;
  };
  const cx = (k: number) => x0 + ((k % w) + 0.5) * C;
  const cz = (k: number) => z0 + (Math.floor(k / w) + 0.5) * C;
  state.fill(0, 0, n);
  blockCache.fill(-1, 0, n);
  const isBlocked = (k: number) => {
    let b = blockCache[k];
    if (b < 0) {
      b = blocked(cx(k), cz(k)) ? 1 : 0;
      blockCache[k] = b;
    }
    return b === 1;
  };
  let start = cellOf(sx, sz);
  // objetivo fora da janela: busca a célula da borda mais perto dele (caminho parcial)
  const goalInside = tx >= x0 && tx < x0 + w * C && tz >= z0 && tz < z0 + h * C;
  const goal = cellOf(tx, tz);
  // encostado num obstáculo (a célula do próprio corpo conta como bloqueada): parte da livre mais perto
  let shifted = false;
  if (isBlocked(start)) {
    let bestK = -1;
    let bestD = Infinity;
    const si = start % w;
    const sj = Math.floor(start / w);
    for (let rr = 1; rr <= 3 && bestK < 0; rr++) {
      for (let dj = -rr; dj <= rr; dj++) {
        for (let di = -rr; di <= rr; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rr) continue;
          const ni = si + di;
          const nj = sj + dj;
          if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
          const k = nj * w + ni;
          if (isBlocked(k)) continue;
          const d = Math.hypot(cx(k) - sx, cz(k) - sz);
          if (d < bestD) {
            bestD = d;
            bestK = k;
          }
        }
      }
    }
    if (bestK < 0) return null;
    start = bestK;
    shifted = true;
  }
  const gi = goal % w;
  const gj = Math.floor(goal / w);
  const hcost = (k: number) => {
    const ax = Math.abs((k % w) - gi);
    const az = Math.abs(Math.floor(k / w) - gj);
    return Math.max(ax, az) + (SQ2 - 1) * Math.min(ax, az);
  };
  heapN = 0;
  g[start] = 0;
  came[start] = -1;
  state[start] = 1;
  heapPush(start, hcost(start));
  let best = start;
  let bestH = hcost(start);
  let expanded = 0;
  let found = false;
  while (heapN > 0 && expanded < FIELD_NAV.maxExpand) {
    const k = heapPop();
    if (state[k] === 2) continue;
    state[k] = 2;
    expanded++;
    if (k === goal) {
      found = true;
      best = k;
      break;
    }
    const hk = hcost(k);
    if (hk < bestH) {
      bestH = hk;
      best = k;
    }
    const i = k % w;
    const j = Math.floor(k / w);
    for (let d = 0; d < 8; d++) {
      const ni = i + DX[d];
      const nj = j + DZ[d];
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nk = nj * w + ni;
      if (state[nk] === 2) continue;
      // o objetivo pode estar "dentro" de algo (jogador encostado na parede): aceita
      if ((nk !== goal || !goalInside) && isBlocked(nk)) continue;
      // diagonal sem cortar quina
      if (d >= 4 && (isBlocked(j * w + ni) || isBlocked(nj * w + i))) continue;
      const ng = g[k] + (d >= 4 ? SQ2 : 1);
      if (state[nk] === 0 || ng < g[nk]) {
        g[nk] = ng;
        came[nk] = k;
        state[nk] = 1;
        heapPush(nk, ng + hcost(nk));
      }
    }
  }
  if (best === start) return null;
  // reconstrói (do fim para o início)
  const cells: number[] = [];
  for (let k = best; k !== -1; k = came[k]) cells.push(k);
  cells.reverse();
  // alisa: do ponto atual, pula até o mais distante com reta livre
  const clear = (ax: number, az: number, bx: number, bz: number) => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / (C * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const k = cellOf(ax + dx * t, az + dz * t);
      if ((k !== goal || !goalInside) && isBlocked(k)) return false;
    }
    return true;
  };
  const pts: { x: number; z: number }[] = [{ x: sx, z: sz }];
  let ax = sx;
  let az = sz;
  if (shifted) {
    ax = cx(start);
    az = cz(start);
    pts.push({ x: ax, z: az });
  }
  let idx = 0;
  while (idx < cells.length - 1) {
    let far = idx + 1;
    for (let m = cells.length - 1; m > idx + 1; m--) {
      if (clear(ax, az, cx(cells[m]), cz(cells[m]))) {
        far = m;
        break;
      }
    }
    idx = far;
    ax = cx(cells[idx]);
    az = cz(cells[idx]);
    pts.push({ x: ax, z: az });
  }
  if (found && goalInside) {
    const last = pts[pts.length - 1];
    last.x = tx;
    last.z = tz;
  }
  return { points: pts, partial: !(found && goalInside), expanded };
}

/** A reta de A até B está livre (amostras a cada meia célula)? */
export function straightClear(ax: number, az: number, bx: number, bz: number, blocked: BlockedFn, skipEnd = 1.2): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const step = FIELD_NAV.cell * 0.75;
  const steps = Math.floor((len - skipEnd) / step);
  for (let s = 1; s <= steps; s++) {
    const t = (s * step) / len;
    if (blocked(ax + dx * t, az + dz * t)) return false;
  }
  return true;
}
