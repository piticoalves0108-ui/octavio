import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { Entity } from '../core/Entity';
import type { DamageInfo, DamageResult } from '../combat/Health';
import type { VfxHandle } from '../combat/VFX';
import { AI_RULES, DEFAULT_BLOCK_REDUCTION, type AttackDef, type EnemyDef } from '../data/enemies';
import { EnemyHealth } from './EnemyHealth';
import { createRigMaterial, type RigMaterial } from './rigs/material';
import { createEnemyRig } from './rigs/factory';
import { makeAnimInput, type AnimInput, type Rig } from './rigs/anim';
import { chooseAttack, inViewCone, needsMeleeToken, type AttackChoiceContext } from './logic';
import { V1, V2, V3, V4, angleDiff, clamp, dist2XZ, distXZ, groundAt, isDeepWater, rand, turnTowards, yawTo } from './shared';
import { beginAttackImpact, updateAttackActive, cancelAttackVisuals, attackDamage } from './enemyAttacks';
import { specialsThink, specialsUpdate, onSpecialDamaged, type SpecialState, makeSpecialState } from './enemySpecials';
import { findCover } from './tactics';
import type { AI } from './AI';
import { VILLAGE } from '../data/places';

/** Temporários da navegação (sem alocação por quadro). */
const NAV_A = new THREE.Vector3();
const NAV_B = new THREE.Vector3();

export type EnemyState = 'idle' | 'patrol' | 'investigate' | 'alert' | 'combat' | 'search' | 'return' | 'flee' | 'surrender' | 'dead';
export type EnemyAction = 'none' | 'attack' | 'dodge' | 'block' | 'special' | 'overheat';
export type MoveMode = 'stop' | 'goto' | 'approach' | 'circle' | 'keepRange' | 'flee' | 'hold' | 'hover';

export interface EnemySpawnOptions {
  level?: number;
  uniqueId?: string;
  zoneId?: string;
  /** Índice do posto dentro da zona (respawn). */
  slot?: string;
  patrol?: THREE.Vector3[];
  patrolLoop?: boolean;
  perched?: boolean;
  guard?: boolean;
  aggro?: boolean;
  yaw?: number;
}

const ARCH_MELEE = new Set(['duelist', 'pack', 'brute', 'knight', 'ravena', 'assassin']);
const _choice: AttackChoiceContext = { dist: 0, heightDiff: 0, los: true, blockBias: 0, rangedBias: 0, lastId: null, repeat: 0, random: Math.random };
const _list: Entity[] = [];

/**
 * Inimigo genérico guiado por dados (src/data/enemies.ts): modelo procedural animado,
 * percepção (cone + distância + linha de visão; audição por eventos; memória), máquina de
 * estados (ocioso/patrulha → investigar → alerta → combate → busca/retorno/fuga/rendição),
 * posicionamento por arquétipo, ataques com antecipação/impacto/recuperação, combos,
 * esquiva, bloqueio/aparo com contra-ataque, tokens de ataque e adaptação ao jogador.
 *
 * Barra de vida (desenhada pela UI): `health`, `name`, `elite`, `level`, `barVisible`, `barHeight`.
 */
export class Enemy extends Entity {
  readonly def: EnemyDef;
  readonly rig: Rig;
  readonly mat: RigMaterial;
  readonly anim: AnimInput = makeAnimInput();
  declare health: EnemyHealth;
  ctx!: GameContext;
  ai!: AI;
  elite: boolean;
  level: number;
  uniqueId?: string;
  zoneId?: string;
  slot?: string;
  /** Barra de vida visível neste quadro (a UI lê). */
  barVisible = false;
  /** Altura (m, acima dos pés) para desenhar a barra. */
  barHeight: number;
  /** Multiplicador de dano por nível. */
  dmgMul = 1;

  // ---- estado de alto nível ----
  state: EnemyState = 'idle';
  stateT = 0;
  target: Entity | null = null;
  readonly lastSeen = new THREE.Vector3();
  lostT = 0;
  canSee = false;
  detection = 0;
  senseT = Math.random() * 0.3;
  thinkT = Math.random() * 0.3;
  readonly investigatePos = new THREE.Vector3();
  alertDelay = 0;
  sinceHurt = 99;
  /** Tempo em combate (s). */
  combatT = 0;

  // ---- casa / patrulha ----
  readonly home = new THREE.Vector3();
  homeYaw = 0;
  patrol: THREE.Vector3[] | null = null;
  patrolLoop = true;
  patrolIdx = 0;
  patrolDir = 1;
  patrolWait = 0;
  perched = false;
  guard = false;
  lookAround = Math.random() * 10;

  // ---- ação atual ----
  act: EnemyAction = 'none';
  atk: AttackDef | null = null;
  atkIdx = -1;
  phase: 0 | 1 | 2 = 0;
  phaseT = 0;
  atkYaw = 0;
  atkLocked = false;
  readonly atkDir = new THREE.Vector3();
  readonly atkFrom = new THREE.Vector3();
  readonly atkTo = new THREE.Vector3();
  readonly atkHit = new Set<number>();
  atkSweepT = 0;
  atkDone = false;
  tele: VfxHandle | null = null;
  cooldowns: Float32Array;
  lastAtkId: string | null = null;
  repeat = 0;
  /** Pausa mínima entre ataques (s). */
  attackGap = 0;
  /** Levanta a guarda na próxima pausa entre ataques (escudo/cavaleiro). */
  guardUp = false;
  heavyCount = 0;
  comboDepth = 0;
  counterIdx = -1;
  counterT = -1;
  // esquiva / bloqueio
  readonly dodgeDir = new THREE.Vector3();
  dodgeCd = 0;
  blockT = 0;
  reactT = -1;
  reactKind: 'dodge' | 'block' = 'dodge';
  readonly reactDir = new THREE.Vector3();
  /**
   * Projéteis já avaliados para não decidir duas vezes. Os projéteis vêm de um pool (o id se
   * repete entre disparos), então a chave é (id, instante do disparo).
   */
  readonly seenProjectiles: number[] = [];
  readonly seenProjT: number[] = [];
  seenProjIdx = 0;
  projScanT = Math.random() * 0.1;

  // ---- movimento ----
  moveMode: MoveMode = 'stop';
  readonly goal = new THREE.Vector3();
  moveSpeed = 0;
  readonly moveVel = new THREE.Vector3();
  faceYaw = 0;
  facingTarget = false;
  strafeSign = Math.random() < 0.5 ? -1 : 1;
  strafeT = 0;
  readonly sep = new THREE.Vector3();
  sepT = Math.random() * 0.2;
  stuckT = 0;
  readonly stuckRef = new THREE.Vector3();
  unstickT = 0;
  readonly unstickDir = new THREE.Vector3();
  flankAngle = 0;
  readonly cover = new THREE.Vector3();
  coverValid = false;
  coverT = 0;
  retreated = false;
  fleeT = 0;
  airY = 0;
  /** Navegação pelo grafo da vila (`world.findPath`): caminho atual, waypoint e temporizador de recálculo. */
  navPath: { x: number; z: number }[] | null = null;
  navIdx = 0;
  navT = Math.random() * 0.6;
  readonly navPoint = new THREE.Vector3();

  // ---- visual ----
  hitFlash = 0;
  charge = 0;
  chargeColor = 0xff6a1a;
  deadT = -1;
  dissolving = false;
  hitReact = 0;
  shadowT = 0;
  overheatT = 0;
  stealthed = false;
  hidden = false;
  readonly sp: SpecialState = makeSpecialState();

