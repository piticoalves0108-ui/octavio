import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import { clamp } from '../core/math';

export type CameraMode = 'explore' | 'combat' | 'flight' | 'dialogue' | 'cinematic' | 'boss';

/**
 * STUB — câmera em terceira pessoa. O módulo player/ substitui a implementação
 * mantendo as assinaturas públicas.
 */
export class CameraRig implements GameSystem {
  readonly name = 'camera';
  yaw = Math.PI;
  pitch = 0.25;
  distance = 6;
  mode: CameraMode = 'explore';
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  lateUpdate(_dt: number, ctx: GameContext) {
    const look = ctx.input.lookDelta();
    this.yaw -= look.x;
    this.pitch = clamp(this.pitch + look.y, -0.9, 1.2);
    this.distance = clamp(this.distance + ctx.input.wheel * 0.6, 2.5, 12);
    const target = ctx.sys.player.entity.getCenter(new THREE.Vector3());
    target.y += 0.5;
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(-this.distance);
    ctx.camera.position.copy(target).add(off);
    const g = ctx.physics.terrainHeight(ctx.camera.position.x, ctx.camera.position.z) + 0.4;
    if (ctx.camera.position.y < g) ctx.camera.position.y = g;
    ctx.camera.lookAt(target);
  }

  /** Tremor de câmera (respeita configuração do jogador). */
  shake(_intensity: number, _duration: number) {}
  /** Foco para diálogos (null = volta ao jogador). */
  setDialogueFocus(_target: THREE.Vector3 | null) {}
  setMode(mode: CameraMode) {
    this.mode = mode;
  }
  /** Frente horizontal da câmera (XZ, normalizado). */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  /** Direção 3D para onde a câmera olha (mira). */
  getLookDirection(out = new THREE.Vector3()): THREE.Vector3 {
    return this.ctx.camera.getWorldDirection(out);
  }
}
