import { P, GeoBuilder } from './builder';
import type { SiteKit } from './kit';
import type { GateSystem } from './gates';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { CAMP, TOWER, FERROLUZ, place } from '../../data/places';
import { COL, EMIT, tent, campfire, barrel, crate, bookshelf, crystal, windowPiece, brazier, type RGB } from './parts';
import { terrainRect } from './village';

// ---------------------------------------------------------------------------
// Acampamento dos Corvos
// ---------------------------------------------------------------------------

/**
 * Paliçada de troncos com abertura voltada para a estrada (portão 'portao_corvos'),
 * fogueira central, tendas, tenda do líder, torre de vigia com plataforma
 * caminhável, jaula do prisioneiro, cristais roubados, caixotes e estandartes.
 */
export function buildCamp(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('acampamento');
  const rng = new RNG(1313);
  b.frame(CAMP.x, 0, CAMP.z, 0);
  const H = (x: number, z: number) => kit.h(CAMP.x + x, CAMP.z + z);
  const R = CAMP.palisadeRadius;
  const ga = CAMP.gateAngle;
  const halfGap = CAMP.gateWidth / 2 / R;
  const log = P(LAYER.LOG, [0.75, 0.62, 0.5]);
  const angDiff = (a: number, c: number) => {
    let d = (a - c) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  };
  kit.disc(b, 0, 0, R - 1, 0.28, 0.35);
  // paliçada: troncos pontudos
  const nPosts = Math.round((2 * Math.PI * R) / 0.62);
  for (let i = 0; i < nPosts; i++) {
    const a = (i / nPosts) * Math.PI * 2;
    if (angDiff(a, ga) < halfGap + 0.02) continue;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const g = H(x, z) - 0.5;
    const h = 4.2 + rng.next() * 0.8;
    b.cylinder(x, g, z, 0.32, 0.3, h, 6, log, false, false, false, a);
    b.cone(x, g + h, z, 0.3, 0.6, 6, log, false, a);
  }
  // colisores da paliçada em trechos de ~4 m
  const nSeg = 40;
  for (let i = 0; i < nSeg; i++) {
    const a0 = (i / nSeg) * Math.PI * 2;
    const a1 = ((i + 1) / nSeg) * Math.PI * 2;
    if (angDiff((a0 + a1) / 2, ga) < halfGap + Math.PI / nSeg) continue;
    const x0 = Math.cos(a0) * R;
    const z0 = Math.sin(a0) * R;
    const x1 = Math.cos(a1) * R;
    const z1 = Math.sin(a1) * R;
    const g = Math.min(H(x0, z0), H(x1, z1)) - 0.5;
    kit.wall(b, x0, z0, x1, z1, g, g + 4.6, 0.8, 'wall', { walkable: false, blocksSight: true });
    // passadiço interno a cada 2 trechos
    if (i % 2 === 0) b.beam(x0 * 0.96, z0 * 0.96, x1 * 0.96, z1 * 0.96, g + 2.6, g + 2.75, 0.8, P(LAYER.WOOD, COL.timber));
  }
  // portão de troncos (abre para dentro)
  const gx = Math.cos(ga) * R;
  const gz = Math.sin(ga) * R;
  const gYaw = Math.atan2(Math.cos(ga), Math.sin(ga)); // +Z local para fora
  const gy = H(gx, gz);
  b.push(gx, gy, gz, gYaw);
  for (const s of [-1, 1]) {
    b.cylinder(s * (CAMP.gateWidth / 2 + 0.3), -0.5, 0, 0.42, 0.38, 6.2, 7, log);
    b.box(s * (CAMP.gateWidth / 2 + 0.3), 5.6, 0.3, 0.9, 1.2, 0.08, P(LAYER.FABRIC, [0.08, 0.08, 0.1]));
    b.box(s * (CAMP.gateWidth / 2 + 0.3), 5.6, 0.35, 0.35, 0.35, 0.02, P(LAYER.FABRIC, [0.85, 0.85, 0.8]));
    kit.cyl(b, s * (CAMP.gateWidth / 2 + 0.3), -0.5, 0, 0.45, 6.2, 'wall');
  }
  b.box(0, 5.2, 0, CAMP.gateWidth + 1.4, 0.5, 0.5, log);
  // crânio de corvo estilizado no alto
  b.box(0, 5.8, 0.2, 0.8, 0.5, 0.3, P(LAYER.PLAIN, [0.9, 0.88, 0.8]));
  b.cone(0, 5.6, 0.45, 0.15, 0.5, 4, P(LAYER.PLAIN, [0.2, 0.2, 0.22]));
  for (const s of [-1, 1]) {
    const lb = new GeoBuilder();
    lb.frame(0, 0, 0, 0);
    const lw = CAMP.gateWidth / 2;
    for (let k = 0; k < 5; k++) lb.cylinder(-s * (0.3 + k * (lw / 5)), 0, 0, 0.18, 0.18, 3.8, 6, log, true);
    lb.box((-s * lw) / 2, 1.0, 0.15, lw, 0.2, 0.12, P(LAYER.WOOD, COL.timber));
    lb.box((-s * lw) / 2, 3.0, 0.15, lw, 0.2, 0.12, P(LAYER.WOOD, COL.timber));
    const [hx, hy, hz] = b.toWorld(s * (CAMP.gateWidth / 2), 0, -0.2);
    gates.addPart('portao_corvos', lb, hx, hy, hz, b.yaw, { kind: 'swing', angle: -s * 1.6 });
  }
  {
    const [cx, cy, cz] = b.toWorld(0, 1.9, -0.2);
    gates.addBlocker('portao_corvos', cx, cy, cz, CAMP.gateWidth / 2, 1.9, 0.3, b.yaw);
  }
  b.pop();

  // fogueira central + troncos-assento
  const fy = H(0, 0);
  campfire(b, 0, fy, 0, 1.2);
  kit.cyl(b, 0, fy, 0, 1.3, 0.6, 'prop');
  kit.light(b, 0, fy + 1.4, 0, 0xff7a30, 22, 16, 'flicker');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const x = Math.cos(a) * 3.3;
    const z = Math.sin(a) * 3.3;
    const y = H(x, z);
    b.push(x, y + 0.3, z, -a);
    b.strut([0, 0, -1.1], [0, 0, 1.1], 0.55, log);
    b.pop();
    kit.box(b, x, y + 0.3, z, 0.6, 0.6, 2.2, 'prop', {}, -a + Math.PI / 2);
  }
  // tendas
  const tentAngles = [0.9, 1.6, 2.4, 3.9, 4.6];
  tentAngles.forEach((off, i) => {
    const a = ga + off;
    const r = 11 + (i % 2) * 3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    b.push(x, H(x, z), z, Math.atan2(-x, -z));
    tent(b, kit, 3.2, 4, 2.4, ([[0.35, 0.12, 0.12], [0.18, 0.16, 0.16], [0.42, 0.32, 0.22]] as RGB[])[i % 3]);
    b.pop();
    kit.disc(b, x, z, 3, 0.3);
  });
  // tenda do líder (âncora corvos_lider)
  {
    const [lx, lz] = [Math.cos(ga + Math.PI) * 15, Math.sin(ga + Math.PI) * 15];
    b.push(lx, H(lx, lz), lz, Math.atan2(-lx, -lz));
    b.push(0, 0, -3.5, 0);
    tent(b, kit, 5.2, 6, 3.4, [0.12, 0.1, 0.12]);
    b.pop();
    b.box(0, 0.05, -1.0, 2.6, 0.06, 1.8, P(LAYER.FABRIC, [0.6, 0.15, 0.15]));
    // estandarte do corvo
    b.box(2.4, 2.2, -0.4, 0.12, 4.4, 0.12, P(LAYER.WOOD, COL.timber));
    b.box(2.4, 3.6, -0.15, 1.1, 1.6, 0.04, P(LAYER.FABRIC, [0.06, 0.06, 0.08]));
    b.box(2.4, 3.7, -0.12, 0.5, 0.4, 0.02, P(LAYER.FABRIC, [0.8, 0.1, 0.1]));
    b.pop();
  }
  // torre de vigia (âncora corvos_torre_vigia; plataforma em CAMP.y + 6.2)
  {
    const [wx, wz] = [Math.cos(ga + 0.42) * (R - 5), Math.sin(ga + 0.42) * (R - 5)];
    const g = H(wx, wz);
    const top = CAMP.y + 6.2;
    b.push(wx, 0, wz, ga);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        b.strut([sx * 1.9, g - 0.3, sz * 1.9], [sx * 1.4, top + 2.6, sz * 1.4], 0.3, log);
        kit.cyl(b, sx * 1.65, g - 0.3, sz * 1.65, 0.25, top + 2.6 - g, 'prop');
      }
    b.box(0, top - 0.15, 0, 3.8, 0.3, 3.8, P(LAYER.WOOD, COL.woodLight));
    kit.box(b, 0, top - 0.25, 0, 3.8, 0.5, 3.8, 'platform', { surface: 'wood' });
    for (const [x, z, w, d] of [
      [0, 1.8, 3.8, 0.12],
      [0, -1.8, 3.8, 0.12],
      [1.8, 0, 0.12, 3.8],
    ] as [number, number, number, number][]) {
      b.box(x, top + 0.55, z, w, 0.12, d, log);
      kit.box(b, x, top + 0.55, z, w, 1.1, d, 'prop', { walkable: false });
    }
    b.pyramid(0, top + 2.6, 0, 4.6, 4.6, 1.6, P(LAYER.THATCH, [0.8, 0.75, 0.6]));
    // escada
    for (let k = 0; k < 14; k++) b.box(-2.1, g + 0.3 + k * ((top - g) / 14), 0, 0.1, 0.08, 1.0, log);
    b.box(-2.1, (g + top) / 2, 0.5, 0.12, top - g + 0.6, 0.12, log);
    b.box(-2.1, (g + top) / 2, -0.5, 0.12, top - g + 0.6, 0.12, log);
    b.pop();
  }
  // jaula (âncora corvos_jaula)
  {
    const [cx, cz] = [Math.cos(ga + Math.PI * 0.55) * 14, Math.sin(ga + Math.PI * 0.55) * 14];
    const g = H(cx, cz);
    b.push(cx, g, cz, Math.atan2(-cx, -cz));
    b.box(0, 0.1, 0, 3.2, 0.2, 3.2, P(LAYER.WOOD, COL.timber));
    b.box(0, 2.6, 0, 3.3, 0.2, 3.3, P(LAYER.WOOD, COL.timber));
    for (let k = 0; k < 8; k++) {
      const t = -1.5 + (k * 3) / 7;
      for (const [x, z] of [
        [t, 1.55],
        [t, -1.55],
        [1.55, t],
        [-1.55, t],
      ]) b.box(x, 1.35, z, 0.1, 2.5, 0.1, P(LAYER.WOOD, COL.timberDark));
    }
    b.box(0, 1.0, 1.62, 0.25, 0.3, 0.15, P(LAYER.METAL, COL.iron));
    kit.box(b, 0, 1.3, 1.55, 3.2, 2.6, 0.2, 'prop', { walkable: false, blocksSight: false });
    kit.box(b, 0, 1.3, -1.55, 3.2, 2.6, 0.2, 'prop', { walkable: false, blocksSight: false });
    kit.box(b, 1.55, 1.3, 0, 0.2, 2.6, 3.2, 'prop', { walkable: false, blocksSight: false });
    kit.box(b, -1.55, 1.3, 0, 0.2, 2.6, 3.2, 'prop', { walkable: false, blocksSight: false });
    kit.box(b, 0, 2.7, 0, 3.3, 0.3, 3.3, 'prop', { walkable: true });
    b.pop();
  }
  // cristais roubados (ao lado da âncora bau_corvos)
  {
    const p = place('bau_corvos');
    const x = p.x - CAMP.x;
    const z = p.z - CAMP.z;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const cx = x + 1.6 + Math.cos(a) * 0.6;
      const cz = z + Math.sin(a) * 0.6;
      crystal(b, cx, H(cx, cz) - 0.05, cz, 0.18 + rng.next() * 0.1, 0.7 + rng.next() * 0.6, [0.6, 0.8, 1], EMIT.crystalBlue, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
    }
  }
  // caixotes, barris, cavaletes de armas, boneco de treino
  for (let i = 0; i < 10; i++) {
    const a = ga + 0.6 + rng.next() * (Math.PI * 2 - 1.2);
    const r = 17 + rng.next() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (i % 2) crate(b, kit, x, H(x, z), z, 0.8 + rng.next() * 0.3, rng.next() * 3);
    else barrel(b, kit, x, H(x, z), z, 0.9);
  }
  for (const off of [-0.7, 0.75]) {
    const x = Math.cos(ga + off) * 8;
    const z = Math.sin(ga + off) * 8;
    const y = H(x, z);
    b.push(x, y, z, ga + off);
    b.box(0, 0.9, 0, 2.0, 0.1, 0.1, P(LAYER.WOOD, COL.timber));
    b.box(-0.9, 0.5, 0, 0.1, 1.0, 0.5, P(LAYER.WOOD, COL.timber));
    b.box(0.9, 0.5, 0, 0.1, 1.0, 0.5, P(LAYER.WOOD, COL.timber));
    for (let k = 0; k < 4; k++) b.strut([-0.6 + k * 0.4, 0.05, 0.25], [-0.6 + k * 0.4, 1.6, -0.1], 0.05, P(LAYER.METAL, [0.7, 0.7, 0.75]));
    kit.box(b, 0, 0.5, 0, 2.0, 1.0, 0.5, 'prop');
    b.pop();
  }
  kit.surface(b, 'dirt', 0, 0, R * 2, R * 2, -100, 400, 0, 'acampamento');
}

