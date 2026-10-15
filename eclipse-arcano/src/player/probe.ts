import type * as THREE from 'three';
import type { Collider, CollisionWorld } from '../world/Collision';
import { WATER_LEVEL } from '../data/world';

/**
 * Consultas de colisão SEM alocação usadas pelo jogador e pela câmera
 * (o raycast do CollisionWorld aloca vetores e conjuntos; aqui não).
 */

/** O ponto está dentro do colisor (com folga `pad`)? */
export function pointInCollider(c: Collider, x: number, y: number, z: number, pad = 0): boolean {
  if (!c.enabled) return false;
  if (c.type === 'cylinder') {
    if (y < c.y0 - pad || y > c.y1 + pad) return false;
    const dx = x - c.x;
    const dz = z - c.z;
    const r = c.radius + pad;
    return dx * dx + dz * dz <= r * r;
  }
  const ly = y - c.y;
  if (ly < -c.hy - pad || ly > c.hy + pad) return false;
  const rx = x - c.x;
  const rz = z - c.z;
  const lx = rx * c.cos - rz * c.sin;
  const lz = rx * c.sin + rz * c.cos;
  return Math.abs(lx) <= c.hx + pad && Math.abs(lz) <= c.hz + pad;
}

/** Primeiro colisor que contém o ponto (ou null). `climbableOnly` filtra paredes escaláveis. */
export function colliderAt(world: CollisionWorld, x: number, y: number, z: number, pad = 0, climbableOnly = false): Collider | null {
  for (const c of world.near(x, z, pad + 1)) {
    if (climbableOnly && !c.climbable) continue;
    if (pointInCollider(c, x, y, z, pad)) return c;
  }
  return null;
}

/** Topo do colisor (y). */
export function colliderTop(c: Collider): number {
  return c.type === 'cylinder' ? c.y1 : c.y + c.hy;
}

/** Base do colisor (y). */
export function colliderBottom(c: Collider): number {
  return c.type === 'cylinder' ? c.y0 : c.y - c.hy;
}

/**
 * Menor base de colisor acima de `y` cuja projeção XZ cobre o ponto (com raio) —
 * impede atravessar ilhas/tetos de baixo para cima. Retorna Infinity se não houver.
 */
export function ceilingAbove(world: CollisionWorld, x: number, z: number, y: number, radius: number): number {
  let best = Infinity;
  for (const c of world.near(x, z, radius + 1)) {
    const bottom = colliderBottom(c);
    if (bottom < y) continue;
    if (c.type === 'cylinder') {
      const dx = x - c.x;
      const dz = z - c.z;
      const r = c.radius + radius * 0.5;
      if (dx * dx + dz * dz > r * r) continue;
    } else {
      const rx = x - c.x;
      const rz = z - c.z;
      const lx = rx * c.cos - rz * c.sin;
      const lz = rx * c.sin + rz * c.cos;
      if (Math.abs(lx) > c.hx + radius * 0.5 || Math.abs(lz) > c.hz + radius * 0.5) continue;
    }
    if (bottom < best) best = bottom;
  }
  return best;
}

/** Raio vs. cilindro inflado (distância ou Infinity). */
function rayCyl(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, c: Collider & { type: 'cylinder' }, r: number, maxT: number): number {
  const px = ox - c.x;
  const pz = oz - c.z;
  const R = c.radius + r;
  const a = dx * dx + dz * dz;
  let t = Infinity;
  if (a > 1e-8) {
    const b = 2 * (px * dx + pz * dz);
    const cc = px * px + pz * pz - R * R;
    if (cc <= 0) {
      // origem dentro do círculo: só a tampa importa (ou já está dentro)
      const y = oy;
      if (y >= c.y0 - r && y <= c.y1 + r) return 0;
    } else {
      const disc = b * b - 4 * a * cc;
      if (disc >= 0) {
        const t0 = (-b - Math.sqrt(disc)) / (2 * a);
        if (t0 >= 0 && t0 <= maxT) {
          const y = oy + dy * t0;
          if (y >= c.y0 - r && y <= c.y1 + r) t = t0;
        }
      }
    }
  }
  if (Math.abs(dy) > 1e-6) {
    // descendo atinge a tampa de cima; subindo, a de baixo
    const plane = dy < 0 ? c.y1 + r : c.y0 - r;
    const tc = (plane - oy) / dy;
    if (tc >= 0 && tc < t && tc <= maxT) {
      const qx = px + dx * tc;
      const qz = pz + dz * tc;
      if (qx * qx + qz * qz <= R * R) t = tc;
    }
  }
  return t;
}

