import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { SurfaceType } from '../core/EventBus';
import { Entity } from '../core/Entity';
import { Health, type DamageInfo } from '../combat/Health';
import { MAX_FLIGHT_ALTITUDE, PLAYABLE_HALF, PLAYER_START } from '../data/world';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { angleDiff, clamp, damp, dampAngle } from '../core/math';
import {
  ANIM_COMMIT,
  ANIM_DURATION,
  CAMERA,
  CLIMB,
  DEATH_DELAY,
  DODGE,
  ENERGY,
  FLIGHT,
  JUMP,
  LOCOMOTION,
  PLAYER_BODY,
  PLAYER_FX,
  SWIM,
} from '../data/player';
import { PlayerModel, type WeaponKind } from './PlayerModel';
import { Animator, createLocoParams, type LocoMode } from './Animator';
import { CLIP_DEFS } from './animClips';
import { RUNE_UNIFORMS } from './runeMaterial';
import { PlayerFx } from './PlayerFx';
import { JumpAssist, accelerateXZ, bankFromTurn, fallDamage, flightEnergyCost, type V2 } from './locomotion';
import { ceilingAbove, colliderAt, colliderTop } from './probe';
import { B } from './rig';
import type { Collider } from '../world/Collision';

/**
 * Protagonista: o Mago Ancestral.
 * - Máquina de estados de locomoção: chão, ar, voo, esquiva, escalada, nado, atordoado e morte.
 * - Voo (mecânica principal): decolagem, pairar, cruzeiro, turbo, planar sem energia, pouso.
 * - Modelo procedural (PlayerModel) animado pelo Animator; capa simulada; partículas próprias.
 * O jogador NÃO decide ataques/bloqueio/habilidades: o módulo de combate chama as APIs públicas
 * (playAnimation, lockMovement, setBlocking, getHandWorldPosition, getAimRay...).
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
  /** Chamado pelo Player para reagir à morte (definido no init). */
  onDeathHook: (() => void) | null = null;
  /** Chamado ao receber dano (reação visual). */
  onDamagedHook: ((info: DamageInfo) => void) | null = null;

  constructor() {
    super('player', 'player');
    this.name = 'Mago Ancestral';
    this.typeId = 'player';
    this.radius = PLAYER_BODY.radius;
    this.height = PLAYER_BODY.height;
    this.health = new Health(100);
    this.alwaysActive = true;
    this.persistent = true;
  }

  override onDamaged(info: DamageInfo): void {
    this.onDamagedHook?.(info);
  }

  override onDeath(): void {
    this.onDeathHook?.();
  }
}

/** Cor das runas: normal (ciano arcano) e Forma Ascendente (dourado). */
const RUNE_NORMAL = new THREE.Color(0.25, 0.85, 1.0);
const RUNE_ASCENDED = new THREE.Color(1.0, 0.72, 0.28);

