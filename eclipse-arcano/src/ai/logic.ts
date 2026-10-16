/**
 * Lógica pura da IA (sem three.js) — testável em tests/ai.*.test.ts:
 * escolha ponderada de ataques com anti-repetição e adaptação, tokens de ataque,
 * rastreador do estilo do jogador, mira balística e testes de percepção.
 */
import type { AttackDef } from '../data/enemies';

// ---------------------------------------------------------------------------
// Escolha de ataque
// ---------------------------------------------------------------------------
export interface AttackChoiceContext {
  /** Distância horizontal até o alvo. */
  dist: number;
  /** Altura do alvo acima do atacante (m). */
  heightDiff: number;
  /** Tem linha de visão. */
  los: boolean;
  /** Viés de bloqueio do jogador (0..1): favorece imbloqueáveis/quebra-guarda. */
  blockBias: number;
  /** Viés de luta à distância (0..1): favorece ataques que fecham distância. */
  rangedBias: number;
  /** Último ataque usado e quantas vezes seguidas. */
  lastId: string | null;
  repeat: number;
  /** O atacante voa (ignora restrição de altura). */
  flyer?: boolean;
  random: () => number;
}

/** Peso efetivo de um ataque no contexto (0 = indisponível). Exportado para testes. */
export function attackWeight(a: AttackDef, cooldown: number, c: AttackChoiceContext): number {
  if (a.comboOnly || a.counterOnly || a.kind === 'buff' || a.kind === 'special') return 0;
  if (cooldown > 0) return 0;
  if (c.dist < a.minRange || c.dist > a.maxRange) return 0;
  const reachesUp = a.kind === 'projectile' || a.kind === 'dive' || c.flyer;
  if (!reachesUp && c.heightDiff > 2.6) return 0;
  if (a.kind === 'projectile' && !c.los) return 0;
  let w = a.weight;
  if (w <= 0) return 0;
  if (a.unblockable || a.guardBreak) w *= 1 + 2.5 * c.blockBias;
  const closer = a.kind === 'leap' || a.kind === 'charge' || (a.lunge ?? 0) >= 2;
  if (closer && c.dist > 4) w *= 1 + 2 * c.rangedBias;
  if (c.lastId === a.id) w *= Math.pow(0.35, Math.max(1, c.repeat));
  return w;
}

/** Índice do ataque escolhido (ou -1). `cooldowns[i]` > 0 = em recarga. */
export function chooseAttack(attacks: readonly AttackDef[], cooldowns: ArrayLike<number>, c: AttackChoiceContext): number {
  let total = 0;
  for (let i = 0; i < attacks.length; i++) total += attackWeight(attacks[i], cooldowns[i], c);
  if (total <= 0) return -1;
  let r = c.random() * total;
  for (let i = 0; i < attacks.length; i++) {
    const w = attackWeight(attacks[i], cooldowns[i], c);
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return i;
  }
  for (let i = attacks.length - 1; i >= 0; i--) if (attackWeight(attacks[i], cooldowns[i], c) > 0) return i;
  return -1;
}

/** Ataques usam token corpo a corpo? (padrão: melee/leap/charge) */
export function needsMeleeToken(a: AttackDef): boolean {
  if (a.token !== undefined) return a.token && a.kind !== 'projectile';
  return a.kind === 'melee' || a.kind === 'leap' || a.kind === 'charge';
}

// ---------------------------------------------------------------------------
// Tokens de ataque (coordenação: no máx. N atacantes simultâneos por alvo)
// ---------------------------------------------------------------------------
export type TokenKind = 'melee' | 'ranged';

interface TokenEntry {
  target: number;
  kind: TokenKind;
  since: number;
}

export class AttackTokens {
  private byAttacker = new Map<number, TokenEntry>();
  constructor(public caps: Record<TokenKind, number>) {}

  /** Pede (ou renova) o token. Retorna false se o alvo já tem atacantes demais. */
  request(attacker: number, target: number, kind: TokenKind, now: number): boolean {
    const cur = this.byAttacker.get(attacker);
    if (cur && cur.target === target && cur.kind === kind) return true;
    if (this.count(target, kind) >= this.caps[kind]) return false;
    if (cur) {
      cur.target = target;
      cur.kind = kind;
      cur.since = now;
    } else this.byAttacker.set(attacker, { target, kind, since: now });
    return true;
  }

  release(attacker: number) {
    this.byAttacker.delete(attacker);
  }

  holds(attacker: number, kind?: TokenKind): boolean {
    const e = this.byAttacker.get(attacker);
    return !!e && (kind === undefined || e.kind === kind);
  }

  count(target: number, kind: TokenKind): number {
    let n = 0;
    for (const e of this.byAttacker.values()) if (e.target === target && e.kind === kind) n++;
    return n;
  }

  /** Remove tokens antigos (atacante travado/morto sem devolver). */
  expire(now: number, timeout: number, alive?: (attacker: number) => boolean) {
    for (const [id, e] of this.byAttacker) if (now - e.since > timeout || (alive && !alive(id))) this.byAttacker.delete(id);
  }

