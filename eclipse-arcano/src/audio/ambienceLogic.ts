/**
 * Lógica pura da ambiência: a partir do lugar (bioma, proximidades), do horário e
 * do clima, calcula os níveis-alvo das camadas contínuas e as taxas dos sons
 * pontuais. Sem WebAudio — testado em tests/audio.ambience.test.ts.
 */
import { AMBIENCE, type ReverbSpace } from './data';
import { clamp01, smooth01 } from './audioMath';

export interface AmbienceInputs {
  biome: string;
  /** Altura sobre o chão (m). */
  altitude: number;
  /** Altura absoluta (m). */
  height: number;
  /** 0 = dia, 1 = noite. */
  night: number;
  hour: number;
  /** 0..1 */
  rain: number;
  /** 0..2 */
  wind: number;
  /** 0..1 rajada */
  gust: number;
  indoors: boolean;
  /** Interior grande/pétreo (cripta). */
  crypt: boolean;
  /** Interior com gente (taverna). */
  tavern: boolean;
  /** Proximidades 0..1. */
  water: number;
  village: number;
  forge: number;
  ruins: number;
  swamp: number;
  corruption: number;
  flying: boolean;
  /** Menu principal (ambiência mais baixa). */
  menu: boolean;
}

export interface AmbienceTargets {
  wind: number;
  /** Uivo/assobio do vento (montanha/altitude). */
  howl: number;
  rain: number;
  /** Chuva ouvida de dentro (abafada). */
  rainMuffled: number;
  water: number;
  swamp: number;
  hum: number;
  corruption: number;
  crowd: number;
  crickets: number;
  cave: number;
  /** Taxas (eventos/s). */
  birdRate: number;
  owlRate: number;
  frogRate: number;
  bubbleRate: number;
  hammerRate: number;
  crackleRate: number;
  howlRate: number;
  dripRate: number;
  gustRate: number;
  space: ReverbSpace;
}

export function emptyTargets(): AmbienceTargets {
  return {
    wind: 0,
    howl: 0,
    rain: 0,
    rainMuffled: 0,
    water: 0,
    swamp: 0,
    hum: 0,
    corruption: 0,
    crowd: 0,
    crickets: 0,
    cave: 0,
    birdRate: 0,
    owlRate: 0,
    frogRate: 0,
    bubbleRate: 0,
    hammerRate: 0,
    crackleRate: 0,
    howlRate: 0,
    dripRate: 0,
    gustRate: 0,
    space: 'outdoor',
  };
}

/** Densidade de pássaros por bioma (0..1). */
const BIRDS: Record<string, number> = { forest: 1, meadow: 0.7, village: 0.4, shore: 0.45, swamp: 0.15, ruins: 0.2, mountain: 0.1, rocky: 0.15, corrupted: 0.03 };
/** Densidade de insetos noturnos por bioma (0..1). */
const INSECTS: Record<string, number> = { forest: 0.9, meadow: 1, village: 0.6, shore: 0.5, swamp: 0.7, ruins: 0.3, mountain: 0.1, rocky: 0.2, corrupted: 0.1 };

