/**
 * Ícones da interface desenhados em SVG (procedurais, sem arquivos externos).
 * Todos usam viewBox 0 0 64 64. A cor principal vem por parâmetro.
 */
import type { ItemIconShape } from '../data/items';
import type { LocationKind } from '../data/world';
import type { WeatherKind } from '../core/EventBus';

const svg = (body: string, extra = '') => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;

/** Contorno escuro padrão para leitura sobre qualquer fundo. */
const STROKE = 'stroke="#0b0a14" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';

function shade(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function hexToCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

const ITEM_SHAPES: Record<ItemIconShape, (c: string, l: string, d: string) => string> = {
  staff: (c, l) =>
    `<path d="M18 56 L44 16" ${STROKE} stroke="#0b0a14" stroke-width="7"/><path d="M18 56 L44 16" stroke="#8a6440" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="46" cy="13" r="8" fill="${c}" ${STROKE}/><circle cx="44" cy="11" r="3" fill="${l}"/>` +
    `<path d="M38 20 q-4 -10 6 -14 M54 15 q4 -9 -6 -11" fill="none" stroke="#c9a46a" stroke-width="2.5"/>`,
  sword: (c, l) =>
    `<path d="M46 8 L54 10 L56 18 L28 46 L18 36 Z" fill="${l}" ${STROKE}/><path d="M50 13 L25 40" stroke="${c}" stroke-width="2"/>` +
    `<path d="M14 32 L32 50" ${STROKE} stroke-width="7"/><path d="M14 32 L32 50" stroke="#c9a46a" stroke-width="4"/>` +
    `<path d="M22 44 L12 54" ${STROKE} stroke-width="8"/><path d="M22 44 L12 54" stroke="#6b4a2e" stroke-width="5"/><circle cx="10" cy="56" r="4" fill="${c}" ${STROKE}/>`,
  dagger: (c, l) =>
    `<path d="M44 12 L50 14 L34 40 L28 36 Z" fill="${l}" ${STROKE}/><path d="M20 34 L36 44" ${STROKE} stroke-width="6"/><path d="M20 34 L36 44" stroke="${c}" stroke-width="3"/>` +
    `<path d="M28 42 L18 54" ${STROKE} stroke-width="7"/><path d="M28 42 L18 54" stroke="#5a3e28" stroke-width="4"/>`,
  spear: (c, l) =>
    `<path d="M14 56 L44 18" ${STROKE} stroke-width="6"/><path d="M14 56 L44 18" stroke="#7a5a38" stroke-width="3"/>` +
    `<path d="M40 22 L52 6 L48 24 Z" fill="${l}" ${STROKE}/><path d="M38 24 l8 4" stroke="${c}" stroke-width="3"/>`,
  gauntlet: (c, l, d) =>
    `<path d="M18 52 L18 30 Q18 20 26 20 L44 20 Q50 20 50 28 L50 44 Q50 52 42 54 Z" fill="${d}" ${STROKE}/>` +
    `<path d="M24 20 L24 10 M32 20 L32 8 M40 20 L40 10" ${STROKE} stroke-width="7"/><path d="M24 20 L24 10 M32 20 L32 8 M40 20 L40 10" stroke="${d}" stroke-width="4"/>` +
    `<circle cx="34" cy="36" r="7" fill="${c}" ${STROKE}/><circle cx="32" cy="34" r="2.5" fill="${l}"/>`,
  orb: (c, l, d) =>
    `<circle cx="32" cy="30" r="16" fill="${c}" ${STROKE}/><circle cx="27" cy="25" r="5" fill="${l}"/><path d="M20 48 L44 48 L40 56 L24 56 Z" fill="${d}" ${STROKE}/>`,
  potion: (c, l) =>
    `<path d="M26 8 L38 8 L38 20 Q50 26 50 40 Q50 56 32 56 Q14 56 14 40 Q14 26 26 20 Z" fill="#cfe6ff" fill-opacity=".35" ${STROKE}/>` +
    `<path d="M17 38 Q32 32 47 38 Q48 53 32 53 Q16 53 17 38 Z" fill="${c}"/><circle cx="25" cy="42" r="3" fill="${l}"/><rect x="24" y="4" width="16" height="6" rx="2" fill="#8a6440" ${STROKE}/>`,
  flask: (c, l) =>
    `<path d="M27 6 L37 6 L37 22 L50 50 Q52 56 46 56 L18 56 Q12 56 14 50 L27 22 Z" fill="#cfe6ff" fill-opacity=".35" ${STROKE}/>` +
    `<path d="M20 40 L44 40 L49 51 Q50 54 46 54 L18 54 Q14 54 15 51 Z" fill="${c}"/><circle cx="30" cy="46" r="2.5" fill="${l}"/>`,
  crystal: (c, l, d) =>
    `<path d="M32 4 L46 22 L40 56 L24 56 L18 22 Z" fill="${c}" ${STROKE}/><path d="M32 4 L32 56 M18 22 L46 22" stroke="${d}" stroke-width="2"/><path d="M24 22 L32 6 L30 22 Z" fill="${l}"/>`,
  ore: (c, l, d) =>
    `<path d="M10 46 L18 24 L34 14 L52 24 L56 44 L40 56 L18 56 Z" fill="${d}" ${STROKE}/><path d="M22 30 L30 26 L32 34 Z M38 36 L46 32 L46 42 Z M26 44 L32 42 L30 50 Z" fill="${c}"/><path d="M34 14 L30 24" stroke="${l}" stroke-width="2"/>`,
  herb: (c, l, d) =>
    `<path d="M32 58 Q30 40 34 22" fill="none" stroke="${d}" stroke-width="3.5"/>` +
    `<path d="M32 40 Q16 38 12 24 Q28 22 32 40 Z M33 32 Q46 30 52 16 Q36 14 33 32 Z M34 22 Q30 10 36 4 Q42 12 34 22 Z" fill="${c}" ${STROKE}/><circle cx="36" cy="10" r="3" fill="${l}"/>`,
  leather: (c, l, d) =>
    `<path d="M14 14 Q24 18 32 12 Q40 18 50 14 L54 50 Q42 46 32 52 Q22 46 10 50 Z" fill="${c}" ${STROKE}/><path d="M18 20 L46 20 M16 44 L48 44" stroke="${d}" stroke-width="2" stroke-dasharray="3 3"/><path d="M22 30 Q32 26 42 30" stroke="${l}" stroke-width="2" fill="none"/>`,
  gear: (c, l, d) =>
    `<path d="M28 4 h8 l2 8 l6 3 l7 -4 l6 6 l-4 7 l3 6 l8 2 v8 l-8 2 l-3 6 l4 7 l-6 6 l-7 -4 l-6 3 l-2 8 h-8 l-2 -8 l-6 -3 l-7 4 l-6 -6 l4 -7 l-3 -6 l-8 -2 v-8 l8 -2 l3 -6 l-4 -7 l6 -6 l7 4 l6 -3 Z" fill="${c}" ${STROKE}/><circle cx="32" cy="32" r="9" fill="${d}" ${STROKE}/><circle cx="29" cy="29" r="2.5" fill="${l}"/>`,
  core: (c, l, d) =>
    `<circle cx="32" cy="32" r="22" fill="${d}" ${STROKE}/><circle cx="32" cy="32" r="13" fill="${c}"/><circle cx="32" cy="32" r="6" fill="${l}"/><path d="M32 6 v8 M32 50 v8 M6 32 h8 M50 32 h8" ${STROKE}/>`,
  shard: (c, l, d) =>
    `<path d="M22 6 L44 18 L50 46 L30 58 L14 34 Z" fill="${c}" ${STROKE}/><path d="M22 6 L30 30 L50 46 M30 30 L14 34" stroke="${d}" stroke-width="2" fill="none"/><path d="M24 12 L28 26 L18 30 Z" fill="${l}"/>`,
  key: (c, l, d) =>
    `<circle cx="20" cy="20" r="12" fill="${c}" ${STROKE}/><circle cx="20" cy="20" r="5" fill="${d}"/><path d="M28 28 L54 54 M44 44 L50 38 M50 50 L56 44" ${STROKE} stroke-width="7"/><path d="M28 28 L54 54 M44 44 L50 38 M50 50 L56 44" stroke="${c}" stroke-width="4"/><circle cx="16" cy="16" r="2" fill="${l}"/>`,
  hammer: (c, l, d) =>
    `<path d="M30 30 L12 52" ${STROKE} stroke-width="8"/><path d="M30 30 L12 52" stroke="#7a5a38" stroke-width="5"/><path d="M22 18 L38 6 L56 26 L42 38 Z" fill="${c}" ${STROKE}/><path d="M28 16 L46 34" stroke="${d}" stroke-width="2"/><path d="M38 8 L52 24" stroke="${l}" stroke-width="2"/>`,
  scroll: (c, l, d) =>
    `<rect x="14" y="10" width="36" height="44" rx="3" fill="${c}" ${STROKE}/><rect x="10" y="6" width="44" height="8" rx="4" fill="${d}" ${STROKE}/><rect x="10" y="50" width="44" height="8" rx="4" fill="${d}" ${STROKE}/><path d="M20 22 h24 M20 30 h20 M20 38 h24" stroke="#6a5a3a" stroke-width="2"/><circle cx="40" cy="44" r="3" fill="${l}"/>`,
  letter: (c, _l, d) =>
    `<rect x="8" y="16" width="48" height="34" rx="3" fill="${c}" ${STROKE}/><path d="M8 18 L32 36 L56 18" fill="none" stroke="${d}" stroke-width="2.5"/><circle cx="32" cy="36" r="5" fill="#c0392b" ${STROKE}/>`,
  amulet: (c, l, d) =>
    `<path d="M16 6 Q32 30 48 6" fill="none" stroke="#c9a46a" stroke-width="3"/><path d="M32 26 L46 40 L32 58 L18 40 Z" fill="${c}" ${STROKE}/><path d="M32 26 L32 58 M18 40 L46 40" stroke="${d}" stroke-width="1.5"/><circle cx="28" cy="36" r="3" fill="${l}"/>`,
  ring: (c, l) =>
    `<ellipse cx="32" cy="38" rx="18" ry="14" fill="none" stroke="#0b0a14" stroke-width="10"/><ellipse cx="32" cy="38" rx="18" ry="14" fill="none" stroke="#d8b25a" stroke-width="6"/><path d="M24 22 L32 12 L40 22 L32 28 Z" fill="${c}" ${STROKE}/><circle cx="30" cy="19" r="2" fill="${l}"/>`,
  robe: (c, l, d) =>
    `<path d="M22 6 L42 6 L50 16 L58 26 L50 32 L46 26 L48 58 L16 58 L18 26 L14 32 L6 26 L14 16 Z" fill="${c}" ${STROKE}/><path d="M32 8 L32 58" stroke="${d}" stroke-width="2"/><path d="M26 6 L32 16 L38 6" fill="none" stroke="${l}" stroke-width="2.5"/><circle cx="32" cy="30" r="4" fill="${l}"/>`,
  coin: (_c, l) =>
    `<circle cx="32" cy="32" r="22" fill="#e8b84a" ${STROKE}/><circle cx="32" cy="32" r="15" fill="none" stroke="#a87a1e" stroke-width="2.5"/><path d="M32 22 L36 30 L44 32 L36 34 L32 42 L28 34 L20 32 L28 30 Z" fill="#fff2b8"/><circle cx="24" cy="22" r="3" fill="${l}" opacity=".7"/>`,
  apple: (c, l, d) =>
    `<path d="M32 18 Q44 10 52 20 Q60 34 50 48 Q42 58 32 52 Q22 58 14 48 Q4 34 12 20 Q20 10 32 18 Z" fill="${c}" ${STROKE}/>` +
    `<path d="M32 18 Q30 10 34 4" fill="none" stroke="#5a3e28" stroke-width="3.5"/><path d="M34 10 Q44 4 48 10 Q40 16 34 10 Z" fill="#6ac84a" ${STROKE}/>` +
    `<path d="M20 26 Q18 34 22 40" fill="none" stroke="${l}" stroke-width="3" stroke-linecap="round"/><path d="M32 52 L32 46" stroke="${d}" stroke-width="2"/>`,
  mushroom: (c, l, d) =>
    `<path d="M24 34 L22 54 Q32 58 42 54 L40 34 Z" fill="#efe2c8" ${STROKE}/>` +
    `<path d="M6 34 Q8 10 32 8 Q56 10 58 34 Q32 40 6 34 Z" fill="${c}" ${STROKE}/>` +
    `<circle cx="20" cy="22" r="4" fill="${l}"/><circle cx="36" cy="16" r="3" fill="${l}"/><circle cx="46" cy="26" r="3.5" fill="${l}"/><path d="M14 33 Q32 37 50 33" fill="none" stroke="${d}" stroke-width="2"/>`,
  meat: (c, l, d) =>
    `<path d="M44 8 L56 20 L50 26 L38 14 Z" fill="#efe2c8" ${STROKE}/><circle cx="54" cy="10" r="5" fill="#efe2c8" ${STROKE}/>` +
    `<path d="M40 18 Q52 30 42 44 Q30 60 14 52 Q4 44 12 30 Q22 14 40 18 Z" fill="${c}" ${STROKE}/>` +
    `<path d="M18 36 Q26 28 36 30" fill="none" stroke="${l}" stroke-width="3" stroke-linecap="round"/><path d="M16 46 Q24 50 34 44" fill="none" stroke="${d}" stroke-width="2"/>`,
  berries: (c, l, d) =>
    `<path d="M30 14 Q34 6 44 6" fill="none" stroke="#3a7a2a" stroke-width="3"/><path d="M34 10 Q24 4 18 10 Q26 16 34 10 Z" fill="#6ac84a" ${STROKE}/>` +
    `<circle cx="24" cy="30" r="9" fill="${c}" ${STROKE}/><circle cx="40" cy="28" r="9" fill="${c}" ${STROKE}/><circle cx="32" cy="44" r="10" fill="${c}" ${STROKE}/><circle cx="18" cy="46" r="7" fill="${d}" ${STROKE}/>` +
    `<circle cx="21" cy="27" r="2.5" fill="${l}"/><circle cx="37" cy="25" r="2.5" fill="${l}"/><circle cx="29" cy="41" r="2.5" fill="${l}"/>`,
  dish: (c, l, d) =>
    `<ellipse cx="32" cy="44" rx="28" ry="12" fill="#e6e2d8" ${STROKE}/><ellipse cx="32" cy="42" rx="20" ry="7" fill="#cfc8b8"/>` +
    `<path d="M14 40 Q16 22 32 20 Q48 22 50 40 Q32 46 14 40 Z" fill="${c}" ${STROKE}/><path d="M22 30 Q30 24 40 28" fill="none" stroke="${l}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M24 16 Q22 10 26 6 M34 14 Q32 8 36 4 M42 16 Q40 10 44 6" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/><circle cx="40" cy="36" r="3" fill="${d}"/>`,
  bowl: (c, l, d) =>
    `<path d="M8 30 L56 30 Q56 54 32 56 Q8 54 8 30 Z" fill="#8a6440" ${STROKE}/><ellipse cx="32" cy="30" rx="24" ry="7" fill="${c}" ${STROKE}/>` +
    `<circle cx="24" cy="30" r="3" fill="${l}"/><circle cx="38" cy="29" r="2.5" fill="${d}"/>` +
    `<path d="M22 20 Q20 14 24 10 M32 18 Q30 12 34 8 M42 20 Q40 14 44 10" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/>`,
};

export function itemIcon(shape: ItemIconShape, color: string): string {
  const fn = ITEM_SHAPES[shape] ?? ITEM_SHAPES.shard;
  return svg(fn(color, shade(color, 0.55), shade(color, -0.45)));
}

// ---------------------------------------------------------------------------
// Habilidades
// ---------------------------------------------------------------------------

const ABILITY_SHAPES: Record<string, (c: string, l: string) => string> = {
  orb: (c, l) => `<circle cx="32" cy="32" r="14" fill="${c}"/><circle cx="32" cy="32" r="20" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 5"/><circle cx="27" cy="27" r="5" fill="${l}"/>`,
  lance: (c, l) => `<path d="M8 56 L48 16" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M42 10 L58 6 L54 22 Z" fill="${l}"/><path d="M14 40 L24 50 M22 32 L32 42" stroke="${l}" stroke-width="2"/>`,
  blast: (c, l) =>
    `<path d="M32 4 L37 22 L54 12 L44 28 L60 34 L42 38 L50 56 L34 44 L24 60 L24 42 L6 46 L18 32 L4 20 L22 22 Z" fill="${c}"/><circle cx="32" cy="32" r="8" fill="${l}"/>`,
  chains: (c, l) =>
    `<ellipse cx="20" cy="32" rx="11" ry="7" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="44" cy="32" rx="11" ry="7" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="32" cy="32" rx="6" ry="10" fill="none" stroke="${l}" stroke-width="4"/>`,
  shield: (c, l) => `<path d="M32 6 L54 14 Q54 42 32 58 Q10 42 10 14 Z" fill="${c}"/><path d="M32 14 L46 19 Q46 38 32 50 Z" fill="${l}" opacity=".6"/>`,
  blink: (c, l) =>
    `<circle cx="16" cy="40" r="7" fill="${c}" opacity=".45"/><circle cx="28" cy="34" r="6" fill="${c}" opacity=".7"/><circle cx="46" cy="24" r="10" fill="${c}"/><circle cx="43" cy="21" r="3.5" fill="${l}"/><path d="M8 50 Q30 40 52 14" fill="none" stroke="${l}" stroke-width="2" stroke-dasharray="3 4"/>`,
  storm: (c, l) =>
    `<path d="M14 26 Q14 14 28 14 Q34 6 44 12 Q56 12 54 26 Z" fill="${c}" opacity=".85"/><path d="M34 26 L24 42 L32 42 L26 58 L44 36 L36 36 L42 26 Z" fill="${l}"/>`,
  blades: (c, l) =>
    `<path d="M32 4 L38 26 L32 32 L26 26 Z M60 32 L38 38 L32 32 L38 26 Z M32 60 L26 38 L32 32 L38 38 Z M4 32 L26 26 L32 32 L26 38 Z" fill="${c}"/><circle cx="32" cy="32" r="5" fill="${l}"/>`,
  rift: (c, l) =>
    `<ellipse cx="32" cy="32" rx="22" ry="14" fill="#120822"/><ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="${c}" stroke-width="4"/><path d="M14 32 Q32 18 50 32 Q32 46 14 32" fill="none" stroke="${l}" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="${l}"/>`,
  ascend: (c, l) =>
    `<path d="M32 4 L40 24 L60 24 L44 36 L50 58 L32 44 L14 58 L20 36 L4 24 L24 24 Z" fill="${c}"/><circle cx="32" cy="32" r="7" fill="${l}"/>`,
};

export function abilityIcon(icon: string, color: number): string {
  const c = hexToCss(color);
  const fn = ABILITY_SHAPES[icon] ?? ABILITY_SHAPES.orb;
  return svg(fn(c, shade(c, 0.65)));
}

// ---------------------------------------------------------------------------
// Mapa
// ---------------------------------------------------------------------------

const LOCATION_SHAPES: Record<LocationKind, string> = {
  settlement: `<path d="M10 54 V30 L22 18 L34 30 V54 Z M30 54 V26 L44 12 L58 26 V54 Z" fill="currentColor" ${STROKE}/><rect x="18" y="40" width="7" height="14" fill="#0b0a14"/><rect x="40" y="38" width="8" height="16" fill="#0b0a14"/>`,
  dungeon: `<path d="M8 56 V30 Q8 10 32 10 Q56 10 56 30 V56 Z" fill="currentColor" ${STROKE}/><path d="M20 56 V36 Q20 24 32 24 Q44 24 44 36 V56 Z" fill="#0b0a14"/>`,
  ruins: `<path d="M8 56 h48 M14 56 V20 h8 v36 M30 56 V28 h8 v28 M44 56 V14 h8 v16 l-8 4 Z" fill="currentColor" ${STROKE}/>`,
  landmark: `<path d="M32 6 L42 30 L56 34 L42 40 L32 58 L22 40 L8 34 L22 30 Z" fill="currentColor" ${STROKE}/>`,
  camp: `<path d="M6 54 L32 12 L58 54 Z" fill="currentColor" ${STROKE}/><path d="M32 54 L24 54 L32 34 L40 54 Z" fill="#0b0a14"/><path d="M32 12 L32 4 L42 8 L32 10" fill="currentColor" ${STROKE}/>`,
  tower: `<path d="M22 56 L24 18 L20 18 L20 8 L26 8 L26 12 L30 12 L30 8 L34 8 L34 12 L38 12 L38 8 L44 8 L44 18 L40 18 L42 56 Z" fill="currentColor" ${STROKE}/><rect x="29" y="26" width="6" height="9" fill="#0b0a14"/>`,
  region: `<path d="M6 50 L22 22 L32 36 L42 18 L58 50 Z" fill="currentColor" ${STROKE}/>`,
  secret: `<circle cx="32" cy="32" r="22" fill="currentColor" ${STROKE}/><text x="32" y="44" text-anchor="middle" font-size="32" font-weight="700" fill="#0b0a14" font-family="serif">?</text>`,
  arena: `<circle cx="32" cy="32" r="22" fill="currentColor" ${STROKE}/><path d="M20 20 L44 44 M44 20 L20 44" stroke="#0b0a14" stroke-width="6" stroke-linecap="round"/>`,
};

export function locationIcon(kind: LocationKind): string {
  return svg(LOCATION_SHAPES[kind] ?? LOCATION_SHAPES.landmark);
}

export type PinShape = 'pin' | 'star' | 'skull' | 'chest' | 'herb' | 'eye';
const PIN_SHAPES: Record<PinShape, string> = {
  pin: `<path d="M32 60 Q12 36 12 24 A20 20 0 0 1 52 24 Q52 36 32 60 Z" fill="currentColor" ${STROKE}/><circle cx="32" cy="24" r="7" fill="#0b0a14"/>`,
  star: `<path d="M32 4 L40 24 L60 24 L44 36 L50 58 L32 44 L14 58 L20 36 L4 24 L24 24 Z" fill="currentColor" ${STROKE}/>`,
  skull: `<path d="M12 30 Q12 8 32 8 Q52 8 52 30 Q52 40 44 44 L44 54 L20 54 L20 44 Q12 40 12 30 Z" fill="currentColor" ${STROKE}/><circle cx="24" cy="30" r="6" fill="#0b0a14"/><circle cx="40" cy="30" r="6" fill="#0b0a14"/><path d="M28 54 V46 M36 54 V46" stroke="#0b0a14" stroke-width="3"/>`,
  chest: `<path d="M8 28 Q8 12 32 12 Q56 12 56 28 V54 H8 Z" fill="currentColor" ${STROKE}/><path d="M8 30 H56" stroke="#0b0a14" stroke-width="3"/><rect x="27" y="26" width="10" height="12" rx="2" fill="#0b0a14"/>`,
  herb: `<path d="M32 58 Q30 40 34 22" fill="none" stroke="#0b0a14" stroke-width="4"/><path d="M32 40 Q16 38 12 24 Q28 22 32 40 Z M33 32 Q46 30 52 16 Q36 14 33 32 Z M34 22 Q30 10 36 4 Q42 12 34 22 Z" fill="currentColor" ${STROKE}/>`,
  eye: `<path d="M4 32 Q32 6 60 32 Q32 58 4 32 Z" fill="currentColor" ${STROKE}/><circle cx="32" cy="32" r="10" fill="#0b0a14"/><circle cx="29" cy="29" r="3" fill="currentColor"/>`,
};

export function pinIcon(shape: PinShape): string {
  return svg(PIN_SHAPES[shape] ?? PIN_SHAPES.pin);
}

/** Losango de objetivo de missão. */
export function questDiamond(main: boolean): string {
  const c = main ? '#ffd36a' : '#7fe6ff';
  return svg(`<path d="M32 4 L58 32 L32 60 L6 32 Z" fill="${c}" ${STROKE}/><path d="M32 16 L46 32 L32 48 L18 32 Z" fill="#0b0a14" opacity=".35"/>`);
}

/** Seta do jogador (aponta para cima = para onde ele olha). */
export function playerArrow(): string {
  return svg(`<path d="M32 4 L54 56 L32 44 L10 56 Z" fill="#ffffff" stroke="#0b0a14" stroke-width="4" stroke-linejoin="round"/><path d="M32 12 L32 42" stroke="#58d8ff" stroke-width="3"/>`);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export function weatherIcon(w: WeatherKind, night: boolean): string {
  const sun = night
    ? `<path d="M38 10 A20 20 0 1 0 54 40 A16 16 0 1 1 38 10 Z" fill="#dfe8ff"/>`
    : `<circle cx="30" cy="28" r="11" fill="#ffd36a"/><path d="M30 6 v6 M30 44 v6 M8 28 h6 M46 28 h6 M14 12 l4 4 M42 40 l4 4 M14 44 l4 -4 M42 16 l4 -4" stroke="#ffd36a" stroke-width="3" stroke-linecap="round"/>`;
  const cloud = (y = 0, c = '#e8eef8') => `<path d="M16 ${48 + y} Q6 ${48 + y} 8 ${38 + y} Q10 ${30 + y} 20 ${32 + y} Q24 ${20 + y} 38 ${24 + y} Q52 ${22 + y} 54 ${36 + y} Q62 ${38 + y} 58 ${48 + y} Z" fill="${c}"/>`;
  switch (w) {
    case 'clear':
      return svg(night ? sun : sun.replace(/cx="30" cy="28"/, 'cx="32" cy="32"'));
    case 'cloudy':
      return svg(sun + cloud(4));
    case 'rain':
      return svg(cloud(-6, '#b8c4d8') + `<path d="M20 48 l-4 10 M32 48 l-4 10 M44 48 l-4 10" stroke="#7fc8ff" stroke-width="3" stroke-linecap="round"/>`);
    case 'storm':
      return svg(cloud(-8, '#8a94a8') + `<path d="M34 40 L26 52 L32 52 L28 62 L42 48 L36 48 L40 40 Z" fill="#ffe66a"/>`);
    case 'fog':
      return svg(`<path d="M8 22 h40 M14 32 h44 M6 42 h40 M16 52 h36" stroke="#d8dee8" stroke-width="5" stroke-linecap="round"/>`);
  }
}

export const TONE_INFO: Record<string, { label: string; color: string; glyph: string }> = {
  compassivo: { label: 'Compassivo', color: '#7fe6a8', glyph: '♥' },
  pragmatico: { label: 'Pragmático', color: '#ffd36a', glyph: '⚖' },
  arrogante: { label: 'Arrogante', color: '#ff7a6a', glyph: '♛' },
  curioso: { label: 'Curioso', color: '#7fc8ff', glyph: '?' },
};

export function heartIcon(): string {
  return svg(`<path d="M32 56 Q6 38 6 22 Q6 8 20 8 Q28 8 32 16 Q36 8 44 8 Q58 8 58 22 Q58 38 32 56 Z" fill="#ff4a5a" ${STROKE}/><path d="M16 18 Q18 12 24 13" stroke="#ffc0c6" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}

export function goldIcon(): string {
  return itemIcon('coin', '#ffd36a');
}

export function keyCapIcon(label: string): string {
  return `<span class="ui-key">${label}</span>`;
}
