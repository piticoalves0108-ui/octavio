import * as THREE from 'three';
import { P, GeoBuilder, type V3 } from './builder';
import type { SiteKit } from './kit';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { LAB, CRYSTAL_SHRINE, CANYON, place } from '../../data/places';
import { RIVERS, ROADS, WATER_LEVEL, LOCATION_BY_ID } from '../../data/world';
import { COL, EMIT, crystal, column, barrel, crate, windowPiece } from './parts';

// ---------------------------------------------------------------------------
// Laboratório Abandonado
// ---------------------------------------------------------------------------

export function buildLab(kit: SiteKit) {
  const b = kit.g('laboratorio');
  const rng = new RNG(707);
  const W = 18;
  const D = 14;
  const [, mx] = kit.groundRange(LAB.x, LAB.z, W + 2, D + 2, LAB.yaw);
  b.frame(LAB.x, mx + 0.2, LAB.z, LAB.yaw);
  const conc = P(LAYER.PLASTER, [0.7, 0.72, 0.75]);
  const metal = P(LAYER.METAL, [0.5, 0.52, 0.58], EMIT.circuitDim);
  const frame = P(LAYER.METAL, [0.42, 0.44, 0.5]);
  const t = 0.5;
  const H = 6;
  b.box(0, -1, 0, W + 0.6, 2, D + 0.6, P(LAYER.STONE, COL.stoneDark), 0, 63 - 8);
  b.box(0, 0.02, 0, W - 2 * t, 0.04, D - 2 * t, P(LAYER.METAL, [0.38, 0.4, 0.44]), 0, 4);
  kit.box(b, 0, -1, 0, W + 0.6, 2, D + 0.6, 'platform', { surface: 'metal' });
  kit.footprint(b, 0, 0, W + 4, D + 4, 0, 1.5, 0.35);
  kit.surface(b, 'metal', 0, 0, W, D, -100, 400, 0, 'laboratorio');
  // paredes (frente com abertura arrebentada; canto nordeste desabado)
  const wall = (ax: number, az: number, bx: number, bz: number, h: number) => {
    b.beam(ax, az, bx, bz, 0, h, t, conc);
    b.beam(ax, az, bx, bz, h - 0.6, h - 0.3, t + 0.06, metal, 1 | 2 | 16 | 32);
    kit.wall(b, ax, az, bx, bz, 0, h, t, 'building', { walkable: true, surface: 'metal' });
  };
  wall(-W / 2, -D / 2, W / 2, -D / 2, H);
  wall(-W / 2, -D / 2, -W / 2, D / 2, H);
  wall(W / 2, -D / 2, W / 2, 1, H);
  wall(W / 2, 1, W / 2, D / 2, 2.2);
  wall(-W / 2, D / 2, -2.2, D / 2, H);
  wall(2.2, D / 2, W / 2, D / 2, 3.2);
  // pilares metálicos
  for (const x of [-W / 2, -W / 4, 0, W / 4, W / 2]) {
    for (const z of [-D / 2, D / 2]) {
      b.box(x, H / 2, z, 0.6, H + 0.4, 0.6, frame);
    }
  }
  // janelas quebradas
  for (const x of [-5, 5]) {
    b.push(x, 0, -D / 2, Math.PI);
    windowPiece(b, 0, 2.6, 2.2, 1.6, null, null, false);
    b.pop();
  }
  // teto parcial (fundos) e vigas partidas
  b.box(0, H + 0.1, -D / 4, W, 0.3, D / 2, P(LAYER.METAL, [0.45, 0.47, 0.52]));
  kit.box(b, 0, H + 0.1, -D / 4, W, 0.4, D / 2, 'building', { walkable: true, surface: 'metal' });
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 2 + i * 4.5;
    b.strut([x, H, 0], [x + (rng.next() - 0.5) * 2, H - 1.5 - rng.next() * 3, D / 2 - 1 - rng.next() * 3], 0.35, frame);
  }
  kit.indoor(b, 'laboratorio', 0, -D / 4, W - 1, D / 2 - 0.5, -100, 400);
  // tanque de contenção partido (centro)
  b.cylinder(0, 0, -1, 1.8, 1.8, 0.6, 14, frame, true);
  b.cylinder(0, 0.6, -1, 1.35, 1.35, 3.2, 14, P(LAYER.CRYSTAL, [0.7, 0.55, 0.95], [0.8, 0.25, 1.4, 2]), false);
  b.cylinder(0, 3.8, -1, 1.8, 1.6, 0.6, 14, frame, true, true);
  for (let i = 0; i < 6; i++) {
    const a = rng.next() * Math.PI * 2;
    crystal(b, Math.cos(a) * (2.2 + rng.next() * 2), 0, -1 + Math.sin(a) * (2 + rng.next() * 2), 0.15, 0.6, [0.7, 0.55, 0.95], EMIT.crystalPurple, Math.cos(a) * 0.6, Math.sin(a) * 0.6);
  }
  kit.cyl(b, 0, 0, -1, 1.8, 4.4, 'prop', { walkable: true, surface: 'metal' });
  // terminal (âncora laboratorio_terminal) e armário (âncora laboratorio_bau)
  b.box(-4, 0.5, -4.4, 2.2, 1.0, 0.8, frame);
  b.box(-4, 1.6, -4.7, 1.8, 1.1, 0.12, P(LAYER.PLAIN, [0.2, 0.6, 0.7], [0.3, 1.6, 2.0, 3]), -0.2);
  kit.box(b, -4, 0.8, -4.5, 2.2, 1.6, 1.0, 'prop');
  b.box(7.5, 1.2, -6.0, 2.0, 2.4, 0.9, P(LAYER.METAL, [0.55, 0.57, 0.62]));
  kit.box(b, 7.5, 1.2, -6.0, 2.0, 2.4, 0.9, 'prop');
  // máquinas e tubos nas paredes
  for (let i = 0; i < 3; i++) {
    const x = -7 + i * 2.6;
    b.box(x, 1.4, -D / 2 + 0.9, 2.0, 2.8, 1.2, P(LAYER.METAL, [0.5, 0.52, 0.58], i === 1 ? [0.2, 0.9, 1.2, 3] : EMIT.circuitDim));
    kit.box(b, x, 1.4, -D / 2 + 0.9, 2.0, 2.8, 1.2, 'prop');
  }
  for (let i = 0; i < 5; i++) {
    const z = -4 + i * 2;
    b.cylinder(W / 2 - 0.6, 0, z, 0.25, 0.25, rng.next() < 0.4 ? 1.2 : 4, 8, P(LAYER.CRYSTAL, [0.6, 0.8, 0.9]), true);
  }
  // cabos e entulho
  for (let i = 0; i < 6; i++) b.strut([-6 + rng.next() * 12, 0.08, -5 + rng.next() * 10], [-6 + rng.next() * 12, 0.08, -5 + rng.next() * 10], 0.1, P(LAYER.PLAIN, [0.12, 0.12, 0.14]));
  for (let i = 0; i < 10; i++) {
    const x = -W / 2 + rng.next() * W;
    const z = D / 2 + 0.5 + rng.next() * 5;
    const s = 0.4 + rng.next() * 0.8;
    b.box(x, s * 0.3, z, s * 1.5, s * 0.6, s, conc, rng.next() * 3);
  }
  barrel(b, kit, -W / 2 + 1, 0, D / 2 - 1.2, 0.9);
  crate(b, kit, -W / 2 + 2.2, 0, D / 2 - 1.1, 0.9, 0.3);
}

