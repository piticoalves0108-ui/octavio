import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import { Entity } from '../../core/Entity';
import type { DamageInfo, DamageResult } from '../../combat/Health';
import type { VfxHandle, SustainedSegment, LightHandle } from '../../combat/VFX';
import { GUARDIAN, BOSS_GATES } from '../../data/bosses';
import { PLACES } from '../../data/places';
import { EnemyHealth } from '../EnemyHealth';
import { createRigMaterial, type RigMaterial } from '../rigs/material';
import { HumanoidRig } from '../rigs/humanoid';
import { PillarRig } from '../rigs/misc';
import { makeAnimInput, type AnimInput, type ExtraAnim } from '../rigs/anim';
import type { Enemy } from '../Enemy';
import type { AI } from '../AI';
import { V1, V2, V3, V4, angleDiff, clamp, distXZ, groundAt, rand, turnTowards, yawTo } from '../shared';

export type GuardianState = 'intro' | 'idle' | 'attack' | 'transition' | 'stunned' | 'overheat' | 'dead';
type GAttack = 'sweep' | 'stomp' | 'charge' | 'laser';

const G = GUARDIAN;
const BOSS_ID = G.id;

/**
 * Chefe — Guardião Mecânico das Ruínas. Constructo rúnico colossal com núcleo luminoso.
 * F1 (100–66%): varrida em cone, pisão com onda de choque em anel, investida em linha.
 * F2 (66–33%): 4 pilares de cristal nos soquetes dão escudo (−90%) até serem destruídos,
 *   laser giratório, invoca 2 sentinelas.
 * F3 (33–0%): respiradouros explodem em padrões anunciados; combos mais rápidos e, após cada
 *   combo, superaquece expondo o núcleo (×2 + janela de atordoamento).
 * Imune a atordoamento/enraizamento; sofre lentidão reduzida. Transições com rugido, tremor,
 * relâmpago e 'boss:phase'. A morte emite 'boss:defeated'; a luta reseta se o jogador morrer.
 */
export class Guardian extends Entity {
  readonly rig: HumanoidRig;
  readonly mat: RigMaterial;
  readonly anim: AnimInput = makeAnimInput();
  declare health: EnemyHealth;
  ctx!: GameContext;
  ai!: AI;
  readonly bossId = BOSS_ID;
  elite = true;
  level = 6;
  barVisible = false;
  barHeight = G.height + 0.6;
  phase: 1 | 2 | 3 = 1;
  state: GuardianState = 'intro';
  stateT = 0;
  attack: GAttack | null = null;
  atkPhase: 0 | 1 | 2 = 0;
  atkT = 0;
  atkYaw = 0;
  private tele: VfxHandle | null = null;
  private cds: Record<GAttack, number> = { sweep: 1.5, stomp: 3, charge: 5, laser: 4 };
  private lastAttack: GAttack | null = null;
  private combo = 0;
  readonly center = new THREE.Vector3();
  readonly pillars: Enemy[] = [];
  readonly summons: Enemy[] = [];
  private shielded = false;
  private linkT = 0;
  // pisão
  private ringR = -1;
  private ringHit = false;
  readonly ringCenter = new THREE.Vector3();
  // investida
  private chargeDist = 0;
  private chargeHit = false;
  // laser
  private beam: SustainedSegment | null = null;
  private laserYaw = 0;
  private laserDir = 1;
  private laserTick = 0;
  private laserHit = new Set<number>();
  // respiradouros
  readonly vents: THREE.Vector3[] = [];
  private ventT = 4;
  private ventIdx = 0;
  private ventPending: { t: number; idx: number[] } | null = null;
  private steamT = 0;
  private light: LightHandle | null = null;
  private hitFlash = 0;
  private charge = 0;
  private chargeColor = 0xff6a1a;
  deadT = -1;
  private dissolving = false;
  private outsideT = 0;
  private sweepHit = new Set<number>();
  /** Estatísticas para testes. */
  stats = { attacks: { sweep: 0, stomp: 0, charge: 0, laser: 0 } as Record<GAttack, number>, vents: 0, overheats: 0, wallStuns: 0, pillarsDestroyed: 0 };

  constructor() {
    super('boss', 'construct');
    this.typeId = BOSS_ID;
    this.name = G.title;
    this.radius = G.radius;
    this.height = G.height;
    this.alwaysActive = true;
    this.persistent = false;
    const h = new EnemyHealth(G.hp);
    h.armor = G.armor;
    h.resist = { ...G.resist };
    h.maxPoise = h.poise = G.poise;
    h.poiseRegen = 30;
    h.staggerDuration = 2.2;
    h.statusImmune.add('stun');
    h.statusImmune.add('root');
    h.statusImmune.add('bleed');
    h.slowResist = G.slowResist;
    h.invulnerable = G.intro;
    this.health = h;
    this.mat = createRigMaterial({ metalness: 0.5, roughness: 0.45 });
    this.rig = new HumanoidRig('guardiao', this.mat);
    this.rig.root.scale.setScalar(G.scale);
    this.object3d.add(this.rig.root);
    this.object3d.name = BOSS_ID;
  }

