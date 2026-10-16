import type { GeoBuilder } from './builder';
import { P } from './builder';
import type { SiteKit } from './kit';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';

/**
 * Peças de arquitetura reutilizáveis. Todas trabalham no quadro atual do
 * construtor (b.push/pop) e, quando passam o kit, registram colisores coerentes.
 */

export type RGB = readonly [number, number, number];

export const COL = {
  plaster: [
    [0.96, 0.92, 0.84],
    [0.95, 0.84, 0.62],
    [0.8, 0.86, 0.9],
    [0.95, 0.82, 0.76],
    [0.9, 0.9, 0.86],
    [0.86, 0.9, 0.78],
  ] as RGB[],
  roof: [
    [0.78, 0.4, 0.27],
    [0.58, 0.24, 0.2],
    [0.42, 0.46, 0.55],
    [0.55, 0.38, 0.27],
    [0.46, 0.5, 0.34],
    [0.7, 0.5, 0.32],
  ] as RGB[],
  timber: [0.42, 0.3, 0.21] as RGB,
  timberDark: [0.3, 0.22, 0.16] as RGB,
  woodLight: [0.85, 0.7, 0.52] as RGB,
  stone: [0.88, 0.86, 0.82] as RGB,
  stoneWarm: [0.95, 0.88, 0.76] as RGB,
  stoneDark: [0.62, 0.62, 0.66] as RGB,
  iron: [0.35, 0.36, 0.4] as RGB,
  glass: [0.18, 0.22, 0.28] as RGB,
  white: [1, 1, 1] as RGB,
};

/** Emissões padrão (rgb × intensidade, modo). */
export const EMIT = {
  windowNight: [2.2, 1.35, 0.6, 1] as const,
  lampNight: [5.5, 3.6, 1.6, 1] as const,
  fire: [6, 2.6, 0.7, 3] as const,
  embers: [3.2, 0.9, 0.2, 3] as const,
  crystalBlue: [0.5, 1.6, 2.6, 2] as const,
  crystalPurple: [1.6, 0.5, 2.4, 2] as const,
  crystalDim: [0.25, 0.45, 0.9, 2] as const,
  circuit: [0.3, 1.6, 2.2, 2] as const,
  circuitDim: [0.08, 0.4, 0.55, 2] as const,
  rune: [0.6, 1.2, 2.4, 2] as const,
  gold: [2.4, 1.7, 0.6, 2] as const,
  candle: [3.5, 2.2, 0.9, 3] as const,
};

/**
 * Janela na face +Z local (o sub-quadro já deve estar na superfície da parede).
 * Vidro escuro que acende à noite, moldura, peitoril, venezianas e floreira opcionais.
 */
export function windowPiece(b: GeoBuilder, x: number, y: number, w: number, h: number, shutterColor: RGB | null, flowers: RGB | null, lit = true) {
  const fr = P(LAYER.WOOD, COL.timberDark);
  b.box(x, y + h / 2, 0.02, w, h, 0.06, P(LAYER.PLAIN, COL.glass, lit ? EMIT.windowNight : undefined));
  // moldura e cruzeta
  b.box(x, y + h + 0.06, 0.07, w + 0.24, 0.12, 0.14, fr);
  b.box(x, y - 0.08, 0.1, w + 0.34, 0.12, 0.22, P(LAYER.STONE, COL.stone));
  b.box(x - w / 2 - 0.06, y + h / 2, 0.07, 0.12, h + 0.12, 0.14, fr);
  b.box(x + w / 2 + 0.06, y + h / 2, 0.07, 0.12, h + 0.12, 0.14, fr);
  b.box(x, y + h / 2, 0.06, 0.06, h, 0.06, fr);
  b.box(x, y + h * 0.55, 0.06, w, 0.06, 0.06, fr);
  if (shutterColor) {
    const sc = P(LAYER.WOOD, shutterColor);
    // venezianas abertas, levemente anguladas
    b.push(x - w / 2 - 0.12, 0, 0.08, 0);
    b.box(-w * 0.25, y + h / 2, 0.08, w * 0.5, h, 0.05, sc, -0.35);
    b.pop();
    b.push(x + w / 2 + 0.12, 0, 0.08, 0);
    b.box(w * 0.25, y + h / 2, 0.08, w * 0.5, h, 0.05, sc, 0.35);
    b.pop();
  }
  if (flowers) {
    b.box(x, y - 0.25, 0.2, w + 0.1, 0.22, 0.26, P(LAYER.WOOD, COL.timber));
    for (let i = 0; i < 4; i++) b.box(x - w / 2 + 0.18 + i * ((w - 0.36) / 3), y - 0.05, 0.22, 0.24, 0.2, 0.2, P(LAYER.MOSS, i % 2 ? flowers : [0.5, 0.75, 0.35]));
  }
}