// ---------------------------------------------------------------------------
// Santuário de Cristal + poleiro da fênix
// ---------------------------------------------------------------------------

export function buildCrystalShrine(kit: SiteKit) {
  const b = kit.g('santuario_cristal');
  const S = CRYSTAL_SHRINE;
  const rng = new RNG(4848);
  b.frame(S.x, S.y, S.z, 0);
  const top = 0.45;
  const stone = P(LAYER.STONE, [0.88, 0.88, 0.92]);
  b.cylinder(0, -2.5, 0, S.radius + 0.8, S.radius, 2.5 + top, 24, P(LAYER.STONE, COL.stoneDark), false);
  b.disc(0, top, 0, S.radius, 24, stone);
  b.ring(0, top + 0.01, 0, 4.5, 5.0, 24, P(LAYER.RUNE, [0.9, 0.95, 1], EMIT.rune));
  b.ring(0, top + 0.01, 0, S.radius - 0.8, S.radius - 0.4, 24, P(LAYER.RUNE, [0.9, 0.95, 1], EMIT.rune));
  kit.cyl(b, 0, -3, 0, S.radius + 0.4, 3 + top, 'platform', { surface: 'stone' });
  kit.disc(b, 0, 0, S.radius + 2, 0.1, 0.2);
  kit.surface(b, 'stone', 0, 0, S.radius * 2, S.radius * 2, S.y - 3, S.y + 20, 0, 'santuario_cristal');
  // degraus
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.push(Math.sin(a) * (S.radius + 0.6), 0, Math.cos(a) * (S.radius + 0.6), a);
    b.box(0, -0.05, 0, 3, 0.5, 1.2, stone);
    kit.box(b, 0, -0.05, 0, 3, 0.5, 1.2, 'platform', { surface: 'stone' });
    b.pop();
  }
  // círculo de cristais
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r = S.radius - 1.8;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 4 + rng.next() * 3;
    crystal(b, x, top, z, 0.6 + rng.next() * 0.3, h, [0.65, 0.9, 1], EMIT.crystalBlue, Math.sin(a) * 0.06, Math.cos(a) * 0.06);
    crystal(b, x + Math.sin(a + 1) * 0.9, top, z + Math.cos(a + 1) * 0.9, 0.3, h * 0.45, [0.65, 0.9, 1], EMIT.crystalBlue, Math.sin(a + 1) * 0.2, Math.cos(a + 1) * 0.2);
    kit.cyl(b, x, top, z, 0.85, h, 'prop', { walkable: false });
  }
  // altar (ao norte do centro; a âncora fica livre no centro)
  b.box(0, top + 0.45, -1.6, 1.4, 0.9, 1.0, P(LAYER.RUNE, [0.95, 0.95, 1], EMIT.rune));
  crystal(b, 0, top + 0.95, -1.6, 0.25, 1.0, [0.8, 0.95, 1], EMIT.crystalBlue);
  kit.box(b, 0, top + 0.45, -1.6, 1.4, 0.9, 1.0, 'prop');
  kit.light(b, 0, top + 2.5, 0, 0x8adfff, 16, 16, 'always');
  // poleiro da fênix: agulha de rocha com ninho (âncora poleiro_fenix)
  const ph = place('poleiro_fenix');
  const px = ph.x - S.x;
  const pz = ph.z - S.z;
  const topY = (ph.y ?? S.y + 15) - S.y;
  const g = kit.h(ph.x, ph.z) - S.y - 1;
  const ico = new THREE.IcosahedronGeometry(1, 1);
  const rock = P(LAYER.ROCK, [0.8, 0.74, 0.7]);
  const segs = 6;
  for (let k = 0; k < segs; k++) {
    const y0 = g + ((topY - g) * k) / segs;
    const y1 = g + ((topY - g) * (k + 1)) / segs;
    const r0 = 3.2 - k * 0.32;
    b.cylinder(px + (rng.next() - 0.5) * 0.4, y0, pz + (rng.next() - 0.5) * 0.4, r0, r0 - 0.32, y1 - y0, 7, rock, false, false, false, k);
  }
  b.cylinder(px, topY - 0.2, pz, 1.6, 2.2, 0.2, 9, rock, true);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.strut([px + Math.cos(a) * 1.9, topY + 0.05, pz + Math.sin(a) * 1.9], [px + Math.cos(a + 1.2) * 1.7, topY + 0.45, pz + Math.sin(a + 1.2) * 1.7], 0.12, P(LAYER.LOG, [0.75, 0.6, 0.45]));
  }
  crystal(b, px + 1.2, topY, pz - 0.6, 0.2, 0.9, [1, 0.6, 0.3], [2.6, 1.0, 0.3, 2]);
  for (let i = 0; i < 4; i++) b.addGeometry(ico, rock, px + Math.cos(i * 1.7) * 3.5, g + 0.6, pz + Math.sin(i * 1.7) * 3.5, 1.5, 1.0, 1.3, i);
  kit.cyl(b, px, g, pz, 2.4, topY - g, 'rock', { walkable: true, surface: 'stone', climbable: true });
  ico.dispose();
}