  override onAdded(ctx: GameContext): void {
    this.ctx = ctx;
    this.ai = ctx.sys.ai;
    const c = PLACES['arena_centro'];
    this.center.set(c?.x ?? this.position.x, c?.y ?? this.position.y, c?.z ?? this.position.z);
    for (let i = 1; i <= 6; i++) {
      const v = PLACES[`arena_respiradouro_${i}`];
      if (v) this.vents.push(new THREE.Vector3(v.x, v.y ?? this.center.y, v.z));
    }
    this.position.y = groundAt(ctx, this.position.x, this.position.z, this.position.y + 2);
    this.rig.setShadows(ctx.settings.q.shadowMapSize > 0);
    this.state = 'intro';
    this.stateT = 0;
    this.health.floor = Math.ceil(G.hp * G.phaseAt[0]);
    // despertar: rugido + tremor
    ctx.sys.audio.play('boss_roar', { position: this.position, volume: 1 });
    ctx.sys.camera.shake(0.6, 1.4);
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 3, color: 0x7ff8ff });
    this.light = ctx.sys.vfx.sustainedLight(V1.copy(this.center).setY(this.center.y + 6), 0x58d8ff, 8, 9999, null, 40);
  }

  get engaged() {
    return this.alive && this.state !== 'dead';
  }

  // =====================================================================
  override update(dt: number, ctx: GameContext): void {
    this.stateT += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
    if (this.state === 'dead') {
      this.updateDead(dt, ctx);
      return;
    }
    const h = this.health;
    const act = h.actionMultiplier() * (this.phase === 3 ? G.phase3.actionSpeed : 1);
    for (const k in this.cds) this.cds[k as GAttack] -= dt * act;
    const pl = ctx.sys.player.entity;
    // trela: jogador fora da arena por muito tempo → reseta
    if (pl.alive && distXZ(pl.position, this.center) > G.leashRadius) {
      this.outsideT += dt;
      if (this.outsideT > 5) {
        this.ai.resetBossFight('fuga');
        return;
      }
    } else this.outsideT = 0;
    this.updatePillars(dt, ctx);
    this.updateRing(dt, ctx);
    if (this.phase === 3) this.updateVents(dt * (h.actionMultiplier() || 1), ctx);
    switch (this.state) {
      case 'intro':
        this.anim.action = 'roar';
        this.anim.phase = this.stateT < G.intro * 0.4 ? 0 : 1;
        this.anim.phaseT = clamp(this.stateT / (G.intro * 0.5), 0, 1);
        this.faceTarget(dt, 1);
        if (this.stateT >= G.intro) this.setState('idle');
        break;
      case 'transition':
        this.updateTransition(dt, ctx);
        break;
      case 'stunned':
        this.anim.action = 'none';
        this.anim.stagger = true;
        if (this.stateT >= G.charge.wallStun) {
          this.anim.stagger = false;
          this.setState('idle');
        }
        break;
      case 'overheat':
        this.anim.action = 'none';
        this.anim.overheat = true;
        if (Math.random() < dt * 14) {
          this.rig.chestWorld(V1);
          ctx.sys.vfx.puff(V1, 0xe0e0e0, rand(1.2, 2), 1.4, 0.4, 2.2);
        }
        if (this.stateT >= G.phase3.overheat || h.staggered) {
          if (this.stateT >= G.phase3.overheat) this.endOverheat();
        }
        break;
      case 'idle':
        this.anim.action = 'none';
        if (!h.canAct()) break;
        this.think(dt, ctx);
        break;
      case 'attack':
        this.updateAttack(dt * act, dt, ctx);
        break;
    }
    if (h.staggered && this.state === 'attack') this.cancelAttack();
    this.locomotion(dt, ctx);
    this.updateVisual(dt, ctx);
  }

  private setState(s: GuardianState) {
    this.state = s;
    this.stateT = 0;
  }

  private faceTarget(dt: number, mul: number) {
    const pl = this.ctx.sys.player.entity;
    const want = yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z);
    this.yaw = turnTowards(this.yaw, want, G.turn * mul * dt);
  }

  // ---------------------------------------------------------------------
  private moveSpeed = 0;
  private think(dt: number, ctx: GameContext) {
    const pl = ctx.sys.player.entity;
    if (!pl.alive) {
      this.moveSpeed = 0;
      return;
    }
    const d = distXZ(this.position, pl.position);
    const facing = Math.abs(angleDiff(this.yaw, yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z)));
    // escolha ponderada com anti-repetição (sem alocar: pesos em arrays fixos)
    let choice: GAttack | null = null;
    this.wN = 0;
    this.addChoice('sweep', d < G.sweep.radius - 0.5 && facing < 0.9 ? 3 : 0);
    this.addChoice('stomp', d < 13 ? 2 : 0);
    this.addChoice('charge', d > 9 && d < G.charge.length ? (d > 15 ? 3 : 1.2) : 0);
    if (this.phase >= 2) this.addChoice('laser', d > 5 ? 2.2 : 0.8);
    if (this.combo > 0) {
      // fase 3: combo rápido (varrida/pisão alternados)
      const k = this.lastAttack === 'sweep' ? 'stomp' : 'sweep';
      if (k === 'sweep' && d < G.sweep.radius + 2) choice = 'sweep';
      else if (k === 'stomp' && d < 14) choice = 'stomp';
    }
    if (!choice && this.wN > 0 && this.stateT > (this.phase === 3 ? 0.35 : 0.8)) {
      let tot = 0;
      for (let i = 0; i < this.wN; i++) tot += this.wW[i];
      let r = Math.random() * tot;
      for (let i = 0; i < this.wN; i++) {
        r -= this.wW[i];
        if (r <= 0) {
          choice = this.wA[i];
          break;
        }
      }
    }
    if (choice && (facing < 0.8 || choice === 'stomp' || choice === 'laser')) {
      this.beginAttack(choice, ctx);
      return;
    }
    // aproxima-se
    this.faceTarget(dt, 1);
    this.moveSpeed = d > 7 ? (d > 18 ? G.run * 0.75 : G.walk) : 0;
  }

  private readonly wA: GAttack[] = ['sweep', 'sweep', 'sweep', 'sweep'];
  private readonly wW = new Float32Array(4);
  private wN = 0;
  private addChoice(a: GAttack, weight: number) {
    if (this.cds[a] > 0 || weight <= 0) return;
    this.wA[this.wN] = a;
    this.wW[this.wN] = this.lastAttack === a ? weight * 0.3 : weight;
    this.wN++;
  }

  private beginAttack(a: GAttack, ctx: GameContext) {
    const pl = ctx.sys.player.entity;
    this.setState('attack');
    this.attack = a;
    this.atkPhase = 0;
    this.atkT = 0;
    this.lastAttack = a;
    this.moveSpeed = 0;
    this.stats.attacks[a]++;
    if (this.phase === 3 && this.combo === 0) this.combo = Math.round(rand(G.phase3.comboLength[0], G.phase3.comboLength[1]));
    this.atkYaw = yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z);
    const speed = this.phase === 3 ? G.phase3.actionSpeed : 1;
    const vfx = ctx.sys.vfx;
    const p = this.position;
    switch (a) {
      case 'sweep':
        this.cds.sweep = G.sweep.cooldown;
        this.yaw = this.atkYaw;
        this.sweepHit.clear();
        this.tele = vfx.telegraph({ type: 'cone', position: p, yaw: this.atkYaw, radius: G.sweep.radius, angle: G.sweep.arc, duration: G.sweep.windup / speed, color: 0xff8a20 });
        this.chargeColor = 0xff7a18;
        break;
      case 'stomp':
        this.cds.stomp = G.stomp.cooldown;
        this.tele = vfx.telegraph({ type: 'ring', position: p, radius: 8, innerRadius: 5, duration: G.stomp.windup / speed, color: 0xff2018 });
        this.chargeColor = 0xff2418;
        break;
      case 'charge': {
        this.cds.charge = G.charge.cooldown;
        this.yaw = this.atkYaw;
        const len = Math.min(G.charge.length, distXZ(p, pl.position) + 8);
        this.chargeDist = len;
        this.chargeHit = false;
        this.tele = vfx.telegraph({ type: 'line', position: p, yaw: this.atkYaw, length: len, width: G.charge.width, duration: G.charge.windup / speed, color: 0xff2018 });
        this.chargeColor = 0xff2418;
        ctx.sys.audio.play('boss_roar', { position: p, volume: 0.6, pitch: 1.3 });
        break;
      }
      case 'laser': {
        this.cds.laser = G.laser.cooldown;
        this.laserYaw = this.atkYaw - 0.5;
        this.yaw = this.laserYaw;
        // gira na direção que "persegue" o jogador
        this.laserDir = Math.random() < 0.5 ? -1 : 1;
        this.tele = vfx.telegraph({ type: 'line', position: p, yaw: this.laserYaw, length: G.laser.length, width: 1.2, duration: G.laser.windup, color: 0x40e8ff });
        this.chargeColor = 0x58e8ff;
        break;
      }
    }
  }

  private cancelAttack() {
    this.tele?.cancel();
    this.tele = null;
    this.beam?.cancel();
    this.beam = null;
    this.attack = null;
    this.charge = 0;
    this.combo = 0;
    if (this.state === 'attack') this.setState('idle');
  }

  private updateAttack(dta: number, dt: number, ctx: GameContext) {
    const a = this.attack!;
    this.atkT += dta;
    const pl = ctx.sys.player.entity;
    const p = this.position;
    const combat = ctx.sys.combat;
    const vfx = ctx.sys.vfx;
    const N = a === 'sweep' ? G.sweep : a === 'stomp' ? G.stomp : a === 'charge' ? G.charge : G.laser;
    const active = a === 'laser' ? G.laser.duration : a === 'charge' ? G.charge.length / G.charge.speed : 0.25;
    this.anim.action = (a === 'sweep' ? 'sweep' : a === 'stomp' ? 'slam' : a === 'charge' ? 'charge' : 'beam') as ExtraAnim;
    if (this.atkPhase === 0) {
      this.charge = clamp(this.atkT / N.windup, 0, 1) * 1.2;
      this.anim.phase = 0;
      this.anim.phaseT = clamp(this.atkT / N.windup, 0, 1);
      if (this.atkT >= N.windup) {
        this.atkPhase = 1;
        this.atkT = 0;
        this.tele = null;
        this.charge = 0;
        this.impact(a, ctx);
      }
      return;
    }
    if (this.atkPhase === 1) {
      this.anim.phase = 1;
      this.anim.phaseT = clamp(this.atkT / active, 0, 1);
      if (a === 'charge') {
        const sp = G.charge.speed;
        const step = sp * dt;
        V1.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
        const ox = p.x;
        const oz = p.z;
        p.x += V1.x * step;
        p.z += V1.z * step;
        const res = ctx.physics.resolveCapsule(p, this.radius, this.height);
        const moved = Math.hypot(p.x - ox, p.z - oz);
        this.chargeDist -= step;
        if (!this.chargeHit && pl.alive && distXZ(p, pl.position) < this.radius + G.charge.width * 0.5 + pl.radius) {
          this.chargeHit = true;
          combat.applyDamage(pl, { amount: G.charge.damage, type: G.charge.type, source: this, knockback: G.charge.knockback, poiseDamage: G.charge.poise, unblockable: true, tag: 'melee', direction: V1.clone() });
          ctx.sys.camera.shake(0.5, 0.4);
        }
        if (Math.random() < dt * 20) vfx.burst('dust', p, { scale: 1.2, count: 4 });
        // bateu na parede ou num pilar → atordoado
        let hitPillar = false;
        for (const pi of this.pillars) if (pi.alive && distXZ(pi.position, p) < this.radius + pi.radius + 0.3) hitPillar = true;
        if ((res.collided && moved < step * 0.5) || hitPillar) {
          this.stats.wallStuns++;
          vfx.burst('metalSpark', V2.copy(p).setY(p.y + 3), { scale: 2.5 });
          vfx.burst('shockwave', p, { scale: 2, color: 0xffa060 });
          ctx.sys.audio.play('boss_slam', { position: p });
          ctx.sys.camera.shake(0.7, 0.6);
          this.attack = null;
          this.combo = 0;
          this.setState('stunned');
          return;
        }
        if (this.chargeDist <= 0) {
          this.atkPhase = 2;
          this.atkT = 0;
        }
        return;
      }
      if (a === 'laser') {
        this.laserYaw += this.laserDir * G.laser.turnSpeed * dta;
        this.yaw = this.laserYaw;
        // persegue: se o jogador estiver do outro lado, inverte uma vez
        this.rig.chestWorld(V1);
        V1.y = this.center.y + G.laser.height + 0.4 + (p.y - this.center.y);
        V1.x += Math.sin(this.laserYaw) * (this.radius + 0.3);
        V1.z += Math.cos(this.laserYaw) * (this.radius + 0.3);
        V2.set(Math.sin(this.laserYaw), -0.01, Math.cos(this.laserYaw));
        this.laserTick -= dt;
        if (this.laserTick <= 0) {
          this.laserTick = G.laser.tick;
          this.laserHit.clear();
        }
        const res = combat.beamAttack(this, V1, V2, G.laser.length, G.laser.width, { amount: G.laser.damage, type: G.laser.type, poiseDamage: G.laser.poise, tag: 'bossLaser' }, { visual: false, alreadyHit: this.laserHit, pierce: true });
        if (!this.beam) this.beam = vfx.sustainedBeam(0x58e8ff, 0.5, 'beam');
        this.beam?.set(V1, res.end);
        if (Math.random() < dt * 25) vfx.burst('arcaneSpark', res.end, { scale: 0.8, color: 0x7ff8ff });
        if (this.atkT >= active) {
          this.beam?.cancel();
          this.beam = null;
          this.atkPhase = 2;
          this.atkT = 0;
        }
        return;
      }
      if (this.atkT >= active) {
        this.atkPhase = 2;
        this.atkT = 0;
      }
      return;
    }
    // recuperação (janela de abertura)
    this.anim.phase = 2;
    this.anim.phaseT = clamp(this.atkT / N.recovery, 0, 1);
    if (this.atkT >= N.recovery * (this.combo > 1 ? 0.45 : 1)) {
      this.attack = null;
      this.setState('idle');
      if (this.phase === 3 && this.combo > 0) {
        this.combo--;
        if (this.combo === 0) this.startOverheat(ctx);
      }
    }
  }

  private impact(a: GAttack, ctx: GameContext) {
    const p = this.position;
    const combat = ctx.sys.combat;
    const vfx = ctx.sys.vfx;
    switch (a) {
      case 'sweep': {
        V1.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
        combat.meleeSweep(this, p, V1, G.sweep.radius, G.sweep.arc, { amount: G.sweep.damage, type: G.sweep.type, source: this, knockback: G.sweep.knockback, poiseDamage: G.sweep.poise, tag: 'melee' }, { alreadyHit: this.sweepHit, verticalReach: 4 });
        ctx.sys.audio.play('swing_heavy', { position: p, pitch: 0.5, volume: 1 });
        V2.copy(p).addScaledVector(V1, G.sweep.radius * 0.6);
        vfx.burst('dust', V2, { scale: 2, count: 16 });
        ctx.sys.camera.shake(0.35, 0.3);
        break;
      }
      case 'stomp':
        this.ringCenter.copy(p);
        this.ringR = 0.5;
        this.ringHit = false;
        combat.explode(p, 4, { amount: G.stomp.damage, type: G.stomp.type, source: this, knockback: G.stomp.knockback, poiseDamage: G.stomp.poise, unblockable: true, tag: 'aoe' }, this, { falloff: false });
        vfx.ring(p, G.stomp.maxRadius, 0xffa060, G.stomp.maxRadius / G.stomp.ringSpeed);
        vfx.burst('shockwave', p, { scale: 3, color: 0xffa060 });
        ctx.sys.audio.play('boss_slam', { position: p, volume: 1 });
        ctx.sys.camera.shake(0.7, 0.5);
        break;
      case 'charge':
        ctx.sys.audio.play('boss_roar', { position: p, pitch: 1.4, volume: 0.6 });
        break;
      case 'laser':
        ctx.sys.audio.play('boss_laser', { position: p, volume: 1 });
        this.laserTick = 0;
        break;
    }
  }

  /** Onda de choque do pisão: anel que se expande — pule ou esquive através dela. */
  private updateRing(dt: number, ctx: GameContext) {
    if (this.ringR < 0) return;
    this.ringR += G.stomp.ringSpeed * dt;
    const pl = ctx.sys.player;
    const pe = pl.entity;
    if (!this.ringHit && pe.alive) {
      const d = distXZ(pe.position, this.ringCenter);
      const airborne = pl.heightAboveGround > G.stomp.jumpClear || pl.isFlying();
      if (Math.abs(d - this.ringR) < G.stomp.ringWidth + pe.radius && !airborne) {
        this.ringHit = true;
        V1.set(pe.position.x - this.ringCenter.x, 0, pe.position.z - this.ringCenter.z).normalize();
        ctx.sys.combat.applyDamage(pe, { amount: G.stomp.damage * 0.8, type: G.stomp.type, source: this, knockback: G.stomp.knockback, poiseDamage: G.stomp.poise, unblockable: true, tag: 'shockwave', direction: V1.clone() });
      }
    }
    if (this.ringR > G.stomp.maxRadius) this.ringR = -1;
  }

  // ---------------------------------------------------------------------
  // Fases
  // ---------------------------------------------------------------------
  override onDamaged(info: DamageInfo, result: DamageResult, ctx: GameContext): void {
    if (this.state === 'dead') return;
    if (result.dealt > 0) this.hitFlash = Math.min(1, 0.4 + result.dealt / 60);
    if (this.health.lastWeak) ctx.sys.vfx.burst('metalSpark', info.point ?? this.getCenter(V1), { scale: 1.6, color: 0x7ff8ff });
    if (this.shielded && result.dealt > 0 && Math.random() < 0.3) ctx.sys.vfx.burst('blockSpark', info.point ?? this.getCenter(V1), { scale: 1, color: 0x7ff8ff });
    const h = this.health;
    if (this.phase === 1 && h.current <= Math.ceil(G.hp * G.phaseAt[0]) + 0.01 && this.state !== 'transition') this.beginTransition(2, ctx);
    else if (this.phase === 2 && h.current <= Math.ceil(G.hp * G.phaseAt[1]) + 0.01 && this.state !== 'transition') this.beginTransition(3, ctx);
    if (result.staggered && this.state === 'overheat') ctx.sys.vfx.burst('impact', this.getCenter(V1), { scale: 2 });
  }

  private beginTransition(next: 2 | 3, ctx: GameContext) {
    this.cancelAttack();
    if (this.state === 'overheat') this.endOverheat();
    this.phase = next;
    this.setState('transition');
    this.health.invulnerable = G.transition + 0.3;
    this.health.floor = next === 2 ? Math.ceil(G.hp * G.phaseAt[1]) : 0;
    this.combo = 0;
    ctx.sys.audio.play('boss_roar', { position: this.position, volume: 1, pitch: next === 3 ? 0.8 : 1 });
    ctx.sys.camera.shake(0.9, 1.8);
    ctx.sys.env.lightningFlash(V1.copy(this.center).setY(this.center.y + 30));
    ctx.events.emit('boss:phase', { bossId: BOSS_ID, phase: next });
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 4, color: next === 3 ? 0xff5020 : 0x7ff8ff });
    ctx.events.emit('ui:notify', { text: next === 2 ? 'O Guardião ergue pilares de cristal!' : 'O núcleo do Guardião superaquece — os respiradouros despertam!', kind: 'warning' });
    // mudança da arena
    this.light?.cancel();
    this.light = ctx.sys.vfx.sustainedLight(V1.copy(this.center).setY(this.center.y + 6), next === 3 ? 0xff5a20 : 0x7ff8ff, next === 3 ? 12 : 10, 9999, null, 45);
    if (next === 2) {
      this.raisePillars(ctx);
      this.summon(ctx);
    } else {
      this.ventT = 1.5;
    }
  }

  private updateTransition(_dt: number, ctx: GameContext) {
    this.anim.action = 'roar';
    this.anim.phase = this.stateT < G.transition * 0.35 ? 0 : 1;
    this.anim.phaseT = clamp(this.stateT / (G.transition * 0.4), 0, 1);
    if (Math.random() < 0.2) ctx.sys.vfx.burst('arcaneSpark', this.getCenter(V1), { scale: 1.5, color: this.phase === 3 ? 0xff6a20 : 0x7ff8ff });
    if (this.stateT >= G.transition) this.setState('idle');
  }

  private raisePillars(ctx: GameContext) {
    for (let i = 1; i <= 4; i++) {
      const s = PLACES[`arena_soquete_${i}`];
      if (!s) continue;
      V1.set(s.x, s.y ?? this.center.y, s.z);
      const pi = this.ai.spawnEnemy('pilar_cristal', V1.clone(), { uniqueId: undefined }) as Enemy | null;
      if (!pi) continue;
      pi.health.max = pi.health.current = G.pillars.hp;
      pi.sp.noLeash = true;
      (pi.rig as PillarRig).rise = 0;
      this.pillars.push(pi);
      ctx.sys.vfx.burst('crystalShatter', V1, { scale: 1.5 });
    }
    this.shielded = this.pillars.length > 0;
    this.health.extraMul = this.shielded ? G.pillars.shieldMul : 1;
    ctx.sys.camera.shake(0.5, G.pillars.riseTime);
  }

  private summon(ctx: GameContext) {
    const ent = PLACES['arena_entrada'];
    for (let i = 0; i < G.summon.count; i++) {
      const a = (i / G.summon.count) * Math.PI * 2 + 0.6;
      const x = ent ? this.center.x + (ent.x - this.center.x) * 0.55 + Math.cos(a) * 4 : this.center.x + Math.cos(a) * 18;
      const z = ent ? this.center.z + (ent.z - this.center.z) * 0.55 + Math.sin(a) * 4 : this.center.z + Math.sin(a) * 18;
      V1.set(x, this.center.y + 1, z);
      const s = this.ai.spawnEnemy(G.summon.typeId, V1.clone(), { aggro: true }) as Enemy | null;
      if (s) {
        s.sp.noLeash = true;
        this.summons.push(s);
        ctx.sys.vfx.burst('teleport', s.getCenter(V2), { color: 0x58d8ff, scale: 1.2 });
      }
    }
  }

  private updatePillars(dt: number, ctx: GameContext) {
    if (this.pillars.length === 0) return;
    let alive = 0;
    for (const pi of this.pillars) {
      const rig = pi.rig as PillarRig;
      if (rig.rise < 1) rig.rise = Math.min(1, rig.rise + dt / G.pillars.riseTime);
      if (pi.alive) alive++;
    }
    const wasShielded = this.shielded;
    this.shielded = alive > 0;
    this.health.extraMul = this.shielded ? G.pillars.shieldMul : 1;
    if (wasShielded && !this.shielded) {
      this.stats.pillarsDestroyed = this.pillars.length;
      ctx.events.emit('ui:notify', { text: 'O escudo do Guardião se desfez!', kind: 'info' });
      ctx.sys.vfx.burst('crystalShatter', this.getCenter(V1), { scale: 3 });
      ctx.sys.audio.play('boss_roar', { position: this.position, pitch: 1.5, volume: 0.7 });
      this.health.staggerTimer = 1.6;
      this.cancelAttack();
    }
    // elos de energia pilar → núcleo
    if (this.shielded) {
      this.linkT -= dt;
      if (this.linkT <= 0) {
        this.linkT = 0.45;
        this.rig.chestWorld(V2);
        for (const pi of this.pillars) {
          if (!pi.alive) continue;
          pi.rig.muzzle(V1);
          ctx.sys.vfx.chain(V1, V2, 0x7ff8ff, 0.5, 0.12);
        }
        ctx.sys.vfx.shell(V2, this.radius + 0.6, this.radius + 1.4, 0x7ff8ff, 0.5, 0.35);
      }
    }
    for (let i = this.pillars.length - 1; i >= 0; i--) if (this.pillars[i].removed) this.pillars.splice(i, 1);
  }

  /** Fase 3: respiradouros em padrões anunciados (sequência fixa = aprendível). */
  private updateVents(dt: number, ctx: GameContext) {
    const V = G.vents;
    this.steamT -= dt;
    if (this.steamT <= 0 && this.vents.length > 0) {
      this.steamT = 0.35;
      const v = this.vents[Math.floor(Math.random() * this.vents.length)];
      ctx.sys.vfx.puff(V1.copy(v).setY(v.y + 0.3), 0x8a7a70, rand(1, 1.8), 1.6, 0.3, 1.5);
    }
    if (this.ventPending) {
      this.ventPending.t -= dt;
      if (this.ventPending.t <= 0) {
        for (const i of this.ventPending.idx) {
          const v = this.vents[i];
          if (!v) continue;
          ctx.sys.combat.explode(v, V.radius, { amount: V.damage, type: V.type, source: this, knockback: V.knockback, poiseDamage: V.poise, unblockable: true, tag: 'vent' }, this, { falloff: false, ignoreWalls: true });
          ctx.sys.vfx.burst('fire', V1.copy(v).setY(v.y + 0.5), { scale: 2.2 });
          ctx.sys.vfx.burst('smoke', V1, { scale: 1.6 });
          ctx.sys.vfx.groundFlash(v, V.radius, 0xff6a20, 0.4);
        }
        ctx.sys.audio.play('explosion', { position: this.center, volume: 0.8 });
        ctx.sys.camera.shake(0.25, 0.3);
        this.stats.vents++;
        this.ventPending = null;
      }
      return;
    }
    this.ventT -= dt;
    if (this.ventT > 0 || this.state === 'transition') return;
    this.ventT = V.cooldown;
    const pat = V.patterns[this.ventIdx % V.patterns.length];
    this.ventIdx++;
    for (const i of pat) {
      const v = this.vents[i];
      if (v) ctx.sys.vfx.telegraph({ type: 'circle', position: v, radius: V.radius, duration: V.warn, color: 0xff3a10 });
    }
    this.ventPending = { t: V.warn, idx: pat };
  }

  private startOverheat(ctx: GameContext) {
    this.setState('overheat');
    this.stats.overheats++;
    const h = this.health;
    h.exposedMul = G.phase3.coreMul;
    h.maxPoise = G.phase3.staggerPoise;
    h.poise = Math.min(h.poise, G.phase3.staggerPoise);
    h.addStatus('overheated', G.phase3.overheat, G.phase3.coreMul);
    ctx.sys.vfx.burst('smoke', this.getCenter(V1), { scale: 2.5, color: 0xdddddd });
    ctx.sys.audio.play('hit_metal', { position: this.position, pitch: 0.4, volume: 1 });
    ctx.events.emit('ui:notify', { text: 'Núcleo exposto! Ataque agora!', kind: 'info' });
  }

  private endOverheat() {
    const h = this.health;
    h.exposedMul = 0;
    h.maxPoise = G.poise;
    h.poise = G.poise;
    h.clearStatus('overheated');
    this.anim.overheat = false;
    if (this.state === 'overheat') this.setState('idle');
  }

  // ---------------------------------------------------------------------
  private locomotion(dt: number, ctx: GameContext) {
    const p = this.position;
    const h = this.health;
    if (this.state === 'idle' && this.moveSpeed > 0 && h.canAct()) {
      const mm = h.moveMultiplier();
      const sp = this.moveSpeed * mm;
      p.x += Math.sin(this.yaw) * sp * dt;
      p.z += Math.cos(this.yaw) * sp * dt;
      this.anim.speed = sp;
    } else this.anim.speed = Math.max(0, this.anim.speed - dt * 6);
    if (this.state === 'attack' && this.attack === 'charge' && this.atkPhase === 1) this.anim.speed = G.charge.speed * 0.5;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    this.velocity.multiplyScalar(Math.exp(-6 * dt));
    ctx.physics.resolveCapsule(p, this.radius, this.height);
    const g = groundAt(ctx, p.x, p.z, p.y + 1);
    p.y += (g - p.y) * Math.min(1, dt * 10);
    this.object3d.rotation.y = this.yaw;
  }

  private updateVisual(dt: number, ctx: GameContext) {
    const a = this.anim;
    const h = this.health;
    a.time += dt;
    a.timeScale = h.actionMultiplier() * (this.phase === 3 ? G.phase3.actionSpeed : 1);
    a.combat = true;
    a.localZ = 1;
    a.localX = 0;
    a.run = this.anim.speed > G.walk * 1.2 ? 1 : 0;
    a.stagger = h.staggered || this.state === 'stunned';
    a.hit = Math.max(0, a.hit - dt * 3);
    a.overheat = this.state === 'overheat';
    const pl = ctx.sys.player.entity;
    a.lookYaw = angleDiff(this.yaw, yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z));
    this.rig.update(dt, a);
    const u = this.mat.rig;
    u.uHit.value = this.hitFlash;
    u.uCharge.value = this.charge;
    u.uChargeColor.value.setHex(this.chargeColor);
    const coreHot = this.state === 'overheat';
    u.uGlowMul.value = coreHot ? 2.4 + Math.sin(a.time * 12) * 1 : this.shielded ? 1.6 : this.phase === 3 ? 1.4 : 1;
    u.uGlowTintMix.value = coreHot || this.phase === 3 ? 0.65 : 0;
    u.uGlowTint.value.setHex(0xff6a20);
    this.barVisible = this.state !== 'dead';
  }

  // ---------------------------------------------------------------------
  override onDeath(_info: DamageInfo | undefined, ctx: GameContext): void {
    this.cancelAttack();
    this.endOverheat();
    this.setState('dead');
    this.deadT = 0;
    this.ringR = -1;
    this.ventPending = null;
    this.barVisible = false;
    this.light?.cancel();
    this.light = null;
    ctx.sys.audio.play('boss_roar', { position: this.position, pitch: 0.6, volume: 1 });
    ctx.sys.camera.shake(1, 2.2);
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 4, color: 0x7ff8ff });
    ctx.sys.env.lightningFlash(V1.copy(this.center).setY(this.center.y + 30));
    this.ai.onBossDefeated(this);
  }

  private updateDead(dt: number, ctx: GameContext) {
    this.deadT += dt;
    const a = this.anim;
    a.time += dt;
    // colapso: cede, ajoelha e tomba; o núcleo apaga devagar
    if (this.deadT < 1.6) {
      a.action = 'slump';
      a.phase = 1;
      a.phaseT = clamp(this.deadT / 1.6, 0, 1);
      a.kneel = this.deadT > 0.8;
      if (Math.random() < 0.3) ctx.sys.vfx.burst('metalSpark', this.getCenter(V1).add(V2.set(rand(-2, 2), rand(-1, 2), rand(-2, 2))), { scale: 1.2 });
    } else {
      a.kneel = false;
      a.action = 'none';
      a.dead = clamp((this.deadT - 1.6) / 1.4, 0, 1);
    }
    this.rig.update(dt, a);
    const u = this.mat.rig;
    u.uGlowMul.value = Math.max(0.15, 1.5 - this.deadT * 0.3);
    u.uGlowTintMix.value = 0;
    u.uCharge.value = 0;
    u.uHit.value = 0;
    if (Math.random() < dt * 4) {
      this.rig.chestWorld(V3);
      ctx.sys.vfx.puff(V3, 0x9a9a9a, rand(1, 2), 2, 0.3, 1.2);
    }
    // o corpo fica alguns minutos (a narrativa usa o núcleo); some quando o jogador se afasta
    const pl = ctx.sys.player.entity;
    if (!this.dissolving && (this.deadT > 180 || (this.deadT > 20 && distXZ(pl.position, this.position) > 140)) && !this.removed) {
      this.dissolving = true;
      ctx.sys.vfx.dissolve(this.object3d, { duration: 2.5, color: 0x7ff8ff, height: this.height, onDone: () => ctx.entities.remove(this) });
    }
    void V4;
  }

  /** Remove pilares/invocações (fim da luta ou reset). */
  cleanup(ctx: GameContext) {
    for (const p of this.pillars) if (!p.removed) ctx.entities.remove(p);
    for (const s of this.summons) if (!s.removed && s.alive) ctx.entities.remove(s);
    this.pillars.length = 0;
    this.summons.length = 0;
    this.beam?.cancel();
    this.beam = null;
    this.tele?.cancel();
    this.tele = null;
    this.light?.cancel();
    this.light = null;
  }

  override dispose(): void {
    this.beam?.cancel();
    this.tele?.cancel();
    this.light?.cancel();
    super.dispose();
    this.mat.dispose();
  }

  debug() {
    return {
      phase: this.phase,
      state: this.state,
      attack: this.attack,
      hp: Math.round(this.health.current),
      max: this.health.max,
      shielded: this.shielded,
      pillars: this.pillars.filter((p) => p.alive).length,
      summons: this.summons.filter((s) => s.alive).length,
      exposed: this.health.exposedMul,
      extraMul: this.health.extraMul,
      stats: this.stats,
    };
  }
}

export { BOSS_GATES };
