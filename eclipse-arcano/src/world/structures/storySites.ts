import * as THREE from 'three';
import { P, type V3 } from './builder';
import type { SiteKit } from './kit';
import type { Collider } from '../Collision';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { Simplex2 } from '../../core/noise';
import { LOCATION_BY_ID } from '../../data/world';
import { SKY_CITADEL } from '../../data/storyBosses';
import { COL, EMIT, brazier, column, crystal } from './parts';

/**
 * Arenas dos Atos II a IV: Pico das Tempestades (menires e para-raios), Picos de Cristal
 * (agulhas e ninho), Coração do Pântano (ilha de raízes negras), Templo Submerso (colunas,
 * poças e selo dourado) e a Cidadela Celeste (ilha no céu, escondida até o Ato IV).
 */

const STORM_EMIT = [0.6, 1.4, 2.8, 2] as const;
const CORRUPT_EMIT = [1.6, 0.35, 2.6, 2] as const;

function site(id: string) {
  const l = LOCATION_BY_ID[id];
  return { x: l.x, z: l.z, y: l.flattenTo!, r: l.radius };
}

/** Pico das Tempestades: platô com anel de menires queimados, para-raios e um altar. */
function buildStormPeak(kit: SiteKit) {
  const S = site('pico_tempestades');
  const b = kit.g('pico_tempestades');
  const rng = new RNG(7710);
  b.frame(S.x, S.y, S.z, 0);
  const stone = P(LAYER.STONE, [0.62, 0.64, 0.7]);
  const dark = P(LAYER.ROCK, [0.42, 0.42, 0.48]);
  // chão de lajes com runas
  b.disc(0, 0.12, 0, S.r - 3, 28, P(LAYER.COBBLE, [0.6, 0.62, 0.66], undefined, 1.4));
  b.ring(0, 0.14, 0, 7, 7.6, 28, P(LAYER.RUNE, [0.8, 0.9, 1], STORM_EMIT));
  b.ring(0, 0.14, 0, S.r - 4.5, S.r - 4, 32, P(LAYER.RUNE, [0.8, 0.9, 1], STORM_EMIT));
  kit.disc(b, 0, 0, S.r, 0.2, 0.1);
  kit.surface(b, 'stone', 0, 0, S.r * 2, S.r * 2, S.y - 3, S.y + 30, 0, 'pico_tempestades');
  // menires (alguns tombados) com cicatrizes de raio
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.15;
    const r = S.r - 1.5;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 5 + rng.next() * 4;
    const broken = i % 4 === 3;
    b.push(x, 0, z, a);
    if (broken) {
      b.box(0, 0.6, 1.8, 1.4, 1.2, h * 0.8, dark, 0.2);
      kit.box(b, 0, 0.6, 1.8, 1.4, 1.2, h * 0.8, 'rock', { walkable: true, surface: 'stone' }, 0.2);
    } else {
      b.box(0, h / 2 - 0.3, 0, 1.5, h, 1.1, stone, (rng.next() - 0.5) * 0.15);
      b.box(0, h * 0.6, 0.56, 0.18, h * 0.5, 0.02, P(LAYER.RUNE, [0.8, 0.9, 1], STORM_EMIT));
      kit.box(b, 0, h / 2 - 0.3, 0, 1.5, h, 1.1, 'rock', { walkable: true, surface: 'stone' });
    }
    b.pop();
  }
  // para-raios: hastes de metal com cristal no topo
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * (S.r * 0.62);
    const z = Math.cos(a) * (S.r * 0.62);
    b.cylinder(x, 0, z, 0.25, 0.12, 9, 6, P(LAYER.METAL, COL.iron), false);
    crystal(b, x, 9, z, 0.3, 1.6, [0.7, 0.9, 1], STORM_EMIT);
    kit.cyl(b, x, 0, z, 0.35, 9, 'prop', { walkable: false });
  }
  // altar (onde repousa o Coração da Tempestade)
  b.box(0, 0.45, -9, 2.4, 0.9, 1.4, P(LAYER.RUNE, [0.85, 0.9, 1], STORM_EMIT));
  kit.box(b, 0, 0.45, -9, 2.4, 0.9, 1.4, 'prop', { walkable: true });
  kit.light(b, 0, 3, 0, 0x9fd8ff, 10, 26, 'always');
}