// ---------------------------------------------------------------------------
// Arcos do Desfiladeiro
// ---------------------------------------------------------------------------

export function buildCanyonArches(kit: SiteKit) {
  const b = kit.g('desfiladeiro');
  const road = ROADS.find((r) => r.id === 'estrada_leste')!.points;
  const rock = P(LAYER.ROCK, [1.0, 0.72, 0.58]);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  const rng = new RNG(616);
  // pontos ao longo dos trechos que cruzam o desfiladeiro
  const spots: [number, number, number][] = [];
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i];
    const [bx, bz] = road[i + 1];
    for (const t of [0.35, 0.75]) {
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (Math.hypot(x - CANYON.x, z - CANYON.z) < 105) spots.push([x, z, Math.atan2(bx - ax, bz - az)]);
    }
  }
  for (const [x, z, yaw] of spots.slice(0, 3)) {
    const g = kit.h(x, z);
    b.frame(x, g, z, yaw);
    const span = 22;
    const spring = 7 + rng.next() * 3;
    const rise = 7 + rng.next() * 2;
    const leg = (s: number) => {
      const lx = (s * span) / 2 + s * 2.2;
      const [wx, , wz] = b.toWorld(lx, 0, 0);
      const lg = kit.h(wx, wz) - g - 2;
      b.box(lx, (lg + spring + 1) / 2, 0, 4.4, spring + 1 - lg, 6.5, rock, s * 0.05);
      b.addGeometry(ico, rock, lx + s * 1.5, lg + 2.5, 1.8, 3, 2.6, 2.4, rng.next() * 3);
      b.addGeometry(ico, rock, lx - s * 0.5, spring - 0.5, -1.6, 2.6, 2.0, 2.6, rng.next() * 3);
      kit.box(b, lx, (lg + spring + 1) / 2, 0, 4.4, spring + 1 - lg, 6.5, 'climbable', { walkable: true, surface: 'stone' });
    };
    leg(-1);
    leg(1);
    b.arch(0, spring, 0, span + 4.4, rise, 4.2, 6.5, 12, rock);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI - ((k + 0.5) / 5) * Math.PI;
      const cx = Math.cos(a) * ((span + 4.4) / 2 + 2.1);
      const cy = spring + Math.sin(a) * (rise + 2.1);
      b.addGeometry(ico, rock, cx, cy + 1.5, (rng.next() - 0.5) * 3, 2.4, 1.6, 2.4, rng.next() * 3);
      kit.box(b, cx, cy, 0, 6.5, 4.2, 6.5, 'climbable', { walkable: true, surface: 'stone' }, 0);
    }
  }
  ico.dispose();
}