/** Porta (folha de madeira com ferragens) na face +Z local, centrada em x. `open` gira a folha para dentro. */
export function doorPiece(b: GeoBuilder, x: number, w: number, h: number, color: RGB, open = false) {
  const fr = P(LAYER.WOOD, COL.timberDark);
  b.box(x - w / 2 - 0.1, h / 2, 0.05, 0.2, h + 0.1, 0.2, fr);
  b.box(x + w / 2 + 0.1, h / 2, 0.05, 0.2, h + 0.1, 0.2, fr);
  b.box(x, h + 0.12, 0.05, w + 0.5, 0.24, 0.24, fr);
  if (!open) {
    b.box(x, h / 2, -0.05, w, h, 0.1, P(LAYER.WOOD, color));
    b.box(x, h * 0.25, 0.02, w * 0.9, 0.08, 0.04, P(LAYER.METAL, COL.iron));
    b.box(x, h * 0.75, 0.02, w * 0.9, 0.08, 0.04, P(LAYER.METAL, COL.iron));
    b.box(x + w * 0.32, h * 0.5, 0.05, 0.08, 0.16, 0.06, P(LAYER.METAL, [0.7, 0.6, 0.3]));
  } else {
    // folha aberta para dentro (gira 80° na dobradiça esquerda)
    b.push(x - w / 2, 0, -0.08, -1.4);
    b.box(w / 2, h / 2, 0, w, h, 0.1, P(LAYER.WOOD, color));
    b.pop();
  }
}

/** Lampião de poste (acende à noite). Base local (x, z). */
export function lampPost(b: GeoBuilder, kit: SiteKit | null, x: number, z: number, h = 3.4) {
  const iron = P(LAYER.METAL, COL.iron);
  b.box(x, 0.15, z, 0.5, 0.3, 0.5, P(LAYER.STONE, COL.stone));
  b.cylinder(x, 0.3, z, 0.09, 0.07, h - 0.3, 6, iron, false);
  b.box(x + 0.3, h - 0.05, z, 0.7, 0.07, 0.07, iron);
  // lanterna
  b.box(x + 0.6, h - 0.45, z, 0.32, 0.42, 0.32, P(LAYER.PLAIN, [1, 0.85, 0.55], EMIT.lampNight));
  b.pyramid(x + 0.6, h - 0.24, z, 0.42, 0.42, 0.22, iron);
  b.box(x + 0.6, h - 0.68, z, 0.36, 0.05, 0.36, iron);
  if (kit) kit.cyl(b, x, 0, z, 0.22, h, 'prop');
}

/** Cerca de madeira ao longo de uma polilinha local (postes + 2 travessas). */
export function fence(b: GeoBuilder, kit: SiteKit | null, pts: [number, number][], ground: (x: number, z: number) => number, h = 1.1, gap?: { from: number; to: number }) {
  const wood = P(LAYER.WOOD, COL.timber);
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      const s0 = acc + len * t0;
      if (gap && s0 >= gap.from && s0 < gap.to) continue;
      const x0 = ax + (bx - ax) * t0;
      const z0 = az + (bz - az) * t0;
      const x1 = ax + (bx - ax) * t1;
      const z1 = az + (bz - az) * t1;
      const g0 = ground(x0, z0);
      const g1 = ground(x1, z1);
      b.box(x0, g0 + h / 2, z0, 0.16, h + 0.15, 0.16, wood);
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const gm = (g0 + g1) / 2;
      b.box(mx, gm + h * 0.45, mz, 0.08, 0.12, segLen + 0.1, wood, yaw);
      b.box(mx, gm + h * 0.85, mz, 0.08, 0.12, segLen + 0.1, wood, yaw);
      if (kit) kit.box(b, mx, gm + h / 2, mz, 0.2, h, segLen, 'prop', { walkable: false, blocksSight: false }, yaw);
    }
    acc += len;
  }
  const [lx, lz] = pts[pts.length - 1];
  b.box(lx, ground(lx, lz) + h / 2, lz, 0.16, h + 0.15, 0.16, wood);
}