/** Picos de Cristal: agulhas gigantes em volta de um ninho de pedra, ossos e cristais. */
function buildCrystalPeaks(kit: SiteKit) {
  const S = site('picos_cristal');
  const b = kit.g('picos_cristal');
  const rng = new RNG(9911);
  b.frame(S.x, S.y, S.z, 0);
  b.disc(0, 0.1, 0, S.r - 2, 30, P(LAYER.ROCK, [0.55, 0.58, 0.66]));
  kit.disc(b, 0, 0, S.r, 0.1, 0.05);
  kit.surface(b, 'stone', 0, 0, S.r * 2, S.r * 2, S.y - 3, S.y + 40, 0, 'picos_cristal');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng.next() * 0.2;
    const r = S.r - 1 + rng.next() * 3;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 8 + rng.next() * 12;
    const rr = 1 + rng.next() * 1.2;
    crystal(b, x, -0.5, z, rr, h, [0.62, 0.86, 1], EMIT.crystalBlue, -Math.sin(a) * 0.08, -Math.cos(a) * 0.08);
    crystal(b, x + Math.cos(a) * 1.6, -0.5, z - Math.sin(a) * 1.6, rr * 0.5, h * 0.45, [0.75, 0.6, 1], EMIT.crystalPurple, Math.cos(a) * 0.2, -Math.sin(a) * 0.2);
    kit.cyl(b, x, -0.5, z, rr * 1.2, h * 0.7, 'rock', { walkable: false, climbable: true });
  }
  // ninho: anel de pedras, costelas de ossos e o Cristal Primordial
  const bone = P(LAYER.PLAIN, [0.9, 0.86, 0.78]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p0: V3 = [Math.sin(a) * 9, 0.1, Math.cos(a) * 9];
    const p1: V3 = [Math.sin(a) * 6.5, 3.2 + (i % 3) * 0.4, Math.cos(a) * 6.5];
    b.strut(p0, p1, 0.22, bone);
  }
  b.cylinder(0, 0, 4, 1.2, 1.4, 0.5, 10, P(LAYER.STONE, [0.7, 0.72, 0.8]), true);
  crystal(b, 0, 0.5, 4, 0.5, 2.6, [0.8, 0.98, 1], [0.9, 2.2, 3, 2]);
  kit.cyl(b, 0, 0, 4, 1.3, 0.5, 'platform', { surface: 'stone' });
  kit.light(b, 0, 4, 0, 0x9ff0ff, 12, 30, 'always');
}

/** Coração do Pântano: ilha de lama com raízes negras retorcidas e cristais corrompidos. */
function buildSwampHeart(kit: SiteKit) {
  const S = site('coracao_pantano');
  const b = kit.g('coracao_pantano');
  const rng = new RNG(6612);
  const noise = new Simplex2(661);
  b.frame(S.x, S.y, S.z, 0);
  b.disc(0, 0.05, 0, S.r - 2, 30, P(LAYER.ROCK, [0.22, 0.18, 0.22]));
  b.ring(0, 0.08, 0, 5, 5.5, 24, P(LAYER.RUNE, [0.7, 0.3, 0.9], CORRUPT_EMIT));
  b.ring(0, 0.08, 0, 13, 13.4, 28, P(LAYER.RUNE, [0.7, 0.3, 0.9], CORRUPT_EMIT));
  kit.disc(b, 0, 0, S.r, 0.6, 0);
  kit.surface(b, 'mud', 0, 0, S.r * 2, S.r * 2, S.y - 3, S.y + 20, 0, 'coracao_pantano');
  const root = P(LAYER.LOG, [0.22, 0.16, 0.2]);
  // raízes: arcos negros que saem do chão e voltam
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng.next() * 0.3;
    const r0 = S.r - 4 + rng.next() * 4;
    const r1 = r0 - 4 - rng.next() * 4;
    const h = 2 + rng.next() * 4;
    const pts: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const rr = r0 + (r1 - r0) * t;
      const aa = a + noise.noise(i, t * 2) * 0.25;
      pts.push([Math.sin(aa) * rr, Math.sin(t * Math.PI) * h - 0.3, Math.cos(aa) * rr]);
    }
    for (let k = 0; k < pts.length - 1; k++) b.strut(pts[k], pts[k + 1], 0.45 - k * 0.05, root);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const r = S.r - 6;
    crystal(b, Math.sin(a) * r, -0.3, Math.cos(a) * r, 0.7, 3 + rng.next() * 3, [0.6, 0.3, 0.9], CORRUPT_EMIT, rng.next() * 0.3 - 0.15, rng.next() * 0.3 - 0.15);
  }
  kit.light(b, 0, 3, 0, 0xb040ff, 9, 30, 'always');
}