// ---------------------------------------------------------------------------
// Pontes nos cruzamentos estrada × rio
// ---------------------------------------------------------------------------

function segIntersect(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): number | null {
  const rx = bx - ax;
  const rz = bz - az;
  const sx = dx - cx;
  const sz = dz - cz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den;
  const u = ((cx - ax) * rz - (cz - az) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/** Cruzamentos estrada × rio (puro; usado também nos testes). */
export function roadRiverCrossings(): { x: number; z: number; yaw: number; riverWidth: number; roadWidth: number; roadId: string }[] {
  const out: { x: number; z: number; yaw: number; riverWidth: number; roadWidth: number; roadId: string }[] = [];
  for (const road of ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const [ax, az] = road.points[i];
      const [bx, bz] = road.points[i + 1];
      for (const river of RIVERS) {
        for (let k = 0; k < river.points.length - 1; k++) {
          const [cx, cz] = river.points[k];
          const [dx, dz] = river.points[k + 1];
          const t = segIntersect(ax, az, bx, bz, cx, cz, dx, dz);
          if (t === null) continue;
          out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az), riverWidth: river.width, roadWidth: road.width, roadId: road.id });
        }
      }
    }
  }
  return out;
}

/** Perfil do tabuleiro: alturas por segmento (degraus ≤ maxStep). Puro, testável. */
export function bridgeProfile(endA: number, endB: number, minMid: number, n: number, maxStep = 0.45): number[] {
  const mid = Math.max(endA, endB, minMid);
  const ys: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const base = endA + (endB - endA) * t;
    const lift = (mid - Math.min(endA, endB)) * Math.pow(Math.sin(Math.PI * t), 0.6);
    ys.push(Math.max(base, Math.min(mid, base + lift)));
  }
  // suaviza degraus grandes
  for (let pass = 0; pass < 20; pass++) {
    let ok = true;
    for (let i = 1; i <= n; i++) {
      const d = ys[i] - ys[i - 1];
      if (Math.abs(d) > maxStep) {
        ok = false;
        if (d > 0) ys[i - 1] = ys[i] - maxStep;
        else ys[i] = ys[i - 1] - maxStep;
      }
    }
    if (ok) break;
  }
  return ys;
}