export function barrel(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, s = 1) {
  b.cylinder(x, y, z, 0.38 * s, 0.38 * s, 1.0 * s, 9, P(LAYER.WOOD, [0.8, 0.62, 0.45]), true);
  b.cylinder(x, y + 0.18 * s, z, 0.4 * s, 0.4 * s, 0.07 * s, 9, P(LAYER.METAL, COL.iron), false);
  b.cylinder(x, y + 0.78 * s, z, 0.4 * s, 0.4 * s, 0.07 * s, 9, P(LAYER.METAL, COL.iron), false);
  if (kit) kit.cyl(b, x, y, z, 0.4 * s, 1.0 * s, 'prop');
}

export function crate(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, s = 1, yaw = 0) {
  b.box(x, y + 0.45 * s, z, 0.9 * s, 0.9 * s, 0.9 * s, P(LAYER.WOOD, [0.9, 0.75, 0.55], undefined, 0.7), yaw);
  b.box(x, y + 0.45 * s, z, 0.96 * s, 0.12 * s, 0.96 * s, P(LAYER.WOOD, COL.timber), yaw);
  if (kit) kit.box(b, x, y + 0.45 * s, z, 0.9 * s, 0.9 * s, 0.9 * s, 'prop', {}, yaw);
}

export function bench(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, yaw: number, len = 1.8) {
  b.push(x, y, z, yaw);
  const w = P(LAYER.WOOD, COL.woodLight);
  b.box(0, 0.45, 0, len, 0.08, 0.42, w);
  b.box(-len / 2 + 0.15, 0.22, 0, 0.1, 0.44, 0.38, P(LAYER.WOOD, COL.timber));
  b.box(len / 2 - 0.15, 0.22, 0, 0.1, 0.44, 0.38, P(LAYER.WOOD, COL.timber));
  if (kit) kit.box(b, 0, 0.25, 0, len, 0.5, 0.45, 'prop');
  b.pop();
}

/** Mesa redonda com tampo, pé central e caneca/vela. */
export function roundTable(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, r = 0.75, candle = true) {
  const w = P(LAYER.WOOD, [0.72, 0.55, 0.38]);
  b.cylinder(x, y + 0.74, z, r, r, 0.07, 10, w, true, true);
  b.cylinder(x, y, z, 0.12, 0.1, 0.74, 6, P(LAYER.WOOD, COL.timber), false);
  b.cylinder(x, y, z, 0.4, 0.3, 0.06, 8, P(LAYER.WOOD, COL.timber), true);
  if (candle) {
    b.cylinder(x + 0.15, y + 0.81, z, 0.04, 0.04, 0.16, 6, P(LAYER.PLAIN, [0.95, 0.92, 0.8]), true);
    b.box(x + 0.15, y + 1.0, z, 0.05, 0.08, 0.05, P(LAYER.PLAIN, [1, 0.8, 0.4], EMIT.candle));
    b.cylinder(x - 0.25, y + 0.81, z + 0.1, 0.08, 0.07, 0.17, 7, P(LAYER.METAL, [0.6, 0.55, 0.45]), true);
  }
  if (kit) kit.cyl(b, x, y, z, r, 0.8, 'prop');
}

export function stool(b: GeoBuilder, x: number, y: number, z: number) {
  b.cylinder(x, y + 0.45, z, 0.22, 0.22, 0.06, 8, P(LAYER.WOOD, COL.woodLight), true);
  b.cylinder(x, y, z, 0.06, 0.06, 0.45, 5, P(LAYER.WOOD, COL.timber), false);
}

