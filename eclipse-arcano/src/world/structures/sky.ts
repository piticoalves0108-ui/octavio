import * as THREE from 'three';
import { P, type V3 } from './builder';
import type { SiteKit } from './kit';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { Simplex2 } from '../../core/noise';
import { FLOATING_ISLANDS } from '../../data/world';
import { COL, EMIT, column, crystal } from './parts';

/**
 * Ilhas Suspensas de Elyra + Farol Celeste: topo gramado caminhável, rocha
 * pendente irregular, raízes, pequenas ruínas, árvores e o farol com lanterna
 * de cristal. Colisores: topo (caminhável) + cilindros escalonados por baixo.
 */
export function buildIslands(kit: SiteKit) {
  const b = kit.g('ilhas');
  const noise = new Simplex2(5150);
  const rock = P(LAYER.ROCK, [0.78, 0.74, 0.7]);
  const grass = P(LAYER.MOSS, [0.75, 0.95, 0.6]);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  for (const isl of FLOATING_ISLANDS) {
    const rng = new RNG(Math.round(isl.x * 7 + isl.z * 13));
    const r = isl.radius;
    b.frame(isl.x, isl.y, isl.z, rng.next() * 6);
    const n = Math.max(14, Math.round(r * 1.6));
    const edge = (i: number) => {
      const a = (i / n) * Math.PI * 2;
      return r * (0.86 + 0.18 * (noise.noise(Math.cos(a) * 1.3 + isl.x, Math.sin(a) * 1.3 + isl.z) * 0.5 + 0.5));
    };
    const rings = [
      { d: 0, s: 1 },
      { d: 1.6, s: 1.02 },
      { d: r * 0.45 + 2, s: 0.78 },
      { d: r * 0.85 + 3, s: 0.48 },
      { d: r * 1.3 + 4, s: 0.18 },
    ];
    const ringPt = (k: number, i: number): V3 => {
      const a = (i / n) * Math.PI * 2;
      const rr = edge(i % n) * rings[k].s * (k > 1 ? 0.85 + 0.3 * (noise.noise(i * 0.7 + k * 3, isl.z) * 0.5 + 0.5) : 1);
      return [Math.cos(a) * rr, -rings[k].d - (k > 1 ? noise.noise(i * 0.5, k + isl.x) * 2 : 0), Math.sin(a) * rr];
    };
    // topo (leque) com leve abaulado
    for (let i = 0; i < n; i++) {
      const p0 = ringPt(0, i);
      const p1 = ringPt(0, i + 1);
      b.tri([0, 0.25, 0], [p1[0], 0, p1[2]], [p0[0], 0, p0[2]], grass);
    }
    // laterais rochosas
    for (let k = 0; k < rings.length - 1; k++) {
      for (let i = 0; i < n; i++) {
        const a0 = ringPt(k, i);
        const a1 = ringPt(k, i + 1);
        const b0 = ringPt(k + 1, i);
        const b1 = ringPt(k + 1, i + 1);
        b.quad(a0, a1, b1, b0, k === 0 ? P(LAYER.MOSS, [0.55, 0.65, 0.45]) : rock);
      }
    }
    // ponta de baixo
    const tip: V3 = [0, -(r * 1.6 + 6), 0];
    for (let i = 0; i < n; i++) b.tri(ringPt(rings.length - 1, i), ringPt(rings.length - 1, i + 1), tip, rock);
    // raízes pendentes
    for (let i = 0; i < Math.round(r / 2); i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = r * (0.5 + rng.next() * 0.3);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const len = 3 + rng.next() * 6;
      b.strut([x, -r * 0.45 - 1, z], [x * 0.9, -r * 0.45 - 1 - len, z * 0.9], 0.12 + rng.next() * 0.1, P(LAYER.LOG, [0.5, 0.45, 0.35]));
    }
    // colisores: topo caminhável + rocha por baixo
    const [wx, wy, wz] = b.toWorld(0, 0, 0);
    const top = kit.physics.addCylinder(wx, wz, r * 0.92, wy - 1.6, wy, 'island', { walkable: true, surface: 'grass' });
    kit.colliders.push(top);
    kit.colliders.push(kit.physics.addCylinder(wx, wz, r * 0.72, wy - r * 0.45 - 2, wy - 1.6, 'island', { walkable: true, surface: 'stone' }));
    kit.colliders.push(kit.physics.addCylinder(wx, wz, r * 0.42, wy - r * 0.85 - 3, wy - r * 0.45 - 2, 'island', { walkable: true, surface: 'stone' }));
    kit.colliders.push(kit.physics.addCylinder(wx, wz, r * 0.15, wy - r * 1.3 - 4, wy - r * 0.85 - 3, 'island', { walkable: true, surface: 'stone' }));
    kit.surface(b, 'grass', 0, 0, r * 2, r * 2, wy - 1, wy + 30, 0, isl.id);

    // pedras e cristais no topo
    for (let i = 0; i < Math.round(r / 3); i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = r * (0.3 + rng.next() * 0.55);
      const s = 0.4 + rng.next() * 0.9;
      b.addGeometry(ico, P(LAYER.ROCK, [0.75, 0.72, 0.68]), Math.cos(a) * rr, s * 0.3, Math.sin(a) * rr, s * 1.3, s * 0.8, s, rng.next() * 3);
    }
    // árvores pequenas
    const trees = isl.id === 'farol_celeste' ? 1 : Math.round(r / 7);
    for (let i = 0; i < trees; i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = r * (0.45 + rng.next() * 0.35);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const h = 3 + rng.next() * 2.5;
      b.cylinder(x, 0, z, 0.3, 0.18, h, 6, P(LAYER.LOG, [0.7, 0.62, 0.55]), false);
      for (let k = 0; k < 4; k++) {
        const ox = (rng.next() - 0.5) * 2.2;
        const oz = (rng.next() - 0.5) * 2.2;
        const s = 1.3 + rng.next() * 0.8;
        b.addGeometry(ico, P(LAYER.MOSS, [0.55 + rng.next() * 0.2, 0.85, 0.65]), x + ox, h + rng.next() * 1.2, z + oz, s, s * 0.85, s);
      }
      kit.cyl(b, x, 0, z, 0.35, h, 'tree');
    }
    if (isl.id === 'elyra_1') {
      // ruínas: anel de colunas, arco e altar
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const x = Math.cos(a) * r * 0.55;
        const z = Math.sin(a) * r * 0.55;
        const broken = i % 2 ? 0.3 + rng.next() * 0.4 : 0;
        column(b, x, 0, z, 0.5, 6, P(LAYER.STONE, [0.9, 0.88, 0.85]), broken);
        kit.cyl(b, x, 0, z, 0.6, 6 * (1 - broken), 'prop', { walkable: true, surface: 'stone' });
      }
      b.box(-r * 0.2, 0.3, 0, 3, 0.6, 2, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
      kit.box(b, -r * 0.2, 0.3, 0, 3, 0.6, 2, 'prop');
      for (const s of [-1, 1]) {
        b.box(-r * 0.45, 2.5, s * 3, 1.2, 5, 1.2, P(LAYER.STONE, COL.stoneWarm));
        kit.box(b, -r * 0.45, 2.5, s * 3, 1.2, 5, 1.2, 'prop', { walkable: true });
      }
      b.push(-r * 0.45, 0, 0, Math.PI / 2);
      b.arch(0, 5, 0, 4.8, 1.6, 0.8, 1.2, 8, P(LAYER.STONE, COL.stoneWarm));
      b.pop();
    }
    if (isl.id === 'elyra_4') {
      // pequeno santuário de tempestade
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        column(b, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, 0.35, 4, P(LAYER.STONE, COL.stone));
        kit.cyl(b, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, 0.45, 4, 'prop');
      }
      b.cylinder(0, 4, 0, 3.6, 3.6, 0.4, 12, P(LAYER.STONE, COL.stoneWarm), true, true);
      b.cone(0, 4.4, 0, 3.4, 2.4, 12, P(LAYER.METAL, [0.5, 0.55, 0.7], EMIT.circuitDim));
      crystal(b, 0, 6.6, 0, 0.3, 1.2, [0.7, 0.8, 1], EMIT.crystalBlue);
      kit.cyl(b, 0, 4, 0, 3.6, 3, 'building', { walkable: true });
    }
    if (isl.id === 'farol_celeste') {
      // farol: torre de pedra com lanterna de cristal
      b.cylinder(0, 0, 0, 2.6, 2.1, 13, 12, P(LAYER.STONE, [0.92, 0.9, 0.86]), false);
      for (const y of [4, 8.5]) b.cylinder(0, y, 0, 2.55, 2.45, 0.5, 12, P(LAYER.STONE, COL.stoneDark), false);
      b.cylinder(0, 13, 0, 2.9, 2.9, 0.5, 12, P(LAYER.STONE, COL.stoneDark), true, true);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.box(Math.sin(a) * 1.7, 15, Math.cos(a) * 1.7, 0.2, 3, 0.2, P(LAYER.METAL, [0.8, 0.7, 0.4]));
      }
      crystal(b, 0, 13.5, 0, 0.9, 3.2, [0.85, 0.95, 1], [1.5, 2.6, 3.6, 2]);
      b.cone(0, 16.5, 0, 2.4, 2.6, 12, P(LAYER.METAL, [0.8, 0.7, 0.4]), true);
      b.box(0, 1.2, 2.45, 1.0, 2.4, 0.2, P(LAYER.WOOD, [0.4, 0.3, 0.22]));
      kit.cyl(b, 0, 0, 0, 2.6, 19, 'building', { walkable: true, surface: 'stone' });
    }
    // detritos flutuando em volta
    for (let i = 0; i < Math.round(r / 3); i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = r * (1.15 + rng.next() * 0.5);
      const s = 0.6 + rng.next() * 1.4;
      b.addGeometry(ico, rock, Math.cos(a) * rr, -2 - rng.next() * r * 0.6, Math.sin(a) * rr, s, s * 0.7, s * 1.1, rng.next() * 3);
    }
  }
  ico.dispose();
}