  constructor(def: EnemyDef, opts: EnemySpawnOptions = {}) {
    super('enemy', def.faction);
    this.def = def;
    this.typeId = def.id;
    this.name = def.name;
    this.elite = !!def.elite;
    this.level = Math.max(1, opts.level ?? def.level);
    const lv = this.level - def.level;
    this.dmgMul = 1 + lv * 0.08;
    this.uniqueId = opts.uniqueId;
    this.zoneId = opts.zoneId;
    this.slot = opts.slot;
    this.radius = def.radius;
    this.height = def.height;
    this.barHeight = def.height + 0.35;
    this.perched = !!opts.perched;
    this.guard = !!opts.guard;
    if (opts.patrol && opts.patrol.length > 0) {
      this.patrol = opts.patrol;
      this.patrolLoop = opts.patrolLoop ?? true;
    }
    if (opts.yaw !== undefined) this.yaw = this.homeYaw = this.faceYaw = opts.yaw;
    if (opts.uniqueId) this.persistent = false;

    const h = new EnemyHealth(Math.round(def.hp * (1 + lv * 0.12)));
    h.armor = def.armor;
    h.resist = { ...def.resist };
    h.maxPoise = h.poise = def.poise;
    h.poiseRegen = def.poiseRegen;
    h.staggerDuration = def.staggerTime;
    for (const s of def.statusImmune ?? []) h.statusImmune.add(s);
    h.blockReduction = def.defense.blockReduction ?? DEFAULT_BLOCK_REDUCTION;
    if (def.weakPoint) {
      h.weakSide = def.weakPoint.side;
      h.weakMul = def.weakPoint.mul;
    }
    if (def.special?.surrenderAt) h.floor = 1;
    this.health = h;

    this.cooldowns = new Float32Array(def.attacks.length);
    for (let i = 0; i < def.attacks.length; i++) this.cooldowns[i] = def.attacks[i].cooldown * Math.random() * 0.5;
    this.mat = createRigMaterial({ metalness: def.rig === 'construct' ? 0.45 : 0.08, roughness: def.rig === 'construct' ? 0.5 : 0.78 });
    this.rig = createEnemyRig(def.rig, def.look, this.mat);
    this.rig.root.scale.setScalar(def.scale);
    this.object3d.add(this.rig.root);
    this.object3d.name = def.id;
    if (def.archetype === 'flyer') this.anim.flying = true;
    if (def.archetype === 'static') this.solid = true;
    if (opts.aggro) this.sp.startAggro = true;
  }

  get isFlyer() {
    return this.def.archetype === 'flyer';
  }

  /** Engajado em combate (música, save, tokens). */
  get engaged(): boolean {
    return this.alive && (this.state === 'combat' || this.state === 'alert' || (this.state === 'flee' && !this.sp.standDown));
  }

  override onAdded(ctx: GameContext): void {
    this.ctx = ctx;
    this.ai = ctx.sys.ai;
    const p = this.position;
    if (!this.perched) {
      const g = groundAt(ctx, p.x, p.z, p.y + 1.5);
      p.y = this.isFlyer ? g + (this.def.flyHeight ?? 8) : g;
    }
    this.airY = p.y;
    this.home.copy(p);
    if (this.homeYaw === 0 && this.yaw !== 0) this.homeYaw = this.yaw;
    this.faceYaw = this.yaw;
    this.object3d.rotation.y = this.yaw;
    this.state = this.patrol ? 'patrol' : 'idle';
    this.ai.register(this);
    const sh = ctx.settings.q.shadowMapSize > 0;
    this.rig.setShadows(sh);
    if (this.def.special?.stealth) this.setStealth(true);
    if (this.sp.startAggro) {
      const pl = ctx.sys.player.entity;
      if (pl.alive) this.engage(pl, false);
    }
  }

  // =====================================================================
  // Atualização
  // =====================================================================
  override update(dt: number, ctx: GameContext): void {
    const t0 = performance.now();
    this.step(dt, ctx);
    if (this.ai) this.ai.enemyAcc += performance.now() - t0;
  }

  private step(dt: number, ctx: GameContext): void {
    if (this.deadT >= 0) {
      this.updateDeath(dt, ctx);
      return;
    }
    const h = this.health;
    const actMul = h.actionMultiplier();
    this.stateT += dt;
    this.sinceHurt += dt;
    if (this.attackGap > 0) this.attackGap -= dt * actMul;
    if (this.dodgeCd > 0) this.dodgeCd -= dt;
    for (let i = 0; i < this.cooldowns.length; i++) if (this.cooldowns[i] > 0) this.cooldowns[i] -= dt * actMul;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
    this.hitReact = Math.max(0, this.hitReact - dt * 3.5);

    if (this.def.archetype === 'static') {
      this.updateVisual(dt, ctx);
      return;
    }

    // atordoado / cambaleando: cancela a ação
    const canAct = h.canAct() && this.overheatT <= 0;
    if (!canAct && (this.act === 'attack' || this.act === 'block' || this.act === 'special')) this.cancelAction();

    this.perceive(dt, ctx);
    if (canAct && this.state !== 'surrender') this.brain(dt, ctx);
    else this.moveMode = this.state === 'surrender' ? 'stop' : this.moveMode;
    if (!canAct) {
      this.moveMode = 'stop';
    }
    this.updateAction(dt * actMul, dt, ctx);
    specialsUpdate(this, dt, ctx);
    this.locomotion(dt, ctx);
    this.updateVisual(dt, ctx);
  }

  /** Simulação barata (tier 2): segue a patrulha sem colisão nem animação; desiste de combates. */
  override farUpdate(dt: number, ctx: GameContext): void {
    if (this.deadT >= 0 || this.def.archetype === 'static') return;
    if (this.state === 'combat' || this.state === 'alert' || this.state === 'search' || this.state === 'flee') this.disengage();
    if (this.state === 'return') {
      this.position.copy(this.home);
      this.health.heal(this.health.max);
      this.state = this.patrol ? 'patrol' : 'idle';
      return;
    }
    if (this.state === 'patrol' && this.patrol) {
      const pt = this.patrol[this.patrolIdx];
      const p = this.position;
      const d = distXZ(p, pt);
      const step = this.def.walk * dt;
      if (d <= step + 0.5) this.nextPatrolPoint();
      else {
        p.x += ((pt.x - p.x) / d) * step;
        p.z += ((pt.z - p.z) / d) * step;
        this.yaw = yawTo(p.x, p.z, pt.x, pt.z);
        this.object3d.rotation.y = this.yaw;
      }
      const g = ctx.heightfield.heightAt(p.x, p.z);
      p.y = this.isFlyer ? g + (this.def.flyHeight ?? 8) : Math.max(g, ctx.physics.groundHeight(p.x, p.z, p.y + 1));
    }
  }

