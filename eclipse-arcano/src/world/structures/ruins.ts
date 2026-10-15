import { P, GeoBuilder } from './builder';
import type { SiteKit } from './kit';
import type { GateSystem } from './gates';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { ARENA, RUINS, place } from '../../data/places';
import { COL, EMIT, column, crystal, brazier } from './parts';
import { terrainDisc, terrainRect } from './village';

const RUNE_STONE = P(LAYER.RUNE, [0.85, 0.85, 0.95], EMIT.rune);
const OLD_STONE = P(LAYER.STONE, [0.78, 0.76, 0.7]);
const MOSSY = P(LAYER.MOSS, [0.6, 0.75, 0.5]);
const TECH = P(LAYER.METAL, [0.62, 0.66, 0.75], EMIT.circuit);
const TECH_DIM = P(LAYER.METAL, [0.45, 0.48, 0.55], EMIT.circuitDim);

/**
 * Ruínas de Aeternum: avenida de colunas, praça com obelisco tecnológico, muros
 * arruinados (alguns escaláveis — tag 'climbable'), salão desabado, coluna caída,
 * pilares tecnológicos, condutos de cristal elevados e o portão selado.
 */
export function buildRuins(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('ruinas');
  const rng = new RNG(9090);
  b.frame(RUINS.x, 0, RUINS.z, 0);
  const H = (x: number, z: number) => kit.h(RUINS.x + x, RUINS.z + z);

  // --- avenida (pavimento quebrado + colunas) ---
  const a0: [number, number] = [-46, 58];
  const a1: [number, number] = [-6, 8];
  const alen = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
  const ayaw = Math.atan2(a1[0] - a0[0], a1[1] - a0[1]);
  b.push((a0[0] + a1[0]) / 2, 0, (a0[1] + a1[1]) / 2, ayaw);
  for (let k = 0; k < Math.floor(alen / 3); k++) {
    if (rng.next() < 0.22) continue;
    terrainRect(kit, b, (rng.next() - 0.5) * 0.6, -alen / 2 + 1.5 + k * 3, 8 + rng.next(), 2.8, P(LAYER.COBBLE, [0.75, 0.75, 0.7]), 0.05, 3);
  }
  for (let k = 0; k <= Math.floor(alen / 8); k++) {
    const z = -alen / 2 + 2 + k * 8;
    for (const s of [-1, 1]) {
      const x = s * 6.2;
      const [wx, , wz] = b.toWorld(x, 0, z);
      const y = kit.h(wx, wz) - 0.2;
      const r = rng.next();
      if (r < 0.2) {
        // coluna tombada ao lado da base
        b.box(x, y + 0.2, z, 1.6, 0.4, 1.6, OLD_STONE);
        b.strut([x + s * 0.8, y + 0.7, z], [x + s * 6.5, y + 0.6, z + 2.2], 1.2, OLD_STONE);
        kit.box(b, x + s * 3.6, y + 0.6, z + 1.1, 1.2, 1.2, 5.6, 'rock', { walkable: true, surface: 'stone' }, Math.atan2(s * 5.7, 2.2));
      } else {
        const broken = r < 0.6 ? 0.3 + rng.next() * 0.45 : 0;
        column(b, x, y, z, 0.6, 7.5, OLD_STONE, broken);
        kit.cyl(b, x, y, z, 0.75, 7.5 * (1 - broken), 'climbable', { walkable: true, surface: 'stone' });
      }
    }
  }
  // arcos sobre a avenida
  for (const z of [-alen / 2 + 10, alen / 2 - 14]) {
    const [wx, , wz] = b.toWorld(0, 0, z);
    const y = kit.h(wx, wz);
    for (const s of [-1, 1]) {
      b.box(s * 5.6, y + 3, z, 1.6, 6, 1.8, OLD_STONE);
      kit.box(b, s * 5.6, y + 3, z, 1.6, 6, 1.8, 'climbable', { walkable: true, surface: 'stone' });
    }
    b.arch(0, y + 6, z, 9.6, 2.8, 1.2, 1.8, 10, OLD_STONE);
    b.box(0, y + 6.6 + 2.8, z, 12.8, 1.0, 1.8, RUNE_STONE);
    kit.box(b, 0, y + 9.4, z, 12.8, 1.0, 1.8, 'wall', { walkable: true, surface: 'stone' });
  }
  b.pop();

  // --- praça das colunas + obelisco tecnológico ---
  terrainDisc(kit, b, 0, 0, 18, P(LAYER.COBBLE, [0.72, 0.72, 0.68]), 0.06);
  kit.disc(b, 0, 0, 18.5, 0.2, 0.25);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    const x = Math.cos(a) * 15.5;
    const z = Math.sin(a) * 15.5;
    if (Math.abs(x + 6) < 4 && z > 0) continue; // abertura da avenida
    const broken = i % 3 === 0 ? 0 : 0.2 + rng.next() * 0.5;
    column(b, x, H(x, z) - 0.1, z, 0.55, 8, OLD_STONE, broken);
    kit.cyl(b, x, H(x, z) - 0.1, z, 0.7, 8 * (1 - broken), 'climbable', { walkable: true, surface: 'stone' });
  }
  const oy = H(0, 0);
  b.box(0, oy + 0.5, 0, 4, 1, 4, OLD_STONE);
  b.box(0, oy + 1.2, 0, 3, 0.4, 3, RUNE_STONE);
  b.cylinder(0, oy + 1.4, 0, 1.1, 0.55, 8.5, 4, TECH, false, false, false, Math.PI / 4);
  b.cone(0, oy + 9.9, 0, 0.55, 0.9, 4, TECH_DIM, false, Math.PI / 4);
  crystal(b, 0, oy + 11.2, 0, 0.6, 2.2, [0.6, 0.85, 1], EMIT.crystalBlue);
  b.ring(0, oy + 11.6, 0, 1.4, 1.7, 16, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
  kit.box(b, 0, oy + 0.7, 0, 4, 1.4, 4, 'platform', { surface: 'stone' });
  kit.cyl(b, 0, oy + 1.4, 0, 1.1, 9, 'prop', { walkable: false });

  // --- muros arruinados (escaláveis) ---
  const wall = (ax: number, az: number, bx: number, bz: number, h: number, thick: number, climb: boolean, ragged = true) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const x0 = ax + (bx - ax) * t0;
      const z0 = az + (bz - az) * t0;
      const x1 = ax + (bx - ax) * t1;
      const z1 = az + (bz - az) * t1;
      const g = Math.min(H(x0, z0), H(x1, z1)) - 0.4;
      const hh = ragged ? h * (0.7 + 0.3 * rng.next()) : h;
      b.beam(x0, z0, x1, z1, g, g + 0.4 + hh, thick, OLD_STONE);
      // faixa de runas e musgo no topo
      b.beam(x0, z0, x1, z1, g + 2.2, g + 2.6, thick + 0.06, RUNE_STONE, 1 | 2 | 16 | 32);
      if (rng.next() < 0.6) b.beam(x0, z0, x1, z1, g + 0.4 + hh - 0.02, g + 0.5 + hh, thick + 0.02, MOSSY, 4);
      kit.wall(b, x0, z0, x1, z1, g, g + 0.4 + hh, thick, climb ? 'climbable' : 'wall', { walkable: true, surface: 'stone' });
    }
  };
  // muro norte (escalável; baú no topo em (-8,-62))
  const ny = RUINS.y + 6.4;
  {
    const g = H(-8, -62) - 0.4;
    b.beam(-30, -62, 16, -62, g, ny, 2.2, OLD_STONE);
    b.beam(-30, -62, 16, -62, g + 2.2, g + 2.6, 2.26, RUNE_STONE, 1 | 2 | 16 | 32);
    b.beam(-30, -62, 16, -62, ny - 0.02, ny + 0.08, 2.24, MOSSY, 4);
    // pedras salientes (apoios de escalada)
    for (let i = 0; i < 18; i++) b.box(-28 + rng.next() * 42, g + 1 + rng.next() * 4.5, -60.8, 0.6, 0.3, 0.3, OLD_STONE);
    kit.wall(b, -30, -62, 16, -62, g, ny, 2.2, 'climbable', { walkable: true, surface: 'stone' });
    // trepadeiras
    for (let i = 0; i < 6; i++) b.box(-24 + i * 7 + rng.next() * 2, g + 3, -60.85, 1.2 + rng.next(), 4.5, 0.05, MOSSY);
  }
  wall(-64, -40, -64, -18, 5, 1.8, true);
  wall(-64, -8, -64, 20, 4.5, 1.8, true);
  wall(-56, -58, -36, -62, 4, 1.6, false);
  // torre arruinada
  {
    const x = -50;
    const z = -40;
    const g = H(x, z) - 0.5;
    b.cylinder(x, g, z, 4.2, 3.9, 9.5, 14, OLD_STONE, false);
    b.cylinder(x, g + 9.5, z, 3.9, 3.9, 0.3, 14, MOSSY, true);
    b.cylinder(x, g + 3.5, z, 4.26, 4.26, 0.5, 14, RUNE_STONE, false);
    kit.cyl(b, x, g, z, 4.2, 9.8, 'climbable', { walkable: true, surface: 'stone' });
  }
  // ruína de construção a leste
  wall(48, -18, 64, -18, 6, 1.4, true);
  wall(64, -18, 64, -4, 5, 1.4, true);
  wall(48, -4, 54, -4, 3.5, 1.4, false);

  // --- salão desabado (baú em 42,30) ---
  {
    const cx = 42;
    const cz = 30;
    wall(cx - 9, cz - 7, cx + 9, cz - 7, 7, 1.4, true);
    wall(cx - 9, cz - 7, cx - 9, cz + 7, 5.5, 1.4, true);
    wall(cx + 9, cz - 7, cx + 9, cz + 1, 6, 1.4, true);
    wall(cx - 9, cz + 7, cx - 3, cz + 7, 3, 1.4, false);
    terrainRect(kit, b, cx, cz, 16, 12, P(LAYER.COBBLE, [0.6, 0.62, 0.6]), 0.04, 2);
    kit.footprint(b, cx, cz, 18, 14, 0, 1, 0.2);
    for (const [x, z, broken] of [
      [cx - 4, cz - 3, 0],
      [cx + 4, cz - 3, 0.4],
      [cx - 4, cz + 3, 0.6],
      [cx + 4, cz + 3, 0.2],
    ] as [number, number, number][]) {
      column(b, x, H(x, z) - 0.1, z, 0.45, 6.5, OLD_STONE, broken);
      kit.cyl(b, x, H(x, z) - 0.1, z, 0.55, 6.5 * (1 - broken), 'climbable', { walkable: true, surface: 'stone' });
    }
    // lajes do teto caídas
    for (let i = 0; i < 4; i++) {
      const x = cx - 6 + i * 3.5 + rng.next();
      const z = cz - 4 + rng.next() * 8;
      if (Math.hypot(x - cx, z - cz) < 2.2) continue;
      const g = H(x, z);
      b.push(x, g + 0.5, z, rng.next() * 3);
      b.strut([-1.6, -0.3, 0], [1.6, 0.6, 0], 1.0, OLD_STONE);
      b.pop();
      kit.box(b, x, g + 0.4, z, 3, 0.9, 1.6, 'rock', { walkable: true, surface: 'stone' });
    }
  }

  // --- coluna caída sobre o baú (-38,-26) ---
  {
    const g = H(-38, -26);
    b.box(-44, g + 0.6, -20, 2.2, 1.6, 2.2, OLD_STONE);
    b.box(-32.5, g + 0.5, -31, 1.4, 1.2, 1.4, OLD_STONE, 0.4);
    b.strut([-44, g + 1.9, -20], [-32, g + 1.6, -31.5], 1.5, OLD_STONE);
    b.strut([-44, g + 1.9, -20], [-32, g + 1.6, -31.5], 1.56, P(LAYER.RUNE, [0.8, 0.8, 0.9]));
    kit.box(b, -38, g + 1.75, -25.7, 1.5, 1.5, 16.3, 'rock', { walkable: true, surface: 'stone' }, Math.atan2(12, -11.5));
    kit.box(b, -44, g + 0.6, -20, 2.2, 1.6, 2.2, 'rock', { walkable: true, surface: 'stone' });
  }

  // --- pilares tecnológicos (um deles é o terminal ativo) ---
  const term = place('ruinas_terminal');
  const tx = term.x - RUINS.x + Math.sin(term.yaw ?? 0) * 1.6;
  const tz = term.z - RUINS.z + Math.cos(term.yaw ?? 0) * 1.6;
  const pillars: [number, number, boolean][] = [
    [tx, tz, true],
    [-24, 10, false],
    [6, 26, false],
    [-14, -24, false],
  ];
  for (const [x, z, active] of pillars) {
    const g = H(x, z) - 0.2;
    b.box(x, g + 0.4, z, 2.4, 0.8, 2.4, OLD_STONE);
    b.cylinder(x, g + 0.8, z, 0.85, 0.7, 6.2, 6, active ? TECH : TECH_DIM, false, false, false, 0.3);
    b.cylinder(x, g + 7.0, z, 1.1, 1.1, 0.4, 6, P(LAYER.METAL, [0.5, 0.52, 0.6]), true, true);
    crystal(b, x, g + 7.4, z, 0.35, 1.6, active ? [0.6, 0.9, 1] : [0.5, 0.55, 0.7], active ? EMIT.crystalBlue : EMIT.crystalDim);
    kit.cyl(b, x, g, z, 1.2, 7.6, 'prop', { walkable: true, surface: 'metal' });
    if (active) {
      const yaw = (term.yaw ?? 0) + Math.PI;
      b.push(x, g, z, yaw);
      b.box(0, 1.6, 1.0, 1.2, 0.8, 0.12, P(LAYER.PLAIN, [0.2, 0.7, 0.9], [0.6, 2.4, 3.2, 2]), -0.3);
      b.box(0, 1.2, 0.9, 1.4, 0.15, 0.4, P(LAYER.METAL, [0.5, 0.52, 0.6]));
      b.pop();
    }
  }

  // --- condutos de cristal elevados (praça → pedestal → arena) ---
  const ped = place('pedestal_cristal_ruinas');
  const conduit = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 6));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        const g = H(x, z);
        b.box(x, g + 1.4, z, 0.35, 2.8, 0.35, P(LAYER.METAL, [0.45, 0.46, 0.5]));
        b.box(x, g + 2.75, z, 1.0, 0.25, 0.6, P(LAYER.METAL, [0.45, 0.46, 0.5]), Math.atan2(bx - ax, bz - az));
        kit.cyl(b, x, g, z, 0.3, 2.6, 'prop');
      }
      const ga = H(ax, az) + 3.1;
      const gb = H(bx, bz) + 3.1;
      b.strut([ax, ga, az], [bx, gb, bz], 0.55, TECH_DIM);
      // segmentos de cristal brilhando ao longo do tubo
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const y = ga + (gb - ga) * t;
        const dx = (bx - ax) / len;
        const dz = (bz - az) / len;
        b.strut([x - dx * 1.2, y, z - dz * 1.2], [x + dx * 1.2, y, z + dz * 1.2], 0.62, P(LAYER.CRYSTAL, [0.6, 0.85, 1], EMIT.crystalBlue));
      }
    }
  };
  const pedL: [number, number] = [ped.x - RUINS.x, ped.z - RUINS.z];
  conduit([
    [3, -3],
    [12, -12],
    [pedL[0] - 6, pedL[1] + 4],
  ]);
  conduit([
    [-3, 3],
    [-20, 16],
    [-40, 22],
    [-60, 22],
  ]);

  // entulho espalhado
  for (let i = 0; i < 70; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = 20 + rng.next() * 80;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x - 70, z + 80) < 58) continue; // arena
    const s = 0.4 + rng.next() * 1.1;
    const g = H(x, z);
    b.box(x, g + s * 0.3, z, s * 1.6, s * 0.8, s, rng.next() < 0.2 ? RUNE_STONE : OLD_STONE, rng.next() * 3);
    if (s > 1.0) kit.box(b, x, g + s * 0.3, z, s * 1.6, s * 0.8, s, 'rock', { walkable: true, surface: 'stone' }, 0);
  }
  void gates;
}