/** Estante de livros (frente +Z local). */
export function bookshelf(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, yaw: number, w = 2, h = 2.4, seed = 1) {
  const rng = new RNG(seed);
  b.push(x, y, z, yaw);
  const wood = P(LAYER.WOOD, COL.timberDark);
  b.box(0, h / 2, -0.2, w, h, 0.06, wood);
  b.box(-w / 2, h / 2, 0, 0.06, h, 0.45, wood);
  b.box(w / 2, h / 2, 0, 0.06, h, 0.45, wood);
  const shelves = Math.round(h / 0.55);
  for (let s = 0; s <= shelves; s++) {
    const sy = (s / shelves) * (h - 0.05) + 0.02;
    b.box(0, sy, 0, w, 0.05, 0.42, wood);
    if (s === shelves) break;
    let bx = -w / 2 + 0.06;
    while (bx < w / 2 - 0.12) {
      const bw = 0.05 + rng.next() * 0.07;
      const bh = 0.3 + rng.next() * 0.16;
      const hue = rng.next();
      const c: RGB = hue < 0.25 ? [0.55, 0.15, 0.12] : hue < 0.5 ? [0.18, 0.3, 0.5] : hue < 0.75 ? [0.25, 0.42, 0.2] : [0.6, 0.45, 0.25];
      b.box(bx + bw / 2, sy + 0.03 + bh / 2, 0.02, bw, bh, 0.3, P(LAYER.FABRIC, c, undefined, 0.3), rng.next() < 0.1 ? 0.2 : 0);
      bx += bw + 0.005;
    }
  }
  if (kit) kit.box(b, 0, h / 2, 0, w, h, 0.5, 'prop', { walkable: false });
  b.pop();
}

/** Casa genérica (fachada com porta em +Z local). Retorna a altura total. */
export interface HouseParams {
  w: number;
  d: number;
  floors: 1 | 2;
  style: number;
  /** Interior acessível: paredes ocas, piso e forro com colisores. */
  interior?: boolean;
  /** Id da zona de interior (World.indoorId), ex.: 'taverna', 'arquivo'. */
  interiorId?: string;
  /** Paredes térreas de pedra (senão reboco com enxaimel). */
  stoneBase?: boolean;
  thatch?: boolean;
  seed?: number;
}

/**
 * Casa de vila: alicerce, paredes (reboco + enxaimel ou pedra), segundo andar em
 * balanço, telhado de duas águas com beirais, chaminé, janelas que acendem à
 * noite, porta, lampião, barris. Colisores: corpo + telhado escalonado
 * (caminhável), ou paredes ocas + piso + forro quando `interior`.
 * O quadro do construtor deve estar no centro da casa, y = piso.
 */
