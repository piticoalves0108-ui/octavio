import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import { Entity } from '../core/Entity';
import { Health } from '../combat/Health';
import { PLAYER_START } from '../data/world';
import { GLOBAL_UNIFORMS } from '../core/uniforms';

/**
 * STUB — contrato público do jogador. O módulo player/ substitui a implementação
 * mantendo as assinaturas públicas (pode adicionar membros).
 */
export type PlayerState = 'ground' | 'air' | 'flight' | 'dodge' | 'climb' | 'swim' | 'stagger' | 'dead';

/** Animações/ações que outros sistemas podem disparar no modelo do jogador. */
export type PlayerAnim =
  | 'cast'
  | 'castHeavy'
  | 'castChannel'
  | 'slash1'
  | 'slash2'
  | 'slash3'
  | 'thrust'
  | 'heavySlash'
  | 'staffStrike'
  | 'block'
  | 'hit'
  | 'dodge'
  | 'land'
  | 'ascend'
  | 'interact'
  | 'drink';

export class PlayerEntity extends Entity {
  constructor() {
    super('player', 'player');
    this.name = 'Mago Ancestral';
    this.typeId = 'player';
    this.radius = 0.45;
    this.height = 1.85;
    this.health = new Health(100);
    this.alwaysActive = true;
    this.persistent = true;
  }
}

export class Player implements GameSystem, Saveable {
  readonly name = 'player';
  readonly saveKey = 'player';
  entity = new PlayerEntity();
  state: PlayerState = 'ground';
  energy = { current: 100, max: 100, regen: 8 };
  /** Alvo travado (lock-on) ou null. */
  lockTarget: Entity | null = null;
  inputEnabled = true;
  protected ctx!: GameContext;

  get position() {
    return this.entity.position;
  }
  get health() {
    return this.entity.health!;
  }