/** Raio vs. caixa orientada inflada (distância ou Infinity). */
function rayBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, c: Collider & { type: 'box' }, r: number, maxT: number): number {
  const rx = ox - c.x;
  const rz = oz - c.z;
  const lox = rx * c.cos - rz * c.sin;
  const loz = rx * c.sin + rz * c.cos;
  const loy = oy - c.y;
  const ldx = dx * c.cos - dz * c.sin;
  const ldz = dx * c.sin + dz * c.cos;
  let tmin = 0;
  let tmax = maxT;
  // eixo X
  {
    const h = c.hx + r;
    if (Math.abs(ldx) < 1e-8) {
      if (lox < -h || lox > h) return Infinity;
    } else {
      let t1 = (-h - lox) / ldx;
      let t2 = (h - lox) / ldx;
      if (t1 > t2) {
        const k = t1;
        t1 = t2;
        t2 = k;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  {
    const h = c.hy + r;
    if (Math.abs(dy) < 1e-8) {
      if (loy < -h || loy > h) return Infinity;
    } else {
      let t1 = (-h - loy) / dy;
      let t2 = (h - loy) / dy;
      if (t1 > t2) {
        const k = t1;
        t1 = t2;
        t2 = k;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  {
    const h = c.hz + r;
    if (Math.abs(ldz) < 1e-8) {
      if (loz < -h || loz > h) return Infinity;
    } else {
      let t1 = (-h - loz) / ldz;
      let t2 = (h - loz) / ldz;
      if (t1 > t2) {
        const k = t1;
        t1 = t2;
        t2 = k;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

export interface CastOptions {
  /** Ignora árvores (câmera atravessa copas). */
  ignoreTrees?: boolean;
  /** Considera a superfície da água como sólida. */
  water?: boolean;
  /** Passo da marcha no terreno (m). */
  step?: number;
}

/**
 * "Sphere cast" aproximado: distância livre ao longo de `dir` (normalizado) até terreno
 * ou colisor, para uma esfera de raio `r`. Retorna maxDist se nada for atingido.
 */
export function sphereCast(world: CollisionWorld, o: THREE.Vector3, dir: THREE.Vector3, maxDist: number, r: number, opts: CastOptions = NO_OPTS): number {
  const hf = world.heightfield;
  const ox = o.x;
  const oy = o.y;
  const oz = o.z;
  const dx = dir.x;
  const dy = dir.y;
  const dz = dir.z;
  let best = maxDist;
  // Terreno: marcha + refinamento
  const step = opts.step ?? 0.6;
  let prevT = 0;
  const groundAt = (x: number, z: number) => {
    const h = hf.heightAt(x, z);
    return opts.water && h < WATER_LEVEL ? WATER_LEVEL : h;
  };
  if (oy - r > groundAt(ox, oz)) {
    for (let t = step; t <= maxDist + 1e-6; t += step) {
      const x = ox + dx * t;
      const z = oz + dz * t;
      if (oy + dy * t - r <= groundAt(x, z)) {
        let lo = prevT;
        let hi = t;
        for (let k = 0; k < 6; k++) {
          const mid = (lo + hi) * 0.5;
          if (oy + dy * mid - r <= groundAt(ox + dx * mid, oz + dz * mid)) hi = mid;
          else lo = mid;
        }
        best = lo;
        break;
      }
      prevT = t;
    }
  } else best = 0;
  // Colisores ao longo do segmento
  const ex = ox + dx * best;
  const ez = oz + dz * best;
  const cx = (ox + ex) * 0.5;
  const cz = (oz + ez) * 0.5;
  const half = Math.hypot(ex - ox, ez - oz) * 0.5 + r + 1;
  for (const c of world.near(cx, cz, half)) {
    if (opts.ignoreTrees && c.tag === 'tree') continue;
    const t = c.type === 'cylinder' ? rayCyl(ox, oy, oz, dx, dy, dz, c, r, best) : rayBox(ox, oy, oz, dx, dy, dz, c, r, best);
    if (t < best) best = t;
  }
  return best < 0 ? 0 : best;
}
const NO_OPTS: CastOptions = {};
