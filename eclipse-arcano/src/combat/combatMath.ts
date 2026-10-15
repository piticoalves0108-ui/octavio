/**
 * Funções puras do combate (sem three.js de cena, sem contexto): geometria de colisão
 * de projéteis/feixes, fórmulas de dano, carga, combos e geração de raios.
 * Testadas em tests/combat.math.test.ts.
 */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** Resultado reutilizável de `segmentVsCapsule`. */
export interface SegHit {
  /** Distância² mínima entre o segmento e o eixo da cápsula. */
  dist2: number;
  /** Parâmetro (0..1) do ponto mais próximo no segmento. */
  s: number;
  /** Parâmetro (0..1) ao longo do eixo da cápsula. */
  t: number;
}

const EPS = 1e-9;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Pontos mais próximos entre o segmento p0→p1 e o eixo vertical de uma cápsula
 * (base `b`, altura `h`). Escreve em `out` (sem alocar).
 */
export function segmentVsCapsule(p0: Vec3Like, p1: Vec3Like, b: Vec3Like, h: number, out: SegHit): SegHit {
  // segmento 1: P(s) = p0 + s*d1 ; segmento 2: Q(t) = b + t*d2, d2 = (0,h,0)
  const d1x = p1.x - p0.x;
  const d1y = p1.y - p0.y;
  const d1z = p1.z - p0.z;
  const rx = p0.x - b.x;
  const ry = p0.y - b.y;
  const rz = p0.z - b.z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z; // |d1|²
  const e = h * h; // |d2|²
  const f = ry * h; // d2·r
  let s: number;
  let t: number;
  if (a <= EPS && e <= EPS) {
    s = t = 0;
  } else if (a <= EPS) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz; // d1·r
    if (e <= EPS) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const bb = d1y * h; // d1·d2
      const denom = a * e - bb * bb;
      s = denom > EPS ? clamp01((bb * f - c * e) / denom) : 0;
      t = (bb * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((bb - c) / a);
      }
    }
  }
  const px = p0.x + d1x * s - b.x;
  const py = p0.y + d1y * s - (b.y + h * t);
  const pz = p0.z + d1z * s - b.z;
  out.dist2 = px * px + py * py + pz * pz;
  out.s = s;
  out.t = t;
  return out;
}

/** Distância² de um ponto a um segmento; `outS` recebe o parâmetro do ponto mais próximo. */
export function pointSegmentDist2(p: Vec3Like, a: Vec3Like, b: Vec3Like): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const l2 = abx * abx + aby * aby + abz * abz;
  let s = 0;
  if (l2 > EPS) s = clamp01(((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2);
  const dx = a.x + abx * s - p.x;
  const dy = a.y + aby * s - p.y;
  const dz = a.z + abz * s - p.z;
  return dx * dx + dy * dy + dz * dz;
}

// =====================================================================
// Dano
// =====================================================================
export interface DamageRoll {
  amount: number;
  crit: boolean;
}

/**
 * Dano de um golpe/disparo do jogador:
 * base × poder (meleePower/spellPower) × aprimoramento × multiplicador do golpe, com crítico.
 * `roll` é um número 0..1 (Math.random() em jogo; fixo nos testes).
 */
export function rollDamage(base: number, power: number, upgradeMul: number, hitMul: number, critChance: number, critMul: number, roll: number, out: DamageRoll = { amount: 0, crit: false }): DamageRoll {
  const crit = roll < Math.max(0, Math.min(1, critChance));
  out.crit = crit;
  out.amount = Math.max(0, base * power * upgradeMul * hitMul * (crit ? Math.max(1, critMul) : 1));
  return out;
}

/** Recarga efetiva: base × (1 − redução, limitada a 50%) × multiplicador (ex.: Forma Ascendente). */
export function effectiveCooldown(base: number, cooldownReduction: number, mul = 1): number {
  const cdr = Math.max(0, Math.min(0.5, cooldownReduction || 0));
  return Math.max(0, base * (1 - cdr) * mul);
}

/** Fração de carga (0..1) de um botão segurado por `held` s, com limiar e tempo de carga. */
export function chargeFraction(held: number, threshold: number, chargeTime: number): number {
  if (held <= threshold) return 0;
  if (chargeTime <= 0) return 1;
  return clamp01((held - threshold) / chargeTime);
}

/** Interpola entre mínimo e máximo pela carga. */
export function chargedValue(min: number, max: number, charge: number): number {
  return min + (max - min) * clamp01(charge);
}

/**
 * Próximo golpe do combo.
 * - `last`: índice do último golpe executado (-1 = nenhum);
 * - `sinceEnd`: tempo desde o fim do último golpe (negativo = ainda em andamento);
 * - `window`: janela de continuação após o fim.
 * Fora da janela (ou depois do último golpe), recomeça do 0.
 */
export function nextComboStep(last: number, sinceEnd: number, window: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  if (last < 0 || last >= stepCount - 1) return 0;
  if (sinceEnd > window) return 0;
  return last + 1;
}

/** Carga Arcana ganha por dano causado (limitada ao máximo). */
export function addUltimateCharge(current: number, damage: number, perDamage: number, max: number): number {
  if (!(damage > 0)) return current;
  return Math.min(max, current + damage * perDamage);
}

// =====================================================================
// Raios (geração de polilinha irregular com ramificações)
// =====================================================================
/** Gerador pseudoaleatório simples (determinístico para testes). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pontos de um raio de `a` até `b` (deslocamento do ponto médio). Escreve em `out` como
 * [x0,y0,z0,x1,y1,z1,...] e retorna o número de pontos. `jitter` é a fração do comprimento.
 */
export function lightningPoints(a: Vec3Like, b: Vec3Like, segments: number, jitter: number, rnd: () => number, out: number[]): number {
  const n = Math.max(1, Math.floor(segments));
  out.length = 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  // base ortonormal perpendicular ao raio
  let ux = -dz;
  let uy = 0;
  let uz = dx;
  let ul = Math.sqrt(ux * ux + uz * uz);
  if (ul < 1e-6) {
    ux = 1;
    uz = 0;
    ul = 1;
  }
  ux /= ul;
  uz /= ul;
  // v = (d/len) × u
  const fx = dx / len;
  const fy = dy / len;
  const fz = dz / len;
  const vx = fy * uz - fz * uy;
  const vy = fz * ux - fx * uz;
  const vz = fx * uy - fy * ux;
  const amp = len * jitter;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // envelope: zero nas pontas, máximo no meio
    const env = i === 0 || i === n ? 0 : Math.sin(t * Math.PI) * (0.6 + 0.4 * rnd());
    const o1 = (rnd() * 2 - 1) * amp * env;
    const o2 = (rnd() * 2 - 1) * amp * env;
    out.push(a.x + dx * t + ux * o1 + vx * o2, a.y + dy * t + uy * o1 + vy * o2, a.z + dz * t + uz * o1 + vz * o2);
  }
  return n + 1;
}