  // =====================================================================
  // Percepção
  // =====================================================================
  private perceive(dt: number, ctx: GameContext) {
    this.senseT -= dt;
    if (this.state === 'combat' || this.state === 'search') {
      if (this.canSee) this.lostT = 0;
      else this.lostT += dt;
    }
    if (this.senseT > 0) return;
    const interval = AI_RULES.sightInterval * (this.tier === 0 ? 1 : 2.5);
    this.senseT = interval * (0.85 + Math.random() * 0.3);
    const P = this.def.perception;
    // alvo: em combate, o atual; senão, o jogador
    const tgt = this.target && this.target.alive && !this.target.removed ? this.target : ctx.sys.player.entity;
    if (!tgt.alive || this.state === 'surrender' || ctx.state === 'cinematic') {
      this.canSee = false;
      return;
    }
    const p = this.position;
    const dx = tgt.position.x - p.x;
    const dz = tgt.position.z - p.z;
    const dy = tgt.position.y - p.y;
    const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 0.6);
    let see = false;
    const engaged = this.state === 'combat' || this.state === 'alert' || this.state === 'search' || this.state === 'flee';
    if (d < P.awareness * (engaged ? 1.6 : 1)) see = true;
    else {
      const night = ctx.clock.isNight() ? AI_RULES.nightSight : 1;
      const vis = clamp((ctx.sys.env as { visibility?: () => number }).visibility?.() ?? 1, 0.45, 1);
      const range = P.sight * night * vis * (engaged ? 1.5 : 1);
      if (d < range) {
        const cosHalf = Math.cos(((engaged ? Math.max(P.fov, 220) : P.fov) * Math.PI) / 360);
        if (inViewCone(Math.sin(this.yaw), Math.cos(this.yaw), dx, dz, cosHalf)) {
          if (this.tier === 0 || d < 25) {
            V1.set(p.x, p.y + this.height * 0.9, p.z);
            V2.set(tgt.position.x, tgt.position.y + tgt.height * 0.6, tgt.position.z);
            see = ctx.physics.lineOfSight(V1, V2);
          }
        }
        if (see && !engaged) {
          // detecção gradual (mais rápida perto)
          this.detection += interval * (0.6 + 2.6 * (1 - d / range));
          see = this.detection >= 1;
          if (!see && this.detection > 0.35 && (this.state === 'idle' || this.state === 'patrol' || this.state === 'return')) {
            this.investigatePos.copy(tgt.position);
            this.setState('investigate');
          }
        }
      }
    }
    if (!see && !engaged) this.detection = Math.max(0, this.detection - interval * 0.25);
    this.canSee = see;
    if (see) {
      this.lastSeen.copy(tgt.position);
      this.lostT = 0;
      if (!engaged && tgt.kind === 'player' && ctx.sys.combat.isHostile(this, tgt)) this.engage(tgt, true);
      else if (this.state === 'search') this.setState('combat');
    }
  }

  /** Ouviu algo (magia, combate, alarme): investiga ou entra em alerta se muito perto. */
  hear(pos: THREE.Vector3, loud: boolean, source: Entity | null) {
    if (!this.alive || this.deadT >= 0) return;
    // só quem está calmo (ou voltando) reage a sons
    if (this.state !== 'idle' && this.state !== 'patrol' && this.state !== 'return' && this.state !== 'investigate') return;
    const d = distXZ(this.position, pos);
    if (source && source.alive && loud && d < 14 && this.ctx.sys.combat.isHostile(this, source)) {
      this.engage(source, true);
      return;
    }
    this.investigatePos.copy(pos);
    this.detection = Math.max(this.detection, 0.5);
    if (!this.perched) this.setState('investigate');
    else this.faceYaw = yawTo(this.position.x, this.position.z, pos.x, pos.z);
  }

  /** Entra em alerta/combate contra `target`. */
  engage(target: Entity, callAllies: boolean, delay?: number) {
    if (!this.alive || this.state === 'surrender') return;
    const wasIdle = this.state !== 'combat' && this.state !== 'alert' && this.state !== 'search' && this.state !== 'flee';
    this.target = target;
    this.lastSeen.copy(target.position);
    this.lostT = 0;
    this.detection = 1;
    if (wasIdle) {
      this.alertDelay = delay ?? this.def.perception.alertDelay * (0.8 + Math.random() * 0.5);
      this.setState('alert');
      this.combatT = 0;
      this.ai.onEnemyAlert(this, callAllies);
    } else if (this.state === 'search') this.setState('combat');
  }

  /** Abandona o combate e volta para casa. */
  disengage() {
    this.ai?.releaseAttackToken(this);
    this.cancelAction();
    this.target = null;
    this.detection = 0;
    this.canSee = false;
    this.retreated = false;
    this.setState('return');
  }

  setState(s: EnemyState) {
    if (this.state === s) return;
    if (s !== 'combat') this.ai?.releaseAttackToken(this);
    this.state = s;
    this.stateT = 0;
    if (s === 'combat') this.thinkT = 0;
  }

  // =====================================================================
  // Cérebro
  // =====================================================================
  private brain(dt: number, ctx: GameContext) {
    const P = this.def.perception;
    switch (this.state) {
      case 'idle':
        this.moveMode = 'stop';
        if (!this.perched && dist2XZ(this.position, this.home) > 4) this.goTo(this.home, this.def.walk);
        else {
          this.lookAround += dt;
          this.faceYaw = this.homeYaw + Math.sin(this.lookAround * 0.35) * 0.6;
        }
        if (this.isFlyer) this.hoverIdle(dt);
        break;
      case 'patrol': {
        if (!this.patrol) {
          this.setState('idle');
          break;
        }
        if (this.patrolWait > 0) {
          this.patrolWait -= dt;
          this.moveMode = 'stop';
          this.lookAround += dt;
          this.faceYaw = this.yaw + Math.sin(this.lookAround * 0.8) * 0.02;
          if (this.patrolWait <= 0) this.nextPatrolPoint();
          break;
        }
        const pt = this.patrol[this.patrolIdx];
        if (dist2XZ(this.position, pt) < 1.6) this.patrolWait = rand(1.2, 3.5);
        else this.goTo(pt, this.def.walk);
        break;
      }
      case 'investigate':
        if (this.perched) {
          this.moveMode = 'stop';
          this.faceYaw = yawTo(this.position.x, this.position.z, this.investigatePos.x, this.investigatePos.z);
          if (this.stateT > 5) this.setState('idle');
          break;
        }
        if (dist2XZ(this.position, this.investigatePos) > 4 && this.stateT < 12) this.goTo(this.investigatePos, this.def.walk * 1.3);
        else {
          this.moveMode = 'stop';
          this.lookAround += dt * 2;
          this.faceYaw += Math.sin(this.lookAround) * dt * 1.5;
          if (this.stateT > 6) this.setState('return');
        }
        break;
      case 'alert':
        this.moveMode = 'stop';
        if (this.target) this.faceYaw = yawTo(this.position.x, this.position.z, this.target.position.x, this.target.position.z);
        this.alertDelay -= dt;
        if (this.alertDelay <= 0) this.setState('combat');
        break;
      case 'combat':
        this.combatT += dt;
        this.combatBrain(dt, ctx);
        break;
      case 'search':
        if (dist2XZ(this.position, this.lastSeen) > 4 && !this.perched) this.goTo(this.lastSeen, this.def.run * 0.7);
        else {
          this.moveMode = 'stop';
          this.lookAround += dt * 2.5;
          this.faceYaw += Math.sin(this.lookAround) * dt * 2;
        }
        if (this.stateT > 6) this.disengage();
        break;
      case 'flee': {
        this.fleeT -= dt;
        // recuando ainda esquiva (espreitador/arqueiros)
        if (this.pendingReaction(dt)) break;
        const t = this.target;
        if (!t || !t.alive) {
          this.disengage();
          break;
        }
        const p = this.position;
        const d = Math.max(0.1, distXZ(p, t.position));
        V1.set(p.x + ((p.x - t.position.x) / d) * 10, p.y, p.z + ((p.z - t.position.z) / d) * 10);
        this.goTo(V1, this.def.run);
        this.facingTarget = false;
        if (this.fleeT <= 0) {
          if (this.sp.standDown) {
            // rendidos/dispersos: somem quando longe da vista
            if (d > 30) this.ctx.entities.remove(this);
            this.fleeT = 1;
          } else this.setState('combat');
        }
        break;
      }
      case 'return': {
        const h = this.health;
        h.heal(h.max * AI_RULES.returnRegen * dt);
        if (dist2XZ(this.position, this.home) < 2.5 || this.stateT > 30) {
          if (this.stateT > 30) this.position.copy(this.home);
          this.setState(this.patrol ? 'patrol' : 'idle');
          this.faceYaw = this.homeYaw;
        } else this.goTo(this.home, this.def.run * 0.55);
        if (this.isFlyer) this.hoverIdle(dt);
        break;
      }
      default:
        this.moveMode = 'stop';
    }
    void P;
  }

  nextPatrolPoint() {
    if (!this.patrol) return;
    const n = this.patrol.length;
    if (n <= 1) return;
    if (this.patrolLoop) this.patrolIdx = (this.patrolIdx + 1) % n;
    else {
      if (this.patrolIdx + this.patrolDir >= n || this.patrolIdx + this.patrolDir < 0) this.patrolDir *= -1;
      this.patrolIdx += this.patrolDir;
    }
  }

  private goTo(p: THREE.Vector3, speed: number) {
    this.moveMode = 'goto';
    this.goal.copy(p);
    this.moveSpeed = speed;
    this.facingTarget = false;
  }

  private hoverIdle(_dt: number) {
    // voadores circulam devagar em volta da casa
    if (this.moveMode === 'stop') {
      const a = this.stateT * 0.25 + this.id;
      V1.set(this.home.x + Math.cos(a) * 9, this.home.y, this.home.z + Math.sin(a) * 9);
      this.goTo(V1, this.def.walk);
    }
  }

  /** Combate: alvo perdido/morto, recuo, especiais, escolha de ataque e posicionamento. */
  private combatBrain(dt: number, ctx: GameContext) {
    const t = this.target;
    if (!t || !t.alive || t.removed) {
      this.disengage();
      return;
    }
    const P = this.def.perception;
    const p = this.position;
    const dist = distXZ(p, t.position);
    // perdeu de vista por muito tempo → procura
    if (this.lostT > P.memory) {
      this.setState('search');
      return;
    }
    // trela: longe demais de casa (sem tomar dano recente)
    if (!this.sp.noLeash && dist2XZ(p, this.home) > P.leash * P.leash && this.sinceHurt > 4) {
      this.disengage();
      return;
    }
    // reação agendada (esquiva/bloqueio) — pode abortar a antecipação de um golpe
    if (this.pendingReaction(dt)) return;
    // atirador pressionado: aborta o disparo e salta para trás (o chute vem no próximo pensar)
    const rangedArch = this.def.archetype === 'archer' || this.def.archetype === 'caster';
    if (rangedArch && this.act === 'attack' && this.phase === 0 && this.atk?.kind === 'projectile' && dist < this.def.preferredRange[0] * 0.3) {
      this.cancelAction();
      this.thinkT = 0;
      if (this.dodgeCd <= 0 && Math.random() < 0.7) this.startDodge(p.x - t.position.x, p.z - t.position.z);
      return;
    }
    // durante uma ação, o movimento é controlado pela ação
    if (this.act !== 'none') {
      if (this.act === 'block' && t) this.faceYaw = yawTo(p.x, p.z, t.position.x, t.position.z);
      return;
    }
    // contra-ataque pendente
    if (this.counterT >= 0) {
      this.counterT -= dt;
      if (this.counterT < 0 && this.counterIdx >= 0 && dist < this.def.attacks[this.counterIdx].maxRange + 0.8) {
        this.beginAttack(this.counterIdx, true);
        this.counterIdx = -1;
        return;
      }
    }

    this.thinkT -= dt;
    const think = this.thinkT <= 0;
    if (think) this.thinkT = AI_RULES.thinkInterval * (0.7 + Math.random() * 0.6);

    if (think) {
      if (specialsThink(this, dist, ctx)) return;
      // recuo com vida baixa
      const rb = this.def.retreatBelow;
      if (rb && !this.retreated && this.health.fraction < rb && Math.random() < 0.6) {
        this.retreated = true;
        this.fleeT = rand(2.2, 4);
        this.setState('flee');
        return;
      }
      // escolha de ataque
      if (this.attackGap <= 0 && !this.stealthBlocksAttack(dist)) {
        const style = this.ai.style;
        const c = _choice;
        c.dist = dist;
        c.heightDiff = t.position.y - p.y;
        c.los = this.canSee;
        c.blockBias = style.block;
        c.rangedBias = style.ranged;
        c.lastId = this.lastAtkId;
        c.repeat = this.repeat;
        c.flyer = this.isFlyer;
        let idx = chooseAttack(this.def.attacks, this.cooldowns, c);
        const ranged = this.def.archetype === 'archer' || this.def.archetype === 'caster';
        if (idx >= 0 && ranged && this.def.attacks[idx].kind === 'projectile' && dist < this.def.preferredRange[0] * 0.55 && this.unstickT <= 0) {
          // perto demais: se o alvo está avançando, recua em vez de parar para atirar
          const tv = this.ai.targetVelocity(t, V3);
          const closing = (tv.x * (p.x - t.position.x) + tv.z * (p.z - t.position.z)) / Math.max(0.1, dist);
          if (closing > 1.2 || Math.random() < 0.5) idx = -1;
        }
        if (idx >= 0) {
          const a = this.def.attacks[idx];
          const melee = needsMeleeToken(a);
          const ok = melee ? this.ai.requestAttackToken(this, t) : a.kind === 'projectile' ? this.ai.requestRangedToken(this, t) : true;
          if (ok) {
            this.beginAttack(idx, false);
            return;
          }
        }
      }
    }
    this.tactics(dist, dt, ctx);
  }

  /** Executa a reação agendada (esquiva/bloqueio) quando o atraso de reação vence. */
  private pendingReaction(dt: number): boolean {
    if (this.reactT < 0) return false;
    this.reactT -= dt;
    if (this.reactT >= 0) return false;
    if (this.act === 'none' || (this.act === 'attack' && this.phase === 0) || this.act === 'block') {
      if (this.act === 'attack') this.cancelAction();
      if (this.reactKind === 'dodge') this.startDodge(this.reactDir.x, this.reactDir.z);
      else if (this.act !== 'block' && this.state === 'combat') this.startBlock();
      return true;
    }
    return false;
  }

  /** Já avaliou este disparo (`stamp` = instante do disparo no relógio da IA)? */
  sawProjectile(id: number, stamp: number): boolean {
    for (let i = 0; i < this.seenProjectiles.length; i++) if (this.seenProjectiles[i] === id && Math.abs(this.seenProjT[i] - stamp) < 0.1) return true;
    return false;
  }

  markProjectile(id: number, stamp: number) {
    this.seenProjectiles[this.seenProjIdx] = id;
    this.seenProjT[this.seenProjIdx] = stamp;
    this.seenProjIdx = (this.seenProjIdx + 1) % 8;
  }

  /** Assassinos furtivos só atacam quando chegam perto (ou já revelados). */
  private stealthBlocksAttack(dist: number) {
    return this.stealthed && dist > 3.2;
  }

  // =====================================================================
  // Posicionamento
  // =====================================================================
  private tactics(dist: number, dt: number, ctx: GameContext) {
    const t = this.target!;
    const p = this.position;
    const def = this.def;
    const [rMin, rMax] = def.preferredRange;
    this.facingTarget = true;
    this.strafeT -= dt;
    if (this.strafeT <= 0) {
      this.strafeT = rand(1.8, 4);
      if (Math.random() < 0.45) this.strafeSign *= -1;
    }
    if (this.perched) {
      this.moveMode = 'hold';
      return;
    }
    const arch = def.archetype;
    if (arch === 'flyer') {
      this.moveMode = 'hover';
      this.moveSpeed = def.strafe;
      return;
    }
    if (arch === 'archer' || arch === 'caster') {
      // mantém a distância; procura cobertura; recua quando o jogador se aproxima
      this.coverT -= dt;
      if (arch === 'archer' && this.coverT <= 0) {
        this.coverT = rand(3, 5);
        this.coverValid = findCover(ctx, this, t, rMin, rMax, this.cover);
      }
      if (dist < rMin) {
        this.moveMode = 'keepRange';
        this.goal.copy(t.position);
        this.moveSpeed = dist < rMin * 0.5 ? def.run : def.strafe * 1.3;
        return;
      }
      if (this.coverValid && dist2XZ(p, this.cover) > 1.5) {
        this.goTo(this.cover, def.run * 0.85);
        this.facingTarget = dist2XZ(p, this.cover) < 36;
        return;
      }
      if (!this.canSee && this.lostT > 1) {
        // sai da cobertura para ter linha de visão
        this.goTo(this.lastSeen, def.walk * 1.4);
        this.facingTarget = true;
        return;
      }
      if (dist > rMax) {
        this.moveMode = 'approach';
        this.goal.copy(t.position);
        this.moveSpeed = def.run * 0.75;
        return;
      }
      this.moveMode = this.coverValid ? 'stop' : 'circle';
      this.goal.copy(t.position);
      this.moveSpeed = def.strafe * 0.55;
      return;
    }
    // corpo a corpo: com token aproxima; sem token circula
    const melee = ARCH_MELEE.has(arch);
    if (!melee) {
      this.moveMode = 'stop';
      return;
    }
    const hasToken = this.ai.requestAttackToken(this, t);
    if (arch === 'pack' && !hasToken) {
      // matilha: flanqueia — ocupa uma posição ao lado/atrás do alvo
      const slot = this.ai.packSlot(this, t);
      const base = t.yaw + slot;
      const r = rMax + 0.5;
      this.goal.set(t.position.x + Math.sin(base) * r, t.position.y, t.position.z + Math.cos(base) * r);
      this.moveMode = 'goto';
      this.moveSpeed = dist > r + 4 ? def.run : def.strafe;
      this.facingTarget = dist < r + 3;
      return;
    }
    if (arch === 'assassin' && this.stealthed) {
      // aproxima-se escondido por trás
      const behind = t.yaw + Math.PI;
      this.goal.set(t.position.x + Math.sin(behind) * 1.6, t.position.y, t.position.z + Math.cos(behind) * 1.6);
      this.moveMode = 'goto';
      this.moveSpeed = dist > 10 ? def.run : def.walk * 1.6;
      this.facingTarget = dist < 4;
      return;
    }
    if (hasToken && this.guardUp && this.attackGap > 0 && (arch === 'duelist' || arch === 'knight') && dist < rMax + 2.5) {
      this.guardUp = false;
      this.startBlock(Math.min(1.3, Math.max(0.5, this.attackGap)));
      return;
    }
    if (hasToken) {
      this.moveMode = 'approach';
      this.goal.copy(t.position);
      const reach = this.meleeReach();
      this.moveSpeed = dist > reach + 5 ? def.run : dist > reach + 1.5 ? def.run * 0.75 : def.strafe;
      return;
    }
    // sem token: circula na distância preferida (+ folga), com guarda alta (cavaleiro)
    this.moveMode = 'circle';
    this.goal.copy(t.position);
    this.moveSpeed = def.strafe * AI_RULES.circleSpeed;
    if (arch === 'knight' && dist < rMax + 3 && this.act === 'none' && Math.random() < dt * 0.45) this.startBlock(1.1);
    if (this.guardUp && (arch === 'duelist' || arch === 'knight') && dist < rMax + 2.5 && this.act === 'none') {
      this.guardUp = false;
      this.startBlock(Math.min(1.3, Math.max(0.5, this.attackGap)));
    }
  }

  /** Alcance típico dos golpes corpo a corpo (para parar de avançar). */
  meleeReach(): number {
    let r = 1.6;
    for (const a of this.def.attacks) if (a.kind === 'melee' && !a.counterOnly && !a.comboOnly) r = Math.max(r, a.maxRange * 0.8);
    return r;
  }

  // =====================================================================
  // Ações: ataque, esquiva, bloqueio
  // =====================================================================
  beginAttack(idx: number, counter: boolean) {
    const a = this.def.attacks[idx];
    const t = this.target;
    this.act = 'attack';
    this.atk = a;
    this.atkIdx = idx;
    this.phase = 0;
    this.phaseT = 0;
    this.atkHit.clear();
    this.atkDone = false;
    this.atkSweepT = 0;
    this.cooldowns[idx] = a.cooldown * rand(0.85, 1.2);
    if (this.lastAtkId === a.id) this.repeat++;
    else {
      this.lastAtkId = a.id;
      this.repeat = 1;
    }
    if (!a.comboOnly) this.comboDepth = 0;
    const p = this.position;
    this.atkYaw = t ? yawTo(p.x, p.z, t.position.x, t.position.z) : this.yaw;
    this.atkLocked = !!a.telegraph || counter;
    if (counter) this.yaw = this.atkYaw;
    this.chargeColor = a.unblockable ? 0xff2418 : a.heavy ? 0xff7a18 : 0xffc060;
    if (t) this.atkTo.copy(t.position);
    if (a.telegraph && a.heavy) this.telegraph(a);
    if (a.unblockable || a.heavy) this.ai.ctx.sys.audio.play('swing_heavy', { position: p, pitch: 0.7, volume: 0.35 });
    if (this.stealthed && a.kind !== 'projectile') this.setStealth(false);
  }

  /** Telegraph no chão (ataques fortes). */
  telegraph(a: AttackDef) {
    const vfx = this.ctx.sys.vfx;
    const p = this.position;
    const dur = a.windup / Math.max(0.2, this.health.actionMultiplier());
    const color = a.unblockable ? 0xff2018 : 0xff8a20;
    const s = this.def.scale;
    switch (a.telegraph) {
      case 'cone':
        this.tele = vfx.telegraph({ type: 'cone', position: p, yaw: this.atkYaw, radius: a.reach + (a.lunge ?? 0) * 0.8, angle: Math.min(359, a.arc), duration: dur, color });
        break;
      case 'circle':
        this.tele = vfx.telegraph({ type: 'circle', position: p, radius: a.reach, duration: dur, color });
        break;
      case 'line': {
        const t = this.target;
        const d = t ? Math.min(a.maxRange + 1, distXZ(p, t.position) + a.reach) : a.maxRange;
        const len = a.kind === 'leap' || a.kind === 'charge' ? d + 1 : a.reach + (a.lunge ?? 0);
        this.tele = vfx.telegraph({ type: 'line', position: p, yaw: this.atkYaw, length: len, width: Math.max(1.4, this.radius * 2.2 * s), duration: dur, color });
        break;
      }
      case 'ring':
        this.tele = vfx.telegraph({ type: 'ring', position: p, radius: a.reach, innerRadius: a.reach * 0.6, duration: dur, color });
        break;
    }
  }

  startDodge(dx: number, dz: number) {
    if (this.act === 'attack') cancelAttackVisuals(this);
    this.act = 'dodge';
    this.phaseT = 0;
    const l = Math.hypot(dx, dz) || 1;
    this.dodgeDir.set(dx / l, 0, dz / l);
    this.health.invulnerable = Math.max(this.health.invulnerable, AI_RULES.dodgeIframes);
    this.health.blocking = false;
    this.dodgeCd = this.def.defense.dodgeCooldown * rand(0.85, 1.25);
    this.ctx.sys.audio.play('dodge', { position: this.position, volume: 0.5 });
    if (this.def.rig !== 'construct') this.ctx.sys.vfx.burst('dust', this.position, { scale: 0.4, count: 5 });
  }

  startBlock(hold = AI_RULES.blockHold) {
    const def = this.def.defense;
    this.act = 'block';
    this.blockT = hold * rand(0.85, 1.3);
    const h = this.health;
    h.blocking = true;
    h.blockReduction = def.blockReduction ?? DEFAULT_BLOCK_REDUCTION;
    if (def.parry && Math.random() < def.parry) h.parryWindow = AI_RULES.parryWindow;
  }

  /**
   * Ameaça detectada (golpe do jogador começando, projétil vindo): decide esquivar/bloquear
   * com atraso de reação humano. `chanceMul` vem da adaptação.
   */
  threat(kind: 'melee' | 'projectile', fromX: number, fromZ: number, chanceMul = 1) {
    const fleeing = this.state === 'flee' && !this.sp.standDown;
    if ((this.state !== 'combat' && !fleeing) || this.act === 'dodge' || this.act === 'special' || this.act === 'overheat' || this.reactT >= 0 || !this.health.canAct()) return;
    if (this.act === 'attack' && this.phase !== 0) return; // golpe saindo/recuperação: janela do jogador
    const arch = this.def.archetype;
    const agile = arch === 'ravena' || arch === 'assassin';
    const early = this.act === 'attack' && this.atk ? this.phaseT < this.atk.windup * 0.5 : true;
    // corpo a corpo: só os ágeis abortam um golpe para esquivar; escudos podem abortar no começo para bloquear
    if (kind === 'melee' && this.act === 'attack' && !agile && !(early && this.def.defense.block > 0)) return;
    if (kind === 'projectile' && this.act === 'attack' && !early && !agile) return;
    const d = this.def.defense;
    const p = this.position;
    // direção da ameaça → esquiva lateral (ou para trás)
    let ax = p.x - fromX;
    let az = p.z - fromZ;
    const l = Math.hypot(ax, az) || 1;
    ax /= l;
    az /= l;
    const side = Math.random() < 0.5 ? -1 : 1;
    const back = Math.random() < 0.3;
    const rx = back ? ax : -az * side;
    const rz = back ? az : ax * side;
    const delay = rand(AI_RULES.reactionDelay[0], AI_RULES.reactionDelay[1]);
    if (kind === 'melee') {
      // bloqueio frontal primeiro (quem tem escudo/guarda)
      if (d.block > 0 && !fleeing && (this.act === 'none' || this.act === 'attack') && Math.random() < d.block * chanceMul) {
        this.reactKind = 'block';
        this.reactT = delay * 0.6;
        return;
      }
      if (this.dodgeCd <= 0 && Math.random() < d.dodge * chanceMul) {
        this.reactKind = 'dodge';
        this.reactDir.set(rx, 0, rz);
        this.reactT = delay;
      }
    } else if (this.dodgeCd <= 0 && Math.random() < d.dodgeProjectile * chanceMul) {
      this.reactKind = 'dodge';
      this.reactDir.set(rx, 0, rz);
      this.reactT = delay * 0.7;
    }
  }

  cancelAction() {
    if (this.act === 'attack') cancelAttackVisuals(this);
    if (this.act === 'block') this.health.blocking = false;
    this.health.parryWindow = 0;
    this.act = 'none';
    this.atk = null;
    this.charge = 0;
    this.ai?.releaseAttackToken(this);
  }

  private endAction() {
    const wasAttack = this.act === 'attack';
    if (this.act === 'block') this.health.blocking = false;
    this.act = 'none';
    this.atk = null;
    this.charge = 0;
    if (wasAttack) {
      const arch = this.def.archetype;
      const guard = (arch === 'duelist' || arch === 'knight') && this.def.defense.block > 0;
      this.attackGap = guard ? rand(0.9, 1.8) : rand(0.35, 0.9) * (arch === 'brute' ? 1.4 : 1);
      this.guardUp = guard && Math.random() < 0.65;
      this.ai.releaseAttackToken(this);
      this.thinkT = Math.min(this.thinkT, 0.15);
    }
  }

  private updateAction(dta: number, dt: number, ctx: GameContext) {
    switch (this.act) {
      case 'none':
        if (this.charge > 0) this.charge = Math.max(0, this.charge - dt * 4);
        return;
      case 'attack': {
        const a = this.atk!;
        this.phaseT += dta;
        const t = this.target;
        if (this.phase === 0) {
          // antecipação: gira para o alvo (até travar), brilho cresce
          if (t && !this.atkLocked) {
            this.atkYaw = yawTo(this.position.x, this.position.z, t.position.x, t.position.z);
            if (this.phaseT > a.windup * 0.65) this.atkLocked = true;
          }
          this.faceYaw = this.atkYaw;
          const k = clamp(this.phaseT / Math.max(0.05, a.windup), 0, 1);
          this.charge = (a.heavy || a.unblockable ? 1.1 : 0.45) * k * k;
          this.moveMode = 'stop';
          if (this.phaseT >= a.windup) {
            this.phase = 1;
            this.phaseT = 0;
            this.yaw = this.atkYaw;
            this.atkDir.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
            this.tele = null;
            beginAttackImpact(this, ctx);
          }
        } else if (this.phase === 1) {
          this.charge = Math.max(0, this.charge - dt * 3);
          updateAttackActive(this, dt, ctx);
          if (this.phaseT >= a.active) {
            this.phase = 2;
            this.phaseT = 0;
            if (a.heavy) this.heavyCount++;
            // combo: encadeia o próximo golpe pulando a recuperação
            if (a.next && t && t.alive && this.comboDepth < 3) {
              const ni = this.def.attacks.findIndex((x) => x.id === a.next);
              const nx = this.def.attacks[ni];
              const chance = (a.comboChance ?? 0.5) * (1 + this.ai.style.block * 0.3);
              if (nx && Math.random() < chance && distXZ(this.position, t.position) <= nx.maxRange + 0.6) {
                this.comboDepth++;
                this.beginAttack(ni, false);
                this.atkLocked = false;
                return;
              }
            }
          }
        } else {
          this.moveMode = 'stop';
          if (this.phaseT >= a.recovery) {
            this.endAction();
            // superaquecimento (constructos) após N golpes pesados
            const oh = this.def.overheat;
            if (oh && this.heavyCount >= oh.after) {
              this.heavyCount = 0;
              this.startOverheat(oh.duration, oh.damageMul);
            }
          }
        }
        return;
      }
      case 'dodge': {
        this.phaseT += dt;
        const T = AI_RULES.dodgeTime;
        const k = this.phaseT / T;
        const spd = (this.def.defense.dodgeDistance / T) * (1.5 - k);
        this.moveVel.set(this.dodgeDir.x * spd, 0, this.dodgeDir.z * spd);
        this.moveMode = 'stop';
        if (this.phaseT >= T) {
          this.act = 'none';
          this.moveVel.set(0, 0, 0);
          // esquiva às vezes vira contra-ataque (Ravena/espreitador)
          const ci = this.def.attacks.findIndex((x) => x.counterOnly);
          if (ci >= 0 && Math.random() < this.def.defense.counter * 0.5) {
            this.counterIdx = ci;
            this.counterT = 0.05;
          }
        }
        return;
      }
      case 'block': {
        this.blockT -= dt;
        this.moveMode = 'stop';
        if (this.blockT <= 0) this.endAction();
        return;
      }
      case 'overheat': {
        this.overheatT -= dt;
        this.moveMode = 'stop';
        if (this.overheatT <= 0) this.endOverheat();
        else if (Math.random() < dt * 8) {
          V1.copy(this.position);
          V1.y += this.height * 0.7;
          ctx.sys.vfx.puff(V1, 0xdddddd, 0.6 * this.def.scale, 1.2, 0.35, 1.6);
        }
        return;
      }
      case 'special':
        // controlada por enemySpecials
        return;
    }
  }

  startOverheat(duration: number, mul: number) {
    this.cancelAction();
    this.act = 'overheat';
    this.overheatT = duration;
    this.health.exposedMul = mul;
    this.health.addStatus('overheated', duration, mul);
    this.ctx.sys.vfx.burst('smoke', this.getCenter(V1), { scale: 1.2, color: 0xcccccc });
    this.ctx.sys.audio.play('hit_metal', { position: this.position, pitch: 0.6 });
  }

  private endOverheat() {
    this.act = 'none';
    this.overheatT = 0;
    this.health.exposedMul = 0;
    this.health.clearStatus('overheated');
  }

  // =====================================================================
  // Locomoção
  // =====================================================================
  private locomotion(dt: number, ctx: GameContext) {
    const p = this.position;
    const h = this.health;
    const def = this.def;
    const mm = h.moveMultiplier();
    const t = this.target;
    // velocidade desejada
    let vx = 0;
    let vz = 0;
    if (this.act === 'none' && mm > 0) {
      const spd = this.moveSpeed * mm;
      switch (this.moveMode) {
        case 'goto':
        case 'approach': {
          const dx = this.goal.x - p.x;
          const dz = this.goal.z - p.z;
          const d = Math.hypot(dx, dz);
          const stopAt = this.moveMode === 'approach' ? Math.max(0.9, (t ? t.radius : 0.4) + this.radius + 0.4) : 0.3;
          if (d > stopAt) {
            const s = Math.min(spd, (d - stopAt) * 3 + 0.4);
            // dentro da vila, com a reta bloqueada: segue o próximo ponto do grafo (só tier 0)
            if (this.tier === 0 && this.updateNav(dt, ctx)) {
              const wx = this.navPoint.x - p.x;
              const wz = this.navPoint.z - p.z;
              const wl = Math.hypot(wx, wz) || 1;
              vx = (wx / wl) * s;
              vz = (wz / wl) * s;
            } else {
              vx = (dx / d) * s;
              vz = (dz / d) * s;
            }
          } else this.navPath = null;
          if (!this.facingTarget && d > 0.3) this.faceYaw = Math.atan2(dx, dz);
          break;
        }
        case 'circle': {
          const dx = p.x - this.goal.x;
          const dz = p.z - this.goal.z;
          const d = Math.hypot(dx, dz) || 1;
          const want = def.preferredRange[1] + 1.2;
          const radial = clamp((want - d) * 0.8, -1, 1);
          vx = ((-dz / d) * this.strafeSign + (dx / d) * radial) * spd;
          vz = ((dx / d) * this.strafeSign + (dz / d) * radial) * spd;
          break;
        }
        case 'keepRange': {
          const dx = p.x - this.goal.x;
          const dz = p.z - this.goal.z;
          const d = Math.hypot(dx, dz) || 1;
          vx = ((dx / d) * 0.85 + (-dz / d) * this.strafeSign * 0.4) * spd;
          vz = ((dz / d) * 0.85 + (dx / d) * this.strafeSign * 0.4) * spd;
          break;
        }
        case 'hover': {
          if (t) {
            const dx = p.x - t.position.x;
            const dz = p.z - t.position.z;
            const d = Math.hypot(dx, dz) || 1;
            const want = (def.preferredRange[0] + def.preferredRange[1]) * 0.5;
            const radial = clamp((want - d) * 0.4, -1, 1);
            vx = ((-dz / d) * this.strafeSign + (dx / d) * radial) * spd;
            vz = ((dx / d) * this.strafeSign + (dz / d) * radial) * spd;
          }
          break;
        }
        default:
          break;
      }
      // desvio de obstáculos simples: se travado, anda de lado um pouco
      if (this.unstickT > 0) {
        this.unstickT -= dt;
        vx = this.unstickDir.x * spd;
        vz = this.unstickDir.z * spd;
      }
      this.moveVel.x += (vx - this.moveVel.x) * Math.min(1, dt * 8);
      this.moveVel.z += (vz - this.moveVel.z) * Math.min(1, dt * 8);
    } else if (this.act !== 'dodge' && this.act !== 'attack') {
      this.moveVel.x *= Math.exp(-10 * dt);
      this.moveVel.z *= Math.exp(-10 * dt);
    } else if (this.act === 'attack' && this.phase !== 1) {
      this.moveVel.x *= Math.exp(-12 * dt);
      this.moveVel.z *= Math.exp(-12 * dt);
    }
    if (mm === 0 && this.act !== 'dodge') this.moveVel.set(0, 0, 0);

    // separação entre inimigos (barata, escalonada)
    if (this.tier === 0 && def.archetype !== 'flyer') {
      this.sepT -= dt;
      if (this.sepT <= 0) {
        this.sepT = 0.2;
        this.sep.set(0, 0, 0);
        const near = ctx.entities.queryRadius(p, AI_RULES.separation + this.radius + 1, _list);
        for (const e of near) {
          if (e === this || !e.solid || (e.kind !== 'enemy' && e.kind !== 'npc' && e.kind !== 'boss')) continue;
          const dx = p.x - e.position.x;
          const dz = p.z - e.position.z;
          const d = Math.hypot(dx, dz);
          const min = this.radius + e.radius + 0.25;
          if (d < min && d > 1e-3) {
            const k = (min - d) / min;
            this.sep.x += (dx / d) * k * 2.5;
            this.sep.z += (dz / d) * k * 2.5;
          }
        }
      }
    }

    // integra (movimento + empurrões/knockback em this.velocity)
    const ox = p.x;
    const oz = p.z;
    const nx = p.x + (this.moveVel.x + this.velocity.x + this.sep.x) * dt;
    const nz = p.z + (this.moveVel.z + this.velocity.z + this.sep.z) * dt;
    if (h.has('root')) this.velocity.set(0, 0, 0);
    const kd = Math.exp(-6 * dt);
    this.velocity.x *= kd;
    this.velocity.z *= kd;
    if (this.isFlyer) {
      p.x = nx;
      p.z = nz;
      this.flyHeight(dt, ctx);
    } else {
      // não entra em água funda
      if (!isDeepWater(ctx, nx, nz)) {
        p.x = nx;
        p.z = nz;
      } else {
        this.moveVel.set(0, 0, 0);
      }
      if (!this.perched) {
        ctx.physics.resolveCapsule(p, this.radius, this.height);
        const g = groundAt(ctx, p.x, p.z, p.y + 0.7);
        if (this.act === 'attack' && this.atk?.kind === 'leap' && this.phase === 1) {
          // salto: altura controlada pelo ataque
          p.y = Math.max(g, this.airY);
        } else {
          p.y += (g - p.y) * Math.min(1, dt * 14);
          if (Math.abs(g - p.y) > 2) p.y = g;
        }
      }
    }
    // travado?
    if (this.moveMode !== 'stop' && this.act === 'none' && this.unstickT <= 0 && this.moveSpeed > 0.5) {
      this.stuckT += dt;
      if (this.stuckT > 0.9) {
        const moved = Math.hypot(p.x - this.stuckRef.x, p.z - this.stuckRef.z);
        if (moved < this.moveSpeed * 0.15) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const dx = this.goal.x - p.x;
          const dz = this.goal.z - p.z;
          const l = Math.hypot(dx, dz) || 1;
          this.unstickDir.set((-dz / l) * side, 0, (dx / l) * side);
          this.unstickT = rand(0.6, 1.1);
          this.strafeSign *= -1;
        }
        this.stuckT = 0;
        this.stuckRef.copy(p);
      }
    } else this.stuckT = 0;

    // orientação
    if (this.facingTarget && t && this.act === 'none' && (this.state === 'combat' || this.state === 'alert')) this.faceYaw = yawTo(p.x, p.z, t.position.x, t.position.z);
    const turn = def.turn * (this.act === 'block' ? 2 : 1) * h.actionMultiplier() * (h.canAct() ? 1 : 0.2);
    this.yaw = turnTowards(this.yaw, this.faceYaw, turn * dt);
    this.object3d.rotation.y = this.yaw;
    void ox;
    void oz;
  }

  /**
   * Navegação barata pelo grafo da vila: só dentro da muralha (onde o grafo existe), só quando a
   * reta até o objetivo está bloqueada, recalculada a cada ~1,2 s. Escreve o waypoint em `navPoint`.
   * Retorna false quando o movimento direto basta.
   */
  private updateNav(dt: number, ctx: GameContext): boolean {
    const p = this.position;
    const vdx = p.x - VILLAGE.x;
    const vdz = p.z - VILLAGE.z;
    const R = VILLAGE.wallRadius + 14;
    if (this.isFlyer || vdx * vdx + vdz * vdz > R * R) {
      this.navPath = null;
      return false;
    }
    this.navT -= dt;
    if (this.navT <= 0) {
      this.navT = 1.1 + Math.random() * 0.4;
      const gx = this.goal.x - p.x;
      const gz = this.goal.z - p.z;
      this.navPath = null;
      if (gx * gx + gz * gz > 9) {
        NAV_A.set(p.x, p.y + 1.1, p.z);
        NAV_B.set(this.goal.x, this.goal.y + 1.1, this.goal.z);
        if (!ctx.physics.lineOfSight(NAV_A, NAV_B, true)) {
          const world = ctx.sys.world as { findPath?: (a: { x: number; z: number }, b: { x: number; z: number }) => { x: number; z: number }[] | null };
          const path = world.findPath?.({ x: p.x, z: p.z }, { x: this.goal.x, z: this.goal.z }) ?? null;
          if (path && path.length > 2) {
            this.navPath = path;
            this.navIdx = 1;
          }
        }
      }
    }
    const path = this.navPath;
    if (!path) return false;
    // avança os waypoints já alcançados; o último ponto é o próprio objetivo (segue direto)
    while (this.navIdx < path.length - 1) {
      const w = path[this.navIdx];
      const dx = w.x - p.x;
      const dz = w.z - p.z;
      if (dx * dx + dz * dz > 1.6 * 1.6) break;
      this.navIdx++;
    }
    if (this.navIdx >= path.length - 1) {
      this.navPath = null;
      return false;
    }
    const w = path[this.navIdx];
    this.navPoint.set(w.x, p.y, w.z);
    return true;
  }

  /** Voadores: mantêm altitude acima do chão (ou na altura do alvo voador). */
  private flyHeight(dt: number, ctx: GameContext) {
    const p = this.position;
    const g = ctx.heightfield.heightAt(p.x, p.z);
    let want = g + (this.def.flyHeight ?? 8);
    const t = this.target;
    if (t && (this.state === 'combat' || this.state === 'alert')) {
      const tAbove = t.position.y - ctx.heightfield.heightAt(t.position.x, t.position.z);
      // ameaça para quem voa: acompanha a altitude do jogador
      if (tAbove > 4) want = Math.max(g + 3, t.position.y + 2.5);
    }
    if (this.act === 'attack' && this.atk?.kind === 'dive' && this.phase === 1) return; // controlado pelo mergulho
    p.y += clamp(want - p.y, -6 * dt, 6 * dt);
    if (p.y < g + 1) p.y = g + 1;
    this.airY = p.y;
  }

  // =====================================================================
  // Visual
  // =====================================================================
  private updateVisual(dt: number, ctx: GameContext) {
    const a = this.anim;
    const h = this.health;
    const ts = h.actionMultiplier();
    a.time += dt * ts;
    a.timeScale = ts;
    const sx = this.moveVel.x + this.velocity.x * 0.3;
    const sz = this.moveVel.z + this.velocity.z * 0.3;
    const spd = Math.hypot(sx, sz);
    a.speed = spd;
    if (spd > 0.05) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      // local: Z = frente, X = esquerda (+)
      a.localZ = (sx * s + sz * c) / spd;
      a.localX = (sx * c - sz * s) / spd;
    }
    a.run = clamp((spd - this.def.walk * 1.1) / Math.max(0.5, this.def.run - this.def.walk), 0, 1);
    a.combat = this.state === 'combat' || this.state === 'alert' || this.state === 'search';
    a.block = this.act === 'block';
    if (this.act === 'attack' && this.atk) {
      a.action = this.atk.anim;
      a.phase = this.phase;
      const dur = this.phase === 0 ? this.atk.windup : this.phase === 1 ? this.atk.active : this.atk.recovery;
      a.phaseT = clamp(this.phaseT / Math.max(0.02, dur), 0, 1);
    } else if (this.act === 'special' && this.sp.anim !== 'none') {
      a.action = this.sp.anim;
      a.phase = this.sp.animPhase;
      a.phaseT = this.sp.animT;
    } else a.action = 'none';
    if (this.act === 'dodge') {
      a.dodge = clamp(this.phaseT / AI_RULES.dodgeTime, 0.001, 1);
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      a.dodgeZ = this.dodgeDir.x * s + this.dodgeDir.z * c;
      a.dodgeX = this.dodgeDir.x * c - this.dodgeDir.z * s;
    } else a.dodge = 0;
    a.hit = this.hitReact;
    a.stagger = h.staggered || h.has('stun');
    a.kneel = this.state === 'surrender';
    a.overheat = this.act === 'overheat';
    a.dive = this.act === 'attack' && this.atk?.kind === 'dive' && this.phase === 1 ? 1 : 0;
    const t = this.target;
    if (t && (a.combat || this.state === 'investigate')) {
      a.lookYaw = angleDiff(this.yaw, yawTo(this.position.x, this.position.z, t.position.x, t.position.z));
      a.lookPitch = clamp((t.position.y - this.position.y) * 0.08, -0.5, 0.5);
    } else {
      a.lookYaw *= 0.95;
      a.lookPitch *= 0.95;
    }
    // rig: no tier 0 todo quadro; mais longe, quando a entidade é atualizada
    this.rig.update(dt, a);
    // material: clarão de dano, brilho de antecipação, núcleo superaquecido
    const u = this.mat.rig;
    u.uHit.value = this.hitFlash;
    u.uCharge.value = this.charge;
    if (this.charge > 0) u.uChargeColor.value.setHex(this.chargeColor);
    u.uGlowMul.value = this.act === 'overheat' ? 1.8 + Math.sin(a.time * 14) * 0.8 : h.has('empowered') ? 1.6 : 1;
    u.uGlowTintMix.value = h.has('empowered') ? 0.6 : this.act === 'overheat' ? 0.5 : 0;
    if (u.uGlowTintMix.value > 0) u.uGlowTint.value.setHex(this.act === 'overheat' ? 0xff6a20 : 0xff3050);
    // barra de vida
    const pl = ctx.sys.player.entity;
    const d2 = dist2XZ(this.position, pl.position);
    const R = AI_RULES.barRange;
    this.barVisible = !this.stealthed && !this.hidden && d2 < R * R && (this.engaged || this.sinceHurt < AI_RULES.barLinger || (this.elite && d2 < 400));
    // sombras só perto
    this.shadowT -= dt;
    if (this.shadowT <= 0) {
      this.shadowT = 1 + Math.random() * 0.5;
      this.rig.setShadows(ctx.settings.q.shadowMapSize > 0 && d2 < 50 * 50 && !this.stealthed);
    }
  }

  setStealth(on: boolean) {
    if (this.stealthed === on) return;
    this.stealthed = on;
    const st = this.def.special?.stealth;
    this.mat.transparent = on;
    this.mat.opacity = on ? st?.opacity ?? 0.25 : 1;
    this.mat.depthWrite = !on;
    this.mat.needsUpdate = true;
    if (on) this.rig.setShadows(false);
  }

  // =====================================================================
  // Dano e morte
  // =====================================================================
  override onDamaged(info: DamageInfo, result: DamageResult, ctx: GameContext): void {
    if (this.deadT >= 0) return;
    const src = info.source ?? null;
    this.sinceHurt = 0;
    if (this.state === 'surrender') {
      for (const t of [...this.tags]) if (t.startsWith('aggro:')) this.tags.delete(t);
      return;
    }
    if (result.dealt > 0 || result.absorbed > 0) this.hitFlash = 1;
    if (result.parried) {
      ctx.sys.vfx.burst('blockSpark', info.point ?? this.getCenter(V1), { scale: 1.2, color: 0x9fe8ff });
      ctx.sys.audio.play('parry', { position: this.position });
      this.queueCounter(1);
    } else if (result.blocked) {
      ctx.sys.vfx.burst('blockSpark', info.point ?? this.getCenter(V1), { scale: 0.8 });
      ctx.sys.audio.play('block', { position: this.position });
      this.queueCounter(this.def.defense.counter);
    } else if (result.dealt > 0) {
      // reação a dano: brutos/constructos não se encolhem durante golpes pesados
      const armored = this.def.rig === 'construct' || this.def.rig === 'golem';
      if (!(armored && this.act === 'attack')) this.hitReact = Math.min(1, 0.5 + result.dealt / Math.max(20, this.health.max * 0.15));
      if (this.health.lastWeak) {
        ctx.sys.vfx.burst(this.def.rig === 'construct' || this.def.rig === 'golem' ? 'metalSpark' : 'impact', info.point ?? this.getCenter(V1), { scale: 1.1, color: 0x7fe8ff });
      }
    }
    if (result.staggered) {
      this.cancelAction();
      ctx.sys.vfx.burst(this.def.rig === 'construct' ? 'metalSpark' : 'impact', this.getCenter(V1), { scale: 1 });
    }
    // conjuradores: choque interrompe conjuração
    if (this.act === 'attack' && this.phase === 0 && this.atk && (this.atk.anim === 'cast' || this.atk.anim === 'castUp') && this.health.has('shock')) this.cancelAction();
    if (this.stealthed) this.setStealth(false);
    // agressão: quem bateu vira alvo
    if (src && src !== this && src.alive && ctx.sys.combat.isHostile(this, src)) {
      if (this.state !== 'combat' && this.state !== 'alert') this.engage(src, true, 0.1);
      else if (this.target !== src && src.kind === 'player' && Math.random() < 0.5) this.target = src;
      if (this.state === 'search') this.setState('combat');
      this.lastSeen.copy(src.position);
      this.lostT = 0;
    }
    onSpecialDamaged(this, info, result, ctx);
  }

  private queueCounter(chance: number) {
    if (this.counterT >= 0 || this.state !== 'combat') return;
    const ci = this.def.attacks.findIndex((a) => a.counterOnly);
    if (ci < 0 || Math.random() > chance) return;
    this.counterIdx = ci;
    this.counterT = 0.12;
    if (this.act === 'block') {
      this.blockT = Math.min(this.blockT, 0.1);
    }
  }

  override onDeath(_info: DamageInfo | undefined, ctx: GameContext): void {
    this.cancelAction();
    this.ai?.releaseAttackToken(this);
    this.health.blocking = false;
    this.state = 'dead';
    this.deadT = 0;
    this.barVisible = false;
    this.queryable = true;
    this.solid = false;
    if (this.stealthed) this.setStealth(false);
    this.moveVel.set(0, 0, 0);
    ctx.sys.audio.play('enemy_death', { position: this.position });
    this.ai?.onEnemyDeath(this);
  }

  private updateDeath(dt: number, ctx: GameContext) {
    this.deadT += dt;
    const p = this.position;
    if (this.isFlyer) {
      // cai até o chão
      const g = ctx.heightfield.heightAt(p.x, p.z);
      this.velocity.y -= 18 * dt;
      p.y = Math.max(g, p.y + this.velocity.y * dt);
      p.x += this.moveVel.x * dt * 0.5;
      p.z += this.moveVel.z * dt * 0.5;
    }
    this.anim.dead = clamp(this.deadT / 0.9, 0, 1);
    this.anim.action = 'none';
    this.anim.dodge = 0;
    this.anim.time += dt;
    this.rig.update(dt, this.anim);
    this.mat.rig.uHit.value = Math.max(0, 1 - this.deadT * 3);
    this.mat.rig.uCharge.value = 0;
    if (!this.dissolving && this.deadT > 1.1) {
      this.dissolving = true;
      const color = this.def.rig === 'construct' || this.def.rig === 'golem' || this.def.rig === 'pillar' ? 0x58d8ff : this.def.faction === 'corrupted' ? 0xb040ff : 0xff7a40;
      ctx.sys.vfx.dissolve(this.object3d, {
        duration: 1.5,
        color,
        height: this.height,
        onDone: () => ctx.entities.remove(this),
      });
    }
    if (this.deadT > 8) ctx.entities.remove(this);
  }

  override dispose(): void {
    cancelAttackVisuals(this);
    this.ai?.unregister(this);
    super.dispose();
    this.mat.dispose();
  }

  /** Para testes/depuração. */
  debug() {
    return {
      id: this.id,
      type: this.typeId,
      state: this.state,
      act: this.act,
      atk: this.atk?.id ?? null,
      phase: this.phase,
      hp: Math.round(this.health.current),
      max: this.health.max,
      blocking: this.health.blocking,
      dist: this.target ? +distXZ(this.position, this.target.position).toFixed(2) : -1,
      x: +this.position.x.toFixed(2),
      y: +this.position.y.toFixed(2),
      z: +this.position.z.toFixed(2),
      token: this.ai?.tokens.holds(this.id) ?? false,
      stealth: this.stealthed,
      bar: this.barVisible,
    };
  }
}

/** Dano efetivo de um ataque (nível + recurso de teste). */
export { attackDamage };
void V3;
void V4;