const SURFACES: ReadonlySet<string> = new Set(['grass', 'dirt', 'stone', 'wood', 'water', 'metal', 'sand', 'mud']);

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

  /** Modelo procedural (criado no init). */
  model!: PlayerModel;
  readonly animator = new Animator();
  fx!: PlayerFx;
  /** Tempo (s) no estado atual. */
  stateTime = 0;
  /** Está apoiado no chão (ground/esquiva no chão). */
  grounded = true;
  /** Voo: turbo ativo / planando sem energia / em decolagem. */
  boosting = false;
  gliding = false;
  /** Multiplicadores atuais vindos da progressão (atualizados por refreshStats). */
  readonly stats = { moveSpeed: 1, flightSpeed: 1, flightCost: 1, dodgeCost: 1 };
  /** Altura sobre o chão (m) — útil para HUD/câmera. */
  heightAboveGround = 0;
  /** Superfície da água acima dos pés (m) — profundidade atual (0 = seco). */
  waterDepth = 0;

  // ---- estado interno ----
  private hv: V2 = { x: 0, z: 0 };
  private vy = 0;
  private knock = new THREE.Vector3();
  private lastVel = new THREE.Vector3();
  private jump = new JumpAssist();
  private airDodges = DODGE.airDodges;
  private dodgeT = 0;
  private dodgeDur = DODGE.duration;
  private dodgeDir = new THREE.Vector3();
  private dodgeFrom: PlayerState = 'ground';
  private dodgeCooldown = 0;
  private moveLock = 0;
  private blocking = false;
  private takeoffT = 99;
  private flightV = new THREE.Vector3();
  private bank = 0;
  private flightPitch = 0;
  private hover = 1;
  private boostW = 0;
  private turnRate = 0;
  private lastYaw = 0;
  private energySpentAt = -99;
  private deathTimer = 0;
  private deadStateSet = false;
  private wallN = new THREE.Vector3();
  private wallCollider: Collider | null = null;
  private mantleT = -1;
  private mantleFrom = new THREE.Vector3();
  private mantleTo = new THREE.Vector3();
  private staggerFrom: PlayerState = 'ground';
  private ascend = 0;
  private lastGround = 0;
  private pendingHealth: number | null = null;
  private pendingEnergy: number | null = null;
  private statsTimer = 0;
  private warnTimer = 0;
  private weaponShown = true;
  private modelVisible = true;
  private airTime = 0;
  private maxFallSpeed = 0;
  private wasInWater = false;
  private params = createLocoParams();
  // vetores temporários (zero alocação por frame)
  private tv1 = new THREE.Vector3();
  private tv2 = new THREE.Vector3();
  private tv3 = new THREE.Vector3();
  private wish = new THREE.Vector3();
  private camFwd = new THREE.Vector3();
  private camRight = new THREE.Vector3();
  private nrm = { x: 0, y: 1, z: 0 };
  private contact = { collided: false, nx: 0, nz: 0, climbable: false, ceiling: false, collider: null as Collider | null };

  get position() {
    return this.entity.position;
  }
  get health() {
    return this.entity.health!;
  }
  /** Velocidade escalar atual (m/s). */
  get speed(): number {
    if (this.state === 'flight') return this.flightV.length();
    return Math.hypot(this.hv.x + this.knock.x, this.hv.z + this.knock.z);
  }
  /** Velocidade horizontal atual (m/s). */
  get horizontalSpeed(): number {
    if (this.state === 'flight') return Math.hypot(this.flightV.x, this.flightV.z);
    return Math.hypot(this.hv.x, this.hv.z);
  }

  init(ctx: GameContext) {
    this.ctx = ctx;
    const q = ctx.settings.q;
    this.model = new PlayerModel(q);
    this.entity.object3d.add(this.model.root);
    this.model.addToScene(ctx.scene);
    const cap = q.maxParticles <= 600 ? PLAYER_FX.capacityLow : q.maxParticles <= 1500 ? PLAYER_FX.capacityMedium : PLAYER_FX.capacityHigh;
    this.fx = new PlayerFx(cap);
    ctx.scene.add(this.fx.mesh);
    this.entity.onDeathHook = () => this.die();
    this.entity.onDamagedHook = (info) => this.onDamaged(info);
    ctx.entities.add(this.entity);
    this.placeAtStart();
    const refresh = () => this.refreshStats();
    ctx.events.on('level:up', refresh);
    ctx.events.on('talent:unlocked', refresh);
    ctx.events.on('equip:changed', refresh);
  }

  placeAtStart() {
    const y = this.ctx.physics.groundHeight(PLAYER_START.x, PLAYER_START.z);
    this.tv1.set(PLAYER_START.x, y, PLAYER_START.z);
    this.teleport(this.tv1, PLAYER_START.yaw);
  }

  // =====================================================================
  // Loop principal
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    if (dt <= 0) return;
    const e = this.entity;
    const h = this.health;
    this.stateTime += dt;
    if (this.moveLock > 0) this.moveLock -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    this.statsTimer -= dt;
    if (this.statsTimer <= 0) this.refreshStats();
    if (this.warnTimer > 0) this.warnTimer -= dt;

    // Impulsos externos (knockback do Combat soma direto em entity.velocity).
    const ex = e.velocity.x - this.lastVel.x;
    const ez = e.velocity.z - this.lastVel.z;
    if (ex * ex + ez * ez > 1e-4 && this.state !== 'dead') {
      this.knock.x += ex;
      this.knock.z += ez;
    }
    const kd = Math.exp(-(this.grounded ? 7 : 2.5) * dt);
    this.knock.x *= kd;
    this.knock.z *= kd;

    // Morte / atordoamento
    if (this.state !== 'dead' && (!h.alive || !e.alive)) this.die();
    if (this.state !== 'dead' && this.state !== 'stagger' && this.state !== 'flight' && h.staggered && this.mantleT < 0) this.enterStagger();

    this.readInput(ctx);
    this.jump.tick(dt, this.grounded, this.canControl() && ctx.input.pressed('jump'));

    switch (this.state) {
      case 'ground':
        this.updateGround(dt, ctx);
        break;
      case 'air':
        this.updateAir(dt, ctx);
        break;
      case 'flight':
        this.updateFlight(dt, ctx);
        break;
      case 'dodge':
        this.updateDodge(dt, ctx);
        break;
      case 'climb':
        this.updateClimb(dt, ctx);
        break;
      case 'swim':
        this.updateSwim(dt, ctx);
        break;
      case 'stagger':
        this.updateStagger(dt, ctx);
        break;
      case 'dead':
        this.updateDead(dt, ctx);
        break;
    }

    // Energia: regenera fora do voo, depois de um atraso.
    if (this.state !== 'flight' && this.state !== 'dead' && ctx.elapsed - this.energySpentAt > ENERGY.regenDelay) {
      this.energy.current = Math.min(this.energy.max, this.energy.current + this.energy.regen * dt);
    }

    // Velocidade pública (IA, áudio, câmera)
    if (this.state === 'flight' || (this.state === 'dodge' && this.dodgeFrom === 'flight')) e.velocity.copy(this.flightV);
    else e.velocity.set(this.hv.x + this.knock.x, this.vy, this.hv.z + this.knock.z);
    this.lastVel.copy(e.velocity);

    // Giro
    this.turnRate = damp(this.turnRate, angleDiff(this.lastYaw, e.yaw) / dt, 12, dt);
    this.lastYaw = e.yaw;
    e.object3d.rotation.y = e.yaw;

    this.updateVisuals(dt, ctx);

    ctx.entities.focus.copy(e.position);
    GLOBAL_UNIFORMS.uPlayerPos.value.set(e.position.x, e.position.y, e.position.z, this.state === 'flight' ? 3.2 : 1.6);
  }

  // =====================================================================
  // Entrada
  // =====================================================================
  private mx = 0;
  private mz = 0;

  /** Pode controlar o personagem agora? */
  private canControl(): boolean {
    return this.inputEnabled && this.ctx.input.gameplayEnabled && this.ctx.state === 'playing';
  }

  private readInput(ctx: GameContext) {
    const cam = ctx.sys.camera;
    cam.getForward(this.camFwd);
    this.camRight.set(-this.camFwd.z, 0, this.camFwd.x);
    if (!this.canControl()) {
      this.mx = this.mz = 0;
      this.wish.set(0, 0, 0);
      return;
    }
    const inp = ctx.input;
    this.mx = inp.axis('left', 'right');
    this.mz = inp.axis('back', 'forward');
    this.wish.set(0, 0, 0).addScaledVector(this.camFwd, this.mz).addScaledVector(this.camRight, this.mx);
    const l = this.wish.length();
    if (l > 1) this.wish.multiplyScalar(1 / l);
  }

  private pressed(a: Parameters<GameContext['input']['pressed']>[0]): boolean {
    return this.canControl() && this.ctx.input.pressed(a);
  }
  private held(a: Parameters<GameContext['input']['down']>[0]): boolean {
    return this.canControl() && this.ctx.input.down(a);
  }

  // =====================================================================
  // Movimento com colisão
  // =====================================================================
  /** Move a cápsula com subpassos (evita atravessar paredes finas em alta velocidade). */
  private moveCapsule(dx: number, dy: number, dz: number, stepUp: boolean) {
    const pos = this.entity.position;
    const phys = this.ctx.physics;
    const c = this.contact;
    c.collided = false;
    c.climbable = false;
    c.collider = null;
    c.ceiling = false;
    const R = PLAYER_BODY.radius;
    const dist = Math.hypot(dx, dz, dy * 0.5);
    const n = Math.min(14, Math.max(1, Math.ceil(dist / (R * 0.75))));
    const sx = dx / n;
    const sy = dy / n;
    const sz = dz / n;
    for (let i = 0; i < n; i++) {
      pos.x += sx;
      pos.y += sy;
      pos.z += sz;
      if (stepUp) {
        const g = phys.groundHeight(pos.x, pos.z, pos.y, PLAYER_BODY.stepHeight, R * 2);
        if (g > pos.y && g - pos.y <= PLAYER_BODY.stepHeight) pos.y = g;
      } else if (sy > 0) {
        // subindo: a cabeça para na base de tetos/ilhas acima (antes do empurrão lateral,
        // que jogaria o corpo para a borda do colisor)
        const ceil = ceilingAbove(phys, pos.x, pos.z, pos.y - sy + PLAYER_BODY.height - 0.05, R);
        if (pos.y + PLAYER_BODY.height > ceil) {
          pos.y = ceil - PLAYER_BODY.height;
          c.ceiling = true;
        }
      } else if (sy < 0) {
        // descendo: apoia no topo caminhável cruzado neste subpasso (pontes, telhados, ilhas)
        // antes do empurrão lateral, que jogaria o corpo para fora da plataforma
        const g = phys.groundHeight(pos.x, pos.z, pos.y - sy, 0.02, R * 2);
        if (pos.y < g) pos.y = g;
      }
      const r = phys.resolveCapsule(pos, R, PLAYER_BODY.height);
      if (r.collided) {
        c.collided = true;
        c.nx = r.normal.x;
        c.nz = r.normal.z;
        if (r.climbable) {
          c.climbable = true;
          c.collider = r.collider ?? null;
        }
      }
    }
  }

  /** Chão sob os pés (terreno + topos caminháveis até um degrau acima). */
  private groundAt(step = PLAYER_BODY.stepHeight): number {
    const p = this.entity.position;
    return this.ctx.physics.groundHeight(p.x, p.z, p.y, step, PLAYER_BODY.radius * 2);
  }

  /** Atualiza a profundidade da água no ponto atual. */
  private sampleWater(): number {
    const p = this.entity.position;
    const surf = this.ctx.physics.waterSurface(p.x, p.z);
    if (surf === null) {
      this.waterDepth = 0;
      return 0;
    }
    const floor = Math.max(this.ctx.physics.terrainHeight(p.x, p.z), this.groundAt(0.2));
    this.waterDepth = Math.max(0, surf - floor);
    return this.waterDepth;
  }

  private targetGroundSpeed(): number {
    const L = LOCOMOTION;
    let s = this.held('sprint') && !this.blocking ? L.sprintSpeed : this.held('walk') ? L.walkSpeed : L.runSpeed;
    s *= this.stats.moveSpeed * this.health.moveMultiplier();
    if (this.blocking) s = Math.min(s, L.runSpeed * L.blockingSpeedMul);
    if (this.waterDepth > 0.45) s *= L.wadeSpeedMul;
    if (this.moveLock > 0) s = 0;
    return s;
  }

  // =====================================================================
  // Chão
  // =====================================================================
  private updateGround(dt: number, ctx: GameContext) {
    const e = this.entity;
    const pos = e.position;
    const L = LOCOMOTION;
    this.grounded = true;
    this.airDodges = DODGE.airDodges;
    this.sampleWater();

    // Ações de transição
    if (this.pressed('fly') && this.startFlight(true)) return;
    if (this.pressed('dodge') && this.startDodge()) return;
    if (this.canControl() && this.moveLock <= 0 && !this.isBusy() && this.jump.consume()) {
      this.doJump(JUMP.speed);
      return;
    }

    // Velocidade desejada
    const target = this.targetGroundSpeed();
    const wl = this.wish.length();
    accelerateXZ(this.hv, wl > 0.01 ? this.wish.x / Math.max(1, wl) : 0, wl > 0.01 ? this.wish.z / Math.max(1, wl) : 0, target * Math.min(1, wl), L.accel, L.decel, dt);

    // Limite de inclinação do terreno (só quando apoiado no terreno, não em colisores)
    const terrainY = ctx.physics.terrainHeight(pos.x, pos.z);
    const onTerrain = this.lastGround - terrainY < 0.08;
    if (onTerrain) {
      const sp = Math.hypot(this.hv.x, this.hv.z);
      const probe = sp > 0.1 ? 0.6 / sp : 0;
      ctx.heightfield.normalAt(pos.x + this.hv.x * probe, pos.z + this.hv.z * probe, this.nrm);
      const maxCos = Math.cos((PLAYER_BODY.maxSlopeDeg * Math.PI) / 180);
      if (this.nrm.y < maxCos) {
        const nl = Math.hypot(this.nrm.x, this.nrm.z) || 1;
        const nx = this.nrm.x / nl;
        const nz = this.nrm.z / nl;
        const into = this.hv.x * nx + this.hv.z * nz; // < 0 = subindo
        if (into < 0) {
          this.hv.x -= nx * into;
          this.hv.z -= nz * into;
        }
        // escorrega encosta abaixo
        const steep = clamp((maxCos - this.nrm.y) * 6, 0, 1);
        this.hv.x += nx * L.slopeSlideAccel * steep * dt;
        this.hv.z += nz * L.slopeSlideAccel * steep * dt;
      }
    }

    // Move
    this.moveCapsule((this.hv.x + this.knock.x) * dt, 0, (this.hv.z + this.knock.z) * dt, true);
    const c = this.contact;
    if (c.collided) this.slideOffWall(this.hv);

    // Agarrar parede escalável
    if (c.climbable && wl > 0.3 && c.collider) {
      const dot = -(this.wish.x * c.nx + this.wish.z * c.nz) / wl;
      if (dot > CLIMB.grabDot) {
        this.startClimb(c.nx, c.nz, c.collider);
        return;
      }
    }

    // Seguir o chão (descidas e degraus); sair da borda = cair
    const sp = Math.hypot(this.hv.x, this.hv.z);
    const snap = 0.25 + sp * dt * 1.25;
    const g = this.groundAt();
    if (pos.y - g <= snap) {
      pos.y = g;
      this.vy = 0;
      this.lastGround = g;
    } else {
      this.setState('air');
      this.vy = 0;
      this.grounded = false;
      return;
    }

    // Água funda → nadar
    if (this.waterDepth > SWIM.depthToSwim) {
      this.startSwim();
      return;
    }

    this.faceMovement(dt, ctx, L.turnLambda * (sp > L.runSpeed + 1 ? 0.6 : 1));
    this.heightAboveGround = 0;
  }

  /** Remove da velocidade a componente que entra na parede (desliza ao longo dela). */
  private slideOffWall(v: V2) {
    const c = this.contact;
    const into = v.x * c.nx + v.z * c.nz;
    if (into < 0) {
      v.x -= c.nx * into;
      v.z -= c.nz * into;
    }
  }

  private doJump(speed: number) {
    this.vy = speed;
    this.grounded = false;
    this.jump.reset();
    this.setState('air');
    this.ctx.sys.audio.play('jump', { position: this.entity.position });
    this.ctx.events.emit('player:jump', {});
  }

  // =====================================================================
  // Ar (pulo/queda)
  // =====================================================================
  private updateAir(dt: number, ctx: GameContext) {
    const e = this.entity;
    const pos = e.position;
    this.grounded = false;
    this.airTime += dt;
    if (this.pressed('fly') && this.startFlight(false)) return;
    if (this.pressed('dodge') && this.airDodges > 0 && this.startDodge()) return;
    // coyote time: ainda dá para pular logo depois de sair da borda
    if (this.vy <= 0 && this.canControl() && this.jump.consume()) {
      this.doJump(JUMP.speed);
      return;
    }

    this.vy = Math.max(-JUMP.terminalSpeed, this.vy - JUMP.gravity * dt);
    if (-this.vy > this.maxFallSpeed) this.maxFallSpeed = -this.vy;

    // controle aéreo: mantém o embalo, permite corrigir a direção
    const wl = this.wish.length();
    if (wl > 0.01) {
      const cur = Math.hypot(this.hv.x, this.hv.z);
      const target = Math.max(cur, LOCOMOTION.runSpeed * this.stats.moveSpeed * this.health.moveMultiplier()) * Math.min(1, wl);
      accelerateXZ(this.hv, this.wish.x / wl, this.wish.z / wl, target, JUMP.airAccel, JUMP.airAccel * 0.5, dt);
    }

    this.moveCapsule((this.hv.x + this.knock.x) * dt, this.vy * dt, (this.hv.z + this.knock.z) * dt, false);
    const c = this.contact;
    if (c.collided) this.slideOffWall(this.hv);

    // bate a cabeça
    if (c.ceiling && this.vy > 0) this.vy = 0;

    // agarrar parede escalável no ar
    if (c.climbable && c.collider && (wl > 0.3 || this.vy < 0)) {
      const dot = wl > 0.3 ? -(this.wish.x * c.nx + this.wish.z * c.nz) / wl : 1;
      if (dot > CLIMB.grabDot) {
        this.startClimb(c.nx, c.nz, c.collider);
        return;
      }
    }

    // água
    const depth = this.sampleWater();
    const surf = ctx.physics.waterSurface(pos.x, pos.z);
    if (surf !== null && depth > SWIM.depthToSwim && pos.y < surf - SWIM.floatDepth + 0.15) {
      this.startSwim();
      return;
    }

    // aterrissagem
    const g = this.groundAt(Math.max(0.05, -this.vy * dt + 0.05));
    this.heightAboveGround = Math.max(0, pos.y - g);
    if (pos.y <= g && this.vy <= 0) {
      pos.y = g;
      this.lastGround = g;
      this.land(-this.vy);
      return;
    }
    this.faceMovement(dt, ctx, LOCOMOTION.turnLambda * 0.5);
  }

  /** Toca o chão vindo de uma queda/pulo. */
  private land(impact: number) {
    const ctx = this.ctx;
    this.vy = 0;
    this.grounded = true;
    this.setState('ground');
    this.airTime = 0;
    this.maxFallSpeed = 0;
    ctx.events.emit('player:landed', { impactSpeed: impact });
    const dmg = fallDamage(impact, this.health.max, this.health.current);
    if (dmg > 0) {
      ctx.sys.combat.applyDamage(this.entity, { amount: dmg, type: 'physical', poiseDamage: 0, unblockable: true, tag: 'fall' });
    }
    if (impact >= JUMP.hardLandingSpeed) {
      this.playAnimation('land');
      this.lockMovement(0.18 + Math.min(0.35, (impact - JUMP.hardLandingSpeed) * 0.02));
      this.hv.x *= 0.35;
      this.hv.z *= 0.35;
      ctx.sys.camera.shake(Math.min(1, impact / 30), 0.35);
      this.burstRing(14, 3.5);
      ctx.sys.vfx.burst('dust', this.entity.position, { count: 14, scale: 1 });
    } else if (impact > 3) {
      this.animator.landed(Math.min(1, impact / 14));
    }
  }

  // =====================================================================
  // Esquiva
  // =====================================================================
  private startDodge(): boolean {
    if (this.dodgeCooldown > 0 || this.isBusy() || !this.health.canAct()) return false;
    const cost = DODGE.energyCost * this.stats.dodgeCost;
    if (!this.spendEnergy(cost)) {
      this.ctx.sys.audio.play('ui_error');
      return false;
    }
    const e = this.entity;
    const from = this.state;
    this.dodgeFrom = from === 'flight' ? 'flight' : from === 'air' ? 'air' : 'ground';
    if (from === 'air') this.airDodges--;
    const wl = this.wish.length();
    if (wl > 0.1) this.dodgeDir.set(this.wish.x / wl, 0, this.wish.z / wl);
    else e.getForward(this.dodgeDir).multiplyScalar(this.dodgeFrom === 'flight' ? 1 : -1);
    // no voo, sem direção lateral: investida para o lado do giro
    if (this.dodgeFrom === 'flight' && wl <= 0.1) this.dodgeDir.set(this.camRight.x, 0, this.camRight.z);
    this.dodgeT = 0;
    this.dodgeDur = this.dodgeFrom === 'flight' ? DODGE.flightDashDuration : DODGE.duration;
    this.health.invulnerable = Math.max(this.health.invulnerable, DODGE.iframes);
    this.animator.stopActions(0.06);
    // rola sempre de frente para a direção (corpo gira); no voo mantém a frente
    if (this.dodgeFrom !== 'flight') e.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    this.setState('dodge');
    this.ctx.events.emit('player:dodge', {});
    this.burstRing(8, 2);
    return true;
  }

  private updateDodge(dt: number, ctx: GameContext) {
    const e = this.entity;
    const pos = e.position;
    this.dodgeT += dt;
    const u = Math.min(1, this.dodgeT / this.dodgeDur);
    if (this.dodgeFrom === 'flight') {
      const sp = DODGE.flightDashSpeed * this.stats.flightSpeed * (1.4 - u * 0.8);
      this.flightV.x = this.dodgeDir.x * sp;
      this.flightV.z = this.dodgeDir.z * sp;
      this.flightV.y *= Math.exp(-6 * dt);
      this.moveCapsule(this.flightV.x * dt, this.flightV.y * dt, this.flightV.z * dt, false);
      this.keepAboveGround(ctx);
      if (u >= 1) {
        this.flightV.multiplyScalar(0.55);
        this.setState('flight');
      }
      this.emitTrail(dt, 1);
      return;
    }
    // chão/ar: perfil de velocidade decrescente (distância total = DODGE.distance)
    const avg = DODGE.distance / this.dodgeDur;
    const sp = avg * (1.5 - u);
    this.hv.x = this.dodgeDir.x * sp;
    this.hv.z = this.dodgeDir.z * sp;
    this.vy = this.grounded ? 0 : Math.max(-JUMP.terminalSpeed, this.vy - JUMP.gravity * dt);
    this.moveCapsule(this.hv.x * dt, this.vy * dt, this.hv.z * dt, this.grounded);
    if (this.contact.collided) this.slideOffWall(this.hv);
    const g = this.groundAt();
    if (this.grounded) {
      if (pos.y - g <= 0.3 + sp * dt) {
        pos.y = g;
        this.lastGround = g;
      } else this.grounded = false;
    } else if (pos.y <= g && this.vy <= 0) {
      pos.y = g;
      this.grounded = true;
      this.vy = 0;
    }
    if (u >= 1) {
      this.dodgeCooldown = DODGE.cooldown;
      const keep = LOCOMOTION.runSpeed * 0.75;
      this.hv.x = this.dodgeDir.x * keep;
      this.hv.z = this.dodgeDir.z * keep;
      this.setState(this.grounded ? 'ground' : 'air');
    }
  }

  // =====================================================================
  // Escalada
  // =====================================================================
  private startClimb(nx: number, nz: number, collider: Collider) {
    const e = this.entity;
    this.wallN.set(nx, 0, nz).normalize();
    this.wallCollider = collider;
    this.hv.x = this.hv.z = 0;
    this.vy = 0;
    this.knock.set(0, 0, 0);
    this.mantleT = -1;
    e.yaw = Math.atan2(-nx, -nz);
    this.setState('climb');
    this.grounded = false;
    this.animator.stopActions(0.08);
  }

  private updateClimb(dt: number, ctx: GameContext) {
    const e = this.entity;
    const pos = e.position;
    const phys = ctx.physics;
    const R = PLAYER_BODY.radius;
    const n = this.wallN;

    // Transpondo a borda (animação de "mantle")
    if (this.mantleT >= 0) {
      this.mantleT += dt / CLIMB.mantleDuration;
      const u = Math.min(1, this.mantleT);
      const up = Math.min(1, u / 0.6);
      const fwd = clamp((u - 0.35) / 0.65, 0, 1);
      const eu = up * up * (3 - 2 * up);
      const ef = fwd * fwd * (3 - 2 * fwd);
      pos.x = this.mantleFrom.x + (this.mantleTo.x - this.mantleFrom.x) * ef;
      pos.z = this.mantleFrom.z + (this.mantleTo.z - this.mantleFrom.z) * ef;
      pos.y = this.mantleFrom.y + (this.mantleTo.y - this.mantleFrom.y) * eu;
      if (u >= 1) {
        this.mantleT = -1;
        pos.y = this.groundAt(0.3);
        this.lastGround = pos.y;
        this.setState('ground');
        this.grounded = true;
      }
      return;
    }

    // Soltar / pular da parede / voar
    if (this.pressed('jump')) {
      this.hv.x = n.x * CLIMB.wallJumpBack;
      this.hv.z = n.z * CLIMB.wallJumpBack;
      this.vy = CLIMB.wallJumpUp;
      e.yaw = Math.atan2(n.x, n.z);
      this.setState('air');
      this.ctx.sys.audio.play('jump', { position: pos });
      return;
    }
    if (this.pressed('descend') || this.pressed('dodge')) {
      this.hv.x = n.x * 1.2;
      this.hv.z = n.z * 1.2;
      this.vy = 0;
      this.setState('air');
      return;
    }
    if (this.pressed('fly')) {
      this.hv.x = n.x * 3;
      this.hv.z = n.z * 3;
      if (this.startFlight(false)) return;
    }

    // Movimento na parede: W/S vertical, A/D lateral (relativo à parede)
    const sp = CLIMB.speed * this.health.moveMultiplier();
    const rx = n.z; // direita do personagem olhando para a parede
    const rz = -n.x;
    const lockF = this.moveLock > 0 ? 0 : 1;
    const my = this.mz * sp * lockF;
    const mxx = -this.mx * sp * lockF;
    if (CLIMB.energyPerSecond > 0 && (my !== 0 || mxx !== 0)) {
      if (!this.spendEnergy(CLIMB.energyPerSecond * dt)) {
        this.setState('air');
        return;
      }
    }
    pos.x += rx * mxx * dt;
    pos.z += rz * mxx * dt;
    pos.y += my * dt;
    // gruda na parede: empurra para dentro e resolve
    pos.x -= n.x * 0.12;
    pos.z -= n.z * 0.12;
    this.moveCapsule(0, 0, 0, false);
    const c = this.contact;
    if (c.collided && c.climbable) {
      this.wallN.set(c.nx, 0, c.nz);
      if (c.collider) this.wallCollider = c.collider;
      e.yaw = dampAngle(e.yaw, Math.atan2(-c.nx, -c.nz), 12, dt);
    }

    // Probes: peito e cintura logo à frente (dentro da parede)
    const fx = pos.x - n.x * (R + 0.18);
    const fz = pos.z - n.z * (R + 0.18);
    const chest = colliderAt(phys, fx, pos.y + 1.55, fz, 0.02, true);
    const waist = colliderAt(phys, fx, pos.y + 0.55, fz, 0.02, true) ?? colliderAt(phys, fx, pos.y + 0.15, fz, 0.02, true);
    if (!chest && waist && this.mz >= 0) {
      // chegou ao topo: transpõe a borda
      const top = colliderTop(waist);
      this.mantleFrom.copy(pos);
      this.mantleTo.set(pos.x - n.x * (R + 0.45), top + 0.02, pos.z - n.z * (R + 0.45));
      this.mantleT = 0;
      this.playInternal('mantle', CLIMB.mantleDuration * 1.05);
      return;
    }
    if (!chest && !waist) {
      // saiu pela lateral / parede acabou
      this.setState('air');
      this.vy = 0;
      return;
    }
    // chão embaixo ao descer
    const g = this.groundAt(0.05);
    if (pos.y <= g + 0.02 && this.mz < 0) {
      pos.y = g;
      this.setState('ground');
      return;
    }
    if (pos.y < g) pos.y = g;
    this.heightAboveGround = pos.y - g;
  }

  // =====================================================================
  // Nado
  // =====================================================================
  private startSwim() {
    const pos = this.entity.position;
    const surf = this.ctx.physics.waterSurface(pos.x, pos.z);
    if (surf !== null) {
      if (this.state === 'air' || this.vy < -6) this.ctx.sys.vfx.burst('splash', pos, { count: 20, scale: 1.2 });
      pos.y = Math.min(pos.y, surf - SWIM.floatDepth);
    }
    this.vy = 0;
    this.hv.x *= 0.4;
    this.hv.z *= 0.4;
    this.grounded = false;
    this.setState('swim');
  }

  private updateSwim(dt: number, ctx: GameContext) {
    const pos = this.entity.position;
    if (this.pressed('fly') && this.startFlight(false)) return;
    const depth = this.sampleWater();
    const surf = ctx.physics.waterSurface(pos.x, pos.z);
    if (surf === null || depth < SWIM.depthToWade) {
      // saiu da água funda
      const g = this.groundAt(1.2);
      if (pos.y <= g + 0.6) {
        pos.y = Math.max(pos.y, g);
        this.setState('ground');
        return;
      }
    }
    const target = (this.held('sprint') ? SWIM.fastSpeed : SWIM.speed) * this.health.moveMultiplier() * (this.moveLock > 0 ? 0 : 1);
    const wl = this.wish.length();
    accelerateXZ(this.hv, wl > 0.01 ? this.wish.x / wl : 0, wl > 0.01 ? this.wish.z / wl : 0, target * Math.min(1, wl), SWIM.accel, SWIM.accel, dt);
    // flutua na superfície
    if (surf !== null) {
      const ty = surf - SWIM.floatDepth;
      this.vy = (ty - pos.y) * 4;
    }
    if (this.pressed('jump')) {
      this.doJump(JUMP.speed * 0.75);
      return;
    }
    this.moveCapsule((this.hv.x + this.knock.x) * dt, this.vy * dt, (this.hv.z + this.knock.z) * dt, true);
    if (this.contact.collided) this.slideOffWall(this.hv);
    const g = this.groundAt(0.3);
    if (pos.y < g) pos.y = g;
    this.faceMovement(dt, ctx, 5);
    // braçadas → som de água
    if (this.animator.footstep || (wl > 0.2 && Math.floor(this.stateTime * 1.1) !== Math.floor((this.stateTime - dt) * 1.1))) {
      ctx.events.emit('player:footstep', { surface: 'water', running: false });
    }
    this.heightAboveGround = 0;
  }

  // =====================================================================
  // Voo
  // =====================================================================
  /** Inicia o voo (F). Retorna false se não houver energia. */
  startFlight(fromGround = this.state === 'ground'): boolean {
    if (this.state === 'flight' || this.state === 'dead' || this.state === 'stagger') return false;
    if (!this.health.canAct()) return false;
    const ctx = this.ctx;
    if (this.energy.current < FLIGHT.minEnergyToStart && !ctx.sys.abilities?.ascended) {
      this.warn('Energia arcana insuficiente para voar.');
      ctx.sys.audio.play('ui_error');
      return false;
    }
    if (!ctx.sys.abilities?.ascended) this.spendEnergy(FLIGHT.takeoffCost * this.stats.flightCost);
    this.flightV.set(this.hv.x, Math.max(this.vy, 0), this.hv.z);
    if (fromGround || this.state === 'swim') {
      this.flightV.y = FLIGHT.takeoffImpulse;
      this.takeoffT = 0;
      this.playInternal('takeoff', FLIGHT.takeoffDuration * 1.3);
      this.burstRing(22, 4.5);
      ctx.sys.vfx.burst('arcaneBurst', this.entity.position, { count: 18, scale: 0.8 });
      ctx.sys.camera.shake(0.25, 0.25);
    } else {
      this.flightV.y = Math.max(this.flightV.y, 1.5);
      this.takeoffT = FLIGHT.takeoffDuration * 0.6;
      this.burstRing(10, 3);
    }
    this.vy = 0;
    this.grounded = false;
    this.flightPitch = 0;
    this.bank = 0;
    this.hover = 1;
    this.setState('flight');
    ctx.events.emit('player:flightStart', {});
    return true;
  }

  /** Encerra o voo. `soft` = pouso controlado; senão começa a cair. */
  endFlight(soft = false) {
    if (this.state !== 'flight' && !(this.state === 'dodge' && this.dodgeFrom === 'flight')) return;
    const ctx = this.ctx;
    this.hv.x = this.flightV.x;
    this.hv.z = this.flightV.z;
    this.vy = Math.min(this.flightV.y, 2);
    this.boosting = false;
    this.gliding = false;
    ctx.events.emit('player:flightEnd', {});
    if (soft) {
      const pos = this.entity.position;
      const g = this.groundAt(1.5);
      const impact = Math.max(0, -this.flightV.y);
      pos.y = Math.max(g, Math.min(pos.y, g + 0.02));
      const sp = Math.hypot(this.hv.x, this.hv.z);
      const maxKeep = LOCOMOTION.runSpeed;
      if (sp > maxKeep) {
        this.hv.x *= maxKeep / sp;
        this.hv.z *= maxKeep / sp;
      }
      this.vy = 0;
      this.grounded = true;
      this.lastGround = pos.y;
      this.setState('ground');
      ctx.events.emit('player:landed', { impactSpeed: impact });
      this.animator.landed(0.55 + Math.min(0.45, sp / 25));
      this.burstRing(18, 3.8);
      ctx.sys.vfx.burst('dust', pos, { count: 10, scale: 0.8 });
      if (sp > 10) ctx.sys.camera.shake(0.2, 0.2);
    } else {
      this.grounded = false;
      this.setState('air');
    }
  }

  private updateFlight(dt: number, ctx: GameContext) {
    const e = this.entity;
    const pos = e.position;
    const F = FLIGHT;
    const v = this.flightV;
    this.grounded = false;
    this.takeoffT += dt;
    const inTakeoff = this.takeoffT < F.takeoffDuration;

    if (this.pressed('dodge') && this.startDodge()) return;

    const g = this.groundAt(0.3);
    const hag = pos.y - g;
    this.heightAboveGround = Math.max(0, hag);

    // F: pousa se perto do chão, senão desliga o voo e cai
    if (this.pressed('fly')) {
      if (hag < 2.5) this.endFlight(true);
      else this.endFlight(false);
      return;
    }

    const hasEnergy = this.energy.current > 0.01 || !!ctx.sys.abilities?.ascended;
    this.gliding = !hasEnergy;
    const up = this.held('jump') && hasEnergy;
    const down = this.held('descend');
    const wl = this.wish.length();
    const moving = wl > 0.05;
    const forwardInput = this.mz > 0;
    this.boosting = this.held('sprint') && hasEnergy && moving && forwardInput && !inTakeoff;
    this.boostW = damp(this.boostW, this.boosting ? 1 : 0, 6, dt);
    const mul = this.stats.flightSpeed * Math.max(0.15, this.health.moveMultiplier());
    const lock = this.moveLock > 0 ? 0 : 1;

    // Velocidade alvo
    const tv = this.tv1;
    let hSpeed = (this.boosting ? F.boostSpeed : F.cruiseSpeed) * mul;
    if (this.gliding) hSpeed = Math.min(hSpeed, F.glideSpeed);
    tv.set(this.wish.x * hSpeed * lock, 0, this.wish.z * hSpeed * lock);
    let vSpeed = ((up ? 1 : 0) - (down ? 1 : 0)) * F.verticalSpeed * mul;
    if (this.boosting) {
      // turbo segue a inclinação da câmera em relação à neutra (mergulhar / subir olhando)
      let ly = -(ctx.sys.camera.pitch - CAMERA.defaultPitch);
      const dz = F.boostPitchDeadZone;
      ly = Math.abs(ly) < dz ? 0 : clamp(ly - Math.sign(ly) * dz, -1, 1);
      vSpeed += Math.sin(ly) * F.boostSpeed * F.boostPitchFactor * mul;
    }
    if (this.gliding) vSpeed = Math.min(vSpeed, 0) - F.glideSinkSpeed;
    // teto de voo (desacelera a subida perto do limite)
    const ceilRoom = MAX_FLIGHT_ALTITUDE - pos.y;
    if (vSpeed > 0 && ceilRoom < F.ceilingMargin) {
      vSpeed *= clamp(ceilRoom / F.ceilingMargin, 0, 1);
      if (ceilRoom < 3) this.warn('O ar rarefeito impede que você suba mais.');
    }
    tv.y = vSpeed;

    // Decolagem: impulso vertical decaindo, controle horizontal reduzido
    if (inTakeoff) {
      const k = this.takeoffT / F.takeoffDuration;
      tv.y = Math.max(tv.y, F.takeoffImpulse * (1 - k) * 0.6);
      tv.x *= 0.5;
      tv.z *= 0.5;
    }

    // Aceleração 3D: ganha com accel/boostAccel, freia com brake (inércia sem deslizar)
    const accel = this.boosting ? F.boostAccel : F.accel;
    const dvx = tv.x - v.x;
    const dvy = tv.y - v.y;
    const dvz = tv.z - v.z;
    const dl = Math.hypot(dvx, dvy, dvz);
    if (dl > 1e-5) {
      const curSp = v.length();
      const tgtSp = tv.length();
      let rate = tgtSp >= curSp - 0.5 ? accel : F.brake + (moving ? accel * 0.35 : 0);
      if (curSp > 1 && tgtSp > 1 && (v.x * tv.x + v.y * tv.y + v.z * tv.z) / (curSp * tgtSp) < 0.3) rate *= 1.5;
      if (inTakeoff) rate = Math.max(rate, 30);
      const step = Math.min(dl, rate * dt);
      v.x += (dvx / dl) * step;
      v.y += (dvy / dl) * step;
      v.z += (dvz / dl) * step;
    }
    v.x += this.knock.x * dt * 2;
    v.z += this.knock.z * dt * 2;

    // Move e colide
    this.moveCapsule(v.x * dt, v.y * dt, v.z * dt, false);
    if (this.contact.collided) {
      const c = this.contact;
      const into = v.x * c.nx + v.z * c.nz;
      if (into < 0) {
        v.x -= c.nx * into;
        v.z -= c.nz * into;
        if (-into > 14) ctx.sys.camera.shake(Math.min(0.6, -into / 40), 0.25);
      }
    }
    // teto (ilhas/estruturas acima)
    if (this.contact.ceiling && v.y > 0) v.y = 0;
    if (pos.y >= MAX_FLIGHT_ALTITUDE - 0.01 && v.y > 0) v.y = 0;
    const ground = this.keepAboveGround(ctx);

    // Limite do mundo
    const edge = PLAYABLE_HALF - Math.max(Math.abs(pos.x), Math.abs(pos.z));
    if (edge < F.edgeWarnDistance) this.warn('Uma barreira arcana marca o limite do mundo conhecido.');

    // Energia
    // Forma Ascendente: voo gratuito (o custo não é cobrado enquanto `abilities.ascended`).
    if ((!inTakeoff || this.takeoffT > 0.2) && !ctx.sys.abilities?.ascended) {
      const cost = flightEnergyCost(dt, moving, this.boosting, up, this.stats.flightCost);
      if (cost > 0) {
        this.energy.current = Math.max(0, this.energy.current - cost);
        this.energySpentAt = ctx.elapsed;
      }
    }

    // Pouso automático ao chegar perto do chão descendo devagar
    const hag2 = pos.y - ground;
    const hsp = Math.hypot(v.x, v.z);
    if (!inTakeoff && hag2 < F.autoLandHeight && (down || this.gliding || (v.y < -0.5 && !moving)) && hsp < F.autoLandMaxSpeed) {
      this.endFlight(true);
      return;
    }
    // Água: planando sem energia e tocando a água → nada
    const surf = ctx.physics.waterSurface(pos.x, pos.z);
    if (surf !== null && pos.y < surf + 0.35) {
      if (this.gliding) {
        this.endFlight(false);
        this.startSwim();
        return;
      }
      pos.y = surf + 0.35;
      if (v.y < 0) v.y = 0;
    }

    // Orientação: segue a velocidade em cruzeiro; pairando, olha para onde a câmera olha
    const camYaw = Math.atan2(this.camFwd.x, this.camFwd.z);
    let targetYaw = e.yaw;
    if (this.lockTarget && this.lockTarget.alive) targetYaw = Math.atan2(this.lockTarget.position.x - pos.x, this.lockTarget.position.z - pos.z);
    else if (this.animator.faceAim) targetYaw = camYaw;
    else if (hsp > 4 && (v.x * this.camFwd.x + v.z * this.camFwd.z) / hsp > -0.35) targetYaw = Math.atan2(v.x, v.z);
    else targetYaw = camYaw;
    e.yaw = dampAngle(e.yaw, targetYaw, this.boosting ? 3.5 : 5.5, dt);

    // Postura: inclinação para frente proporcional ao avanço, nariz acompanha subida/descida
    const fwdSpeed = (v.x * Math.sin(e.yaw) + v.z * Math.cos(e.yaw));
    const latSpeed = (v.x * Math.cos(e.yaw) - v.z * Math.sin(e.yaw));
    const deg = Math.PI / 180;
    const cruiseF = clamp(fwdSpeed / (F.cruiseSpeed * mul), -0.4, 1);
    let pitchT = cruiseF * F.pitchCruiseDeg * deg;
    pitchT += this.boostW * (F.pitchBoostDeg - F.pitchCruiseDeg) * deg * clamp(fwdSpeed / (F.boostSpeed * 0.6), 0, 1);
    if (hsp > 6) pitchT -= Math.atan2(v.y, hsp) * 0.75;
    else pitchT -= clamp(v.y / F.verticalSpeed, -1, 1) * 0.08;
    this.flightPitch = damp(this.flightPitch, clamp(pitchT, -0.5, 1.5), 5, dt);
    const bankT = bankFromTurn(this.turnRate, hsp, F.bankMaxDeg * deg) + clamp(latSpeed * 0.03, -0.35, 0.35);
    this.bank = damp(this.bank, bankT, 4, dt);
    this.hover = damp(this.hover, clamp(1 - hsp / 6, 0, 1), 4, dt);

    this.emitTrail(dt, this.boostW);
  }

  /** Mantém altura mínima sobre o terreno/topos, deslizando ao longo das encostas. Retorna a altura do chão. */
  private keepAboveGround(ctx: GameContext): number {
    const pos = this.entity.position;
    const v = this.flightV;
    const g = ctx.physics.groundHeight(pos.x, pos.z, pos.y + FLIGHT.minClearance, 0.4, PLAYER_BODY.radius * 2);
    const min = g + FLIGHT.minClearance;
    if (pos.y < min) {
      const terrain = ctx.physics.terrainHeight(pos.x, pos.z);
      if (g - terrain < 0.05) {
        // encosta do terreno: remove a componente que entra no relevo
        ctx.heightfield.normalAt(pos.x, pos.z, this.nrm);
        const into = v.x * this.nrm.x + v.y * this.nrm.y + v.z * this.nrm.z;
        if (into < 0) {
          v.x -= this.nrm.x * into;
          v.y -= this.nrm.y * into;
          v.z -= this.nrm.z * into;
        }
      } else if (v.y < 0) v.y = 0;
      pos.y = min;
    }
    return g;
  }

  // =====================================================================
  // Atordoado / morte
  // =====================================================================
  private enterStagger() {
    this.staggerFrom = this.state;
    if (this.staggerFrom === 'dodge') this.staggerFrom = this.grounded ? 'ground' : 'air';
    this.animator.stopActions(0.05);
    this.playAnimation('hit', { speed: 0.7 });
    this.setState('stagger');
  }

  private updateStagger(dt: number, ctx: GameContext) {
    const pos = this.entity.position;
    const L = LOCOMOTION;
    accelerateXZ(this.hv, 0, 0, 0, L.accel, L.decel * 0.6, dt);
    if (this.staggerFrom === 'swim') {
      this.updateSwimDrift(dt, ctx);
    } else {
      this.vy = this.grounded ? 0 : Math.max(-JUMP.terminalSpeed, this.vy - JUMP.gravity * dt);
      this.moveCapsule((this.hv.x + this.knock.x) * dt, this.vy * dt, (this.hv.z + this.knock.z) * dt, this.grounded);
      const g = this.groundAt();
      if (pos.y <= g + (this.grounded ? 0.35 : 0)) {
        pos.y = g;
        if (!this.grounded && this.vy < -JUMP.hardLandingSpeed) ctx.events.emit('player:landed', { impactSpeed: -this.vy });
        this.vy = 0;
        this.grounded = true;
      } else this.grounded = false;
    }
    if (!this.health.staggered && this.stateTime > 0.2) {
      if (this.staggerFrom === 'swim') this.setState('swim');
      else this.setState(this.grounded ? 'ground' : 'air');
    }
  }

  private updateSwimDrift(dt: number, ctx: GameContext) {
    const pos = this.entity.position;
    const surf = ctx.physics.waterSurface(pos.x, pos.z);
    if (surf !== null) pos.y += (surf - SWIM.floatDepth - pos.y) * Math.min(1, 4 * dt);
    this.moveCapsule((this.hv.x + this.knock.x) * dt, 0, (this.hv.z + this.knock.z) * dt, false);
  }

  /** Morte: animação, evento e, após um tempo, o estado de jogo 'dead'. */
  private die() {
    if (this.state === 'dead') return;
    const wasFlying = this.state === 'flight';
    if (wasFlying) this.ctx.events.emit('player:flightEnd', {});
    this.entity.alive = false;
    this.lockTarget = null;
    this.blocking = false;
    this.health.blocking = false;
    this.mantleT = -1;
    this.boosting = this.gliding = false;
    if (wasFlying) {
      this.hv.x = this.flightV.x * 0.5;
      this.hv.z = this.flightV.z * 0.5;
      this.vy = Math.min(0, this.flightV.y);
      this.grounded = false;
    }
    this.animator.stopActions(0.05);
    this.animator.play('death', 1.6);
    this.setState('dead');
    this.deathTimer = DEATH_DELAY;
    this.deadStateSet = false;
    this.ctx.events.emit('player:death', {});
  }

  private updateDead(dt: number, ctx: GameContext) {
    const pos = this.entity.position;
    const L = LOCOMOTION;
    accelerateXZ(this.hv, 0, 0, 0, L.accel, L.decel * 0.5, dt);
    const surf = ctx.physics.waterSurface(pos.x, pos.z);
    if (surf !== null && pos.y < surf - SWIM.floatDepth) {
      pos.y += (surf - SWIM.floatDepth - pos.y) * Math.min(1, 2 * dt);
      this.vy = 0;
    } else {
      this.vy = Math.max(-JUMP.terminalSpeed, this.vy - JUMP.gravity * dt);
      this.moveCapsule(this.hv.x * dt, this.vy * dt, this.hv.z * dt, false);
      const g = this.groundAt(0.6);
      if (pos.y <= g) {
        pos.y = g;
        this.vy = 0;
        this.hv.x *= 0.5;
        this.hv.z *= 0.5;
      }
    }
    this.deathTimer -= dt;
    if (this.deathTimer <= 0 && !this.deadStateSet) {
      this.deadStateSet = true;
      if (ctx.state === 'playing' || ctx.state === 'cinematic') ctx.setState('dead');
    }
  }

  private onDamaged(info: DamageInfo) {
    if (this.state === 'dead' || info.tag === 'fall' || info.tag === 'dot') return;
    // reação visual leve (não interrompe ações pesadas)
    if (!this.isBusy() && this.state !== 'stagger' && this.state !== 'dodge') {
      this.animator.play('hit', ANIM_DURATION.hit);
    }
    if (info.amount > this.health.max * 0.12) this.ctx.sys.camera.shake(Math.min(0.8, info.amount / this.health.max), 0.25);
  }

  // =====================================================================
  // Orientação do corpo
  // =====================================================================
  private faceMovement(dt: number, ctx: GameContext, lambda: number) {
    const e = this.entity;
    const lt = this.lockTarget;
    const sprinting = this.held('sprint') && this.horizontalSpeed > LOCOMOTION.runSpeed;
    let target: number | null = null;
    if (this.animator.faceAim || this.blocking) {
      if (lt && lt.alive) target = Math.atan2(lt.position.x - e.position.x, lt.position.z - e.position.z);
      else target = Math.atan2(this.camFwd.x, this.camFwd.z);
      lambda = Math.max(lambda, 16);
    } else if (lt && lt.alive && !sprinting && this.state === 'ground') {
      target = Math.atan2(lt.position.x - e.position.x, lt.position.z - e.position.z);
    } else {
      const wl = this.wish.length();
      if (wl > 0.1 && this.moveLock <= 0) target = Math.atan2(this.wish.x, this.wish.z);
    }
    if (target !== null) e.yaw = dampAngle(e.yaw, target, lambda, dt);
    void ctx;
  }

  // =====================================================================
  // Visual: animação, capa, runas, partículas
  // =====================================================================
  private updateVisuals(dt: number, ctx: GameContext) {
    const e = this.entity;
    const m = this.model;
    const p = this.params;
    const anim = this.animator;

    // Parâmetros de animação
    let mode: LocoMode;
    switch (this.state) {
      case 'flight':
        mode = 'flight';
        break;
      case 'air':
        mode = 'air';
        break;
      case 'climb':
        mode = this.mantleT >= 0 ? 'ground' : 'climb';
        break;
      case 'swim':
        mode = 'swim';
        break;
      case 'dodge':
        mode = 'dodge';
        break;
      case 'dead':
        mode = 'dead';
        break;
      case 'stagger':
        mode = this.staggerFrom === 'swim' ? 'swim' : this.grounded ? 'ground' : 'air';
        break;
      default:
        mode = 'ground';
    }
    p.mode = mode;
    const sy = Math.sin(e.yaw);
    const cy = Math.cos(e.yaw);
    const vx = this.state === 'flight' ? this.flightV.x : this.hv.x;
    const vz = this.state === 'flight' ? this.flightV.z : this.hv.z;
    p.speed = this.state === 'stagger' || this.state === 'climb' ? 0 : Math.hypot(vx, vz);
    p.vy = this.state === 'flight' ? this.flightV.y : this.vy;
    p.turnRate = this.turnRate;
    const sp = p.speed;
    if (sp > 0.2) {
      p.localMoveZ = (vx * sy + vz * cy) / sp;
      p.localMoveX = (vx * cy - vz * sy) / sp;
    } else {
      p.localMoveZ = 1;
      p.localMoveX = 0;
    }
    p.strafe = this.lockTarget && this.lockTarget.alive && this.state === 'ground' ? 1 : 0;
    p.flightPitch = this.flightPitch;
    p.flightBank = this.bank;
    p.hover = this.hover;
    p.boost = this.boostW;
    p.vertical = this.state === 'flight' ? clamp(this.flightV.y / FLIGHT.verticalSpeed, -1, 1) : 0;
    p.gliding = this.gliding;
    p.climbX = this.state === 'climb' ? -this.mx : 0;
    p.climbY = this.state === 'climb' ? this.mz : 0;
    p.swimStroke = this.state === 'swim' ? clamp(sp / SWIM.speed, 0, 1) : 0;
    p.dodgeT = this.state === 'dodge' ? this.dodgeT / this.dodgeDur : -1;
    p.dodgeAir = this.dodgeFrom === 'flight';
    if (this.state === 'dodge' && this.dodgeFrom === 'flight') {
      p.localMoveX = this.dodgeDir.x * cy - this.dodgeDir.z * sy;
    }
    p.blocking = this.blocking && this.state !== 'dead';
    // olhar: segue a câmera / alvo, limitado ao campo do pescoço
    const camYaw = Math.atan2(this.camFwd.x, this.camFwd.z);
    let lookYaw = angleDiff(e.yaw, camYaw);
    if (this.lockTarget && this.lockTarget.alive) lookYaw = angleDiff(e.yaw, Math.atan2(this.lockTarget.position.x - e.position.x, this.lockTarget.position.z - e.position.z));
    if (Math.abs(lookYaw) > 2.1) lookYaw = 0;
    const camPitch = ctx.sys.camera.pitch;
    p.lookYaw = damp(p.lookYaw, this.state === 'climb' || this.state === 'dodge' ? 0 : lookYaw, 6, dt);
    p.lookPitch = damp(p.lookPitch, this.state === 'flight' || this.state === 'climb' ? 0 : clamp(camPitch - 0.22, -0.7, 0.9) * 0.6, 6, dt);
    p.aimWeight = damp(p.aimWeight, anim.faceAim || this.blocking ? 1 : 0, 8, dt);

    anim.update(dt, p);
    m.applyPose(anim.pose);

    // Passos
    if (anim.footstep && this.state === 'ground' && this.grounded) {
      this.ctx.events.emit('player:footstep', { surface: this.surfaceUnderFeet(), running: sp > LOCOMOTION.walkSpeed + 0.5 });
    }

    // Arma escondida ao escalar/nadar (materializa de volta depois)
    const showWeapon = this.state !== 'climb' && this.state !== 'swim' && !(this.state === 'stagger' && this.staggerFrom === 'swim');
    if (showWeapon !== this.weaponShown) {
      this.weaponShown = showWeapon;
      m.weaponSocket.visible = showWeapon;
      if (showWeapon) {
        e.object3d.updateMatrixWorld(true);
        this.getWeaponTipWorldPosition(this.tv3);
        this.burstAt(this.tv3, 10, 1.4);
      }
    }

    // Matrizes do mundo (para capa, mãos e câmera)
    e.object3d.updateMatrixWorld(true);

    // Runas: brilho segue a energia; Forma Ascendente troca cor/glifos
    const ascended = !!ctx.sys.abilities?.ascended;
    this.ascend = damp(this.ascend, ascended ? 1 : 0, 2.5, dt);
    const ef = this.energy.max > 0 ? this.energy.current / this.energy.max : 0;
    RUNE_UNIFORMS.uRuneTime.value += dt;
    RUNE_UNIFORMS.uAscend.value = this.ascend;
    const low = ef < 0.15 ? 0.55 + 0.45 * Math.abs(Math.sin(ctx.elapsed * 9)) : 1;
    RUNE_UNIFORMS.uRuneIntensity.value = (0.25 + 1.35 * ef + 0.9 * this.ascend) * low * (this.state === 'dead' ? Math.max(0, this.deathTimer / DEATH_DELAY) : 1);
    RUNE_UNIFORMS.uRuneColor.value.copy(RUNE_NORMAL).lerp(RUNE_ASCENDED, this.ascend);
    this.fx.setRuneColor(RUNE_UNIFORMS.uRuneColor.value);
    m.auraLevel[0] = damp(m.auraLevel[0], anim.aura[0], 12, dt);
    m.auraLevel[1] = damp(m.auraLevel[1], anim.aura[1], 12, dt);
    m.updateGlow(dt, this.state === 'dead' ? 0 : ef, this.ascend, Math.max(anim.aura[0], anim.aura[1]));

    // Capa: vento do mundo + agitação no voo
    const windK = GLOBAL_UNIFORMS.uWindStrength.value * 3.2;
    const wd = GLOBAL_UNIFORMS.uWindDir.value;
    const gust = 0.75 + 0.25 * Math.sin(ctx.elapsed * 1.7) * Math.sin(ctx.elapsed * 0.63);
    m.cape.wind.set(wd.x * windK * gust, 0, wd.y * windK * gust);
    const fl = this.state === 'flight' ? clamp(this.flightV.length() / FLIGHT.boostSpeed, 0, 1) : this.state === 'air' ? 0.15 : 0;
    m.cape.flutter = fl * 0.9;
    m.cape.groundY = this.state === 'flight' ? -Infinity : e.position.y - 0.02;
    m.cape.update(dt);
    if (m.tabard) {
      m.tabard.wind.copy(m.cape.wind);
      m.tabard.flutter = fl * 0.6;
      m.tabard.groundY = m.cape.groundY;
      m.tabard.update(dt);
    }

    // Partículas: aura das mãos e Forma Ascendente
    const fx = this.fx;
    for (let s = 0; s < 2; s++) {
      const a = m.auraLevel[s];
      if (a < 0.25) continue;
      const n = fx.take(2 + s, PLAYER_FX.handRate * a, dt);
      if (n > 0) {
        m.getHandWorld(s === 0 ? 'left' : 'right', this.tv2);
        for (let i = 0; i < n; i++) {
          fx.emit(this.tv2.x + rnd(0.08), this.tv2.y + rnd(0.08), this.tv2.z + rnd(0.08), rnd(0.6), 0.4 + Math.random() * 0.6, rnd(0.6), 0.45 + Math.random() * 0.3, 0.035, 0, 0, 0, 0, 2.5, 0.8);
        }
      }
    }
    if (this.ascend > 0.05) {
      const n = fx.take(4, PLAYER_FX.ascendRate * this.ascend, dt);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.35 + Math.random() * 0.25;
        fx.emit(e.position.x + Math.sin(a) * r, e.position.y + Math.random() * 1.6, e.position.z + Math.cos(a) * r, 0, 0.6, 0, 1.0 + Math.random() * 0.6, 0.03, 0, 0, 0, 0, 0.5, 0.9);
      }
    }
    fx.update(dt);
  }

  /** Centelhas e rastros de vento do voo. `boost` 0..1. */
  private emitTrail(dt: number, boost: number) {
    const fx = this.fx;
    const e = this.entity;
    const v = this.flightV;
    const sp = v.length();
    const m = this.model;
    // centelhas dos pés/mãos e da bainha
    const rate = PLAYER_FX.flightSparkRate * (0.35 + Math.min(1, sp / FLIGHT.cruiseSpeed) * 0.65 + boost * 0.8) * (this.gliding ? 0.25 : 1);
    const n = fx.take(0, rate, dt);
    for (let i = 0; i < n; i++) {
      const which = i % 3;
      if (which === 0) m.getBoneWorld(B.footL, this.tv2, 0, -0.08, 0.04);
      else if (which === 1) m.getBoneWorld(B.footR, this.tv2, 0, -0.08, 0.04);
      else m.cape.particle(m.capeRows - 1, (Math.random() * m.capeCols) | 0, this.tv2);
      fx.emit(this.tv2.x + rnd(0.1), this.tv2.y + rnd(0.1), this.tv2.z + rnd(0.1), v.x * 0.15 + rnd(0.5), v.y * 0.15 - 0.4 + rnd(0.4), v.z * 0.15 + rnd(0.5), 0.5 + Math.random() * 0.5, 0.04, 0, 0, 0, 0, 2.2, 0);
    }
    // rastros de vento: riscos parados no mundo que o mago ultrapassa
    if (sp > 7) {
      const k = clamp((sp - 7) / (FLIGHT.boostSpeed - 7), 0, 1);
      const nw = fx.take(1, PLAYER_FX.windRate * k, dt);
      if (nw > 0) {
        const inv = 1 / sp;
        const dx = v.x * inv;
        const dy = v.y * inv;
        const dz = v.z * inv;
        for (let i = 0; i < nw; i++) {
          // ponto à frente, deslocado para os lados (tubo ao redor da rota)
          const ahead = 2 + Math.random() * 7;
          const ang = Math.random() * Math.PI * 2;
          const rad = 1.2 + Math.random() * 3.2;
          // base ortonormal perpendicular à direção
          let ux = -dz;
          let uz = dx;
          const ul = Math.hypot(ux, uz) || 1;
          ux /= ul;
          uz /= ul;
          const wx = dy * uz;
          const wy = dz * ux - dx * uz;
          const wz = -dy * ux;
          const ox = Math.cos(ang) * ux * rad + Math.sin(ang) * wx * rad;
          const oy = Math.sin(ang) * wy * rad + 0.9;
          const oz = Math.cos(ang) * uz * rad + Math.sin(ang) * wz * rad;
          const len = 0.055 * sp;
          fx.emit(e.position.x + dx * ahead + ox, e.position.y + dy * ahead + oy, e.position.z + dz * ahead + oz, 0, 0, 0, 0.32 + Math.random() * 0.2, 0.012 + 0.01 * k, 1, dx * len, dy * len, dz * len, 0, 0);
        }
      }
    }
  }

  /** Anel de centelhas no chão (decolagem/pouso/esquiva). */
  private burstRing(count: number, speed: number) {
    const p = this.entity.position;
    const n = Math.round(count * (this.fx.capacity >= 200 ? 1 : 0.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const s = speed * (0.7 + Math.random() * 0.5);
      this.fx.emit(p.x + Math.sin(a) * 0.3, p.y + 0.1, p.z + Math.cos(a) * 0.3, Math.sin(a) * s, 0.4 + Math.random() * 0.8, Math.cos(a) * s, 0.5 + Math.random() * 0.35, 0.045, 0, 0, 0, 0, 3.2, 0.5);
    }
  }

  private burstAt(pt: THREE.Vector3, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      this.fx.emit(pt.x, pt.y, pt.z, rnd(speed), rnd(speed), rnd(speed), 0.4 + Math.random() * 0.3, 0.04, 0, 0, 0, 0, 3, 0);
    }
  }

  private surfaceUnderFeet(): SurfaceType {
    const p = this.entity.position;
    const ctx = this.ctx;
    const terrain = ctx.physics.terrainHeight(p.x, p.z);
    if (p.y > terrain + 0.1) {
      const c = colliderAt(ctx.physics, p.x, p.y - 0.08, p.z, 0.3);
      if (c) {
        if (c.surface && SURFACES.has(c.surface)) return c.surface as SurfaceType;
        return c.tag === 'bridge' ? 'wood' : c.tag === 'tree' ? 'wood' : 'stone';
      }
    }
    if (this.waterDepth > 0.05) return 'water';
    return ctx.sys.world.surfaceAt(p.x, p.z);
  }

  private warn(text: string) {
    if (this.warnTimer > 0) return;
    this.warnTimer = 4;
    this.ctx.sys.ui.notify(text, 'warning');
  }

  private setState(s: PlayerState) {
    if (s === this.state) return;
    this.state = s;
    this.stateTime = 0;
  }

  /** Clipes internos (decolagem, transpor borda) — fora do contrato PlayerAnim. */
  private playInternal(name: 'takeoff' | 'mantle', duration: number) {
    this.animator.play(name, duration);
  }

  // =====================================================================
  // API pública (contrato)
  // =====================================================================
  canInteract(): boolean {
    return this.state !== 'dead' && this.state !== 'flight' && this.state !== 'climb' && this.state !== 'dodge';
  }
  canAct(): boolean {
    return this.state !== 'dead' && this.state !== 'stagger' && this.state !== 'dodge' && this.state !== 'climb' && this.mantleT < 0;
  }
  /** Pode conjurar magias pesadas (não nadando nem escalando). */
  canCastHeavy(): boolean {
    return this.canAct() && this.state !== 'swim';
  }
  isFlying(): boolean {
    return this.state === 'flight' || (this.state === 'dodge' && this.dodgeFrom === 'flight');
  }
  isSwimming(): boolean {
    return this.state === 'swim';
  }
  isClimbing(): boolean {
    return this.state === 'climb';
  }
  spendEnergy(amount: number): boolean {
    if (this.energy.current < amount) return false;
    this.energy.current -= amount;
    if (amount > 0) this.energySpentAt = this.ctx ? this.ctx.elapsed : 0;
    return true;
  }
  restoreEnergy(amount: number) {
    this.energy.current = Math.min(this.energy.max, this.energy.current + amount);
  }
  teleport(pos: THREE.Vector3, yaw?: number) {
    const e = this.entity;
    e.position.copy(pos);
    e.velocity.set(0, 0, 0);
    this.lastVel.set(0, 0, 0);
    this.hv.x = this.hv.z = 0;
    this.vy = 0;
    this.knock.set(0, 0, 0);
    this.flightV.set(0, 0, 0);
    if (yaw !== undefined) {
      e.yaw = yaw;
      this.lastYaw = yaw;
      e.object3d.rotation.y = yaw;
    }
    this.lastGround = pos.y;
    this.mantleT = -1;
    this.model?.cape.reset();
    this.model?.tabard?.reset();
    this.fx?.clear();
    if (this.ctx) {
      this.ctx.entities.focus.copy(pos);
      (this.ctx.sys.camera as { snap?: () => void } | undefined)?.snap?.();
    }
  }
  /** Raio de mira a partir do centro da tela (ou do lock-on). */
  getAimRay(outOrigin: THREE.Vector3, outDir: THREE.Vector3): void {
    const e = this.entity;
    // origem: altura do peito, levemente à frente do corpo
    outOrigin.set(e.position.x + Math.sin(e.yaw) * 0.3, e.position.y + 1.45, e.position.z + Math.cos(e.yaw) * 0.3);
    if (this.lockTarget && this.lockTarget.alive && !this.lockTarget.removed) {
      this.lockTarget.getCenter(outDir).sub(outOrigin);
      const l = outDir.length();
      if (l > 1e-4) {
        outDir.multiplyScalar(1 / l);
        return;
      }
    }
    // ponto sob a mira (centro da tela) → direção a partir do peito
    const cam = this.ctx.sys.camera;
    cam.getAimTarget(120, this.tv3);
    outDir.subVectors(this.tv3, outOrigin);
    const l = outDir.length();
    if (l > 0.5) outDir.multiplyScalar(1 / l);
    else cam.getLookDirection(outDir);
  }
  /** Ponto do mundo para onde o jogador mira (até maxDist). */
  getAimPoint(maxDist: number, out = new THREE.Vector3()): THREE.Vector3 {
    const o = this.tv1;
    const d = this.tv2;
    this.getAimRay(o, d);
    const hit = this.ctx.physics.raycast(o, d, maxDist);
    return hit ? out.copy(hit.point) : out.copy(o).addScaledVector(d, maxDist);
  }
  /**
   * Toca uma animação de ação. Retorna a duração (s) já considerando `speed`,
   * para o combate sincronizar o quadro de impacto.
   */
  playAnimation(anim: PlayerAnim, opts?: { speed?: number }): number {
    const speed = Math.max(0.1, opts?.speed ?? 1);
    const dur = ANIM_DURATION[anim] / speed;
    if (this.state === 'dead' || !this.model) return dur;
    let name: PlayerAnim = anim;
    // nadando/escalando, golpes pesados viram versões só de braços
    if ((this.state === 'swim' || this.state === 'climb') && (anim === 'castHeavy' || anim === 'heavySlash' || anim === 'slash3')) name = 'cast';
    if (anim === 'dodge' && this.state !== 'dodge') {
      // pedido externo de esquiva (ex.: habilidade): executa a esquiva real
      if (this.startDodge()) return this.dodgeDur;
    }
    if (anim === 'ascend') this.burstRing(30, 5);
    this.animator.play(name, dur);
    return dur;
  }
  /** Prende o modelo da arma equipada na mão direita (null = remove). */
  setWeaponModel(model: THREE.Object3D | null, kind?: 'sword' | 'staff' | 'dagger' | 'spear' | 'techno' | 'artifact'): void {
    this.model?.setWeapon(model, (kind ?? 'staff') as WeaponKind);
  }
  /** Posição da mão no mundo (origem de magias). */
  getHandWorldPosition(side: 'left' | 'right', out = new THREE.Vector3()): THREE.Vector3 {
    if (!this.model) return this.entity.getCenter(out);
    return this.model.getHandWorld(side, out);
  }
  /** Ponta da arma/cristal do cajado no mundo (origem de projéteis e rastros). */
  getWeaponTipWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    if (!this.model) return this.getHandWorldPosition('right', out);
    if (!this.model.weaponSocket.visible) return this.model.getHandWorld('right', out);
    return this.model.getTipWorld(out);
  }
  /** Impede deslocamento voluntário por `seconds` (ataques pesados, conjurações longas). */
  lockMovement(seconds: number): void {
    this.moveLock = Math.max(this.moveLock, seconds);
  }
  /** Defesa ativa: reduz velocidade e mostra pose de bloqueio. */
  setBlocking(blocking: boolean): void {
    const b = blocking && this.state !== 'dead' && this.state !== 'climb' && this.state !== 'swim';
    this.blocking = b;
    this.health.blocking = b;
  }
  isBlocking(): boolean {
    return this.blocking;
  }
  /** Em animação de ação que não pode ser interrompida. */
  isBusy(): boolean {
    if (this.state === 'dead' || this.state === 'stagger' || this.mantleT >= 0) return true;
    const a = this.animator.activeActionName();
    if (!a) return false;
    const commit = (ANIM_COMMIT as Partial<Record<string, number>>)[a] ?? 0;
    return commit > 0 && this.animator.actionProgress() < commit;
  }
  /** Último ponto de renascimento (santuário/cripta). */
  checkpoint = { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw };
  /** Define o ponto de renascimento (santuários, entradas de masmorra). */
  setCheckpoint(x: number, z: number, yaw = this.entity.yaw) {
    if (!isFinite(x) || !isFinite(z)) return;
    this.checkpoint.x = x;
    this.checkpoint.z = z;
    this.checkpoint.yaw = yaw;
  }
  applyKnockback(dir: THREE.Vector3, force: number) {
    this.knock.x += dir.x * force;
    this.knock.z += dir.z * force;
    if (this.state === 'flight') this.flightV.y += dir.y * force;
  }
  /** Recalcula vida/energia máximas a partir da progressão e equipamentos. */
  refreshStats(): void {
    this.statsTimer = 2;
    const prog = this.ctx?.sys.progression;
    if (!prog) return;
    const h = this.health;
    const st = (id: Parameters<typeof prog.getStat>[0], fallback: number) => {
      const v = prog.getStat(id);
      return typeof v === 'number' && isFinite(v) ? v : fallback;
    };
    const maxH = Math.max(1, st('maxHealth', 100));
    const maxE = Math.max(1, st('maxEnergy', 100));
    // aumento de máximo (subir de nível) também cura a diferença
    if (this.pendingHealth !== null) {
      h.max = maxH;
      h.current = clamp(this.pendingHealth, 1, maxH);
      this.pendingHealth = null;
    } else {
      if (maxH > h.max && h.alive) h.current += maxH - h.max;
      h.max = maxH;
      h.current = Math.min(h.current, maxH);
    }
    if (this.pendingEnergy !== null) {
      this.energy.max = maxE;
      this.energy.current = clamp(this.pendingEnergy, 0, maxE);
      this.pendingEnergy = null;
    } else {
      if (maxE > this.energy.max) this.energy.current += maxE - this.energy.max;
      this.energy.max = maxE;
      this.energy.current = Math.min(this.energy.current, maxE);
    }
    this.energy.regen = Math.max(0, st('energyRegen', 8));
    h.regen = Math.max(0, st('healthRegen', 0));
    this.stats.moveSpeed = clamp(st('moveSpeed', 1), 0.3, 2.5);
    this.stats.flightSpeed = clamp(st('flightSpeed', 1), 0.3, 3);
    this.stats.flightCost = clamp(st('flightCost', 1), 0.05, 5);
    this.stats.dodgeCost = clamp(st('dodgeCost', 1), 0, 5);
  }
  respawn(): void {
    const ctx = this.ctx;
    this.refreshStats();
    this.health.reset();
    this.energy.current = this.energy.max;
    this.entity.alive = true;
    this.lockTarget = null;
    this.blocking = false;
    this.moveLock = 0;
    this.animator.clearDeath();
    this.animator.stopActions(0.01);
    this.state = 'ground';
    this.stateTime = 0;
    this.grounded = true;
    const cp = this.checkpoint;
    const y = ctx.physics.groundHeight(cp.x, cp.z);
    this.tv1.set(cp.x, y, cp.z);
    this.teleport(this.tv1, cp.yaw);
    this.health.invulnerable = 2;
    ctx.events.emit('player:respawn', {});
    if (ctx.state === 'dead') ctx.setState('playing');
  }
  onNewGame() {
    this.refreshStats();
    this.health.reset(this.health.max);
    this.energy.current = this.energy.max;
    this.entity.alive = true;
    this.state = 'ground';
    this.stateTime = 0;
    this.lockTarget = null;
    this.blocking = false;
    this.moveLock = 0;
    this.pendingHealth = this.pendingEnergy = null;
    this.animator.clearDeath();
    this.animator.stopActions(0.01);
    this.checkpoint = { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw };
    this.placeAtStart();
  }
  onStateChange(_from: string, to: string) {
    // fora de jogo: solta defesa
    if (to !== 'playing' && to !== 'dialogue' && to !== 'cinematic') this.blocking = false;
  }
  serialize() {
    const p = this.entity.position;
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: this.entity.yaw,
      health: this.health.current,
      energy: this.energy.current,
      checkpoint: { ...this.checkpoint },
      flying: this.isFlying(),
    };
  }
  deserialize(data: any) {
    if (![data?.x, data?.y, data?.z].every((v) => typeof v === 'number' && isFinite(v))) throw new Error('posição inválida');
    const yaw = typeof data.yaw === 'number' && isFinite(data.yaw) ? data.yaw : 0;
    const cp = data.checkpoint;
    if (cp && [cp.x, cp.z].every((v: unknown) => typeof v === 'number' && isFinite(v as number))) {
      this.checkpoint = { x: cp.x, z: cp.z, yaw: typeof cp.yaw === 'number' && isFinite(cp.yaw) ? cp.yaw : 0 };
    }
    this.tv1.set(data.x, data.y, data.z);
    this.teleport(this.tv1, yaw);
    const hp = typeof data.health === 'number' && isFinite(data.health) ? data.health : this.health.max;
    const en = typeof data.energy === 'number' && isFinite(data.energy) ? data.energy : this.energy.max;
    this.pendingHealth = Math.max(1, hp);
    this.pendingEnergy = Math.max(0, en);
    this.health.current = clamp(hp, 1, this.health.max);
    this.energy.current = clamp(en, 0, this.energy.max);
    this.entity.alive = true;
    this.animator.clearDeath();
    this.stateTime = 0;
    if (data.flying === true) {
      this.state = 'flight';
      this.takeoffT = 99;
      this.hover = 1;
      this.grounded = false;
      this.ctx?.events.emit('player:flightStart', {});
    } else {
      this.state = 'ground';
      const g = this.ctx ? this.ctx.physics.groundHeight(data.x, data.z, data.y + 0.5) : data.y;
      if (data.y - g > 0.6) {
        this.state = 'air';
        this.grounded = false;
      } else {
        this.entity.position.y = Math.max(g, data.y);
        this.grounded = true;
      }
    }
  }

  /** Mostra/esconde o modelo (câmera dentro da cabeça, cinemáticas). */
  setModelVisible(v: boolean) {
    if (v === this.modelVisible || !this.model) return;
    this.modelVisible = v;
    this.model.setVisible(v);
  }

  /** Diagnóstico para testes automatizados. */
  debugInfo() {
    const p = this.entity.position;
    return {
      state: this.state,
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
      z: +p.z.toFixed(2),
      yaw: +this.entity.yaw.toFixed(3),
      speed: +this.speed.toFixed(2),
      vy: +(this.state === 'flight' ? this.flightV.y : this.vy).toFixed(2),
      energy: +this.energy.current.toFixed(1),
      health: +this.health.current.toFixed(1),
      grounded: this.grounded,
      boosting: this.boosting,
      gliding: this.gliding,
      hag: +this.heightAboveGround.toFixed(2),
      water: +this.waterDepth.toFixed(2),
      action: this.animator.activeActionName(),
      busy: this.isBusy(),
      lock: this.lockTarget ? this.lockTarget.id : null,
      particles: this.fx?.alive ?? 0,
    };
  }
}

function rnd(s: number) {
  return (Math.random() * 2 - 1) * s;
}

// referência para tipos de clipes internos (evita "não usado" ao remover clipes)
void CLIP_DEFS;