// ---------------------------------------------------------------------------
// Torre do Observador
// ---------------------------------------------------------------------------

/**
 * Torre redonda de mago: térreo com estantes (interior acessível quando a porta
 * 'porta_torre' abre), corpo alto com janelas, sacada no topo (caminhável,
 * alcançável voando) com telescópio, telhado cônico com agulha de cristal.
 */
export function buildTower(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('torre_observador');
  const T = TOWER;
  const floor = T.floorY;
  b.frame(T.x, floor, T.z, T.doorYaw);
  const R = T.radius;
  const wallT = 0.8;
  const stone = P(LAYER.STONE, [0.82, 0.8, 0.86]);
  const dark = P(LAYER.STONE, COL.stoneDark);
  const sides = 18;
  // plinto e degraus
  b.cylinder(0, -3, 0, R + 1.6, R + 1.4, 3, sides, dark, true, false, false);
  kit.cyl(b, 0, -3, 0, R + 1.5, 3, 'platform', { surface: 'stone' });
  for (let i = 0; i < 2; i++) {
    b.box(0, -0.3 - i * 0.3 - 0.15, R + 1.9 + i * 0.6, 3.2, 0.3 + 0.6, 0.6, dark);
    kit.box(b, 0, -0.3 - i * 0.3, R + 1.9 + i * 0.6, 3.2, 0.6, 0.6, 'platform', { surface: 'stone' });
  }
  kit.disc(b, 0, 0, R + 4, 0.35, 0);
  // térreo: segmentos de parede com vão da porta (+Z local)
  const H1 = 5;
  const doorHalf = 1.1;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const isDoor = Math.abs(Math.sin(am) * (R - wallT / 2)) < doorHalf + 0.3 && Math.cos(am) > 0;
    const p = (r: number, a: number): [number, number] => [Math.sin(a) * r, Math.cos(a) * r];
    const [x0, z0] = p(R - wallT / 2, a0);
    const [x1, z1] = p(R - wallT / 2, a1);
    if (isDoor) {
      b.beam(x0, z0, x1, z1, 3.3, H1, wallT, stone);
      kit.wall(b, x0, z0, x1, z1, 3.3, H1, wallT, 'building', { walkable: false });
      continue;
    }
    b.beam(x0, z0, x1, z1, 0, H1, wallT, stone);
    kit.wall(b, x0, z0, x1, z1, 0, H1, wallT, 'building', { walkable: false });
  }
  // piso e forro do térreo
  b.disc(0, 0.02, 0, R - wallT + 0.05, sides, P(LAYER.WOOD, [0.7, 0.55, 0.4]));
  b.disc(0, H1 - 0.05, 0, R - wallT + 0.05, sides, P(LAYER.WOOD, [0.55, 0.42, 0.32]), false);
  kit.surface(b, 'wood', 0, 0, R * 2, R * 2, floor - 1, floor + H1, 0, 'torre_terreo');
  kit.indoor(b, 'torre_terreo', 0, 0, (R - wallT) * 1.7, (R - wallT) * 1.7, floor - 1, floor + H1);
  kit.cyl(b, 0, H1, 0, R, 0.4, 'building', { walkable: false });
  // estantes encostadas na parede (âncora torre_biblioteca)
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.35 + (i / 6) * Math.PI * 1.3;
    const r = R - wallT - 0.3;
    bookshelf(b, kit, Math.sin(a) * r, 0, Math.cos(a) * r, a + Math.PI, 1.8, 3.4, 300 + i);
  }
  // escada em caracol (visual)
  b.cylinder(0, 0, 0, 0.35, 0.35, H1, 8, P(LAYER.STONE, COL.stone), false);
  kit.cyl(b, 0, 0, 0, 0.45, H1, 'prop', { walkable: false });
  for (let k = 0; k < 14; k++) {
    const a = k * 0.42 + Math.PI;
    b.push(0, 0.3 + k * 0.33, 0, a);
    b.box(1.0, 0, 0, 1.6, 0.1, 0.55, P(LAYER.WOOD, COL.woodLight));
    b.pop();
  }
  b.box(-2.0, 0.8, 1.5, 1.4, 0.08, 0.8, P(LAYER.WOOD, [0.6, 0.45, 0.32]), 0.4);
  b.box(-2.0, 0.4, 1.5, 0.1, 0.8, 0.1, P(LAYER.WOOD, COL.timber));
  b.cylinder(-2.2, 0.84, 1.4, 0.12, 0.12, 0.25, 8, P(LAYER.CRYSTAL, [0.7, 0.9, 1], EMIT.crystalBlue));
  kit.box(b, -2.0, 0.4, 1.5, 1.4, 0.85, 0.8, 'prop', {}, 0.4);
  kit.light(b, 0, 3.2, 0, 0x9ad0ff, 10, 9, 'always');
  // corpo da torre
  const topY = T.height;
  b.cylinder(0, H1, 0, R, R - 0.4, T.balconyHeight - H1, sides, stone, false);
  b.cylinder(0, T.balconyHeight, 0, R - 0.6, R - 0.8, topY - T.balconyHeight, sides, stone, false);
  for (const y of [H1 + 0.2, 16, 27]) b.cylinder(0, y, 0, R + 0.15, R + 0.1, 0.5, sides, dark, false);
  kit.cyl(b, 0, H1, 0, R, topY - H1, 'building', { walkable: false, climbable: false });
  // contrafortes
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    b.push(Math.sin(a) * R, 0, Math.cos(a) * R, a);
    b.box(0, 7, 0.4, 1.2, 14, 1.4, dark);
    b.box(0, 15, 0.1, 1.0, 2.4, 0.9, dark);
    kit.box(b, 0, 7, 0.4, 1.2, 14, 1.4, 'building', { walkable: true });
    b.pop();
  }
  // janelas em espiral (acendem à noite)
  for (let k = 0; k < 9; k++) {
    const a = k * 1.9 + 0.6;
    const y = 8 + k * 3.1;
    if (y > T.balconyHeight - 2) break;
    const r = R - 0.4 * ((y - H1) / (T.balconyHeight - H1));
    b.push(Math.sin(a) * r, 0, Math.cos(a) * r, a);
    windowPiece(b, 0, y, 0.7, 1.4, null, null, k % 3 !== 1);
    b.pop();
  }
  // sacada (anel caminhável com parapeito e mãos-francesas)
  const by = T.balconyHeight;
  const bR = T.balconyRadius;
  b.ring(0, by, 0, R - 0.6, bR, 24, P(LAYER.STONE, COL.stoneWarm));
  b.ring(0, by - 0.4, 0, R - 0.6, bR, 24, dark, false);
  b.cylinder(0, by - 0.4, 0, bR, bR, 0.4, 24, dark, false);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.strut([Math.sin(a) * (R - 0.2), by - 3.4, Math.cos(a) * (R - 0.2)], [Math.sin(a) * (bR - 0.4), by - 0.4, Math.cos(a) * (bR - 0.4)], 0.35, dark);
  }
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2;
    const a1 = ((i + 1) / 24) * Math.PI * 2;
    const [x0, z0] = [Math.sin(a0) * (bR - 0.15), Math.cos(a0) * (bR - 0.15)];
    const [x1, z1] = [Math.sin(a1) * (bR - 0.15), Math.cos(a1) * (bR - 0.15)];
    b.box(x0, by + 0.5, z0, 0.15, 1.0, 0.15, P(LAYER.METAL, COL.iron));
    b.beam(x0, z0, x1, z1, by + 0.95, by + 1.08, 0.12, P(LAYER.METAL, [0.55, 0.45, 0.25]));
    kit.wall(b, x0, z0, x1, z1, by, by + 1.1, 0.3, 'prop', { walkable: false, blocksSight: false });
    // laje caminhável em gomos
    const [mx0, mz0] = [Math.sin(a0) * ((R + bR) / 2 - 0.3), Math.cos(a0) * ((R + bR) / 2 - 0.3)];
    const [mx1, mz1] = [Math.sin(a1) * ((R + bR) / 2 - 0.3), Math.cos(a1) * ((R + bR) / 2 - 0.3)];
    kit.wall(b, mx0, mz0, mx1, mz1, by - 0.6, by, bR - R + 1.2, 'platform', { walkable: true, surface: 'stone' });
  }
  kit.surface(b, 'stone', 0, 0, bR * 2, bR * 2, floor + by - 1, floor + by + 4, 0, 'sacada');
  // porta da sacada e janelas altas
  for (const a of [0, Math.PI]) {
    b.push(Math.sin(a) * (R - 0.65), 0, Math.cos(a) * (R - 0.65), a);
    b.box(0, by + 1.3, 0.05, 1.3, 2.6, 0.1, P(LAYER.WOOD, [0.4, 0.28, 0.2]));
    b.box(0, by + 2.75, 0.08, 1.6, 0.3, 0.2, dark);
    b.pop();
  }
  // telescópio rúnico (âncora torre_telescopio — lado oeste do mundo)
  {
    const tp = place('torre_telescopio');
    const lx = (tp.x - T.x) * Math.cos(T.doorYaw) - (tp.z - T.z) * Math.sin(T.doorYaw);
    const lz = (tp.x - T.x) * Math.sin(T.doorYaw) + (tp.z - T.z) * Math.cos(T.doorYaw);
    const brass = P(LAYER.METAL, [0.85, 0.65, 0.3]);
    const ox = lx * 1.1;
    const oz = lz * 1.1;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.strut([ox + Math.sin(a) * 0.5, by, oz + Math.cos(a) * 0.5], [ox, by + 1.3, oz], 0.06, brass);
    }
    b.strut([ox - lx * 0.04, by + 1.1, oz - lz * 0.04], [ox + lx * 0.12, by + 2.3, oz + lz * 0.12], 0.25, brass);
    b.disc(ox + lx * 0.12, by + 2.3, oz + lz * 0.12, 0.16, 8, P(LAYER.CRYSTAL, [0.7, 0.9, 1], EMIT.crystalBlue));
    kit.cyl(b, ox, by, oz, 0.5, 1.4, 'prop');
  }
  // telhado cônico + agulha com cristal
  b.cylinder(0, topY, 0, R + 0.4, R + 0.4, 0.5, sides, dark, false, true);
  b.cone(0, topY + 0.5, 0, R + 0.9, 9, sides, P(LAYER.ROOF, [0.35, 0.38, 0.6]));
  b.cylinder(0, topY + 9.2, 0, 0.12, 0.05, 3.5, 6, P(LAYER.METAL, [0.8, 0.7, 0.4]), false);
  crystal(b, 0, topY + 10.5, 0, 0.35, 1.4, [0.7, 0.8, 1], EMIT.crystalBlue);
  kit.cyl(b, 0, topY, 0, R + 0.4, 6, 'building', { walkable: true });
  // lampiões da entrada
  for (const s of [-1, 1]) {
    b.box(s * 1.8, 2.6, R + 0.1, 0.28, 0.36, 0.28, P(LAYER.PLAIN, [1, 0.85, 0.55], EMIT.lampNight));
  }
  // porta trancada ('porta_torre'): folha dupla de madeira com ferro e selo
  for (const s of [-1, 1]) {
    const lb = new GeoBuilder();
    lb.frame(0, 0, 0, 0);
    lb.box((-s * doorHalf) / 2, 1.6, 0, doorHalf, 3.2, 0.18, P(LAYER.WOOD, [0.35, 0.24, 0.17]));
    for (const yy of [0.6, 1.6, 2.6]) lb.box((-s * doorHalf) / 2, yy, 0.1, doorHalf - 0.1, 0.12, 0.04, P(LAYER.METAL, COL.iron));
    lb.disc(-s * 0.15, 1.7, 0.12, 0.22, 10, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
    const [hx, hy, hz] = b.toWorld(s * doorHalf, 0, R - wallT * 0.5);
    gates.addPart('porta_torre', lb, hx, hy, hz, b.yaw, { kind: 'swing', angle: -s * 1.5 });
  }
  {
    const [cx, cy, cz] = b.toWorld(0, 1.65, R - wallT * 0.5);
    gates.addBlocker('porta_torre', cx, cy, cz, doorHalf, 1.65, 0.35, b.yaw);
  }
  // trilha pavimentada até a porta
  b.push(0, 0, R + 6, 0);
  terrainRect(kit, b, 0, 0, 3, 8, P(LAYER.COBBLE, [0.8, 0.78, 0.72]), 0.04, 2);
  b.pop();
}