/** Templo Submerso: piso de pedra antigo com colunas partidas, poças e o selo dourado. */
function buildSunkenTemple(kit: SiteKit) {
  const S = site('templo_submerso');
  const b = kit.g('templo_submerso');
  const rng = new RNG(5123);
  b.frame(S.x, S.y, S.z, 0);
  const old = P(LAYER.STONE, [0.62, 0.66, 0.58]);
  const moss = P(LAYER.MOSS, [0.5, 0.62, 0.42]);
  // plataforma baixa com degraus (a água do pântano lambe as bordas)
  const top = 0.5;
  b.cylinder(0, -1.5, 0, S.r - 2, S.r - 3, 1.5 + top, 32, old, false);
  b.disc(0, top, 0, S.r - 3, 32, P(LAYER.COBBLE, [0.6, 0.64, 0.56], undefined, 1.2));
  kit.cyl(b, 0, -1.5, 0, S.r - 2.5, 1.5 + top, 'platform', { surface: 'stone' });
  kit.disc(b, 0, 0, S.r, 0.1, 0);
  kit.surface(b, 'stone', 0, 0, S.r * 2, S.r * 2, S.y - 3, S.y + 25, 0, 'templo_submerso');
  // escadaria ao sul
  for (let k = 0; k < 4; k++) {
    b.box(0, top - 0.15 - k * 0.32, S.r - 2.6 + k * 1.1, 6, 0.3, 1.1, old);
    kit.box(b, 0, top - 0.15 - k * 0.32, S.r - 2.6 + k * 1.1, 6, 0.3, 1.1, 'platform', { surface: 'stone' });
  }
  // selo dourado no chão (sol de sete raios)
  b.ring(0, top + 0.02, 0, 6, 6.6, 32, P(LAYER.RUNE, [1, 0.9, 0.6], EMIT.gold));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.box(Math.sin(a) * 3.2, top + 0.025, Math.cos(a) * 3.2, 0.3, 0.02, 5, P(LAYER.RUNE, [1, 0.9, 0.6], EMIT.gold), a);
  }
  // colunas em anel (várias partidas) e arcos
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = S.r - 5;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const broken = i % 3 === 1 ? 0.35 + rng.next() * 0.4 : 0;
    column(b, x, top, z, 0.7, 9, old, broken);
    if (!broken) b.box(x, top + 7.4, z, 1.9, 0.5, 1.9, moss);
    kit.cyl(b, x, top, z, 0.9, 9 * (1 - broken), 'wall', { walkable: true, surface: 'stone' });
  }
  // selo da Primeira Era (altar ao norte)
  b.box(0, top + 0.6, -12, 3, 1.2, 1.6, P(LAYER.RUNE, [1, 0.92, 0.7], EMIT.gold));
  kit.box(b, 0, top + 0.6, -12, 3, 1.2, 1.6, 'prop', { walkable: true });
  for (const sx of [-1, 1]) brazier(b, kit, sx * 4.5, top, -12, EMIT.fire);
  kit.light(b, 0, 4, 0, 0xffd880, 10, 30, 'always');
}

/** Arena de duelo diante da Torre do Observador: círculo de runas no chão. */
function buildDuelCircle(kit: SiteKit) {
  const l = LOCATION_BY_ID['torre_observador'];
  const b = kit.g('torre_duelo');
  b.frame(l.x, l.flattenTo! + 0.06, l.z - 24, 0);
  b.ring(0, 0, 0, 11, 11.5, 36, P(LAYER.RUNE, [1, 0.6, 0.75], [2.2, 0.6, 1.2, 2]));
  b.ring(0, 0, 0, 4, 4.3, 24, P(LAYER.RUNE, [1, 0.6, 0.75], [2.2, 0.6, 1.2, 2]));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(Math.sin(a) * 7.7, 0.005, Math.cos(a) * 7.7, 0.25, 0.01, 6.6, P(LAYER.RUNE, [1, 0.6, 0.75], [2.2, 0.6, 1.2, 2]), a);
  }
}