/**
 * Câmara do Guardião: piso metálico rúnico (raio = BOSS_ARENAS), muro-pódio,
 * arquibancadas em degraus, corredor de entrada com o portão 'arena_guardiao'
 * (grade que sobe) e o portão selado 'portao_ruinas' (folhas que deslizam),
 * 4 soquetes de pilares (fase 2), 6 respiradouros (fase 3), estrado central.
 */
export function buildArena(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('arena');
  const A = ARENA;
  const fy = A.floorY;
  b.frame(A.x, 0, A.z, 0);
  const th = A.entranceAngle;
  const pol = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
  const angDiff = (a: number, c: number) => {
    let d = (a - c) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  };
  const metalFloor = P(LAYER.METAL, [0.62, 0.64, 0.7], EMIT.circuitDim, 0.4);
  const runeMetal = P(LAYER.RUNE, [0.7, 0.72, 0.85], EMIT.rune);
  const stoneD = P(LAYER.STONE, [0.62, 0.62, 0.68]);

  // piso
  b.disc(0, fy, 0, A.radius + 0.5, 48, metalFloor);
  b.cylinder(0, fy - 2.5, 0, A.radius + 0.5, A.radius + 0.5, 2.5, 48, stoneD, false);
  b.ring(0, fy + 0.02, 0, A.socketRadius - 1.2, A.socketRadius - 0.9, 48, runeMetal);
  b.ring(0, fy + 0.02, 0, A.radius - 0.6, A.radius, 48, runeMetal);
  kit.cyl(b, 0, fy - 3, 0, A.wallRadius, 3, 'platform', { surface: 'metal' });
  kit.disc(b, 0, 0, A.wallRadius + 14, 0, 0);
  kit.surface(b, 'metal', 0, 0, A.wallRadius * 2, A.wallRadius * 2, fy - 2, fy + 30, 0, 'arena');
  // estrado central
  b.cylinder(0, fy, 0, 5, 5, 0.3, 24, stoneD, true);
  b.ring(0, fy + 0.31, 0, 3.6, 4.4, 24, runeMetal);
  kit.cyl(b, 0, fy - 1, 0, 5, 1.3, 'platform', { surface: 'metal' });
  // soquetes (fase 2)
  for (let i = 0; i < 4; i++) {
    const [sx, sz] = pol(A.socketRadius, th + Math.PI / 4 + (i * Math.PI) / 2);
    b.ring(sx, fy + 0.06, sz, 1.6, 2.2, 16, P(LAYER.METAL, [0.55, 0.57, 0.65]));
    b.disc(sx, fy + 0.03, sz, 1.6, 16, P(LAYER.PLAIN, [0.04, 0.05, 0.08]));
    b.ring(sx, fy + 0.07, sz, 2.2, 2.45, 16, runeMetal);
    b.cylinder(sx, fy, sz, 2.2, 2.2, 0.06, 16, P(LAYER.METAL, [0.55, 0.57, 0.65]), false);
  }
  // respiradouros (fase 3)
  for (let i = 0; i < 6; i++) {
    const a = th + Math.PI / 6 + (i * Math.PI) / 3;
    const [vx, vz] = pol(A.ventRadius, a);
    b.push(vx, fy, vz, -a);
    b.box(0, 0.01, 0, 1.6, 0.02, 2.6, P(LAYER.PLAIN, [0.9, 0.4, 0.1], [2.2, 0.8, 0.2, 2]), 0, 4);
    for (let k = 0; k < 6; k++) b.box(-0.65 + k * 0.26, 0.06, 0, 0.1, 0.1, 2.6, P(LAYER.METAL, [0.3, 0.3, 0.34]));
    b.box(0, 0.06, 1.35, 1.8, 0.12, 0.12, P(LAYER.METAL, [0.3, 0.3, 0.34]));
    b.box(0, 0.06, -1.35, 1.8, 0.12, 0.12, P(LAYER.METAL, [0.3, 0.3, 0.34]));
    b.pop();
  }

  // muro-pódio e arquibancadas
  const segs = 32;
  const halfGap = (A.entranceWidth / 2 + 1.6) / A.wallRadius;
  const podH = 5;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const inGap = angDiff(am, th) < halfGap + Math.PI / segs;
    // muro-pódio
    const r0 = A.wallRadius;
    const r1 = A.wallRadius + 1.5;
    if (!inGap) {
      const [x0, z0] = pol(r0, a0);
      const [x1, z1] = pol(r0, a1);
      const [ox0, oz0] = pol(r1, a0);
      const [ox1, oz1] = pol(r1, a1);
      b.quad([x0, fy - 0.5, z0], [x1, fy - 0.5, z1], [x1, fy + podH, z1], [x0, fy + podH, z0], runeMetal);
      b.quad([x0, fy + podH, z0], [x1, fy + podH, z1], [ox1, fy + podH, oz1], [ox0, fy + podH, oz0], P(LAYER.METAL, [0.55, 0.57, 0.65]));
      kit.wall(b, (x0 + ox0) / 2, (z0 + oz0) / 2, (x1 + ox1) / 2, (z1 + oz1) / 2, fy - 1, fy + podH, 1.6, 'wall', { walkable: true, surface: 'metal' });
      // arquibancadas
      for (let k = 0; k < 6; k++) {
        const ri = r1 + k * 2;
        const ro = ri + 2;
        const ty = fy + podH + 0.6 + k * 1.2;
        const py = k === 0 ? fy + podH : ty - 1.2;
        const [ix0, iz0] = pol(ri, a0);
        const [ix1, iz1] = pol(ri, a1);
        const [ux0, uz0] = pol(ro, a0);
        const [ux1, uz1] = pol(ro, a1);
        b.quad([ix0, py, iz0], [ix1, py, iz1], [ix1, ty, iz1], [ix0, ty, iz0], stoneD);
        b.quad([ix0, ty, iz0], [ix1, ty, iz1], [ux1, ty, uz1], [ux0, ty, uz0], P(LAYER.STONE, COL.stone));
        const [mx0, mz0] = pol((ri + ro) / 2, a0);
        const [mx1, mz1] = pol((ri + ro) / 2, a1);
        kit.wall(b, mx0, mz0, mx1, mz1, fy - 1, ty, 2.05, 'wall', { walkable: true, surface: 'stone' });
      }
      // face externa
      const rOut = r1 + 12;
      const [ex0, ez0] = pol(rOut, a0);
      const [ex1, ez1] = pol(rOut, a1);
      const topY = fy + podH + 0.6 + 5 * 1.2;
      const g0 = kit.h(A.x + ex0, A.z + ez0) - 1;
      const g1 = kit.h(A.x + ex1, A.z + ez1) - 1;
      b.quad([ex1, Math.min(g0, g1), ez1], [ex0, Math.min(g0, g1), ez0], [ex0, topY + 1, ez0], [ex1, topY + 1, ez1], stoneD);
      b.quad([ex1, topY + 1, ez1], [ex0, topY + 1, ez0], [ex0 * 0.98, topY + 1, ez0 * 0.98], [ex1 * 0.98, topY + 1, ez1 * 0.98], P(LAYER.METAL, [0.55, 0.57, 0.65]));
      // pilões tecnológicos com cristal
      if (i % 4 === 0) {
        const [px, pz] = pol(rOut - 0.6, a0);
        b.box(px, topY + 2.5, pz, 1.2, 5, 1.2, TECH, -a0);
        crystal(b, px, topY + 5, pz, 0.4, 1.8, [0.6, 0.85, 1], EMIT.crystalBlue);
        kit.cyl(b, px, topY, pz, 0.8, 5, 'prop');
      }
    }
  }

  // corredor de entrada (dromo) pelas arquibancadas
  const cl = A.corridorLength;
  const cw = A.entranceWidth;
  b.push(Math.cos(th) * A.wallRadius, 0, Math.sin(th) * A.wallRadius, Math.atan2(Math.cos(th), Math.sin(th)));
  // no quadro do corredor: +Z aponta para fora da arena
  b.box(0, fy - 0.05, cl / 2 + 1, cw + 0.2, 0.3, cl + 4, metalFloor, 0, 4 | 16 | 32 | 1 | 2);
  kit.box(b, 0, fy - 1, cl / 2 + 1, cw + 0.4, 2, cl + 4, 'platform', { surface: 'metal' });
  // blocos laterais do corredor: fecham o vão das arquibancadas (de 3,5 m a 10 m do eixo)
  const tierTop = fy + podH + 0.6 + 5 * 1.2;
  for (const s of [-1, 1]) {
    const x = s * (cw / 2 + 3.25);
    b.box(x, (fy - 1 + tierTop) / 2, cl / 2 + 0.5, 6.5, tierTop - fy + 1, cl + 1, stoneD);
    b.box(s * (cw / 2 + 0.05), fy + 3, cl / 2 + 0.5, 0.1, 5.5, cl + 1, runeMetal);
    b.box(x, tierTop + 0.2, cl / 2 + 0.5, 6.7, 0.4, cl + 1.2, P(LAYER.METAL, [0.55, 0.57, 0.65]));
    kit.box(b, x, (fy - 1 + tierTop) / 2, cl / 2 + 0.5, 6.5, tierTop - fy + 1, cl + 1, 'wall', { walkable: true, surface: 'metal' });
    // pilones do portão selado
    b.box(s * (cw / 2 + 1.6), fy + 6, cl, 3.2, 12, 3.2, stoneD);
    b.box(s * (cw / 2 + 1.6), fy + 12.3, cl, 3.6, 0.6, 3.6, TECH);
    kit.box(b, s * (cw / 2 + 1.6), fy + 6, cl, 3.2, 12, 3.2, 'wall', { walkable: true, surface: 'stone' });
    brazier(b, null, s * (cw / 2 + 2.6), fy, cl + 3.2, [0.6, 1.4, 3.2, 3]);
  }
  b.box(0, fy + 10.5, cl, cw + 6.4, 3, 3.2, stoneD);
  b.box(0, fy + 10.5, cl + 1.62, 4, 1.6, 0.04, runeMetal);
  kit.box(b, 0, fy + 10.5, cl, cw + 6.4, 3, 3.2, 'wall', { walkable: true, surface: 'stone' });
  // lintel sobre a entrada da arena
  b.box(0, fy + podH + 1.5, 0.75, cw + 3.2, 3, 1.6, runeMetal);
  kit.box(b, 0, fy + podH + 1.5, 0.75, cw + 3.2, 3, 1.6, 'wall', { walkable: true, surface: 'metal' });
  // pedestal do cristal (âncora pedestal_cristal_ruinas)
  b.box(0, fy + 0.5, cl + 9, 1.6, 1.0, 1.6, stoneD);
  b.cylinder(0, fy + 1.0, cl + 9, 0.5, 0.35, 0.6, 8, stoneD, true);
  b.ring(0, fy + 1.61, cl + 9, 0.2, 0.36, 10, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
  kit.box(b, 0, fy + 0.8, cl + 9, 1.6, 1.6, 1.6, 'prop');

  // portão da arena ('arena_guardiao'): grade metálica que sobe
  const portB = new GeoBuilder();
  portB.frame(0, 0, 0, 0);
  for (let k = 0; k <= 12; k++) portB.box(-cw / 2 + (k * cw) / 12, podH / 2, 0, 0.14, podH, 0.14, P(LAYER.METAL, [0.35, 0.36, 0.42]));
  for (const yy of [0.6, 2.2, 3.8]) portB.box(0, yy, 0, cw, 0.18, 0.2, P(LAYER.METAL, [0.5, 0.5, 0.58], EMIT.circuit));
  for (let k = 0; k <= 12; k++) portB.cone(-cw / 2 + (k * cw) / 12, -0.35, 0, 0.1, 0.35, 4, P(LAYER.METAL, [0.35, 0.36, 0.42]));
  const yawC = b.yaw;
  {
    const [gx, , gz] = b.toWorld(0, 0, 0.75);
    gates.addPart('arena_guardiao', portB, gx, fy, gz, yawC, { kind: 'slide', dx: 0, dy: podH + 0.6, dz: 0 });
    gates.addBlocker('arena_guardiao', gx, fy + podH / 2, gz, cw / 2, podH / 2, 0.35, yawC);
  }
  // portão selado ('portao_ruinas'): duas folhas maciças que deslizam para os lados
  for (const s of [-1, 1]) {
    const lb = new GeoBuilder();
    lb.frame(0, 0, 0, 0);
    const lw = cw / 2 + 0.1;
    lb.box((s * lw) / 2, 4.5, 0, lw, 9, 0.9, P(LAYER.STONE, [0.7, 0.7, 0.76]));
    lb.box((s * lw) / 2, 4.5, 0.47, lw - 0.6, 8.2, 0.05, P(LAYER.METAL, [0.5, 0.52, 0.6], EMIT.circuitDim));
    lb.box(s * 0.25, 4.5, 0.52, 0.5, 3.2, 0.05, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
    const [gx, , gz] = b.toWorld(0, 0, cl);
    const [dx, , dz] = [Math.cos(yawC) * s * (lw + 0.2), 0, -Math.sin(yawC) * s * (lw + 0.2)];
    gates.addPart('portao_ruinas', lb, gx, fy, gz, yawC, { kind: 'slide', dx, dy: 0, dz });
  }
  {
    const [gx, , gz] = b.toWorld(0, 0, cl);
    gates.addBlocker('portao_ruinas', gx, fy + 4.5, gz, cw / 2 + 0.2, 4.5, 0.5, yawC);
  }
  b.pop();
}