  /** Renova o carimbo de tempo (atacante ainda está atacando). */
  touch(attacker: number, now: number) {
    const e = this.byAttacker.get(attacker);
    if (e) e.since = now;
  }

  clear() {
    this.byAttacker.clear();
  }

  get size() {
    return this.byAttacker.size;
  }
}

// ---------------------------------------------------------------------------
// Adaptação ao estilo do jogador
// ---------------------------------------------------------------------------
export interface AdaptParams {
  decay: number;
  blockGain: number;
  rangedGain: number;
  repeatGain: number;
  repeatDecay: number;
}

export class PlayerStyle {
  /** 0..1: o jogador bloqueia muito. */
  block = 0;
  /** 0..1: o jogador luta de longe conjurando. */
  ranged = 0;
  private repeats = new Map<string, number>();
  lastAbility: string | null = null;
  lastAbilityAt = -99;
  constructor(private p: AdaptParams) {}

  /** Golpe de inimigo atingiu o jogador (bloqueado ou não). */
  onEnemyHit(blocked: boolean) {
    this.block = clamp01(this.block + (blocked ? this.p.blockGain : -this.p.blockGain * 0.4));
  }
  /** Jogador conjurou/atirou a `dist` m do inimigo mais próximo engajado. */
  onPlayerRanged(id: string, dist: number, now: number) {
    this.ranged = clamp01(this.ranged + (dist > 8 ? this.p.rangedGain : -this.p.rangedGain * 0.5));
    const r = (this.repeats.get(id) ?? 0) + this.p.repeatGain;
    // outras habilidades esfriam
    for (const [k, v] of this.repeats) if (k !== id) this.repeats.set(k, Math.max(0, v - this.p.repeatGain * 0.5));
    this.repeats.set(id, Math.min(1, r));
    this.lastAbility = id;
    this.lastAbilityAt = now;
  }
  /** Golpe corpo a corpo do jogador. */
  onPlayerMelee() {
    this.ranged = clamp01(this.ranged - this.p.rangedGain * 0.6);
  }
  /** 0..1: quanto o jogador repete esta habilidade. */
  repeatOf(id: string | null): number {
    return id ? this.repeats.get(id) ?? 0 : 0;
  }
  decay(dt: number) {
    const d = this.p.decay * dt;
    this.block = Math.max(0, this.block - d);
    this.ranged = Math.max(0, this.ranged - d);
    for (const [k, v] of this.repeats) {
      const nv = v - this.p.repeatDecay * dt;
      if (nv <= 0) this.repeats.delete(k);
      else this.repeats.set(k, nv);
    }
  }
  reset() {
    this.block = 0;
    this.ranged = 0;
    this.repeats.clear();
    this.lastAbility = null;
    this.lastAbilityAt = -99;
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------------------------------------------------------------------------
// Mira e percepção
// ---------------------------------------------------------------------------
/**
 * Ângulo de elevação (rad) para acertar um alvo a `dx` m na horizontal e `dy` m acima,
 * com velocidade `v` e gravidade `g` (trajetória baixa). null se fora de alcance.
 */
export function ballisticPitch(dx: number, dy: number, v: number, g: number): number | null {
  if (g <= 0) return Math.atan2(dy, dx);
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
  if (disc < 0) return null;
  return Math.atan2(v2 - Math.sqrt(disc), g * dx);
}

/** Tempo de voo aproximado (s) até `dx` m na horizontal com elevação `pitch`. */
export function flightTime(dx: number, v: number, pitch: number): number {
  return dx / Math.max(0.1, v * Math.cos(pitch));
}

/** O ponto (dx,dz) está no cone de visão (frente fx,fz normalizada, cos do meio-ângulo)? */
export function inViewCone(fx: number, fz: number, dx: number, dz: number, cosHalf: number): boolean {
  const l = Math.hypot(dx, dz);
  if (l < 1e-4) return true;
  return (fx * dx + fz * dz) / l >= cosHalf;
}

/**
 * Aproximação mais próxima de um projétil (posição relativa r, velocidade v) num horizonte:
 * retorna { t, d2 } (tempo do ponto mais próximo e distância² nesse instante).
 */
export function closestApproach(rx: number, ry: number, rz: number, vx: number, vy: number, vz: number, horizon: number, out: { t: number; d2: number }) {
  const vv = vx * vx + vy * vy + vz * vz;
  let t = vv > 1e-6 ? -(rx * vx + ry * vy + rz * vz) / vv : 0;
  if (t < 0) t = 0;
  if (t > horizon) t = horizon;
  const px = rx + vx * t;
  const py = ry + vy * t;
  const pz = rz + vz * t;
  out.t = t;
  out.d2 = px * px + py * py + pz * pz;
  return out;
}

/** Sorteio inteiro uniforme em [min, max]. */
export function randInt(min: number, max: number, random: () => number = Math.random) {
  return Math.floor(min + random() * (max - min + 1));
}

/** Horário dentro de uma janela [a, b) (com virada da meia-noite). */
export function hourIn(h: number, a: number, b: number) {
  return a <= b ? h >= a && h < b : h >= a || h < b;
}