/** Resultado da construção da Cidadela (escondida até o Ato IV). */
export interface CitadelParts {
  colliders: Collider[];
}

/**
 * Cidadela Celeste: grande ilha flutuante de mármore com colunata, escadarias, trono e o
 * Coração do Eclipse sobre um pedestal. Só se chega voando.
 */
function buildCitadel(kit: SiteKit): CitadelParts {
  const C = SKY_CITADEL;
  const b = kit.g('cidadela', Infinity, true);
  const start = kit.colliders.length;
  const noise = new Simplex2(4242);
  b.frame(C.x, C.y, C.z, 0);
  const marble = P(LAYER.STONE, [0.92, 0.9, 0.86]);
  const gold = P(LAYER.METAL, [0.95, 0.78, 0.4], EMIT.gold);
  const rock = P(LAYER.ROCK, [0.55, 0.52, 0.6]);
  const R = C.radius;
  // rocha pendente (cone irregular)
  const n = 40;
  const ring = (k: number, i: number): V3 => {
    const a = (i / n) * Math.PI * 2;
    const rs = [1, 0.85, 0.6, 0.3, 0.06][k];
    const d = [0, 6, 20, 40, 62][k];
    const wob = 1 + noise.noise(Math.cos(a) * 2 + k, Math.sin(a) * 2) * (k ? 0.15 : 0.03);
    return [Math.cos(a) * R * rs * wob, -d, Math.sin(a) * R * rs * wob];
  };
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < n; i++) {
      b.triPlanar(ring(k, i), ring(k + 1, i), ring(k + 1, i + 1), rock);
      b.triPlanar(ring(k, i), ring(k + 1, i + 1), ring(k, i + 1), rock);
    }
  }
  // piso de mármore com mosaico de eclipse
  b.disc(0, 0.25, 0, R, 48, marble);
  b.ring(0, 0.27, 0, R - 2, R - 1.4, 48, gold);
  b.ring(0, 0.27, 0, 14, 15, 40, P(LAYER.RUNE, [1, 0.7, 0.85], [2.4, 0.8, 1.4, 2]));
  b.disc(0, 0.26, 0, 9, 32, P(LAYER.STONE, [0.18, 0.12, 0.2]));
  kit.cyl(b, 0, -6, 0, R, 6.25, 'island', { walkable: true, surface: 'stone' });
  // colunata
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * (R - 4);
    const z = Math.sin(a) * (R - 4);
    const broken = i % 5 === 2 ? 0.45 : 0;
    column(b, x, 0.25, z, 0.9, 12, marble, broken);
    if (!broken) b.box(x, 12.4, z, 2.4, 0.4, 2.4, gold);
    kit.cyl(b, x, 0.25, z, 1.1, 12 * (1 - broken), 'wall', { walkable: true, surface: 'stone' });
  }
  // trono e o pedestal do Coração do Eclipse (ao norte)
  b.box(0, 1.2, -30, 6, 2, 4, marble);
  b.box(0, 4.5, -31.6, 4, 7, 0.8, marble);
  b.cone(0, 8, -31.6, 2.4, 3, 4, gold);
  kit.box(b, 0, 1.2, -30, 6, 2, 4, 'platform', { surface: 'stone' });
  b.cylinder(0, 0.25, -22, 1.6, 1.2, 1.2, 12, marble, true);
  b.addGeometry(new THREE.IcosahedronGeometry(1, 1), P(LAYER.CRYSTAL, [1, 0.5, 0.7], [3, 0.6, 1.6, 2]), 0, 2.6, -22, 1.1, 1.4, 1.1);
  kit.cyl(b, 0, 0.25, -22, 1.6, 1.2, 'prop', { walkable: true });
  // escadaria flutuante de degraus (enfeite) na borda sul
  for (let k = 0; k < 6; k++) {
    const z = R + 2 + k * 2.6;
    b.box(0, -0.4 - k * 1.2, z, 5 - k * 0.3, 0.5, 2, marble);
  }
  return { colliders: kit.colliders.slice(start) };
}

/** Constrói tudo; devolve as peças da Cidadela para o mundo esconder/mostrar. */
export function buildStorySites(kit: SiteKit): CitadelParts {
  buildStormPeak(kit);
  buildCrystalPeaks(kit);
  buildSwampHeart(kit);
  buildSunkenTemple(kit);
  buildDuelCircle(kit);
  return buildCitadel(kit);
}