// ---------------------------------------------------------------------------
// Posto Avançado de Ferroluz
// ---------------------------------------------------------------------------

/**
 * Fortaleza de engenheiros-cavaleiros: muralhas de pedra com coroamento de metal
 * e circuitos, torres de canto com faróis de cristal, portaria com grade
 * ('portao_ferroluz', fechada), torre de comando com agulha-antena (silhueta
 * marcante de longe), oficina arcana, alojamentos e gerador de cristal.
 */
export function buildFerroluz(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('ferroluz');
  const F = FERROLUZ;
  const [, mx] = kit.groundRange(F.x, F.z, F.half * 2, F.half * 2, 0);
  const fy = mx + 0.2;
  b.frame(F.x, fy, F.z, 0);
  const h = F.half;
  const WH = F.wallHeight;
  const WT = F.wallThickness;
  const stone = P(LAYER.STONE, [0.7, 0.7, 0.74]);
  const metal = P(LAYER.METAL, [0.62, 0.65, 0.72], EMIT.circuit);
  const metalPlain = P(LAYER.METAL, [0.5, 0.52, 0.58]);
  const depth = 4;
  // pátio
  b.box(0, -depth / 2, 0, h * 2 - WT, depth, h * 2 - WT, P(LAYER.COBBLE, [0.72, 0.72, 0.74], undefined, 1.5), 0, 4);
  kit.box(b, 0, -depth / 2, 0, h * 2, depth, h * 2, 'platform', { surface: 'stone' });
  kit.footprint(b, 0, 0, h * 2 + 6, h * 2 + 6, 0, 2, 0.4);
  kit.surface(b, 'stone', 0, 0, h * 2, h * 2, fy - 4, fy + 60, 0, 'ferroluz');
  // muralhas
  const wallRun = (ax: number, az: number, bx: number, bz: number) => {
    b.beam(ax, az, bx, bz, -depth, WH * 0.62, WT, stone);
    b.beam(ax, az, bx, bz, WH * 0.62, WH, WT - 0.3, metal);
    b.beam(ax, az, bx, bz, WH, WH + 0.2, WT + 0.2, metalPlain);
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    // ameias metálicas no lado de fora
    const n = Math.floor(len / 2.2);
    const ox = -uz;
    const oz = ux;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = ax + (bx - ax) * t;
      const cz = az + (bz - az) * t;
      const sgn = Math.sign(cx * ox + cz * oz) || 1;
      b.box(cx + ox * sgn * (WT / 2 - 0.3), WH + 0.8, cz + oz * sgn * (WT / 2 - 0.3), 0.6, 1.2, 1.1, metalPlain, Math.atan2(ux, uz));
    }
    kit.wall(b, ax, az, bx, bz, -depth, WH + 1.4, WT, 'wall', { walkable: true, surface: 'metal' });
  };
  const gw = F.gateWidth;
  const gtw = 7;
  wallRun(-h, -h, h, -h);
  wallRun(h, -h, h, h);
  wallRun(h, h, -h, h);
  wallRun(-h, h, -h, gw / 2 + gtw);
  wallRun(-h, -gw / 2 - gtw, -h, -h);
  // torres de canto com faróis de cristal
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * h;
      const z = sz * h;
      b.box(x, (20 - depth) / 2, z, 10, 20 + depth, 10, stone);
      b.box(x, 20.3, z, 11, 0.6, 11, metalPlain);
      b.box(x, 14, z, 10.2, 3, 10.2, metal);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        b.strut([x + Math.sin(a) * 4.5, 20.6, z + Math.cos(a) * 4.5], [x + Math.sin(a) * 1.2, 25, z + Math.cos(a) * 1.2], 0.4, metalPlain);
      }
      crystal(b, x, 23.5, z, 1.0, 4.5, [0.6, 0.9, 1], EMIT.crystalBlue);
      kit.box(b, x, (20 - depth) / 2, z, 10, 20 + depth, 10, 'wall', { walkable: true, surface: 'metal' });
    }
  }
  // portaria (oeste) com grade
  for (const s of [-1, 1]) {
    const z = s * (gw / 2 + gtw / 2);
    b.box(-h, (18 - depth) / 2, z, 8, 18 + depth, gtw, stone);
    b.box(-h, 13, z, 8.2, 3, gtw + 0.2, metal);
    b.box(-h, 18.3, z, 8.6, 0.6, gtw + 0.6, metalPlain);
    b.pyramid(-h, 18.6, z, 8, gtw, 4, P(LAYER.METAL, [0.4, 0.42, 0.5]));
    kit.box(b, -h, (18 - depth) / 2, z, 8, 18 + depth, gtw, 'wall', { walkable: true, surface: 'metal' });
    // estandarte de Ferroluz
    b.box(-h - 4.05, 11, z, 0.05, 6, 2.4, P(LAYER.FABRIC, [0.85, 0.55, 0.15]));
    b.box(-h - 4.08, 11.5, z, 0.03, 1.4, 1.4, P(LAYER.FABRIC, [0.15, 0.2, 0.35]));
    brazier(b, null, -h - 6, 0, z * 0.75, [0.5, 1.6, 2.6, 3]);
  }
  b.box(-h, 13.5, 0, 8, 6, gw, stone);
  b.box(-h - 4.02, 13.5, 0, 0.05, 2, gw - 1, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
  kit.box(b, -h, 13.5, 0, 8, 6, gw, 'wall', { walkable: true, surface: 'metal' });
  {
    const pb = new GeoBuilder();
    pb.frame(0, 0, 0, 0);
    const ph = 10.5;
    for (let k = 0; k <= 10; k++) pb.box(0, ph / 2, -gw / 2 + (k * gw) / 10, 0.25, ph, 0.18, P(LAYER.METAL, [0.38, 0.4, 0.46]));
    for (let k = 0; k < 6; k++) pb.box(0, 0.8 + k * 1.8, 0, 0.3, 0.22, gw, P(LAYER.METAL, [0.5, 0.52, 0.6], EMIT.circuit));
    for (let k = 0; k <= 10; k++) pb.cone(0, -0.4, -gw / 2 + (k * gw) / 10, 0.15, 0.45, 4, P(LAYER.METAL, [0.38, 0.4, 0.46]));
    const [gx, gyy, gz] = b.toWorld(-h - 2, 0, 0);
    gates.addPart('portao_ferroluz', pb, gx, gyy, gz, 0, { kind: 'slide', dx: 0, dy: 9.8, dz: 0 });
    const [cx, cy, cz] = b.toWorld(-h - 2, 5.2, 0);
    gates.addBlocker('portao_ferroluz', cx, cy, cz, 0.6, 5.2, gw / 2, 0);
  }
  // torre de comando (âncora ferroluz_barao em x=14, porta a oeste)
  {
    const kx = 22;
    b.box(kx, (32 - depth) / 2, 0, 14, 32 + depth, 14, stone);
    b.box(kx, 20, 0, 14.3, 4, 14.3, metal);
    b.box(kx, 32.3, 0, 15, 0.6, 15, metalPlain);
    b.cylinder(kx, 32.6, 0, 5, 4, 6, 8, P(LAYER.METAL, [0.55, 0.58, 0.66], EMIT.circuit), true);
    b.cylinder(kx, 38.6, 0, 0.5, 0.25, 12, 6, metalPlain, false);
    b.ring(kx, 44, 0, 1.6, 2.6, 16, P(LAYER.CRYSTAL, [0.6, 0.9, 1], EMIT.crystalBlue));
    b.ring(kx, 44, 0, 1.6, 2.6, 16, P(LAYER.CRYSTAL, [0.6, 0.9, 1], EMIT.crystalBlue), false);
    crystal(b, kx, 50.5, 0, 0.6, 3.5, [0.6, 0.9, 1], EMIT.crystalBlue);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      b.strut([kx + Math.sin(a) * 5, 32.6, Math.cos(a) * 5], [kx + Math.sin(a) * 0.4, 44, Math.cos(a) * 0.4], 0.3, metalPlain);
    }
    // janelas acesas
    for (const yy of [6, 11, 16, 25]) {
      for (let k = -1; k <= 1; k++) {
        b.push(kx - 7, 0, k * 4, -Math.PI / 2);
        windowPiece(b, 0, yy, 0.9, 1.6, null, null, true);
        b.pop();
        b.push(kx + 7, 0, k * 4, Math.PI / 2);
        windowPiece(b, 0, yy, 0.9, 1.6, null, null, k !== 0);
        b.pop();
      }
    }
    b.push(kx - 7, 0, 0, -Math.PI / 2);
    b.box(0, 1.8, 0.1, 2.4, 3.6, 0.2, P(LAYER.METAL, [0.45, 0.47, 0.55], EMIT.circuitDim));
    b.box(0, 3.9, 0.3, 3.2, 0.5, 0.6, metalPlain);
    b.pop();
    kit.box(b, kx, (32 - depth) / 2, 0, 14, 32 + depth, 14, 'building', { walkable: true, surface: 'metal' });
    kit.cyl(b, kx, 32.6, 0, 5, 6, 'building', { walkable: true, surface: 'metal' });
  }
  // oficina arcana (âncora ferroluz_oficina em -14,-26)
  {
    b.push(-14, 0, -32, 0);
    b.box(0, 3, 0, 16, 6, 10, stone);
    b.box(0, 6.2, 0, 16.6, 0.4, 10.6, metalPlain);
    b.gableRoof(0, 6.4, 0, 17, 11, 3, P(LAYER.METAL, [0.45, 0.48, 0.56]));
    b.box(0, 2.0, 5.05, 4, 4, 0.1, P(LAYER.METAL, [0.4, 0.42, 0.5], EMIT.circuitDim));
    for (const s of [-1, 1]) {
      b.push(s * 5, 0, 5, 0);
      windowPiece(b, 0, 2, 1.6, 1.8, null, null, true);
      b.pop();
    }
    b.cylinder(6, 6.4, -2, 0.6, 0.6, 5, 8, metalPlain, true);
    kit.box(b, 0, 4, 0, 16, 8, 10, 'building', { walkable: true, surface: 'metal' });
    b.pop();
  }
  // alojamentos
  {
    b.push(-14, 0, 32, Math.PI);
    b.box(0, 2.6, 0, 18, 5.2, 9, stone);
    b.gableRoof(0, 5.2, 0, 19, 10, 2.8, P(LAYER.ROOF, COL.roof[2]));
    for (let k = -2; k <= 2; k++) {
      b.push(k * 3.4, 0, 4.5, 0);
      windowPiece(b, 0, 1.8, 0.9, 1.3, null, null, k % 2 === 0);
      b.pop();
    }
    b.box(0, 1.3, 4.55, 1.4, 2.6, 0.1, P(LAYER.WOOD, [0.45, 0.32, 0.22]));
    kit.box(b, 0, 3.5, 0, 18, 7, 9, 'building', { walkable: true });
    b.pop();
  }
  // gerador de cristal no pátio
  {
    const gx = 4;
    const gz = 22;
    b.cylinder(gx, 0, gz, 3, 3, 0.8, 16, stone, true);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.box(gx + Math.sin(a) * 2.4, 2.6, gz + Math.cos(a) * 2.4, 0.4, 3.6, 0.4, metalPlain, a);
    }
    b.cylinder(gx, 0.8, gz, 1.3, 1.3, 3.4, 12, P(LAYER.CRYSTAL, [0.6, 0.9, 1], EMIT.crystalBlue), true);
    b.ring(gx, 4.4, gz, 2.0, 2.8, 16, metalPlain);
    kit.cyl(b, gx, 0, gz, 3, 4.6, 'prop', { walkable: true, surface: 'metal' });
    kit.light(b, gx, 3, gz, 0x7ad8ff, 18, 16, 'always');
  }
  // caixotes e grua
  for (let i = 0; i < 8; i++) crate(b, kit, 14 + (i % 4) * 1.1, 0, 26 + Math.floor(i / 4) * 1.1, 1.0, 0);
  {
    const cx = 30;
    const cz = 26;
    b.box(cx, 6, cz, 0.8, 12, 0.8, metalPlain);
    b.strut([cx, 11.5, cz], [cx - 8, 11.5, cz - 4], 0.5, metalPlain);
    b.box(cx - 8, 9.5, cz - 4, 0.05, 4, 0.05, P(LAYER.PLAIN, [0.3, 0.3, 0.3]));
    crate(b, null, cx - 8, 6.6, cz - 4, 1.2, 0.3);
    kit.cyl(b, cx, 0, cz, 0.6, 12, 'prop');
  }
}
