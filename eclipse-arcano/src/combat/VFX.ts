import type * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';

export type VfxKind =
  | 'arcaneBurst'
  | 'arcaneSpark'
  | 'lightning'
  | 'fire'
  | 'smoke'
  | 'dust'
  | 'impact'
  | 'metalSpark'
  | 'heal'
  | 'levelUp'
  | 'teleport'
  | 'shockwave'
  | 'crystalShatter'
  | 'void'
  | 'time'
  | 'splash'
  | 'leaves'
  | 'pickupGlow'
  | 'corruption'
  | 'blockSpark'
  | 'deathDissolve';

export interface BurstOptions {
  count?: number;
  color?: number;
  scale?: number;
  direction?: THREE.Vector3;
  speed?: number;
  lifetime?: number;
}

export interface TelegraphShape {
  type: 'circle' | 'cone' | 'line' | 'ring';
  position: THREE.Vector3;
  radius?: number;
  innerRadius?: number;
  /** Abertura do cone (graus). */
  angle?: number;
  yaw?: number;
  length?: number;
  width?: number;
  /** Duração até o golpe (s) — o preenchimento anima até o momento do impacto. */
  duration: number;
  color?: number;
}

export interface VfxHandle {
  cancel(): void;
}

/**
 * STUB — efeitos visuais com pool de partículas, luzes temporárias,
 * raios, feixes e marcações de ataques (telegraphs).
 */
export class VFX implements GameSystem {
  readonly name = 'vfx';
  protected ctx!: GameContext;
  init(ctx: GameContext) {
    this.ctx = ctx;
  }
  burst(_kind: VfxKind, _position: THREE.Vector3, _opts?: BurstOptions): void {}
  ring(_position: THREE.Vector3, _radius: number, _color: number, _duration: number): void {}
  beam(_from: THREE.Vector3, _to: THREE.Vector3, _color: number, _width: number, _duration: number): void {}
  lightning(_from: THREE.Vector3, _to: THREE.Vector3, _opts?: { color?: number; branches?: number; duration?: number }): void {}
  flash(_position: THREE.Vector3, _color: number, _intensity: number, _duration: number): void {}
  telegraph(_shape: TelegraphShape): VfxHandle {
    return { cancel() {} };
  }
  /** Rastro contínuo preso a um objeto (armas, projéteis, voo). */
  attachTrail(_object: THREE.Object3D, _color: number, _width?: number): VfxHandle {
    return { cancel() {} };
  }
}
