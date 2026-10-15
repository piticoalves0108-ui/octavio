import * as THREE from 'three';
import type { Entity } from '../core/Entity';

export type DamageType = 'physical' | 'arcane' | 'fire' | 'lightning' | 'void' | 'time' | 'frost';

export type StatusId =
  | 'slow' // reduz velocidade (magnitude = fração, ex 0.4)
  | 'timeSlow' // desacelera movimento E animações/ataques (Lâmina Temporal)
  | 'stun' // não age
  | 'root' // não se move, mas age (Correntes Arcanas)
  | 'burn' // dano por segundo (fogo)
  | 'shock' // dano por segundo pequeno + interrompe conjurações
  | 'bleed'
  | 'vulnerable' // recebe dano extra (magnitude = fração extra)
  | 'empowered' // causa dano extra
  | 'overheated'; // específico de constructos/chefes: ponto fraco exposto

export interface StatusApply {
  id: StatusId;
  duration: number;
  magnitude?: number;
  /** Chance 0..1 de aplicar (default 1). */
  chance?: number;
}

export interface DamageInfo {
  amount: number;
  type: DamageType;
  source?: Entity | null;
  /** Ponto de impacto no mundo (para VFX/knockback). */
  point?: THREE.Vector3;
  /** Direção de onde o golpe veio (normalizada). Se ausente, calculada a partir de source. */
  direction?: THREE.Vector3;
  knockback?: number;
  /** Dano de postura: quebra a "poise" e causa stagger. */
  poiseDamage?: number;
  statuses?: StatusApply[];
  crit?: boolean;
  /** Ignora bloqueio (ex.: agarrões, ataques "imbloqueáveis" anunciados em vermelho). */
  unblockable?: boolean;
  /** Golpe acertou um ponto fraco (multiplicador aplicado por quem chama). */
  weakPoint?: boolean;
  /** Identificador livre: 'melee', 'projectile', 'aoe', 'dot', ability id, weapon id... */
  tag?: string;
}

export interface DamageResult {
  dealt: number;
  absorbed: number; // por escudo
  blocked: boolean;
  parried: boolean;
  killed: boolean;
  staggered: boolean;
  immune: boolean;
}

interface ActiveStatus {
  remaining: number;
  magnitude: number;
  tick: number;
}

const DOT_INTERVAL = 0.5;

/**
 * Componente de vida / dano / estados. Regras puras — sem efeitos visuais.
 * O roteamento (eventos, números de dano, morte) é feito por Combat.applyDamage.
 */
export class Health {
  max: number;
  current: number;
  /** Regeneração por segundo, após `regenDelay` segundos sem tomar dano. */
  regen = 0;
  regenDelay = 4;
  private sinceDamage = 999;

  /** Redução por tipo (0.3 = -30% de dano; -0.5 = +50%, fraqueza). */
  resist: Partial<Record<DamageType, number>> = {};
  /** Redução plana aplicada ao dano físico. */
  armor = 0;

  /** Postura. Ao zerar, o alvo fica atordoado (stagger) por `staggerDuration`. */
  maxPoise = 30;
  poise = 30;
  poiseRegen = 15;
  staggerDuration = 1.0;
  staggerTimer = 0;

  /** Escudo que absorve dano antes da vida. */
  shield = 0;
  shieldMax = 0;
  shieldDecay = 0;

  /** Bloqueio frontal (defesa). */
  blocking = false;
  blockReduction = 0.7;
  /** cos do meio-ângulo do arco de bloqueio (0.3 ≈ 145°). */
  blockArcCos = 0.3;
  /** Janela de parry (s) após começar a bloquear; parry anula o dano e quebra a postura do atacante. */
  parryWindow = 0;

  /** Multiplicador geral de dano recebido (talentos, dificuldade...). */
  damageTakenMul = 1;
  invulnerable = 0; // segundos de i-frames
  immortal = false; // para cinemáticas/testes

  statuses = new Map<StatusId, ActiveStatus>();
  /** Imunidades a estados (chefes costumam ser imunes a stun/root). */
  statusImmune = new Set<StatusId>();

  constructor(max: number) {
    this.max = max;
    this.current = max;
  }

  get alive() {
    return this.current > 0;
  }
  get fraction() {
    return this.max > 0 ? this.current / this.max : 0;
  }
  get staggered() {
    return this.staggerTimer > 0;
  }