export function house(b: GeoBuilder, kit: SiteKit, p: HouseParams, foundationDepth: number) {
  const rng = new RNG(p.seed ?? p.style * 31 + 7);
  const { w, d } = p;
  const plaster = COL.plaster[p.style % COL.plaster.length];
  const roofC = COL.roof[(p.style * 7 + 3) % COL.roof.length];
  const shutter: RGB = [[0.25, 0.4, 0.55], [0.5, 0.25, 0.2], [0.3, 0.45, 0.3], [0.55, 0.45, 0.25]][p.style % 4] as unknown as RGB;
  const stoneWalls = p.stoneBase ?? p.style % 3 === 1;
  const H1 = 3.2;
  const H2 = p.floors === 2 ? 2.9 : 0;
  const jetty = p.floors === 2 ? 0.4 : 0;
  const t = 0.35;
  const wallMat = stoneWalls ? P(LAYER.STONE, COL.stoneWarm) : P(LAYER.PLASTER, plaster);
  const beam = P(LAYER.WOOD, COL.timber);

  // alicerce
  b.box(0, -foundationDepth / 2 - 0.02, 0, w + 0.4, foundationDepth, d + 0.4, P(LAYER.STONE, COL.stoneDark), 0, 63 - 8);
  kit.footprint(b, 0, 0, w + 1.2, d + 1.2, 0, 1.2, 0.25);

  if (!p.interior) {
    b.box(0, H1 / 2, 0, w, H1, d, wallMat, 0, 1 | 2 | 16 | 32);
  } else {
    // paredes ocas com vão de porta na frente
    const dw = 1.8;
    const dh = 2.6;
    b.box(0, H1 / 2, -d / 2 + t / 2, w, H1, t, wallMat);
    b.box(-w / 2 + t / 2, H1 / 2, 0, t, H1, d - 2 * t, wallMat);
    b.box(w / 2 - t / 2, H1 / 2, 0, t, H1, d - 2 * t, wallMat);
    const side = (w - dw) / 2;
    b.box(-w / 2 + side / 2, H1 / 2, d / 2 - t / 2, side, H1, t, wallMat);
    b.box(w / 2 - side / 2, H1 / 2, d / 2 - t / 2, side, H1, t, wallMat);
    b.box(0, dh + (H1 - dh) / 2, d / 2 - t / 2, dw, H1 - dh, t, wallMat);
    // piso de tábuas e forro com vigas
    b.box(0, -0.05, 0, w - 2 * t, 0.1, d - 2 * t, P(LAYER.WOOD, [0.75, 0.6, 0.45]), 0, 4);
    b.box(0, H1 - 0.05, 0, w - 2 * t, 0.1, d - 2 * t, P(LAYER.WOOD, [0.6, 0.48, 0.36]), 0, 8);
    for (let x = -w / 2 + 1.5; x < w / 2 - 0.5; x += 2) b.box(x, H1 - 0.2, 0, 0.22, 0.25, d - 2 * t, beam);
    // colisores: paredes, piso, forro
    kit.box(b, 0, H1 / 2, -d / 2 + t / 2, w, H1, t, 'building', { walkable: false });
    kit.box(b, -w / 2 + t / 2, H1 / 2, 0, t, H1, d, 'building', { walkable: false });
    kit.box(b, w / 2 - t / 2, H1 / 2, 0, t, H1, d, 'building', { walkable: false });
    kit.box(b, -w / 2 + side / 2, H1 / 2, d / 2 - t / 2, side, H1, t, 'building', { walkable: false });
    kit.box(b, w / 2 - side / 2, H1 / 2, d / 2 - t / 2, side, H1, t, 'building', { walkable: false });
    kit.box(b, 0, dh + (H1 - dh) / 2, d / 2 - t / 2, dw, H1 - dh, t, 'building', { walkable: false });
    kit.box(b, 0, -0.25, 0, w, 0.5, d, 'platform', { surface: 'wood' });
    kit.box(b, 0, H1 + 0.2, 0, w, 0.4, d, 'building', { walkable: false });
    const [fx, fy, fz] = b.toWorld(0, 0, 0);
    kit.surface(b, 'wood', 0, 0, w - 2 * t, d - 2 * t, fy - 0.5, fy + H1, 0, 'piso');
    kit.indoor(b, p.interiorId ?? 'interior', 0, 0, w - 2 * t, d - 2 * t, fy - 0.5, fy + H1 + 0.2);
    void fx;
    void fz;
  }

  // enxaimel no térreo (se reboco)
  if (!stoneWalls) halfTimber(b, w, d, 0, H1, rng, p.interior ? 1.8 : 0);
  else {
    // cunhais de pedra clara nos cantos
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box((sx * w) / 2, H1 / 2, (sz * d) / 2, 0.5, H1, 0.5, P(LAYER.STONE, COL.stone));
  }

  // segundo andar em balanço (frente e fundos)
  let topY = H1;
  if (p.floors === 2) {
    b.box(0, H1 + 0.08, 0, w + 0.2, 0.16, d + jetty * 2 + 0.2, beam);
    b.box(0, H1 + 0.16 + H2 / 2, 0, w, H2, d + jetty * 2, P(LAYER.PLASTER, plaster), 0, 1 | 2 | 16 | 32);
    halfTimber(b, w, d + jetty * 2, H1 + 0.16, H2, rng, 0);
    // mísulas sob o balanço
    for (let x = -w / 2 + 0.6; x <= w / 2 - 0.5; x += 1.6) {
      b.strut([x, H1 - 0.7, d / 2], [x, H1, d / 2 + jetty], 0.14, beam);
      b.strut([x, H1 - 0.7, -d / 2], [x, H1, -d / 2 - jetty], 0.14, beam);
    }
    topY = H1 + 0.16 + H2;
  }
  const dd = d + jetty * 2;

  // telhado (cumeeira ao longo de X)
  const rh = dd * (p.thatch ? 0.55 : 0.46);
  const roofMat = p.thatch ? P(LAYER.THATCH, [1, 0.95, 0.85]) : P(LAYER.ROOF, roofC);
  b.gableRoof(0, topY, 0, w + 1.0, dd + 1.1, rh, roofMat, P(LAYER.PLASTER, plaster));
  // cumeeira
  b.box(0, topY + rh + 0.05, 0, w + 1.0, 0.16, 0.28, p.thatch ? P(LAYER.THATCH, [0.8, 0.7, 0.5]) : P(LAYER.ROOF, [roofC[0] * 0.7, roofC[1] * 0.7, roofC[2] * 0.7]));
  // chaminé
  const chx = (rng.next() < 0.5 ? -1 : 1) * (w / 2 - 1.1);
  b.box(chx, topY + rh * 0.5, -dd * 0.15, 0.9, rh + 1.8, 0.9, P(LAYER.STONE, COL.stoneDark));
  b.box(chx, topY + rh + 1.35, -dd * 0.15, 1.05, 0.18, 1.05, P(LAYER.STONE, COL.stone));

  // janelas (frente, fundos, laterais)
  const shut = rng.next() < 0.7 ? shutter : null;
  const fl: RGB | null = rng.next() < 0.6 ? ([[0.9, 0.3, 0.35], [0.95, 0.8, 0.3], [0.7, 0.45, 0.9]][rng.int(0, 2)] as unknown as RGB) : null;
  const winY = 1.1;
  // frente: duas janelas ao lado da porta
  b.push(0, 0, d / 2, 0);
  for (const sx of [-1, 1]) {
    const wx = sx * Math.min(w / 2 - 1.2, 2.4);
    windowPiece(b, wx, winY, 0.9, 1.15, shut, fl, true);
  }
  doorPiece(b, 0, 1.3, 2.3, [0.5, 0.33, 0.22], !!p.interior);
  if (!p.interior) b.box(0, 1.15, -0.02, 1.3, 2.3, 0.06, P(LAYER.WOOD, [0.5, 0.33, 0.22]));
  // lampião ao lado da porta
  b.box(1.1, 2.35, 0.25, 0.22, 0.3, 0.22, P(LAYER.PLAIN, [1, 0.85, 0.55], EMIT.lampNight));
  b.box(1.1, 2.56, 0.18, 0.08, 0.08, 0.4, P(LAYER.METAL, COL.iron));
  b.pop();
  // fundos
  b.push(0, 0, -d / 2, Math.PI);
  windowPiece(b, -w * 0.22, winY, 0.8, 1.0, shut, null, true);
  windowPiece(b, w * 0.22, winY, 0.8, 1.0, shut, null, rng.next() < 0.5);
  b.pop();
  // laterais
  b.push(w / 2, 0, 0, Math.PI / 2);
  windowPiece(b, 0, winY, 0.8, 1.0, shut, null, true);
  b.pop();
  b.push(-w / 2, 0, 0, -Math.PI / 2);
  windowPiece(b, 0, winY, 0.8, 1.0, shut, null, rng.next() < 0.5);
  b.pop();
  if (p.floors === 2) {
    b.push(0, 0, dd / 2, 0);
    for (let k = 0; k < Math.max(2, Math.floor(w / 3)); k++) {
      const n = Math.max(2, Math.floor(w / 3));
      windowPiece(b, -w / 2 + (w / n) * (k + 0.5), H1 + 0.9, 0.8, 1.0, shut, k % 2 ? fl : null, rng.next() < 0.6);
    }
    b.pop();
    b.push(0, 0, -dd / 2, Math.PI);
    windowPiece(b, 0, H1 + 0.9, 0.8, 1.0, shut, null, true);
    b.pop();
  }

  // degraus na porta
  b.box(0, -0.12, d / 2 + 0.55, 1.8, 0.25, 0.7, P(LAYER.STONE, COL.stone));

  // colisores do corpo e telhado escalonado (dá para pousar no telhado)
  if (!p.interior) {
    kit.box(b, 0, topY / 2, 0, w, topY, d, 'building', { walkable: true });
  } else if (p.floors === 2) {
    kit.box(b, 0, H1 + 0.16 + H2 / 2 + 0.2, 0, w, H2, dd, 'building', { walkable: true });
  }
  const steps = 3;
  for (let s = 0; s < steps; s++) {
    const f0 = s / steps;
    const f1 = (s + 1) / steps;
    const dep = (dd + 1.1) * (1 - f1);
    kit.box(b, 0, topY + rh * (f0 + f1) * 0.5, 0, w + 1, rh * (f1 - f0), Math.max(0.6, dep), 'building', { walkable: true });
  }
  // barris/caixotes junto à parede lateral
  if (rng.next() < 0.7) barrel(b, kit, w / 2 + 0.6, 0, d / 2 - 0.8, 0.9);
  if (rng.next() < 0.5) crate(b, kit, -w / 2 - 0.7, 0, -d / 2 + 0.9, 0.8, rng.next());
  return topY + rh;
}