  init(ctx: GameContext) {
    this.ctx = ctx;
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 8), new THREE.MeshStandardMaterial({ color: 0x4b3a8a }));
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    this.entity.object3d.add(mesh);
    ctx.entities.add(this.entity);
    this.placeAtStart();
  }

  placeAtStart() {
    const y = this.ctx.physics.groundHeight(PLAYER_START.x, PLAYER_START.z);
    this.teleport(new THREE.Vector3(PLAYER_START.x, y, PLAYER_START.z), PLAYER_START.yaw);
  }

  update(dt: number, ctx: GameContext) {
    const e = this.entity;
    const cam = ctx.sys.camera;
    const fwd = cam.getForward(new THREE.Vector3());
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const mx = ctx.input.axis('left', 'right');
    const mz = ctx.input.axis('back', 'forward');
    const move = fwd.multiplyScalar(mz).add(right.multiplyScalar(mx));
    if (move.lengthSq() > 0) {
      move.normalize();
      e.yaw = Math.atan2(move.x, move.z);
      const speed = ctx.input.down('sprint') ? 9 : 5;
      e.position.addScaledVector(move, speed * dt);
    }
    ctx.physics.resolveCapsule(e.position, e.radius, e.height);
    e.position.y = ctx.physics.groundHeight(e.position.x, e.position.z, e.position.y + 1);
    e.object3d.rotation.y = e.yaw;
    this.energy.current = Math.min(this.energy.max, this.energy.current + this.energy.regen * dt);
    ctx.entities.focus.copy(e.position);
    GLOBAL_UNIFORMS.uPlayerPos.value.set(e.position.x, e.position.y, e.position.z, 1.6);
  }

  canInteract(): boolean {
    return this.state !== 'dead' && this.state !== 'flight';
  }
  canAct(): boolean {
    return this.state !== 'dead' && this.state !== 'stagger' && this.state !== 'dodge' && this.state !== 'climb';
  }
  isFlying(): boolean {
    return this.state === 'flight';
  }
  spendEnergy(amount: number): boolean {
    if (this.energy.current < amount) return false;
    this.energy.current -= amount;
    return true;
  }
  restoreEnergy(amount: number) {
    this.energy.current = Math.min(this.energy.max, this.energy.current + amount);
  }
  teleport(pos: THREE.Vector3, yaw?: number) {
    this.entity.position.copy(pos);
    this.entity.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.entity.yaw = yaw;
    this.ctx?.entities.focus.copy(pos);
  }
  /** Raio de mira a partir do centro da tela (ou do lock-on). */
  getAimRay(outOrigin: THREE.Vector3, outDir: THREE.Vector3): void {
    this.entity.getCenter(outOrigin).y += 0.3;
    if (this.lockTarget && this.lockTarget.alive) {
      outDir.subVectors(this.lockTarget.getCenter(new THREE.Vector3()), outOrigin).normalize();
    } else {
      this.ctx.sys.camera.getLookDirection(outDir);
    }
  }
  /** Ponto do mundo para onde o jogador mira (até maxDist). */
  getAimPoint(maxDist: number, out = new THREE.Vector3()): THREE.Vector3 {
    const o = new THREE.Vector3();
    const d = new THREE.Vector3();
    this.getAimRay(o, d);
    const hit = this.ctx.physics.raycast(o, d, maxDist);
    return hit ? out.copy(hit.point) : out.copy(o).addScaledVector(d, maxDist);
  }
  /**
   * Toca uma animação de ação. Retorna a duração (s) já considerando `speed`,
   * para o combate sincronizar o quadro de impacto.
   */
  playAnimation(_anim: PlayerAnim, _opts?: { speed?: number }): number {
    return 0.4;
  }
  /** Prende o modelo da arma equipada na mão direita (null = remove). */
  setWeaponModel(_model: THREE.Object3D | null, _kind?: 'sword' | 'staff' | 'dagger' | 'spear' | 'techno' | 'artifact'): void {}
  /** Posição da mão no mundo (origem de magias). */
  getHandWorldPosition(_side: 'left' | 'right', out = new THREE.Vector3()): THREE.Vector3 {
    return this.entity.getCenter(out).add(new THREE.Vector3(0, 0.3, 0));
  }
  /** Ponta da arma/cristal do cajado no mundo (origem de projéteis e rastros). */
  getWeaponTipWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    return this.getHandWorldPosition('right', out);
  }
  /** Impede deslocamento voluntário por `seconds` (ataques pesados, conjurações longas). */
  lockMovement(_seconds: number): void {}
  /** Defesa ativa: reduz velocidade e mostra pose de bloqueio. */
  setBlocking(_blocking: boolean): void {}
  /** Em animação de ação que não pode ser interrompida. */
  isBusy(): boolean {
    return false;
  }
  /** Último ponto de renascimento (santuário/cripta). */
  checkpoint = { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw };
  applyKnockback(dir: THREE.Vector3, force: number) {
    this.entity.velocity.addScaledVector(dir, force);
  }
  /** Recalcula vida/energia máximas a partir da progressão e equipamentos. */
  refreshStats(): void {}
  respawn(): void {
    this.health.reset();
    this.energy.current = this.energy.max;
    this.state = 'ground';
    this.placeAtStart();
    this.ctx.events.emit('player:respawn', {});
  }
  onNewGame() {
    this.health.reset(100);
    this.energy.current = this.energy.max;
    this.state = 'ground';
    this.lockTarget = null;
    this.placeAtStart();
  }
  serialize() {
    const p = this.entity.position;
    return { x: p.x, y: p.y, z: p.z, yaw: this.entity.yaw, health: this.health.current, energy: this.energy.current };
  }
  deserialize(data: any) {
    if (![data?.x, data?.y, data?.z].every((v) => typeof v === 'number' && isFinite(v))) throw new Error('posição inválida');
    this.teleport(new THREE.Vector3(data.x, data.y, data.z), data.yaw ?? 0);
    this.health.current = Math.max(1, Math.min(this.health.max, data.health ?? this.health.max));
    this.energy.current = Math.max(0, Math.min(this.energy.max, data.energy ?? this.energy.max));
  }
}