  /**
   * Calcula e aplica dano. `facing` é o vetor frontal do alvo (para bloqueio).
   */
  applyDamage(info: DamageInfo, facing?: THREE.Vector3): DamageResult {
    const res: DamageResult = { dealt: 0, absorbed: 0, blocked: false, parried: false, killed: false, staggered: false, immune: false };
    if (!this.alive) return res;
    if (this.invulnerable > 0) {
      res.immune = true;
      return res;
    }

    let amount = Math.max(0, info.amount);

    // Bloqueio frontal
    if (this.blocking && !info.unblockable && facing && info.direction) {
      // direction aponta do atacante para o alvo; bloqueia se vier "de frente".
      const dot = -(facing.x * info.direction.x + facing.z * info.direction.z);
      if (dot >= this.blockArcCos) {
        if (this.parryWindow > 0) {
          res.parried = true;
          res.blocked = true;
          return res;
        }
        res.blocked = true;
        amount *= 1 - this.blockReduction;
      }
    }

    // Resistências
    const r = this.resist[info.type] ?? 0;
    amount *= 1 - r;
    if (info.type === 'physical') amount = Math.max(amount * 0.25, amount - this.armor);
    const vul = this.statuses.get('vulnerable');
    if (vul) amount *= 1 + vul.magnitude;
    amount *= this.damageTakenMul;

    // Escudo
    if (this.shield > 0 && amount > 0) {
      const a = Math.min(this.shield, amount);
      this.shield -= a;
      amount -= a;
      res.absorbed = a;
    }

    amount = Math.round(amount * 10) / 10;
    if (this.immortal) amount = Math.min(amount, this.current - 1);
    this.current = Math.max(0, this.current - amount);
    res.dealt = amount;
    this.sinceDamage = 0;

    // Postura
    const poiseDmg = (info.poiseDamage ?? amount * 0.5) * (res.blocked ? 0.5 : 1);
    if (poiseDmg > 0 && this.staggerTimer <= 0) {
      this.poise -= poiseDmg;
      if (this.poise <= 0) {
        this.poise = this.maxPoise;
        this.staggerTimer = this.staggerDuration;
        res.staggered = true;
      }
    }

    // Estados
    if (info.statuses && this.current > 0) {
      for (const s of info.statuses) {
        if (s.chance !== undefined && Math.random() > s.chance) continue;
        this.addStatus(s.id, s.duration, s.magnitude ?? 0);
      }
    }

    if (this.current <= 0) res.killed = true;
    return res;
  }

  addStatus(id: StatusId, duration: number, magnitude = 0) {
    if (this.statusImmune.has(id)) return;
    const cur = this.statuses.get(id);
    if (cur) {
      cur.remaining = Math.max(cur.remaining, duration);
      cur.magnitude = Math.max(cur.magnitude, magnitude);
    } else {
      this.statuses.set(id, { remaining: duration, magnitude, tick: DOT_INTERVAL });
    }
  }

  has(id: StatusId) {
    return this.statuses.has(id);
  }
  statusMagnitude(id: StatusId) {
    return this.statuses.get(id)?.magnitude ?? 0;
  }
  clearStatus(id: StatusId) {
    this.statuses.delete(id);
  }

  heal(amount: number) {
    if (!this.alive) return 0;
    const before = this.current;
    this.current = Math.min(this.max, this.current + amount);
    return this.current - before;
  }

  /** Multiplicador de velocidade de deslocamento causado por estados. */
  moveMultiplier(): number {
    if (this.has('stun') || this.has('root') || this.staggered) return 0;
    let m = 1;
    if (this.has('slow')) m *= 1 - Math.min(0.9, this.statusMagnitude('slow') || 0.4);
    if (this.has('timeSlow')) m *= 1 - Math.min(0.9, this.statusMagnitude('timeSlow') || 0.5);
    return m;
  }

  /** Multiplicador de velocidade de ações (ataques/animações). */
  actionMultiplier(): number {
    if (this.has('timeSlow')) return 1 - Math.min(0.9, this.statusMagnitude('timeSlow') || 0.5);
    return 1;
  }

  canAct(): boolean {
    return this.alive && !this.has('stun') && !this.staggered;
  }

  /**
   * Avança timers. Retorna danos periódicos a serem aplicados (o chamador roteia
   * via Combat.applyDamage para gerar eventos/VFX).
   */
  update(dt: number, out?: DamageInfo[]): void {
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.parryWindow > 0) this.parryWindow -= dt;
    if (this.staggerTimer > 0) this.staggerTimer -= dt;
    this.sinceDamage += dt;
    if (this.alive && this.regen > 0 && this.sinceDamage > this.regenDelay) this.heal(this.regen * dt);
    if (this.poise < this.maxPoise && this.staggerTimer <= 0) this.poise = Math.min(this.maxPoise, this.poise + this.poiseRegen * dt);
    if (this.shield > 0 && this.shieldDecay > 0) this.shield = Math.max(0, this.shield - this.shieldDecay * dt);

    for (const [id, s] of this.statuses) {
      s.remaining -= dt;
      if (id === 'burn' || id === 'shock' || id === 'bleed') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick += DOT_INTERVAL;
          const type: DamageType = id === 'burn' ? 'fire' : id === 'shock' ? 'lightning' : 'physical';
          out?.push({ amount: (s.magnitude || 3) * DOT_INTERVAL, type, poiseDamage: 0, tag: 'dot' });
        }
      }
      if (s.remaining <= 0) this.statuses.delete(id);
    }
  }

  reset(max = this.max) {
    this.max = max;
    this.current = max;
    this.shield = 0;
    this.poise = this.maxPoise;
    this.staggerTimer = 0;
    this.statuses.clear();
    this.invulnerable = 0;
    this.sinceDamage = 999;
  }
}
