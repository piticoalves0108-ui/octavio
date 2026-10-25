import { describe, it, expect } from 'vitest';
import { findFieldPath, straightClear, type BlockedFn } from '../src/ai/fieldNav';
import { FIELD_NAV } from '../src/data/enemies';
import { Heightfield } from '../src/world/heightfield';
import { CollisionWorld } from '../src/world/Collision';
import { WORLD_HALF } from '../src/data/world';

/** Todos os trechos do caminho passam por células livres. */
function pathClear(pts: { x: number; z: number }[], blocked: BlockedFn) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    for (let t = 0.3; t < len - 0.3; t += 0.25) {
      const x = a.x + ((b.x - a.x) * t) / len;
      const z = a.z + ((b.z - a.z) * t) / len;
      if (blocked(x, z)) return false;
    }
  }
  return true;
}

describe('navegação em campo aberto (A* local)', () => {
  // muro em x ∈ [-1, 1] de z = -30 a 30, com uma passagem em z ∈ [12, 16]
  const wall: BlockedFn = (x, z) => Math.abs(x) < 1.6 && Math.abs(z) < 30 && !(z > 12 && z < 16);

  it('contorna o muro pela passagem, com caminho alisado e livre', () => {
    expect(straightClear(-10, 0, 10, 0, wall)).toBe(false);
    const r = findFieldPath(-10, 0, 10, 0, wall)!;
    expect(r).not.toBeNull();
    expect(r.partial).toBe(false);
    const last = r.points[r.points.length - 1];
    expect(last).toEqual({ x: 10, z: 0 });
    // passa pela abertura (algum ponto perto de x = 0 com z na passagem)
    expect(r.points.some((p) => Math.abs(p.x) < 3 && p.z > 11 && p.z < 17)).toBe(true);
    expect(pathClear(r.points, wall)).toBe(true);
    // alisado: poucos pontos (não um por célula)
    expect(r.points.length).toBeLessThanOrEqual(6);
    expect(r.expanded).toBeLessThan(FIELD_NAV.maxExpand);
  });

  it('reta livre não precisa de rota', () => {
    expect(straightClear(-10, 40, 10, 40, wall)).toBe(true);
  });

  it('objetivo cercado: caminho parcial até o ponto mais perto', () => {
    const box: BlockedFn = (x, z) => {
      const d = Math.max(Math.abs(x - 10), Math.abs(z));
      return d > 3 && d < 5;
    };
    const r = findFieldPath(-10, 0, 10, 0, box)!;
    expect(r.partial).toBe(true);
    const last = r.points[r.points.length - 1];
    expect(Math.hypot(last.x - 10, last.z)).toBeLessThan(8);
    expect(pathClear(r.points, box)).toBe(true);
  });

  it('objetivo muito longe: janela limitada, segue na direção certa', () => {
    const r = findFieldPath(-20, 0, 300, 0, wall)!;
    expect(r).not.toBeNull();
    const last = r.points[r.points.length - 1];
    expect(last.x).toBeGreaterThan(20);
    expect(last.x).toBeLessThan(-20 + FIELD_NAV.maxCells * FIELD_NAV.cell);
    expect(r.partial).toBe(true);
    expect(pathClear(r.points, wall)).toBe(true);
  });

  it('encostado no obstáculo (célula de partida bloqueada) ainda acha a saída', () => {
    const r = findFieldPath(-1.7, 0, 10, 0, wall)!;
    expect(r).not.toBeNull();
    expect(r.partial).toBe(false);
    expect(pathClear(r.points.slice(1), wall)).toBe(true);
  });

  it('é rápido o bastante para 1 busca por quadro', () => {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) findFieldPath(-20, -5 + i * 0.1, 20, 3, wall);
    const ms = (performance.now() - t0) / 20;
    expect(ms).toBeLessThan(4);
  });

  it('com o mundo de colisão: um muro de pedra é contornado', () => {
    const hf = new Heightfield();
    for (let j = 0; j < hf.res; j++) for (let i = 0; i < hf.res; i++) hf.data[j * hf.res + i] = 10 + 0 * (-WORLD_HALF + i);
    const phys = new CollisionWorld(hf);
    // muro de 20 m de comprimento em x = 100, de z = 190 a 210
    phys.addBox(100, 12, 200, 0.5, 2, 10, 0, 'wall');
    const R = 0.5;
    const blocked: BlockedFn = (x, z) => phys.blockedAt(x, z, 10.45, 11.8, R + FIELD_NAV.clearance);
    expect(blocked(100, 200)).toBe(true);
    expect(blocked(100, 215)).toBe(false);
    expect(straightClear(90, 200, 110, 200, blocked)).toBe(false);
    const r = findFieldPath(90, 200, 110, 200, blocked)!;
    expect(r.partial).toBe(false);
    expect(pathClear(r.points, blocked)).toBe(true);
    // passa por uma das pontas do muro
    expect(r.points.some((p) => Math.abs(p.x - 100) < 3 && (p.z > 209 || p.z < 191))).toBe(true);
  });
});