/** Vigas de enxaimel nas 4 faces de um bloco (w × d) entre y0 e y0+h. `doorGap` evita a porta da frente. */
export function halfTimber(b: GeoBuilder, w: number, d: number, y0: number, h: number, rng: RNG, doorGap: number) {
  const beam = P(LAYER.WOOD, COL.timber);
  const o = 0.05;
  const faces: [number, number, number, number][] = [
    // [eixo largura, deslocamento normal, sinal, é frente]
    [w, d / 2, 0, 1],
    [w, d / 2, Math.PI, 0],
    [d, w / 2, Math.PI / 2, 0],
    [d, w / 2, -Math.PI / 2, 0],
  ];
  for (const [len, off, yaw, front] of faces) {
    b.push(0, y0, 0, yaw);
    b.push(0, 0, off + o, 0);
    b.box(0, 0.1, 0, len + 0.1, 0.2, 0.12, beam);
    b.box(0, h - 0.1, 0, len + 0.1, 0.2, 0.12, beam);
    b.box(-len / 2, h / 2, 0, 0.22, h, 0.14, beam);
    b.box(len / 2, h / 2, 0, 0.22, h, 0.14, beam);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let k = 1; k < n; k++) {
      const x = -len / 2 + (len * k) / n;
      if (front && doorGap > 0 && Math.abs(x) < doorGap) continue;
      b.box(x, h / 2, 0, 0.18, h - 0.2, 0.12, beam);
    }
    // diagonais nas pontas
    if (rng.next() < 0.8) {
      b.strut([-len / 2 + 0.1, 0.2, 0], [-len / 2 + Math.min(1.4, len / n), h - 0.2, 0], 0.14, beam);
      b.strut([len / 2 - 0.1, 0.2, 0], [len / 2 - Math.min(1.4, len / n), h - 0.2, 0], 0.14, beam);
    }
    b.pop();
    b.pop();
  }
}

