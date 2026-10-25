import { HORSE, HORSE_GEARS, TAMING } from '../data/mounts';

/**
 * Lógica pura de cavalgar (sem three.js): marchas, esporas, giro, pulo, recusa de
 * terreno (subida íngreme, penhasco, água funda) e a luta para domar. Testada no vitest.
 */
export interface RideState {
  /** Velocidade para a frente (m/s; negativa = ré). */
  speed: number;
  /** Marcha atual (índice de HORSE_GEARS). */
  gear: number;
  /** Tempo segurando "frente" desde a última troca de marcha. */
  holdT: number;
  /** Esporas disponíveis (fracionário: recarrega aos poucos). */
  spurs: number;
  /** Galope restante (s) da última espora. */
  gallopT: number;
  /** Pulo: velocidade vertical, no ar, recarga. */
  vy: number;
  airborne: boolean;
  jumpCd: number;
}

export interface RideInput {
  /** -1 (trás) .. 1 (frente). */
  forward: number;
  /** -1 (esquerda) .. 1 (direita). */
  turn: number;
  /** Esporear (borda de subida). */
  spur: boolean;
  /** Pular (borda de subida). */
  jump: boolean;
}

export type TerrainBlock = 'ok' | 'steep' | 'cliff' | 'water';

const GALLOP = HORSE_GEARS.length - 1;
const CANTER = GALLOP - 1;

export function makeRideState(): RideState {
  return { speed: 0, gear: 0, holdT: 0, spurs: HORSE.spurs, gallopT: 0, vy: 0, airborne: false, jumpCd: 0 };
}

/** Velocidade-alvo da marcha atual. */
export function targetSpeed(s: RideState, forward: number): number {
  if (forward < -0.3) return s.speed > 0.3 ? 0 : -HORSE.reverseSpeed;
  if (forward <= 0.3) return 0;
  return HORSE_GEARS[s.gallopT > 0 ? GALLOP : Math.min(s.gear, CANTER)].speed;
}

/**
 * Avança um passo: troca de marchas, esporas, velocidade e pulo.
 * Retorna a velocidade de giro (rad/s, positiva = direita) para este quadro.
 * Retorna 'spur' em `events` quando uma espora foi gasta (efeitos/som).
 */
export function stepRide(s: RideState, inp: RideInput, dt: number, events?: string[]): number {
  // esporas recarregam
  if (s.spurs < HORSE.spurs) s.spurs = Math.min(HORSE.spurs, s.spurs + dt / HORSE.spurRegen);
  if (s.jumpCd > 0) s.jumpCd -= dt;
  const fwd = inp.forward;
  // marchas: segurar "frente" sobe aos poucos (passo → trote → meio-galope)
  if (fwd > 0.3) {
    if (s.gear < 1) {
      s.gear = 1;
      s.holdT = 0;
    }
    s.holdT += dt;
    if (s.holdT >= HORSE.gearUpHold && s.gear < CANTER) {
      s.gear++;
      s.holdT = 0;
    }
  } else {
    s.holdT = 0;
    s.gallopT = 0;
    if (Math.abs(s.speed) < 0.3) s.gear = 0;
    else if (fwd < -0.3) s.gear = Math.max(0, s.gear - 1);
  }
  // espora: galope por alguns segundos (de qualquer marcha, andando para a frente)
  if (inp.spur && fwd > 0.3 && s.spurs >= 1) {
    s.spurs -= 1;
    s.gallopT = HORSE.spurGallop;
    s.gear = Math.max(s.gear, 2);
    events?.push('spur');
  }
  if (s.gallopT > 0) {
    s.gallopT -= dt;
    if (s.gallopT <= 0) {
      s.gallopT = 0;
      s.gear = CANTER;
    }
  }
  // velocidade (no ar mantém o embalo)
  if (!s.airborne) {
    const tgt = targetSpeed(s, fwd);
    const rate = Math.abs(tgt) < Math.abs(s.speed) || Math.sign(tgt) !== Math.sign(s.speed) ? HORSE.brake : HORSE.accel;
    const d = tgt - s.speed;
    s.speed += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
  }
  // pulo
  if (inp.jump && !s.airborne && s.jumpCd <= 0 && s.speed >= HORSE.jumpMinSpeed) {
    s.vy = HORSE.jumpSpeed;
    s.airborne = true;
    s.jumpCd = HORSE.jumpCooldown;
    events?.push('jump');
  }
  // giro: fechado devagar, aberto em velocidade
  const k = Math.min(1, Math.abs(s.speed) / HORSE_GEARS[GALLOP].speed);
  const rate = HORSE.turnSlow + (HORSE.turnFast - HORSE.turnSlow) * k;
  return inp.turn * rate * (s.speed < -0.1 ? -1 : 1);
}

/** Integra a queda do pulo. Retorna true no quadro em que pousou. */
export function stepAir(s: RideState, y: { value: number }, ground: number, dt: number): boolean {
  if (!s.airborne) return false;
  s.vy -= HORSE.gravity * dt;
  y.value += s.vy * dt;
  if (y.value <= ground && s.vy <= 0) {
    y.value = ground;
    s.vy = 0;
    s.airborne = false;
    return true;
  }
  return false;
}

/** Galopando de verdade (para câmera, som e animação). */
export function isGalloping(s: RideState): boolean {
  return s.gallopT > 0 || s.speed > HORSE_GEARS[CANTER].speed + 0.5;
}

/**
 * O terreno à frente deixa passar? `hHere`/`hAhead` = altura do chão aqui e a
 * `dist` metros à frente; `waterAhead` = profundidade da água lá (0 = seco).
 */
export function terrainBlock(hHere: number, hAhead: number, dist: number, waterAhead: number): TerrainBlock {
  if (waterAhead > HORSE.deepWater) return 'water';
  if (hHere - hAhead > HORSE.cliffDrop) return 'cliff';
  const slope = (Math.atan2(hAhead - hHere, Math.max(0.01, dist)) * 180) / Math.PI;
  if (slope > HORSE.maxSlopeDeg) return 'steep';
  return 'ok';
}

/** Luta para domar: progresso 0..1 e energia gasta neste passo. */
export interface TameState {
  t: number;
}

export function stepTaming(st: TameState, energy: number, dt: number): { cost: number; done: boolean; failed: boolean } {
  const cost = TAMING.energyPerSecond * dt;
  if (energy < cost || (st.t === 0 && energy < TAMING.minEnergy)) return { cost: 0, done: false, failed: true };
  st.t += dt;
  return { cost, done: st.t >= TAMING.seconds, failed: false };
}

/** Energia necessária para domar do começo ao fim. */
export function tamingEnergy(): number {
  return TAMING.energyPerSecond * TAMING.seconds;
}