export function buildBridges(kit: SiteKit) {
  const b = kit.g('pontes');
  const stone = P(LAYER.STONE, COL.stoneWarm);
  const plank = P(LAYER.WOOD, [0.8, 0.65, 0.48]);
  for (const c of roadRiverCrossings()) {
    const L = c.riverWidth + 22;
    const seg = 2;
    const n = Math.round(L / seg);
    const W = c.roadWidth + 1.4;
    b.frame(c.x, 0, c.z, c.yaw);
    const gAt = (lz: number) => {
      const [wx, , wz] = b.toWorld(0, 0, lz);
      return kit.h(wx, wz);
    };
    const ys = bridgeProfile(gAt(-L / 2) + 0.05, gAt(L / 2) + 0.05, WATER_LEVEL + 2.6, n);
    for (let i = 0; i < n; i++) {
      const z0 = -L / 2 + i * seg;
      const z1 = z0 + seg;
      const y0 = ys[i];
      const y1 = ys[i + 1];
      // tabuleiro (tábuas sobre longarinas)
      b.quad([-W / 2, y0, z0], [-W / 2, y1, z1], [W / 2, y1, z1], [W / 2, y0, z0], plank);
      b.quad([W / 2, y0 - 0.4, z0], [W / 2, y1 - 0.4, z1], [-W / 2, y1 - 0.4, z1], [-W / 2, y0 - 0.4, z0], plank);
      for (const s of [-1, 1]) {
        // parapeito de pedra (ordem dos vértices invertida no lado esquerdo para manter as normais para fora)
        const q = (a: V3, bb: V3, c: V3, d: V3, m: ReturnType<typeof P>) => (s > 0 ? b.quad(a, bb, c, d, m) : b.quad(d, c, bb, a, m));
        q([s * (W / 2), y0 - 0.4, z0], [s * (W / 2), y1 - 0.4, z1], [s * (W / 2), y1 + 0.9, z1], [s * (W / 2), y0 + 0.9, z0], stone);
        q([s * (W / 2 + 0.4), y1 - 0.4, z1], [s * (W / 2 + 0.4), y0 - 0.4, z0], [s * (W / 2 + 0.4), y0 + 0.9, z0], [s * (W / 2 + 0.4), y1 + 0.9, z1], stone);
        q([s * (W / 2), y0 + 0.9, z0], [s * (W / 2), y1 + 0.9, z1], [s * (W / 2 + 0.4), y1 + 0.9, z1], [s * (W / 2 + 0.4), y0 + 0.9, z0], P(LAYER.STONE, COL.stone));
        kit.box(b, s * (W / 2 + 0.2), (y0 + y1) / 2 + 0.25, (z0 + z1) / 2, 0.4, 1.3, seg, 'wall', { walkable: false });
      }
      kit.box(b, 0, (y0 + y1) / 2 - 0.3, (z0 + z1) / 2, W, 0.6, seg + 0.05, 'bridge', { walkable: true, surface: 'wood' });
    }
    // arcos de pedra e pilares na água
    b.push(0, 0, 0, Math.PI / 2);
    const mid = ys[Math.floor(n / 2)];
    b.arch(0, WATER_LEVEL - 1, 0, c.riverWidth + 2, mid - WATER_LEVEL - 0.6, 0.8, W + 0.8, 10, stone);
    b.pop();
    for (const s of [-1, 1]) {
      const z = s * (c.riverWidth / 2 + 1.6);
      const y = ys[Math.round((z + L / 2) / seg)];
      b.box(0, (WATER_LEVEL - 3 + y - 0.4) / 2, z, W + 1.2, y - 0.4 - (WATER_LEVEL - 3), 2.4, stone);
      // postes com lanterna nas cabeceiras
      for (const sx of [-1, 1]) {
        const ez = s * (L / 2 - 0.6);
        const ey = ys[s < 0 ? 0 : n];
        b.box(sx * (W / 2 + 0.2), ey + 0.9, ez, 0.6, 1.8, 0.6, stone);
        b.box(sx * (W / 2 + 0.2), ey + 2.0, ez, 0.3, 0.4, 0.3, P(LAYER.PLAIN, [1, 0.85, 0.55], EMIT.lampNight));
      }
    }
    kit.surface(b, 'wood', 0, 0, W, L, -100, 400, 0, 'ponte');
  }
}

