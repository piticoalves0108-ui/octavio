import * as THREE from 'three';
import type { Heightfield } from './heightfield';
import { CLIMBABLE_TAGS, MAX_FLIGHT_ALTITUDE, PLAYABLE_HALF, WATER_LEVEL } from '../data/world';

/**
 * Mundo de colisão estático: terreno (heightfield) + colisores simples
 * (cilindros verticais e caixas orientadas por yaw) num grid espacial.
 *
 * Barato o suficiente para dezenas de consultas por frame. Não é uma engine de
 * física completa: personagens são cápsulas verticais resolvidas por empurrão.
 */

export type ColliderTag = 'wall' | 'tree' | 'rock' | 'building' | 'platform' | 'gate' | 'prop' | 'climbable' | 'island' | 'bridge' | 'barrier';

interface BaseCollider {
  id: number;
  tag: ColliderTag;
  /** Pode-se ficar em cima (topo conta como chão). */
  walkable: boolean;
  /** Pode-se escalar as laterais. */
  climbable: boolean;
  /** Bloqueia projéteis/visão. */
  blocksSight: boolean;
  /** Superfície sonora para passos. */
  surface?: string;
  enabled: boolean;
  cells: string[];
}

export interface CylinderCollider extends BaseCollider {
  type: 'cylinder';
  x: number;
  z: number;
  radius: number;
  y0: number;
  y1: number;
}

export interface BoxCollider extends BaseCollider {
  type: 'box';
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  yaw: number;
  cos: number;
  sin: number;
}

export type Collider = CylinderCollider | BoxCollider;

export interface ColliderOptions {
  walkable?: boolean;
  climbable?: boolean;
  blocksSight?: boolean;
  surface?: string;
}

export interface RayHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  kind: 'terrain' | 'collider' | 'water';
  collider?: Collider;
}

export interface PushResult {
  collided: boolean;
  /** Normal (XZ) do último contato lateral. */
  normal: THREE.Vector3;
  climbable: boolean;
  collider?: Collider;
}

const CELL = 16;
const key = (cx: number, cz: number) => `${cx},${cz}`;
/** Chave numérica da célula (consultas por quadro sem alocar strings). */
const nkey = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);

export class CollisionWorld {
  private colliders = new Map<number, Collider>();
  private grid = new Map<string, Set<Collider>>();
  /** Espelho do grid com chaves numéricas (usado nas consultas quentes). */
  private gridN = new Map<number, Set<Collider>>();
  private nextId = 1;
  private tmpSet = new Set<Collider>();
  private seenSet = new Set<Collider>();
  readonly push: PushResult = { collided: false, normal: new THREE.Vector3(), climbable: false };

  constructor(readonly heightfield: Heightfield) {}

  get count() {
    return this.colliders.size;
  }

  addCylinder(x: number, z: number, radius: number, y0: number, y1: number, tag: ColliderTag, opts: ColliderOptions = {}): CylinderCollider {
    const c: CylinderCollider = {
      id: this.nextId++,
      type: 'cylinder',
      tag,
      x,
      z,
      radius,
      y0,
      y1,
      walkable: opts.walkable ?? (tag === 'platform' || tag === 'island' || tag === 'rock' || tag === 'bridge'),
      climbable: opts.climbable ?? CLIMBABLE_TAGS.includes(tag),
      blocksSight: opts.blocksSight ?? tag !== 'tree',
      surface: opts.surface,
      enabled: true,
      cells: [],
    };
    this.insert(c, x - radius, z - radius, x + radius, z + radius);
    return c;
  }

  addBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw: number, tag: ColliderTag, opts: ColliderOptions = {}): BoxCollider {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const c: BoxCollider = {
      id: this.nextId++,
      type: 'box',
      tag,
      x,
      y,
      z,
      hx,
      hy,
      hz,
      yaw,
      cos,
      sin,
      walkable: opts.walkable ?? true,
      climbable: opts.climbable ?? CLIMBABLE_TAGS.includes(tag),
      blocksSight: opts.blocksSight ?? true,
      surface: opts.surface,
      enabled: true,
      cells: [],
    };
    const ext = Math.abs(hx * cos) + Math.abs(hz * sin);
    const ezt = Math.abs(hx * sin) + Math.abs(hz * cos);
    this.insert(c, x - ext, z - ezt, x + ext, z + ezt);
    return c;
  }

  private insert(c: Collider, minX: number, minZ: number, maxX: number, maxZ: number) {
    this.colliders.set(c.id, c);
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const k = key(cx, cz);
        let s = this.grid.get(k);
        if (!s) {
          s = new Set();
          this.grid.set(k, s);
          this.gridN.set(nkey(cx, cz), s);
        }
        s.add(c);
        c.cells.push(k);
      }
    }
  }

  remove(c: Collider | number) {
    const col = typeof c === 'number' ? this.colliders.get(c) : c;
    if (!col) return;
    for (const k of col.cells) this.grid.get(k)?.delete(col);
    this.colliders.delete(col.id);
  }

  setEnabled(c: Collider, enabled: boolean) {
    c.enabled = enabled;
  }

  /** Remove todos os colisores dentro de um retângulo (descarregamento de regiões). */
  removeInRect(minX: number, minZ: number, maxX: number, maxZ: number, filter?: (c: Collider) => boolean) {
    const toRemove: Collider[] = [];
    for (const c of this.colliders.values()) {
      if (c.x >= minX && c.x < maxX && c.z >= minZ && c.z < maxZ && (!filter || filter(c))) toRemove.push(c);
    }
    for (const c of toRemove) this.remove(c);
  }

  /** Colisores perto de um ponto (reutiliza Set interno — copiar se precisar guardar). */
  near(x: number, z: number, r: number): Set<Collider> {
    const out = this.tmpSet;
    out.clear();
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        const s = this.gridN.get(nkey(cx, cz));
        if (s) for (const c of s) if (c.enabled) out.add(c);
      }
    }
    return out;
  }

  terrainHeight(x: number, z: number) {
    return this.heightfield.heightAt(x, z);
  }

  /**
   * Altura do chão sob (x,z) considerando terreno + topos de colisores caminháveis
   * que estejam abaixo de `fromY + step` (para não "teleportar" para cima de telhados).
   */
  groundHeight(x: number, z: number, fromY = Infinity, step = 0.6, radius = 0.3): number {
    let g = this.heightfield.heightAt(x, z);
    const limit = fromY + step;
    for (const c of this.near(x, z, radius + 1)) {
      if (!c.walkable) continue;
      let top: number;
      if (c.type === 'cylinder') {
        const dx = x - c.x;
        const dz = z - c.z;
        if (dx * dx + dz * dz > (c.radius + radius * 0.5) ** 2) continue;
        top = c.y1;
      } else {
        const lx = (x - c.x) * c.cos - (z - c.z) * c.sin;
        const lz = (x - c.x) * c.sin + (z - c.z) * c.cos;
        if (Math.abs(lx) > c.hx + radius * 0.5 || Math.abs(lz) > c.hz + radius * 0.5) continue;
        top = c.y + c.hy;
      }
      if (top <= limit && top > g) g = top;
    }
    return g;
  }

  /** Superfície da água em (x,z) se houver água acima do terreno, senão null. */
  waterSurface(x: number, z: number): number | null {
    return this.heightfield.heightAt(x, z) < WATER_LEVEL ? WATER_LEVEL : null;
  }

  /**
   * Empurra uma cápsula vertical (base em pos.y) para fora dos colisores e dos limites
   * do mundo. Modifica `pos`. Retorna info do contato (objeto reutilizado).
   */
  resolveCapsule(pos: THREE.Vector3, radius: number, height: number): PushResult {
    const res = this.push;
    res.collided = false;
    res.climbable = false;
    res.collider = undefined;
    const y0 = pos.y + 0.05;
    const y1 = pos.y + height;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.near(pos.x, pos.z, radius + 2)) {
        if (c.type === 'cylinder') {
          if (y1 <= c.y0 || y0 >= c.y1) continue;
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const min = c.radius + radius;
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 0.0001;
          const nx = d2 > 0 ? dx / d : 1;
          const nz = d2 > 0 ? dz / d : 0;
          pos.x = c.x + nx * min;
          pos.z = c.z + nz * min;
          res.collided = true;
          res.normal.set(nx, 0, nz);
          res.climbable ||= c.climbable;
          res.collider = c;
        } else {
          if (y1 <= c.y - c.hy || y0 >= c.y + c.hy) continue;
          // para o espaço local da caixa
          const rx = pos.x - c.x;
          const rz = pos.z - c.z;
          const lx = rx * c.cos - rz * c.sin;
          const lz = rx * c.sin + rz * c.cos;
          const cx = Math.max(-c.hx, Math.min(c.hx, lx));
          const cz = Math.max(-c.hz, Math.min(c.hz, lz));
          let dx = lx - cx;
          let dz = lz - cz;
          let d2 = dx * dx + dz * dz;
          if (d2 >= radius * radius) continue;
          let nlx: number, nlz: number, pen: number;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            nlx = dx / d;
            nlz = dz / d;
            pen = radius - d;
          } else {
            // centro dentro da caixa: sai pelo lado mais próximo
            const px = c.hx - Math.abs(lx);
            const pz = c.hz - Math.abs(lz);
            if (px < pz) {
              nlx = Math.sign(lx) || 1;
              nlz = 0;
              pen = px + radius;
            } else {
              nlx = 0;
              nlz = Math.sign(lz) || 1;
              pen = pz + radius;
            }
          }
          // de volta ao mundo (rotação inversa)
          const nx = nlx * c.cos + nlz * c.sin;
          const nz = -nlx * c.sin + nlz * c.cos;
          pos.x += nx * pen;
          pos.z += nz * pen;
          res.collided = true;
          res.normal.set(nx, 0, nz);
          res.climbable ||= c.climbable;
          res.collider = c;
        }
      }
    }
    // Limites do mundo
    const lim = PLAYABLE_HALF;
    if (Math.abs(pos.x) > lim || Math.abs(pos.z) > lim) {
      res.collided = true;
      res.normal.set(-Math.sign(pos.x) * (Math.abs(pos.x) > lim ? 1 : 0), 0, -Math.sign(pos.z) * (Math.abs(pos.z) > lim ? 1 : 0)).normalize();
      pos.x = Math.max(-lim, Math.min(lim, pos.x));
      pos.z = Math.max(-lim, Math.min(lim, pos.z));
    }
    if (pos.y > MAX_FLIGHT_ALTITUDE) pos.y = MAX_FLIGHT_ALTITUDE;
    return res;
  }

  /**
   * Raycast contra terreno + colisores. `ignoreTrees` útil para câmera/projéteis mágicos.
   */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, opts: { colliders?: boolean; water?: boolean; ignoreTags?: ColliderTag[] } = {}): RayHit | null {
    let best: RayHit | null = null;

    // Terreno: marcha + refinamento binário
    const step = 1.0;
    let prevT = 0;
    let prevAbove = origin.y - this.heightfield.heightAt(origin.x, origin.z) > 0;
    if (prevAbove) {
      for (let t = step; t <= maxDist + step; t += step) {
        const tt = Math.min(t, maxDist);
        const x = origin.x + dir.x * tt;
        const y = origin.y + dir.y * tt;
        const z = origin.z + dir.z * tt;
        let groundY = this.heightfield.heightAt(x, z);
        if (opts.water && groundY < WATER_LEVEL) groundY = WATER_LEVEL;
        if (y <= groundY) {
          let lo = prevT,
            hi = tt;
          for (let k = 0; k < 8; k++) {
            const mid = (lo + hi) * 0.5;
            const mx = origin.x + dir.x * mid;
            const mz = origin.z + dir.z * mid;
            let gy = this.heightfield.heightAt(mx, mz);
            if (opts.water && gy < WATER_LEVEL) gy = WATER_LEVEL;
            if (origin.y + dir.y * mid <= gy) hi = mid;
            else lo = mid;
          }
          const p = new THREE.Vector3(origin.x + dir.x * hi, origin.y + dir.y * hi, origin.z + dir.z * hi);
          const isWater = !!opts.water && this.heightfield.heightAt(p.x, p.z) < WATER_LEVEL;
          const n = isWater ? new THREE.Vector3(0, 1, 0) : (() => {
            const nn = this.heightfield.normalAt(p.x, p.z);
            return new THREE.Vector3(nn.x, nn.y, nn.z);
          })();
          best = { point: p, normal: n, distance: hi, kind: isWater ? 'water' : 'terrain' };
          break;
        }
        prevT = tt;
        if (tt >= maxDist) break;
      }
    }

    if (opts.colliders !== false) {
      const limit = best ? best.distance : maxDist;
      const ex = origin.x + dir.x * limit;
      const ez = origin.z + dir.z * limit;
      const minX = Math.min(origin.x, ex);
      const maxX = Math.max(origin.x, ex);
      const minZ = Math.min(origin.z, ez);
      const maxZ = Math.max(origin.z, ez);
      const seen = this.seenSet;
      seen.clear();
      for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
        for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
          const s = this.gridN.get(nkey(cx, cz));
          if (!s) continue;
          for (const c of s) {
            if (!c.enabled || seen.has(c)) continue;
            seen.add(c);
            if (opts.ignoreTags && opts.ignoreTags.includes(c.tag)) continue;
            const hit = c.type === 'cylinder' ? rayCylinder(origin, dir, c) : rayBox(origin, dir, c);
            if (hit && hit.t <= (best ? best.distance : maxDist)) {
              best = {
                point: new THREE.Vector3(origin.x + dir.x * hit.t, origin.y + dir.y * hit.t, origin.z + dir.z * hit.t),
                normal: hit.n,
                distance: hit.t,
                kind: 'collider',
                collider: c,
              };
            }
          }
        }
      }
    }
    return best;
  }

  /** Visão livre entre dois pontos (ignora árvores por padrão). */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3, ignoreTrees = true): boolean {
    const dir = TMPV.subVectors(b, a);
    const dist = dir.length();
    if (dist < 0.01) return true;
    dir.divideScalar(dist);
    const hit = this.raycast(a, dir.clone(), dist - 0.3, { ignoreTags: ignoreTrees ? ['tree'] : undefined });
    return !hit;
  }
}

