import { P, GeoBuilder } from './builder';
import type { SiteKit } from './kit';
import type { GateSystem } from './gates';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { CRYPT } from '../../data/places';
import { COL, EMIT, brazier, crystal } from './parts';

/**
 * Cripta do Despertar: pátio a céu aberto murado (o jogo começa aqui) com saída ao
 * norte, mausoléu semienterrado ao sul com porta de laje deslizante
 * ('porta_cripta'), sarcófago aberto, altar, mural rúnico e luz azul fraca.
 * Coordenadas locais = CRYPT.court / CRYPT.tomb (sem rotação).
 */
export function buildCrypt(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('cripta');
  const c = CRYPT.court;
  const t = CRYPT.tomb;
  const [, mx] = kit.groundRange(CRYPT.x, CRYPT.z - 3, 26, 40, 0);
  const floor = mx + 0.12;
  b.frame(CRYPT.x, floor, CRYPT.z, 0);
  const rng = new RNG(4401);
  const stone = P(LAYER.STONE, [0.78, 0.8, 0.82]);
  const dark = P(LAYER.STONE, COL.stoneDark);
  const moss = P(LAYER.MOSS, [0.7, 0.85, 0.6]);
  const rune = P(LAYER.RUNE, [0.85, 0.9, 1], EMIT.rune);

  // --- pátio: laje de lajotas + muros baixos arruinados ---
  const cw = c.x1 - c.x0;
  const cd = c.z1 - c.z0;
  const ccx = (c.x0 + c.x1) / 2;
  const ccz = (c.z0 + c.z1) / 2;
  b.box(ccx, -0.9, ccz, cw, 1.8, cd, P(LAYER.COBBLE, [0.8, 0.82, 0.8], undefined, 1.6), 0, 63 - 8);
  kit.box(b, ccx, -0.9, ccz, cw, 1.8, cd, 'platform', { surface: 'stone' });
  kit.footprint(b, ccx, ccz, cw + 2, cd + 2, 0, 1, 0.3);
  kit.surface(b, 'stone', ccx, ccz, cw, cd, floor - 3, floor + 8, 0, 'patio_cripta');
  // degraus para fora da saída
  for (let i = 0; i < 3; i++) {
    b.box(0, -0.3 - i * 0.3, c.z0 - 0.6 - i * 0.8, c.exitWidth + 1, 0.6, 0.8, stone);
    kit.box(b, 0, -0.3 - i * 0.3, c.z0 - 0.6 - i * 0.8, c.exitWidth + 1, 0.6, 0.8, 'platform', { surface: 'stone' });
  }
  const wallH = 2.6;
  const ruined = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 1.8));
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const h = wallH * (0.55 + 0.45 * rng.next());
      const x0 = ax + (bx - ax) * t0;
      const z0 = az + (bz - az) * t0;
      const x1 = ax + (bx - ax) * t1;
      const z1 = az + (bz - az) * t1;
      b.beam(x0, z0, x1, z1, -0.6, h, 0.7, stone);
      if (rng.next() < 0.5) b.beam(x0, z0, x1, z1, h - 0.02, h + 0.08, 0.75, moss, 4);
    }
    kit.wall(b, ax, az, bx, bz, -0.6, wallH, 0.7, 'wall', { walkable: true, surface: 'stone' });
  };
  ruined(c.x0, c.z1, c.x0, c.z0);
  ruined(c.x1, c.z0, c.x1, c.z1);
  ruined(c.x0, c.z0, -c.exitWidth / 2 - 0.8, c.z0);
  ruined(c.exitWidth / 2 + 0.8, c.z0, c.x1, c.z0);
  // obeliscos com runas flanqueando a saída
  for (const s of [-1, 1]) {
    const x = s * (c.exitWidth / 2 + 0.6);
    b.box(x, 0.4, c.z0, 1.3, 0.8, 1.3, dark);
    b.box(x, 2.4, c.z0, 0.8, 3.2, 0.8, stone);
    b.pyramid(x, 4.0, c.z0, 0.9, 0.9, 0.9, dark);
    b.push(x, 0, c.z0 - 0.41, 0);
    b.box(0, 2.4, 0, 0.5, 2.4, 0.02, rune, Math.PI);
    b.pop();
    kit.box(b, x, 2.2, c.z0, 1.3, 4.4, 1.3, 'prop', { walkable: false });
  }
  // braseiros de chama azul nos cantos
  for (const [x, z] of [
    [c.x0 + 1.4, c.z0 + 1.4],
    [c.x1 - 1.4, c.z0 + 1.4],
    [c.x0 + 1.4, c.z1 - 1.6],
    [c.x1 - 1.4, c.z1 - 1.6],
  ]) brazier(b, kit, x, 0, z, [0.35, 0.95, 2.4, 3]);
  // pedras caídas e musgo
  for (let i = 0; i < 9; i++) {
    const x = c.x0 + 1 + rng.next() * (cw - 2);
    const z = c.z0 + 1 + rng.next() * (cd - 3);
    if (Math.abs(x) < 3 && z < -3) continue;
    const s = 0.3 + rng.next() * 0.5;
    b.box(x, s / 2, z, s * 1.4, s, s, stone, rng.next() * 3);
  }
  // manchas de musgo irregulares entre as lajotas (aglomerados de discos baixos)
  const mossFloor = P(LAYER.MOSS, [0.46, 0.58, 0.36]);
  for (let i = 0; i < 12; i++) {
    const x = c.x0 + 1 + rng.next() * (cw - 2);
    const z = c.z0 + 1 + rng.next() * (cd - 2);
    const blobs = 3 + Math.floor(rng.next() * 4);
    for (let k = 0; k < blobs; k++) {
      const r = 0.18 + rng.next() * 0.42;
      b.cylinder(x + (rng.next() - 0.5) * 1.6, 0, z + (rng.next() - 0.5) * 1.6, r * 1.08, r, 0.025 + rng.next() * 0.03, 7, mossFloor, true, false, false, rng.next() * 6);
    }
  }

  // --- mausoléu ---
  const tw = t.x1 - t.x0;
  const td = t.z1 - t.z0;
  const tcz = (t.z0 + t.z1) / 2;
  const T = 0.8;
  const H = 4.8;
  const ceil = 4.2;
  // piso
  b.box(0, -0.1, tcz, tw - 2 * T, 0.2, td - 2 * T, P(LAYER.STONE, [0.62, 0.62, 0.66]), 0, 4);
  kit.box(b, 0, -0.5, tcz, tw, 1, td, 'platform', { surface: 'stone' });
  // paredes (frente com vão da porta)
  const dw = t.doorWidth;
  const dh = t.doorHeight;
  const side = (tw - dw) / 2;
  b.box(-tw / 2 + side / 2, H / 2 - 0.5, t.z0 + T / 2, side, H + 1, T, stone);
  b.box(tw / 2 - side / 2, H / 2 - 0.5, t.z0 + T / 2, side, H + 1, T, stone);
  b.box(0, dh + (H - dh) / 2, t.z0 + T / 2, dw, H - dh, T, stone);
  b.box(0, H / 2 - 0.5, t.z1 - T / 2, tw, H + 1, T, stone);
  b.box(t.x0 + T / 2, H / 2 - 0.5, tcz, T, H + 1, td - 2 * T, stone);
  b.box(t.x1 - T / 2, H / 2 - 0.5, tcz, T, H + 1, td - 2 * T, stone);
  kit.box(b, -tw / 2 + side / 2, H / 2, t.z0 + T / 2, side, H, T, 'building', { walkable: false });
  kit.box(b, tw / 2 - side / 2, H / 2, t.z0 + T / 2, side, H, T, 'building', { walkable: false });
  kit.box(b, 0, dh + (H - dh) / 2, t.z0 + T / 2, dw, H - dh, T, 'building', { walkable: false });
  kit.box(b, 0, H / 2, t.z1 - T / 2, tw, H, T, 'building', { walkable: false });
  kit.box(b, t.x0 + T / 2, H / 2, tcz, T, H, td, 'building', { walkable: false });
  kit.box(b, t.x1 - T / 2, H / 2, tcz, T, H, td, 'building', { walkable: false });
  // forro interno com runas e telhado em degraus
  b.box(0, ceil + 0.15, tcz, tw - 2 * T, 0.3, td - 2 * T, dark, 0, 8);
  b.box(0, H + 0.2, tcz, tw + 0.6, 0.4, td + 0.6, P(LAYER.STONE, COL.stoneWarm));
  b.box(0, H + 0.7, tcz, tw - 1.5, 0.6, td - 1.5, stone);
  b.pyramid(0, H + 1.0, tcz, tw - 3, td - 3, 2.4, moss);
  kit.box(b, 0, (ceil + H + 1.6) / 2, tcz, tw + 0.6, H + 1.6 - ceil, td + 0.6, 'building', { walkable: true, surface: 'stone' });
  kit.indoor(b, 'cripta_mausoleu', 0, tcz, tw - 2 * T, td - 2 * T, floor - 1, floor + ceil);
  kit.surface(b, 'stone', 0, tcz, tw, td, floor - 2, floor + ceil, 0, 'mausoleu');
  // pórtico: colunas e frontão sobre a porta
  for (const s of [-1, 1]) {
    b.cylinder(s * (dw / 2 + 0.9), 0, t.z0 - 0.5, 0.32, 0.28, dh + 0.6, 10, P(LAYER.STONE, COL.stone));
    kit.cyl(b, s * (dw / 2 + 0.9), 0, t.z0 - 0.5, 0.36, dh + 0.6, 'prop');
  }
  b.box(0, dh + 0.75, t.z0 - 0.45, dw + 3, 0.35, 1.3, P(LAYER.STONE, COL.stoneWarm));
  b.push(0, dh + 0.92, t.z0 - 1.1, Math.PI);
  b.tri([-(dw + 3) / 2, 0, 0], [(dw + 3) / 2, 0, 0], [0, 1.3, 0], P(LAYER.STONE, COL.stone));
  b.box(0, 0.5, 0.02, 0.9, 0.5, 0.02, rune);
  b.pop();
  // montes de terra e pedra nas laterais e fundos (semienterrado)
  const berm = (cx: number, cz: number, w: number, d: number, h: number) => {
    b.box(cx, h / 2 - 0.4, cz, w, h + 0.8, d, P(LAYER.ROCK, [0.6, 0.58, 0.52]));
    b.box(cx, h + 0.02, cz, w * 0.96, 0.08, d * 0.96, moss);
    kit.box(b, cx, h / 2 - 0.4, cz, w, h + 0.8, d, 'rock', { walkable: true, surface: 'grass' });
  };
  berm(t.x0 - 1.4, tcz + 0.8, 2.8, td - 1, 2.6);
  berm(t.x0 - 3.6, tcz + 1.2, 1.8, td - 3, 1.2);
  berm(t.x1 + 1.4, tcz + 0.8, 2.8, td - 1, 2.6);
  berm(t.x1 + 3.6, tcz + 1.2, 1.8, td - 3, 1.2);
  berm(0, t.z1 + 1.4, tw + 8.4, 2.8, 3.2);
  berm(0, t.z1 + 3.6, tw + 6, 1.8, 1.5);
  kit.footprint(b, 0, tcz + 2, tw + 12, td + 8, 0, 0.5, 0);

  // interior: sarcófago aberto, altar, mural, runas nas paredes
  const sx = 0;
  const sz = 8.6;
  b.box(sx, 0.55, sz, 1.6, 1.1, 2.8, P(LAYER.STONE, COL.stoneWarm));
  b.box(sx, 1.02, sz, 1.3, 0.06, 2.5, P(LAYER.PLAIN, [0.05, 0.05, 0.08]));
  b.box(sx + 0.9, 1.0, sz + 0.3, 1.7, 0.18, 2.9, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune), 0.35);
  kit.box(b, sx, 0.55, sz, 1.6, 1.1, 2.8, 'prop');
  b.box(0, 0.6, 11.9, 2.4, 1.2, 1.0, dark);
  b.box(0, 1.25, 11.9, 2.6, 0.1, 1.2, P(LAYER.RUNE, [0.9, 0.9, 1], EMIT.rune));
  crystal(b, 0, 1.3, 12.0, 0.22, 0.9, [0.6, 0.85, 1], EMIT.crystalBlue);
  kit.box(b, 0, 0.6, 11.9, 2.4, 1.2, 1.0, 'prop');
  kit.light(b, 0, 2.6, 10.4, 0x6aa8ff, 14, 13, 'always');
  // mural rúnico (âncora cripta_mural)
  b.push(t.x0 + T + 0.02, 0, 9, Math.PI / 2);
  b.box(0, 2.0, 0, 3.2, 2.2, 0.04, P(LAYER.RUNE, [0.85, 0.85, 1], EMIT.rune));
  b.pop();
  // faixas de runas nas paredes internas
  b.push(t.x1 - T - 0.02, 0, tcz, -Math.PI / 2);
  b.box(0, 3.3, 0, td - 2.5, 0.35, 0.04, rune);
  b.pop();
  b.push(0, 0, t.z1 - T - 0.02, Math.PI);
  b.box(0, 3.3, 0, tw - 2.5, 0.35, 0.04, rune);
  b.pop();
  // pilares internos
  for (const px of [-4.6, 4.6]) {
    for (const pz of [6, 11]) {
      b.box(px, ceil / 2, pz, 0.7, ceil, 0.7, P(LAYER.STONE, COL.stone));
      kit.box(b, px, ceil / 2, pz, 0.7, ceil, 0.7, 'prop', { walkable: false });
    }
  }

  // porta de laje deslizante ('porta_cripta', aberta por padrão): desliza para dentro da parede direita
  const lb = new GeoBuilder();
  lb.frame(0, 0, 0, 0);
  lb.box(0, dh / 2, 0, dw + 0.1, dh, 0.35, P(LAYER.STONE, [0.7, 0.72, 0.76]));
  lb.box(0, dh / 2, 0.18, 1.0, 1.0, 0.02, rune);
  const [gx, gy, gz] = b.toWorld(0, 0, t.z0 + T / 2);
  gates.addPart('porta_cripta', lb, gx, gy, gz, 0, { kind: 'slide', dx: dw + 0.3, dy: 0, dz: 0 });
  gates.addBlocker('porta_cripta', gx, gy + dh / 2, gz, dw / 2, dh / 2, T / 2, 0);
}