// ---------------------------------------------------------------------------
// Placas de direção (texto em pt-BR num atlas de canvas)
// ---------------------------------------------------------------------------

interface SignDef {
  x: number;
  z: number;
  boards: { text: string; tx: number; tz: number }[];
}

const SIGNS: SignDef[] = [
  {
    x: 132,
    z: 246,
    boards: [
      { text: 'Brumafria', tx: -40, tz: 250 },
      { text: 'Ferroluz', tx: 190, tz: 420 },
      { text: 'Ruínas de Aeternum', tx: 180, tz: 140 },
    ],
  },
  {
    x: 190,
    z: 150,
    boards: [
      { text: 'Torre do Observador', tx: 400, tz: 190 },
      { text: 'Ruínas de Aeternum', tx: 250, tz: 10 },
      { text: 'Brumafria', tx: 125, tz: 236 },
    ],
  },
  { x: -512, z: 522, boards: [{ text: 'Vila de Brumafria', tx: -480, tz: 470 }] },
  {
    x: -333,
    z: 309,
    boards: [
      { text: 'Floresta de Lúmen', tx: -200, tz: 290 },
      { text: 'Estrada do Leste', tx: -40, tz: 250 },
    ],
  },
  { x: -440, z: 420, boards: [{ text: 'Cripta do Despertar', tx: -480, tz: 470 }] },
  { x: 372, z: -222, boards: [{ text: 'Ruínas de Aeternum', tx: 430, tz: -300 }] },
  { x: 622, z: 736, boards: [{ text: 'Ferroluz', tx: 700, tz: 760 }] },
  { x: 400, z: 200, boards: [{ text: 'Torre do Observador', tx: 640, tz: 220 }] },
];