const TMPV = new THREE.Vector3();

function rayCylinder(o: THREE.Vector3, d: THREE.Vector3, c: CylinderCollider): { t: number; n: THREE.Vector3 } | null {
  const ox = o.x - c.x;
  const oz = o.z - c.z;
  const a = d.x * d.x + d.z * d.z;
  let t = Infinity;
  let n = new THREE.Vector3();
  if (a > 1e-8) {
    const b = 2 * (ox * d.x + oz * d.z);
    const cc = ox * ox + oz * oz - c.radius * c.radius;
    const disc = b * b - 4 * a * cc;
    if (disc >= 0) {
      const t0 = (-b - Math.sqrt(disc)) / (2 * a);
      if (t0 >= 0) {
        const y = o.y + d.y * t0;
        if (y >= c.y0 && y <= c.y1) {
          t = t0;
          n.set(ox + d.x * t0, 0, oz + d.z * t0).normalize();
        }
      }
    }
  }
  // tampa superior
  if (Math.abs(d.y) > 1e-6) {
    const tc = (c.y1 - o.y) / d.y;
    if (tc >= 0 && tc < t) {
      const px = ox + d.x * tc;
      const pz = oz + d.z * tc;
      if (px * px + pz * pz <= c.radius * c.radius) {
        t = tc;
        n = new THREE.Vector3(0, 1, 0);
      }
    }
  }
  return t < Infinity ? { t, n } : null;
}