/** Coluna clássica (fuste com anéis) — `broken` corta numa altura irregular. */
export function column(b: GeoBuilder, x: number, y: number, z: number, r: number, h: number, mat = P(LAYER.STONE, COL.stoneWarm), broken = 0) {
  const hh = broken > 0 ? h * (1 - broken) : h;
  b.box(x, y + 0.2, z, r * 2.6, 0.4, r * 2.6, mat);
  b.cylinder(x, y + 0.4, z, r, r * 0.88, hh - 0.4 - (broken > 0 ? 0 : 0.5), 10, mat, broken > 0);
  if (broken <= 0) {
    b.cylinder(x, y + h - 0.5, z, r * 0.9, r * 1.25, 0.3, 10, mat, false);
    b.box(x, y + h - 0.1, z, r * 2.7, 0.25, r * 2.7, mat);
  }
}

/** Tenda em A (lona sobre cumeeira ao longo de Z local). Porta em +Z. */
export function tent(b: GeoBuilder, kit: SiteKit | null, w: number, d: number, h: number, color: RGB) {
  const fab = P(LAYER.FABRIC, color);
  b.quad([-w / 2, 0, d / 2], [-w / 2, 0, -d / 2], [0, h, -d / 2], [0, h, d / 2], fab);
  b.quad([w / 2, 0, -d / 2], [w / 2, 0, d / 2], [0, h, d / 2], [0, h, -d / 2], fab);
  // por dentro (dupla face)
  b.quad([-w / 2 + 0.02, 0, -d / 2], [-w / 2 + 0.02, 0, d / 2], [0, h - 0.03, d / 2], [0, h - 0.03, -d / 2], P(LAYER.FABRIC, [color[0] * 0.6, color[1] * 0.6, color[2] * 0.6]));
  b.quad([w / 2 - 0.02, 0, d / 2], [w / 2 - 0.02, 0, -d / 2], [0, h - 0.03, -d / 2], [0, h - 0.03, d / 2], P(LAYER.FABRIC, [color[0] * 0.6, color[1] * 0.6, color[2] * 0.6]));
  b.tri([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [0, h, -d / 2], fab);
  // abas da porta
  b.tri([-w / 2, 0, d / 2], [-w * 0.15, 0, d / 2 + 0.3], [0, h, d / 2], fab);
  b.tri([w * 0.15, 0, d / 2 + 0.3], [w / 2, 0, d / 2], [0, h, d / 2], fab);
  const pole = P(LAYER.WOOD, COL.timber);
  b.box(0, h / 2, d / 2 + 0.05, 0.1, h + 0.3, 0.1, pole);
  b.box(0, h / 2, -d / 2 - 0.05, 0.1, h + 0.3, 0.1, pole);
  b.box(0, h + 0.02, 0, 0.08, 0.08, d + 0.4, pole);
  if (kit) {
    kit.box(b, 0, h * 0.3, -0.2, w * 0.85, h * 0.6, d - 0.4, 'prop', { walkable: false });
  }
}

/** Fogueira com pedras, lenha e chama emissiva. */
export function campfire(b: GeoBuilder, x: number, y: number, z: number, r = 1.1) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.box(x + Math.sin(a) * r, y + 0.12, z + Math.cos(a) * r, 0.42, 0.3, 0.34, P(LAYER.ROCK, [0.7, 0.68, 0.64]), a);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.strut([x + Math.sin(a) * r * 0.75, y + 0.08, z + Math.cos(a) * r * 0.75], [x + Math.sin(a) * 0.1, y + 0.75, z + Math.cos(a) * 0.1], 0.13, P(LAYER.LOG, [0.5, 0.4, 0.3]));
  }
  b.cone(x, y + 0.05, z, r * 0.55, 1.1, 5, P(LAYER.PLAIN, [1, 0.6, 0.2], EMIT.fire));
  b.cone(x + 0.15, y + 0.05, z - 0.1, r * 0.35, 0.8, 4, P(LAYER.PLAIN, [1, 0.8, 0.3], EMIT.fire), false, 0.7);
  b.disc(x, y + 0.04, z, r * 0.8, 8, P(LAYER.PLAIN, [0.35, 0.12, 0.05], EMIT.embers));
}