/** Placas: postes no material das estruturas + tábuas com texto (1 material com atlas). */
export function buildSigns(kit: SiteKit, parent: THREE.Object3D) {
  const b = kit.g('placas', 400, true);
  const cols = 4;
  const rows = 8;
  const CW = 256;
  const CH = 64;
  const canvas = document.createElement('canvas');
  canvas.width = CW * cols;
  canvas.height = CH * rows;
  const g = canvas.getContext('2d')!;
  const rng = new RNG(99);
  let cell = 0;
  const cellRect = (text: string): [number, number, number, number] => {
    const c = cell++;
    const cx = (c % cols) * CW;
    const cy = Math.floor(c / cols) * CH;
    // madeira
    g.fillStyle = '#8a6440';
    g.fillRect(cx, cy, CW, CH);
    for (let k = 0; k < 14; k++) {
      g.fillStyle = `rgba(60,38,20,${0.15 + rng.next() * 0.2})`;
      g.fillRect(cx, cy + rng.next() * CH, CW, 1 + rng.next() * 2);
    }
    g.strokeStyle = 'rgba(40,25,12,0.8)';
    g.lineWidth = 4;
    g.strokeRect(cx + 3, cy + 3, CW - 6, CH - 6);
    g.fillStyle = '#f3e6c8';
    let size = 30;
    g.font = `bold ${size}px Georgia, serif`;
    while (g.measureText(text).width > CW - 24 && size > 12) {
      size -= 2;
      g.font = `bold ${size}px Georgia, serif`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, cx + CW / 2, cy + CH / 2 + 1);
    return [cx / canvas.width, 1 - (cy + CH) / canvas.height, (cx + CW) / canvas.width, 1 - cy / canvas.height];
  };
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const quad = (p: [number, number, number][], n: [number, number, number], r: [number, number, number, number]) => {
    const base = pos.length / 3;
    for (const v of p) pos.push(...v);
    for (let k = 0; k < 4; k++) nrm.push(...n);
    uv.push(r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const wood = P(LAYER.WOOD, COL.timber);
  for (const s of SIGNS) {
    const gy = kit.h(s.x, s.z);
    b.frame(s.x, gy, s.z, 0);
    b.box(0, 1.6, 0, 0.22, 3.4, 0.22, wood);
    b.cone(0, 3.3, 0, 0.18, 0.3, 4, wood);
    kit.cyl(b, 0, 0, 0, 0.2, 3.3, 'prop');
    s.boards.forEach((bd, i) => {
      const yaw = Math.atan2(bd.tx - s.x, bd.tz - s.z) - Math.PI / 2;
      const y = 2.85 - i * 0.55;
      const front = cellRect(`${bd.text}  →`);
      const back = cellRect(`←  ${bd.text}`);
      b.push(0, 0, 0, yaw);
      // espessura da tábua (estrutura) + ponta de seta
      b.box(1.05, y, 0, 1.7, 0.42, 0.06, wood, 0, 1 | 2 | 4 | 8);
      b.tri([1.9, y + 0.21, -0.03], [2.2, y, -0.03], [1.9, y - 0.21, -0.03], P(LAYER.WOOD, [0.55, 0.4, 0.27]));
      b.tri([1.9, y - 0.21, 0.03], [2.2, y, 0.03], [1.9, y + 0.21, 0.03], P(LAYER.WOOD, [0.55, 0.4, 0.27]));
      const P0 = b.toWorld(0.2, y - 0.21, 0.031);
      const P1 = b.toWorld(1.9, y - 0.21, 0.031);
      const P2 = b.toWorld(1.9, y + 0.21, 0.031);
      const P3 = b.toWorld(0.2, y + 0.21, 0.031);
      const fn: [number, number, number] = [Math.sin(b.yaw), 0, Math.cos(b.yaw)];
      quad([P0, P1, P2, P3], fn, front);
      const Q0 = b.toWorld(1.9, y - 0.21, -0.031);
      const Q1 = b.toWorld(0.2, y - 0.21, -0.031);
      const Q2 = b.toWorld(0.2, y + 0.21, -0.031);
      const Q3 = b.toWorld(1.9, y + 0.21, -0.031);
      quad([Q0, Q1, Q2, Q3], [-fn[0], 0, -fn[2]], back);
      b.pop();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  mesh.name = 'placas_texto';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.userData.maxDist = 400;
  parent.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Pântano: cristais corrompidos e tocos
// ---------------------------------------------------------------------------

export function buildSwampProps(kit: SiteKit) {
  const b = kit.g('pantano');
  const SW = LOCATION_BY_ID['pantano_sombrio'];
  const rng = new RNG(6660);
  b.frame(0, 0, 0, 0);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  let placed = 0;
  for (let tries = 0; tries < 200 && placed < 14; tries++) {
    const a = rng.next() * Math.PI * 2;
    const r = 25 + rng.next() * 170;
    const x = SW.x + Math.cos(a) * r;
    const z = SW.z + Math.sin(a) * r;
    const g = kit.h(x, z);
    if (g < WATER_LEVEL + 0.15 || kit.maps.blockedAt(x, z)) continue;
    placed++;
    const s = 0.7 + rng.next() * 0.9;
    b.addGeometry(ico, P(LAYER.ROCK, [0.45, 0.38, 0.5]), x, g + 0.2, z, 1.6 * s, 0.8 * s, 1.4 * s, rng.next() * 3);
    const n = 3 + Math.floor(rng.next() * 4);
    for (let k = 0; k < n; k++) {
      const ka = rng.next() * Math.PI * 2;
      const kr = rng.next() * 1.0 * s;
      crystal(b, x + Math.cos(ka) * kr, g - 0.1, z + Math.sin(ka) * kr, (0.2 + rng.next() * 0.25) * s, (1.2 + rng.next() * 2.6) * s, [0.75, 0.45, 0.95], EMIT.crystalPurple, Math.cos(ka) * 0.25, Math.sin(ka) * 0.25);
    }
    kit.cyl(b, x, g, z, 1.4 * s, 2.5 * s, 'rock', { walkable: true, surface: 'stone' });
    kit.maps.blockDisc(x, z, 3 * s);
  }
  // ruína de cabana sobre palafitas
  {
    const x = SW.x + 60;
    const z = SW.z - 40;
    const g = kit.h(x, z);
    b.frame(x, Math.max(g, WATER_LEVEL) + 1.4, z, 0.6);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 2.2, -1.2, sz * 1.8, 0.25, 3.4, 0.25, P(LAYER.LOG, [0.5, 0.45, 0.4]));
    b.box(0, 0, 0, 5, 0.2, 4.2, P(LAYER.WOOD, [0.55, 0.48, 0.4]));
    b.box(-2.4, 1.2, 0, 0.15, 2.4, 4.2, P(LAYER.WOOD, [0.5, 0.42, 0.35]));
    b.box(0, 1.2, -2.0, 5, 2.4, 0.15, P(LAYER.WOOD, [0.5, 0.42, 0.35]));
    b.quad([-2.6, 2.4, 2.3], [2.6, 2.6, 2.3], [2.6, 3.2, -2.3], [-2.6, 2.9, -2.3], P(LAYER.THATCH, [0.55, 0.5, 0.4]));
    kit.box(b, 0, -0.2, 0, 5, 0.4, 4.2, 'platform', { surface: 'wood' });
    kit.box(b, -2.4, 1.2, 0, 0.2, 2.4, 4.2, 'building', { walkable: false });
    kit.box(b, 0, 1.2, -2.0, 5, 2.4, 0.2, 'building', { walkable: false });
    for (let k = 0; k < 5; k++) b.box(0, -0.3 - k * 0.35, 2.6 + k * 0.45, 1.2, 0.08, 0.4, P(LAYER.WOOD, [0.5, 0.42, 0.35]));
    kit.maps.blockDisc(x, z, 5);
  }
  ico.dispose();
  void GeoBuilder;
  void column;
}