function rayBox(o: THREE.Vector3, d: THREE.Vector3, c: BoxCollider): { t: number; n: THREE.Vector3 } | null {
  // transforma o raio para o espaço local
  const rx = o.x - c.x;
  const rz = o.z - c.z;
  const lox = rx * c.cos - rz * c.sin;
  const loz = rx * c.sin + rz * c.cos;
  const loy = o.y - c.y;
  const ldx = d.x * c.cos - d.z * c.sin;
  const ldz = d.x * c.sin + d.z * c.cos;
  const ldy = d.y;
  let tmin = -Infinity;
  let tmax = Infinity;
  let axis = -1;
  let sign = 1;
  const slabs: [number, number, number][] = [
    [lox, ldx, c.hx],
    [loy, ldy, c.hy],
    [loz, ldz, c.hz],
  ];
  for (let i = 0; i < 3; i++) {
    const [p, v, h] = slabs[i];
    if (Math.abs(v) < 1e-8) {
      if (p < -h || p > h) return null;
      continue;
    }
    let t1 = (-h - p) / v;
    let t2 = (h - p) / v;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = i;
      sign = s;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || axis < 0) return null;
  const nl = [0, 0, 0];
  nl[axis] = sign;
  const n = new THREE.Vector3(nl[0] * c.cos + nl[2] * c.sin, nl[1], -nl[0] * c.sin + nl[2] * c.cos);
  return { t: tmin, n };
}
