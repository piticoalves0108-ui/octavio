/**
 * Pés no chão (IK de duas articulações por perna), aplicado sobre a pose já animada:
 * mede o chão sob cada pé (relevo + topos caminháveis), abaixa o quadril até o pé mais
 * baixo alcançar e dobra joelho/coxa da outra perna para o pé mais alto não atravessar
 * degraus e rampas. O pé gira para acompanhar a inclinação do chão. Sem alocação.
 */
import type { GameContext } from '../core/context';
import { B, BONE_OFFSET, R_OFFY, type Pose } from './rig';
import { FOOT_IK } from '../data/player';

const THIGH = Math.abs(BONE_OFFSET.shinL[1]);
const SHIN = Math.abs(BONE_OFFSET.footL[1]);

const NRM = { x: 0, y: 1, z: 0 };

interface Leg {
  thigh: number;
  shin: number;
  foot: number;
  side: number;
  /** Diferença suavizada do chão sob o pé em relação à base (m). */
  d: number;
  /** Inclinação suavizada do chão na direção do personagem (rad). */
  pitch: number;
}

function damp(a: number, b: number, lambda: number, dt: number) {
  return b + (a - b) * Math.exp(-lambda * dt);
}

export class FootIK {
  private legs: Leg[] = [
    { thigh: B.thighL, shin: B.shinL, foot: B.footL, side: BONE_OFFSET.thighL[0], d: 0, pitch: 0 },
    { thigh: B.thighR, shin: B.shinR, foot: B.footR, side: BONE_OFFSET.thighR[0], d: 0, pitch: 0 },
  ];
  private drop = 0;
  /** Peso atual (0 = desligado), suavizado para não "estalar" ao pular ou voar. */
  private w = 0;

  reset() {
    for (const l of this.legs) {
      l.d = 0;
      l.pitch = 0;
    }
    this.drop = 0;
    this.w = 0;
  }

  /**
   * `weight` 0..1 (1 = parado/andando no chão, menos correndo, 0 no ar/voo/escalada).
   * `x,y,z,yaw` = base do personagem no mundo.
   */
  apply(pose: Pose, ctx: GameContext, x: number, y: number, z: number, yaw: number, weight: number, dt: number) {
    this.w = damp(this.w, weight, FOOT_IK.blendLambda, dt);
    if (this.w < 0.01) {
      this.drop = damp(this.drop, 0, FOOT_IK.lambda, dt);
      for (const l of this.legs) {
        l.d = damp(l.d, 0, FOOT_IK.lambda, dt);
        l.pitch = damp(l.pitch, 0, FOOT_IK.lambda, dt);
      }
      return;
    }
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const fx = sy; // frente do personagem (mundo)
    const fz = cy;
    let lowest = 0;
    for (const l of this.legs) {
      // posição horizontal do pé na pose atual (espaço local: +Z frente, +X esquerda)
      const at = pose[l.thigh * 3];
      const as = pose[l.shin * 3];
      const lz = -Math.sin(at) * THIGH - Math.sin(at + as) * SHIN;
      const lx = l.side;
      const wx = x + lx * cy + lz * sy;
      const wz = z - lx * sy + lz * cy;
      const g = ctx.physics.groundHeight(wx, wz, y + FOOT_IK.maxStep + 0.1, FOOT_IK.maxStep + 0.1, 0.12);
      const d = Math.max(-FOOT_IK.maxStep, Math.min(FOOT_IK.maxStep, g - y));
      l.d = damp(l.d, d, FOOT_IK.lambda, dt);
      ctx.heightfield.normalAt(wx, wz, NRM);
      // terreno sob o pé: inclinação na direção da frente (pedras/pontes: plano)
      const onTerrain = Math.abs(g - ctx.physics.terrainHeight(wx, wz)) < 0.05;
      const slope = onTerrain ? -Math.atan2(NRM.x * fx + NRM.z * fz, NRM.y) : 0;
      l.pitch = damp(l.pitch, Math.max(-0.6, Math.min(0.6, slope)), FOOT_IK.lambda, dt);
      if (l.d < lowest) lowest = l.d;
    }
    this.drop = damp(this.drop, lowest, FOOT_IK.lambda, dt);
    const w = this.w;
    pose[R_OFFY] += this.drop * w;

    for (const l of this.legs) {
      const raise = (l.d - this.drop) * w;
      const at = pose[l.thigh * 3];
      const as = pose[l.shin * 3];
      // pé atual relativo ao quadril: frente (z) e queda (h, positiva para baixo)
      const z0 = -Math.sin(at) * THIGH - Math.sin(at + as) * SHIN;
      const h0 = Math.cos(at) * THIGH + Math.cos(at + as) * SHIN;
      const h = Math.max(0.25, h0 - raise);
      let D = Math.hypot(z0, h);
      const maxD = THIGH + SHIN - 0.005;
      if (D > maxD) D = maxD;
      // ângulos pela lei dos cossenos
      const cosK = (THIGH * THIGH + SHIN * SHIN - D * D) / (2 * THIGH * SHIN);
      const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK)));
      const phi = Math.atan2(z0, h);
      const cosB = (THIGH * THIGH + D * D - SHIN * SHIN) / (2 * THIGH * D);
      const beta = Math.acos(Math.max(-1, Math.min(1, cosB)));
      const thighX = -(phi + beta);
      const shinX = knee;
      // só substitui se a perna precisa encolher (pé no degrau); senão mantém a animação
      const k = Math.min(1, Math.max(0, raise / 0.04));
      pose[l.thigh * 3] = at + (thighX - at) * k;
      pose[l.shin * 3] = as + (shinX - as) * k;
      // pé acompanha o chão (desfaz a rotação da perna e aplica a inclinação)
      const fNow = pose[l.foot * 3];
      const flat = -(pose[l.thigh * 3] + pose[l.shin * 3]);
      pose[l.foot * 3] = fNow + (flat + l.pitch - fNow) * FOOT_IK.footAlign * w;
    }
  }
}