/** Preenche `out` com os alvos para `i` (sem alocar). */
export function ambienceTargets(i: AmbienceInputs, out: AmbienceTargets = emptyTargets()): AmbienceTargets {
  const day = 1 - clamp01(i.night);
  const rain = clamp01(i.rain);
  const alt = smooth01(AMBIENCE.altitudeStart, AMBIENCE.altitudeFull, i.altitude);
  const mountain = i.biome === 'mountain' || i.biome === 'rocky' ? 1 : 0;
  const high = smooth01(140, 260, i.height);
  const inside = i.indoors ? 1 : 0;
  const outside = 1 - inside;
  // o chão "silencia" a vida quando se voa alto
  const groundLife = outside * (1 - alt * 0.9);

  // vento: base + força do clima + altitude/montanha + rajadas
  const windBase = 0.12 + 0.28 * Math.min(2, i.wind) + 0.15 * i.gust;
  out.wind = clamp01((windBase + 0.45 * alt + 0.3 * mountain + 0.2 * high) * (outside + inside * 0.12));
  out.howl = clamp01((Math.max(mountain * 0.6, alt, high) * (0.5 + 0.4 * Math.min(2, i.wind)) + rain * 0.15) * outside);
  out.gustRate = AMBIENCE.gustRate * clamp01(0.3 + i.wind * 0.5 + alt) * outside;

  // chuva: fora cheia; dentro, só o "telhado" abafado
  out.rain = rain * outside;
  out.rainMuffled = rain * inside * (i.crypt ? 0.25 : 0.8);

  out.water = clamp01(i.water) * (outside + inside * 0.1) * (1 - alt * 0.85);
  out.swamp = clamp01(i.swamp) * groundLife;
  out.hum = clamp01(i.ruins) * (1 - alt * 0.7);
  out.corruption = clamp01(i.corruption) * (1 - alt * 0.5);
  out.cave = i.crypt ? 1 : 0;

  // vila: burburinho de dia (pouco à noite e na chuva); taverna sempre cheia
  const crowdDay = 0.35 + 0.65 * day;
  out.crowd = i.tavern ? 0.9 : clamp01(i.village) * crowdDay * (1 - rain * 0.6) * groundLife;

  const birds = BIRDS[i.biome] ?? 0.2;
  const insects = INSECTS[i.biome] ?? 0.3;
  out.birdRate = AMBIENCE.birdRate * birds * smooth01(0.2, 0.8, day) * (1 - rain * 0.9) * groundLife;
  out.crickets = insects * smooth01(0.3, 0.9, i.night) * (1 - rain * 0.75) * groundLife;
  out.owlRate = AMBIENCE.owlRate * (i.biome === 'forest' ? 1 : i.biome === 'meadow' || i.biome === 'village' ? 0.3 : 0.1) * smooth01(0.5, 1, i.night) * (1 - rain) * groundLife;
  out.frogRate = AMBIENCE.frogRate * Math.max(clamp01(i.swamp) * (0.4 + 0.6 * i.night), clamp01(i.water) * 0.3 * i.night) * (1 - rain * 0.3) * groundLife;
  out.bubbleRate = AMBIENCE.bubbleRate * clamp01(i.swamp) * groundLife;
  const [h0, h1] = AMBIENCE.forgeHours;
  const working = i.hour >= h0 && i.hour <= h1 ? 1 : 0;
  out.hammerRate = AMBIENCE.hammerRate * clamp01(i.forge) * working * (1 - alt);
  out.crackleRate = AMBIENCE.crackleRate * clamp01(i.ruins) * (0.5 + rain * 0.5) * (1 - alt);
  out.howlRate = AMBIENCE.howlRate * smooth01(0.6, 1, i.night) * (i.biome === 'forest' || mountain ? 1 : 0.3) * outside;
  out.dripRate = AMBIENCE.dripRate * (i.crypt ? 1 : 0) + AMBIENCE.dripRate * 0.4 * rain * inside;

  // ambiência do menu: tudo mais baixo
  if (i.menu) {
    out.wind *= 0.5;
    out.crowd *= 0.5;
    out.rain *= 0.6;
    out.birdRate *= 0.5;
    out.hammerRate *= 0.4;
  }

  out.space = i.crypt ? 'crypt' : i.indoors ? 'indoor' : i.biome === 'ruins' || i.ruins > 0.6 ? 'ruins' : i.village > 0.5 ? 'village' : mountain || alt > 0.5 ? 'mountain' : i.biome === 'forest' ? 'forest' : 'outdoor';
  return out;
}

/** Proximidade 0..1 a um ponto: 1 até `near`, 0 a partir de `far`. */
export function proximity(dist: number, near: number, far: number): number {
  return 1 - smooth01(near, far, dist);
}

/**
 * Escolhe um instante de disparo por processo de Poisson: retorna o intervalo
 * até o próximo evento para a taxa `rate` (eventos/s) e `u` uniforme em (0,1].
 */
export function nextInterval(rate: number, u: number): number {
  if (!(rate > 1e-5)) return Infinity;
  return -Math.log(Math.max(1e-6, u)) / rate;
}