/** Tocha/braseiro em tripé de metal. */
export function brazier(b: GeoBuilder, kit: SiteKit | null, x: number, y: number, z: number, emit: readonly [number, number, number, number] = EMIT.fire) {
  const iron = P(LAYER.METAL, COL.iron);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.strut([x + Math.sin(a) * 0.45, y, z + Math.cos(a) * 0.45], [x + Math.sin(a) * 0.2, y + 1.1, z + Math.cos(a) * 0.2], 0.07, iron);
  }
  b.cylinder(x, y + 1.05, z, 0.25, 0.45, 0.3, 8, iron, false, true);
  // chama com a cor da emissão (fogo laranja, chama arcana azul...), núcleo mais claro
  const m = Math.max(emit[0], emit[1], emit[2], 1e-3);
  const flame: RGB = [0.35 + 0.65 * (emit[0] / m), 0.35 + 0.65 * (emit[1] / m), 0.35 + 0.65 * (emit[2] / m)];
  b.cone(x, y + 1.25, z, 0.32, 0.7, 5, P(LAYER.PLAIN, flame, emit));
  b.cone(x + 0.05, y + 1.25, z - 0.04, 0.16, 0.95, 4, P(LAYER.PLAIN, [1, 1, 0.95], [emit[0] * 0.6, emit[1] * 0.6, emit[2] * 0.6, emit[3]]), false, 0.8);
  if (kit) kit.cyl(b, x, y, z, 0.4, 1.3, 'prop');
}

/** Cristal (prisma hexagonal com ponta) — emissivo. */
export function crystal(b: GeoBuilder, x: number, y: number, z: number, r: number, h: number, color: RGB, emit: readonly [number, number, number, number], tiltX = 0, tiltZ = 0) {
  const tip = h * 0.28;
  const bx = x + tiltX * h;
  const bz = z + tiltZ * h;
  const mat = P(LAYER.CRYSTAL, color, emit);
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const p0: [number, number, number] = [x + Math.sin(a0) * r, y, z + Math.cos(a0) * r];
    const p1: [number, number, number] = [x + Math.sin(a1) * r, y, z + Math.cos(a1) * r];
    const q0: [number, number, number] = [x + (bx - x) * (1 - tip / h) + Math.sin(a0) * r * 0.92, y + h - tip, z + (bz - z) * (1 - tip / h) + Math.cos(a0) * r * 0.92];
    const q1: [number, number, number] = [x + (bx - x) * (1 - tip / h) + Math.sin(a1) * r * 0.92, y + h - tip, z + (bz - z) * (1 - tip / h) + Math.cos(a1) * r * 0.92];
    b.quad(p0, p1, q1, q0, mat);
    b.tri(q0, q1, [bx, y + h, bz], mat);
  }
}
