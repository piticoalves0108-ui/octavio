/**
 * Lógica pura de locomoção (sem three.js / sem contexto), testável em vitest.
 */
import { FALL_DAMAGE, FLIGHT, JUMP } from '../data/player';

/** Vetor 2D mutável no plano XZ. */
export interface V2 {
  x: number;
  z: number;
}

/** Aproxima `current` de `target` sem ultrapassar, no máximo `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

/**
 * Acelera a velocidade horizontal `vel` em direção a `wish * targetSpeed`.
 * Usa `accel` quando ganha velocidade (ou muda de direção) e `decel` ao frear.
 * Mudanças bruscas de direção usam aceleração reforçada (responsivo, sem "patinar").
 */
export function accelerateXZ(vel: V2, wishX: number, wishZ: number, targetSpeed: number, accel: number, decel: number, dt: number): V2 {
  const tx = wishX * targetSpeed;
  const tz = wishZ * targetSpeed;
  const dx = tx - vel.x;
  const dz = tz - vel.z;
  const dl = Math.hypot(dx, dz);
  if (dl < 1e-6) return vel;
  const curSpeed = Math.hypot(vel.x, vel.z);
  let rate: number;
  if (targetSpeed < 1e-3) rate = decel;
  else {
    // componente contrária à velocidade atual (curva fechada / inversão) acelera mais
    const dot = curSpeed > 1e-3 ? (vel.x * wishX + vel.z * wishZ) / curSpeed : 1;
    rate = targetSpeed >= curSpeed ? accel : decel;
    if (dot < 0.5) rate *= 1.6;
  }
  const step = Math.min(dl, rate * dt);
  vel.x += (dx / dl) * step;
  vel.z += (dz / dl) * step;
  return vel;
}

/** Dano de queda (nunca mata: deixa ao menos 1 de vida). */
export function fallDamage(impactSpeed: number, maxHealth: number, currentHealth: number): number {
  if (impactSpeed <= FALL_DAMAGE.minSpeed) return 0;
  const raw = (impactSpeed - FALL_DAMAGE.minSpeed) * FALL_DAMAGE.perSpeed;
  const capped = Math.min(raw, maxHealth * FALL_DAMAGE.maxFraction);
  return Math.max(0, Math.min(capped, currentHealth - 1));
}

/** Custo de energia do voo neste passo. */
export function flightEnergyCost(dt: number, moving: boolean, boosting: boolean, climbing: boolean, costMul: number): number {
  let c = boosting ? FLIGHT.costBoost : moving ? FLIGHT.costCruise : FLIGHT.costHover;
  if (climbing) c += FLIGHT.costClimb;
  return c * costMul * dt;
}

/**
 * Pulo com tolerâncias: "coyote time" (pular logo depois de sair da borda)
 * e "buffer" (pulo apertado pouco antes de tocar o chão ainda vale).
 */
export class JumpAssist {
  private sinceGrounded = 999;
  private sincePressed = 999;
  coyote = JUMP.coyoteTime;
  buffer = JUMP.bufferTime;

  /** Chamar todo frame. */
  tick(dt: number, grounded: boolean, pressed: boolean) {
    this.sinceGrounded = grounded ? 0 : this.sinceGrounded + dt;
    this.sincePressed = pressed ? 0 : this.sincePressed + dt;
  }
  /** Há um pulo válido agora? (consome o pedido) */
  consume(): boolean {
    if (this.sincePressed <= this.buffer && this.sinceGrounded <= this.coyote) {
      this.sincePressed = 999;
      this.sinceGrounded = 999;
      return true;
    }
    return false;
  }
  /** Esquece o chão (ex.: após pular). */
  reset() {
    this.sinceGrounded = 999;
    this.sincePressed = 999;
  }
}

/** Inclinação lateral (rad) a partir da taxa de giro e da velocidade, limitada. */
export function bankFromTurn(turnRate: number, speed: number, maxBank: number, gain = 0.045): number {
  const b = -turnRate * speed * gain;
  return b > maxBank ? maxBank : b < -maxBank ? -maxBank : b;
}

/** Candidato a travar alvo (lock-on). */
export interface LockCandidate {
  x: number;
  z: number;
  /** Prioridade extra (chefes). */
  bias?: number;
}

/**
 * Escolhe o melhor alvo para travar: dentro do alcance e do cone de visão,
 * preferindo o mais centralizado e mais próximo. Retorna o índice ou -1.
 */
export function pickLockTarget(cands: LockCandidate[], ox: number, oz: number, fx: number, fz: number, range: number, coneDeg: number): number {
  const cosHalf = Math.cos(((coneDeg * Math.PI) / 180) * 0.5);
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const dx = c.x - ox;
    const dz = c.z - oz;
    const d = Math.hypot(dx, dz);
    if (d > range) continue;
    const dot = d > 1e-3 ? (dx * fx + dz * fz) / d : 1;
    if (dot < cosHalf && d > 2.5) continue;
    const score = dot * 2 - d / range + (c.bias ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Normaliza um ângulo para [-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}
