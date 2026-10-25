import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import { Entity } from '../../core/Entity';
import type { DamageInfo, DamageResult, StatusApply } from '../../combat/Health';
import type { VfxHandle, SustainedSegment, LightHandle } from '../../combat/VFX';
import { MEMORY_WEAKEN, STORY_BOSS_RULES, type StoryAttack, type StoryBossDef, type StoryPhaseEvent } from '../../data/storyBosses';
import { EnemyHealth } from '../EnemyHealth';
import { createRigMaterial, type RigMaterial } from '../rigs/material';
import { HumanoidRig } from '../rigs/humanoid';
import { FlyerRig } from '../rigs/flyer';
import { DevourerRig } from '../rigs/devourer';
import { makeAnimInput, type AnimInput, type ExtraAnim, type Rig } from '../rigs/anim';
import type { Enemy } from '../Enemy';
import type { AI } from '../AI';
import { V1, V2, V3, angleDiff, clamp, distXZ, groundAt, rand, turnTowards, yawTo } from '../shared';

export type StoryBossState = 'intro' | 'idle' | 'attack' | 'transition' | 'yield' | 'dead';

interface RainPoint {
  pos: THREE.Vector3;
  t: number;
  handle: VfxHandle | null;
}

const V4 = new THREE.Vector3();
const V5 = new THREE.Vector3();

/**
 * Chefe da história (Atos II a IV), dirigido por dados (src/data/storyBosses.ts).
 * Escolhe ataques por peso, distância, fase e recarga; cada ataque é uma peça do motor:
 * corte em cone, pancada em círculo, onda em anel (pule), investida, leque de projéteis,
 * chuva de círculos, feixe que varre, invocação, teleporte, rajada de vento, mergulho
 * aéreo e nova (explosão grande anunciada). Fases com eventos (clima, escala, invocações,
 * eclipse) e, para Darian, rendição numa fração da vida.
 */
export class StoryBoss extends Entity {
  readonly def: StoryBossDef;
  readonly bossId: string;
  readonly rig: Rig;
  readonly mat: RigMaterial;
  readonly anim: AnimInput = makeAnimInput();
  declare health: EnemyHealth;
  ctx!: GameContext;
  ai!: AI;
  elite = true;
  level = 10;
  barVisible = false;
  barHeight: number;
  phase = 1;
  readonly phaseCount: number;
  state: StoryBossState = 'intro';
  stateT = 0;
  attack: StoryAttack | null = null;
  private atkIdx = -1;
  private atkPhase: 0 | 1 | 2 = 0;
  private atkT = 0;
  private atkYaw = 0;
  private readonly cds: Float32Array;
  private lastAttack = -1;
  private tele: VfxHandle | null = null;
  readonly center = new THREE.Vector3();
  readonly summons: Enemy[] = [];
  private hover = 0;
  private hoverY = 0;
  private baseScale = 1;
  private targetScale = 1;
  // anel
  private ringR = -1;
  private ringMax = 0;
  private ringSpeed = 0;
  private ringHit = false;
  private ringAtk: StoryAttack | null = null;
  private readonly ringCenter = new THREE.Vector3();
  // investida / mergulho
  private dashLeft = 0;
  private dashHit = false;
  private readonly dashDir = new THREE.Vector3();
  private diveY = 0;
  // feixe
  private beam: SustainedSegment | null = null;
  private beamYaw = 0;
  private beamDir = 1;
  private beamTick = 0;
  private readonly beamHit = new Set<number>();
  // chuva
  private readonly rain: RainPoint[] = [];
  // nova / pancada
  private readonly slamAt = new THREE.Vector3();
  private light: LightHandle | null = null;
  private hitFlash = 0;
  private charge = 0;
  private chargeColor = 0xff6a1a;
  deadT = -1;
  private dissolving = false;
  private outsideT = 0;
  private moveSpeed = 0;
  private strafe = 1;
  private strafeT = 0;
  private readonly sweepHit = new Set<number>();
  /** Eclipse (Rei, fase 3): segundos por meia volta e cronômetro. */
  private eclipseCycle = 0;
  private eclipseT = 0;
  private night = false;
  private yielded = false;
  /** Ações agendadas no tempo do jogo (aliados na batalha final). */
  private later: { t: number; fn: () => void }[] = [];
  /** Estatísticas para testes. */
  stats = { attacks: {} as Record<string, number>, phases: 1, summoned: 0, weakenedBy: 0 };

  constructor(def: StoryBossDef) {
    super('boss', def.faction);
    this.def = def;
    this.bossId = def.id;
    this.typeId = def.id;
    this.name = def.title;
    this.radius = def.radius;
    this.height = def.height;
    this.alwaysActive = true;
    this.persistent = false;
    this.phaseCount = def.phases;
    this.barHeight = def.height + 0.6;
    this.cds = new Float32Array(def.attacks.length);
    for (let i = 0; i < def.attacks.length; i++) this.cds[i] = def.attacks[i].cooldown * rand(0.3, 0.8);
    const h = new EnemyHealth(def.hp);
    h.armor = def.armor;
    h.resist = { ...def.resist };
    h.maxPoise = h.poise = def.poise;
    h.poiseRegen = 30;
    h.staggerDuration = 1.8;
    h.statusImmune.add('stun');
    h.statusImmune.add('root');
    h.slowResist = def.slowResist;
    h.invulnerable = def.intro;
    this.health = h;
    this.mat = createRigMaterial({ metalness: def.rig.kind === 'humanoid' ? 0.35 : 0.15, roughness: 0.5 });
    const r = def.rig;
    this.rig = r.kind === 'humanoid' ? new HumanoidRig(r.look, this.mat) : r.kind === 'dragon' ? new FlyerRig(r.look, this.mat) : new DevourerRig(this.mat);
    this.baseScale = def.scale;
    this.targetScale = def.scale;
    this.rig.root.scale.setScalar(def.scale);
    this.object3d.add(this.rig.root);
    this.object3d.name = def.id;
    this.hover = def.hover ?? 0;
    for (const a of def.attacks) this.stats.attacks[a.kind] = 0;
  }

  override onAdded(ctx: GameContext): void {
    this.ctx = ctx;
    this.ai = ctx.sys.ai;
    const A = this.def.arena;
    this.center.set(A.x, A.y ?? groundAt(ctx, A.x, A.z, (A.y ?? 400) + 2), A.z);
    this.position.y = groundAt(ctx, this.position.x, this.position.z, this.position.y + 2);
    this.hoverY = this.hover;
    this.rig.setShadows(ctx.settings.q.shadowMapSize > 0);
    this.state = 'intro';
    this.stateT = 0;
    this.health.floor = this.phaseCount > 1 ? Math.ceil(this.def.hp * this.def.phaseAt[0]) : 0;
    // Guardião da Primeira Era: cada fragmento de memória responde a uma pergunta
    if (this.def.id === 'guardiao_primeira_era') {
      const n = ctx.sys.inventory.count('fragmento_memoria');
      const cut = Math.min(MEMORY_WEAKEN.max, n * MEMORY_WEAKEN.perFragment);
      if (cut > 0) {
        this.health.current = Math.round(this.health.max * (1 - cut));
        this.stats.weakenedBy = cut;
        ctx.events.emit('ui:notify', { text: `Suas memórias respondem ao Guardião: ele perde ${Math.round(cut * 100)}% da força.`, kind: 'info' });
        if (this.health.current <= this.health.floor) this.health.floor = Math.ceil(this.def.hp * this.def.phaseAt[1]);
      }
    }
    ctx.sys.audio.play('boss_roar', { position: this.position, volume: 1 });
    ctx.sys.camera.shake(0.5, 1.2);
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 2.5, color: this.def.glow });
    if (this.def.introShout) ctx.sys.ui.showSubtitle(this.def.introShout, 4.5);
    this.light = ctx.sys.vfx.sustainedLight(V1.copy(this.center).setY(this.center.y + 7), this.def.glow, 7, 9999, null, this.def.arena.radius + 14);
  }

  get engaged() {
    return this.alive && this.state !== 'dead' && this.state !== 'yield';
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
    const act = h.actionMultiplier() * (this.phase === 3 ? 1.15 : 1);
    for (let i = 0; i < this.cds.length; i++) this.cds[i] -= dt * act;
    const pl = ctx.sys.player.entity;
    // trela: jogador longe da arena por muito tempo → reseta
    if (this.state !== 'yield' && pl.alive && distXZ(pl.position, this.center) > this.def.arena.radius + STORY_BOSS_RULES.leashExtra) {
      this.outsideT += dt;
      if (this.outsideT > STORY_BOSS_RULES.leashSeconds) {
        this.ai.resetStoryBoss('fuga');
        return;
      }
    } else this.outsideT = 0;
    this.updateRing(dt, ctx);
    this.updateRain(dt, ctx);
    if (this.later.length) {
      for (let i = this.later.length - 1; i >= 0; i--) {
        const l = this.later[i];
        l.t -= dt;
        if (l.t <= 0) {
          this.later.splice(i, 1);
          l.fn();
        }
      }
    }
    this.updateEclipse(dt, ctx);
    switch (this.state) {
      case 'intro':
        this.anim.action = 'roar';
        this.anim.phase = this.stateT < this.def.intro * 0.4 ? 0 : 1;
        this.anim.phaseT = clamp(this.stateT / (this.def.intro * 0.5), 0, 1);
        this.faceTarget(dt, 1);
        if (this.stateT >= this.def.intro) this.setState('idle');
        break;
      case 'transition':
        this.anim.action = 'roar';
        this.anim.phase = this.stateT < this.def.transition * 0.35 ? 0 : 1;
        this.anim.phaseT = clamp(this.stateT / (this.def.transition * 0.4), 0, 1);
        if (Math.random() < 0.25) ctx.sys.vfx.burst('arcaneSpark', this.getCenter(V1), { scale: 1.4, color: this.def.glow });
        if (this.stateT >= this.def.transition) this.setState('idle');
        break;
      case 'yield':
        this.anim.action = 'none';
        this.anim.kneel = true;
        this.moveSpeed = 0;
        break;
      case 'idle':
        this.anim.action = 'none';
        if (h.canAct()) this.think(dt, ctx);
        break;
      case 'attack':
        this.updateAttack(dt * act, dt, ctx);
        break;
    }
    if (h.staggered && this.state === 'attack' && this.attack?.kind !== 'dive') this.cancelAttack();
    this.locomotion(dt, ctx);
    this.updateVisual(dt, ctx);
  }

  private setState(s: StoryBossState) {
    this.state = s;
    this.stateT = 0;
  }

  private faceTarget(dt: number, mul: number) {
    const pl = this.ctx.sys.player.entity;
    const want = yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z);
    this.yaw = turnTowards(this.yaw, want, this.def.turn * mul * dt);
  }

  // ---------------------------------------------------------------------
  private think(dt: number, ctx: GameContext) {
    const pl = ctx.sys.player.entity;
    if (!pl.alive) {
      this.moveSpeed = 0;
      return;
    }
    const d = distXZ(this.position, pl.position);
    const facing = Math.abs(angleDiff(this.yaw, yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z)));
    // escolha ponderada
    const A = this.def.attacks;
    let tot = 0;
    let melee = false;
    for (let i = 0; i < A.length; i++) {
      const w = this.weightOf(i, d);
      if (w > 0 && A[i].range[1] <= 10 && A[i].kind !== 'blink') melee = true;
    }
    if (this.stateT > (this.phase === 3 ? 0.4 : 0.7)) {
      for (let i = 0; i < A.length; i++) tot += this.weightOf(i, d);
      if (tot > 0) {
        let r = Math.random() * tot;
        for (let i = 0; i < A.length; i++) {
          r -= this.weightOf(i, d);
          if (r <= 0) {
            const a = A[i];
            const needFacing = a.kind === 'slash' || a.kind === 'charge' || a.kind === 'gust';
            if (!needFacing || facing < 0.7) {
              this.beginAttack(i, ctx);
              return;
            }
            break;
          }
        }
      }
    }
    // movimento: corpo a corpo se aproxima; à distância rodeia
    this.faceTarget(dt, 1);
    if (this.def.walk <= 0) {
      this.moveSpeed = 0;
      return;
    }
    const preferClose = melee || this.hasMelee();
    if (preferClose) this.moveSpeed = d > 5 ? (d > 16 ? this.def.run * 0.7 : this.def.walk) : 0;
    else {
      // mantém distância (8–16 m) e anda de lado
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = rand(2, 4);
        this.strafe = Math.random() < 0.5 ? -1 : 1;
      }
      this.moveSpeed = d < 8 ? -this.def.walk : d > 18 ? this.def.walk : 0;
    }
  }

  private hasMelee() {
    for (const a of this.def.attacks) if (a.phases.includes(this.phase) && (a.kind === 'slash' || a.kind === 'slam') && a.range[1] <= 10) return true;
    return false;
  }

  private weightOf(i: number, d: number): number {
    const a = this.def.attacks[i];
    if (this.cds[i] > 0 || !a.phases.includes(this.phase)) return 0;
    if (a.kind === 'summon' && this.livingSummons() >= 4) return 0;
    if (a.kind === 'dive' && this.hoverY < 3) return 0;
    let w = a.weight;
    if (d < a.range[0] || d > a.range[1]) w *= 0.04;
    if (i === this.lastAttack) w *= 0.35;
    // eclipse: à noite mais chuva de sombras, de dia mais feixes de luz
    if (this.eclipseCycle > 0) {
      if (this.night && a.kind === 'rain') w *= 2;
      if (!this.night && a.kind === 'beam') w *= 2;
    }
    return w;
  }

  private livingSummons() {
    let n = 0;
    for (const s of this.summons) if (s.alive && !s.removed) n++;
    return n;
  }

  private beginAttack(i: number, ctx: GameContext) {
    const a = this.def.attacks[i];
    const pl = ctx.sys.player.entity;
    const vfx = ctx.sys.vfx;
    const p = this.position;
    this.setState('attack');
    this.attack = a;
    this.atkIdx = i;
    this.atkPhase = 0;
    this.atkT = 0;
    this.lastAttack = i;
    this.moveSpeed = 0;
    this.cds[i] = a.cooldown;
    this.stats.attacks[a.kind] = (this.stats.attacks[a.kind] ?? 0) + 1;
    this.atkYaw = yawTo(p.x, p.z, pl.position.x, pl.position.z);
    this.chargeColor = a.color;
    const ground = V5.set(p.x, p.y - this.hoverY, p.z);
    if (a.shout) ctx.sys.ui.showSubtitle(a.shout, 2.6);
    switch (a.kind) {
      case 'slash':
        this.yaw = this.atkYaw;
        this.sweepHit.clear();
        this.tele = vfx.telegraph({ type: 'cone', position: ground.clone(), yaw: this.atkYaw, radius: a.radius ?? 6, angle: a.arc ?? 120, duration: a.windup, color: a.color });
        break;
      case 'slam':
        this.slamAt.copy(a.atTarget ? pl.position : ground);
        this.tele = vfx.telegraph({ type: 'circle', position: this.slamAt.clone(), radius: a.radius ?? 6, duration: a.windup, color: a.color });
        break;
      case 'nova':
        this.slamAt.copy(ground);
        this.tele = vfx.telegraph({ type: 'circle', position: this.slamAt.clone(), radius: a.radius ?? 9, duration: a.windup, color: a.color });
        ctx.sys.audio.play('boss_roar', { position: p, volume: 0.8, pitch: 0.7 });
        break;
      case 'ring':
        this.tele = vfx.telegraph({ type: 'ring', position: ground.clone(), radius: 8, innerRadius: 5, duration: a.windup, color: a.color });
        break;
      case 'charge': {
        this.yaw = this.atkYaw;
        const len = Math.min(a.radius ?? 24, distXZ(p, pl.position) + 6);
        this.dashLeft = len;
        this.dashHit = false;
        this.tele = vfx.telegraph({ type: 'line', position: ground.clone(), yaw: this.atkYaw, length: len, width: Math.max(2.5, this.radius * 1.8), duration: a.windup, color: a.color });
        ctx.sys.audio.play('boss_roar', { position: p, volume: 0.6, pitch: 1.3 });
        break;
      }
      case 'dive': {
        const len = Math.min(a.radius ?? 40, distXZ(p, pl.position) + 10);
        this.dashLeft = len;
        this.dashHit = false;
        this.diveY = this.hoverY;
        this.tele = vfx.telegraph({ type: 'line', position: V4.set(p.x, pl.position.y, p.z), yaw: this.atkYaw, length: len, width: 4, duration: a.windup, color: a.color });
        ctx.sys.audio.play('boss_roar', { position: p, volume: 0.9, pitch: 0.9 });
        break;
      }
      case 'beam':
        this.beamYaw = this.atkYaw - 0.55;
        this.beamDir = Math.random() < 0.5 ? -1 : 1;
        if (this.beamDir < 0) this.beamYaw = this.atkYaw + 0.55;
        this.yaw = this.beamYaw;
        this.tele = vfx.telegraph({ type: 'line', position: ground.clone(), yaw: this.beamYaw, length: a.radius ?? 28, width: 1.4, duration: a.windup, color: a.color });
        break;
      case 'gust':
        this.yaw = this.atkYaw;
        this.tele = vfx.telegraph({ type: 'cone', position: ground.clone(), yaw: this.atkYaw, radius: a.radius ?? 16, angle: a.arc ?? 70, duration: a.windup, color: a.color });
        break;
      case 'rain': {
        const n = a.count ?? 4;
        const R = this.def.arena.radius;
        for (let k = 0; k < n; k++) {
          const pos = new THREE.Vector3();
          if (k === 0) pos.set(pl.position.x, 0, pl.position.z);
          else {
            const ang = Math.random() * Math.PI * 2;
            const rr = rand(2.5, 9);
            pos.set(pl.position.x + Math.cos(ang) * rr, 0, pl.position.z + Math.sin(ang) * rr);
            // fica dentro da arena
            const dc = Math.hypot(pos.x - this.center.x, pos.z - this.center.z);
            if (dc > R) {
              pos.x = this.center.x + ((pos.x - this.center.x) / dc) * R;
              pos.z = this.center.z + ((pos.z - this.center.z) / dc) * R;
            }
          }
          pos.y = groundAt(ctx, pos.x, pos.z, pl.position.y + 4);
          const delay = a.windup + k * 0.18;
          const handle = vfx.telegraph({ type: 'circle', position: pos, radius: a.radius ?? 2.6, duration: delay, color: a.color });
          this.rain.push({ pos, t: delay, handle });
        }
        break;
      }
      case 'volley':
      case 'summon':
      case 'blink':
        break;
    }
  }

  private cancelAttack() {
    this.tele?.cancel();
    this.tele = null;
    this.beam?.cancel();
    this.beam = null;
    this.attack = null;
    this.charge = 0;
    if (this.state === 'attack') this.setState('idle');
  }

  private updateAttack(dta: number, dt: number, ctx: GameContext) {
    const a = this.attack!;
    this.atkT += dta;
    const p = this.position;
    const pl = ctx.sys.player.entity;
    const vfx = ctx.sys.vfx;
    this.anim.action = animFor(a);
    if (this.atkPhase === 0) {
      this.charge = clamp(this.atkT / a.windup, 0, 1) * 1.2;
      this.anim.phase = 0;
      this.anim.phaseT = clamp(this.atkT / a.windup, 0, 1);
      if (a.kind === 'volley' || a.kind === 'beam' || a.kind === 'gust') this.faceTarget(dt, 1.5);
      if (a.kind === 'dive') this.hoverY = Math.min(this.diveY + 6, this.hoverY + dt * 8);
      if (a.kind === 'blink' && Math.random() < 0.5) vfx.burst('teleport', this.getCenter(V1), { scale: 0.6, color: a.color });
      if (this.atkT >= a.windup) {
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
      if (a.kind === 'charge' || a.kind === 'dive') {
        const sp = a.speed ?? 16;
        const step = sp * dt;
        this.dashDir.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
        const ox = p.x;
        const oz = p.z;
        p.x += this.dashDir.x * step;
        p.z += this.dashDir.z * step;
        if (a.kind === 'dive') {
          // desce até o chão no meio e sobe de novo
          const total = a.radius ?? 40;
          const prog = 1 - this.dashLeft / total;
          this.hoverY = this.diveY + 6 - Math.sin(clamp(prog, 0, 1) * Math.PI) * (this.diveY + 5);
        }
        const res = ctx.physics.resolveCapsule(p, this.radius, this.height);
        const moved = Math.hypot(p.x - ox, p.z - oz);
        this.dashLeft -= step;
        const near = distXZ(p, pl.position) < this.radius + 1.6 + pl.radius && Math.abs(pl.position.y - (p.y - this.hoverY * 0)) < this.height + 2;
        if (!this.dashHit && pl.alive && near) {
          this.dashHit = true;
          ctx.sys.combat.applyDamage(pl, { amount: a.damage, type: a.type, source: this, knockback: a.knockback ?? 10, poiseDamage: 40, unblockable: a.kind === 'dive', tag: 'melee', direction: this.dashDir.clone() });
          ctx.sys.camera.shake(0.5, 0.4);
        }
        if (Math.random() < dt * 20) vfx.burst('dust', V1.copy(p).setY(p.y - this.hoverY), { scale: 1.1, count: 4 });
        if ((res.collided && moved < step * 0.5) || this.dashLeft <= 0) {
          if (res.collided && a.kind === 'charge') {
            vfx.burst('shockwave', p, { scale: 1.6, color: a.color });
            ctx.sys.audio.play('boss_slam', { position: p });
          }
          this.atkPhase = 2;
          this.atkT = 0;
        }
        return;
      }
      if (a.kind === 'beam') {
        const dur = a.duration ?? 4;
        this.beamYaw += this.beamDir * (a.speed ?? 0.9) * dta;
        this.yaw = this.beamYaw;
        this.rig.muzzle(V1);
        V2.set(Math.sin(this.beamYaw), 0, Math.cos(this.beamYaw));
        // mira levemente para baixo até a altura do jogador
        const dy = pl.position.y + 1 - V1.y;
        V2.y = clamp(dy / Math.max(6, (a.radius ?? 28) * 0.6), -0.6, 0.2);
        V2.normalize();
        this.beamTick -= dt;
        if (this.beamTick <= 0) {
          this.beamTick = 0.25;
          this.beamHit.clear();
        }
        const res = ctx.sys.combat.beamAttack(this, V1, V2, a.radius ?? 28, 0.6, { amount: a.damage, type: a.type, poiseDamage: 4, tag: 'bossBeam', statuses: statusList(a) }, { visual: false, alreadyHit: this.beamHit, pierce: true });
        if (!this.beam) this.beam = vfx.sustainedBeam(a.color, 0.5, a.type === 'lightning' ? 'lightning' : 'beam');
        this.beam?.set(V1, res.end);
        if (Math.random() < dt * 25) vfx.burst('arcaneSpark', res.end, { scale: 0.8, color: a.color });
        if (this.atkT >= dur) {
          this.beam?.cancel();
          this.beam = null;
          this.atkPhase = 2;
          this.atkT = 0;
        }
        return;
      }
      if (this.atkT >= 0.25) {
        this.atkPhase = 2;
        this.atkT = 0;
      }
      return;
    }
    // recuperação
    this.anim.phase = 2;
    this.anim.phaseT = clamp(this.atkT / a.recovery, 0, 1);
    if (a.kind === 'dive') this.hoverY += (this.diveY - this.hoverY) * Math.min(1, dt * 2);
    if (this.atkT >= a.recovery) {
      this.attack = null;
      this.setState('idle');
    }
  }

  private impact(a: StoryAttack, ctx: GameContext) {
    const p = this.position;
    const combat = ctx.sys.combat;
    const vfx = ctx.sys.vfx;
    const pl = ctx.sys.player.entity;
    const info = (): DamageInfo => ({ amount: a.damage, type: a.type, source: this, knockback: a.knockback ?? 5, poiseDamage: 30, tag: 'aoe', statuses: statusList(a) });
    switch (a.kind) {
      case 'slash': {
        V1.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
        V2.set(p.x, p.y - this.hoverY, p.z);
        combat.meleeSweep(this, V2, V1, a.radius ?? 6, a.arc ?? 120, { ...info(), tag: 'melee' }, { alreadyHit: this.sweepHit, verticalReach: 4 + this.height * 0.3 });
        ctx.sys.audio.play('swing_heavy', { position: p, pitch: 0.6, volume: 1 });
        V2.addScaledVector(V1, (a.radius ?? 6) * 0.6);
        vfx.burst('dust', V2, { scale: 1.6, count: 12 });
        ctx.sys.camera.shake(0.3, 0.25);
        break;
      }
      case 'slam':
      case 'nova': {
        combat.explode(this.slamAt, a.radius ?? 6, { ...info(), unblockable: a.kind === 'nova' }, this, { falloff: false });
        vfx.burst('shockwave', this.slamAt, { scale: (a.radius ?? 6) / 2.5, color: a.color });
        vfx.burst(burstFor(a), this.slamAt, { scale: (a.radius ?? 6) / 3, color: a.color });
        ctx.sys.audio.play(a.kind === 'nova' ? 'explosion' : 'boss_slam', { position: this.slamAt, volume: 1 });
        ctx.sys.camera.shake(a.kind === 'nova' ? 0.9 : 0.6, 0.5);
        break;
      }
      case 'ring':
        this.ringCenter.set(p.x, p.y - this.hoverY, p.z);
        this.ringR = 0.5;
        this.ringMax = a.radius ?? 24;
        this.ringSpeed = a.speed ?? 11;
        this.ringHit = false;
        this.ringAtk = a;
        combat.explode(this.ringCenter, 4, info(), this, { falloff: false });
        vfx.ring(this.ringCenter, this.ringMax, a.color, this.ringMax / this.ringSpeed);
        vfx.burst('shockwave', this.ringCenter, { scale: 3, color: a.color });
        ctx.sys.audio.play('boss_slam', { position: p, volume: 1 });
        ctx.sys.camera.shake(0.7, 0.5);
        break;
      case 'volley': {
        const n = a.count ?? 3;
        const origin = this.rig.muzzle(V1).clone();
        if (origin.distanceToSquared(p) > 400) origin.copy(this.getCenter(V3));
        V2.copy(pl.position).setY(pl.position.y + 1).sub(origin).normalize();
        const spread = n > 1 ? 0.55 : 0;
        for (let k = 0; k < n; k++) {
          const t = n > 1 ? k / (n - 1) - 0.5 : 0;
          const dir = V3.copy(V2).applyAxisAngle(V4.set(0, 1, 0), t * spread).normalize().clone();
          combat.spawnProjectile({
            kind: a.projectile ?? 'enemyOrb',
            source: this,
            origin: origin.clone(),
            direction: dir,
            speed: a.speed ?? 20,
            range: 60,
            radius: 0.35,
            color: a.color,
            damage: { amount: a.damage, type: a.type, source: this, statuses: statusList(a), tag: 'projectile' },
          });
        }
        ctx.sys.audio.play(a.type === 'lightning' ? 'cast_lightning' : 'cast_arcane', { position: p, volume: 0.9, pitch: 0.8 });
        break;
      }
      case 'beam':
        ctx.sys.audio.play('boss_laser', { position: p, volume: 1 });
        this.beamTick = 0;
        break;
      case 'gust': {
        V1.set(Math.sin(this.atkYaw), 0, Math.cos(this.atkYaw));
        const d = distXZ(p, pl.position);
        const ang = Math.abs(angleDiff(this.atkYaw, yawTo(p.x, p.z, pl.position.x, pl.position.z)));
        if (pl.alive && d < (a.radius ?? 16) && ang < (((a.arc ?? 70) * Math.PI) / 180) * 0.5) {
          combat.applyDamage(pl, { amount: a.damage, type: a.type, source: this, knockback: a.knockback ?? 16, unblockable: true, tag: 'gust', direction: V1.clone() });
        }
        for (let k = 0; k < 14; k++) {
          V2.copy(p).addScaledVector(V1, rand(1, a.radius ?? 16)).add(V3.set(rand(-2, 2), rand(0.3, 2.5), rand(-2, 2)));
          vfx.puff(V2, 0xe8f0ff, rand(0.8, 1.6), 0.8, 0.35, 0.3);
        }
        ctx.sys.audio.play('amb_gust', { position: p, volume: 1 });
        break;
      }
      case 'summon':
        this.summonAdds(a.enemy ?? 'mago_corrompido', a.count ?? 2, ctx);
        break;
      case 'blink': {
        vfx.burst('teleport', this.getCenter(V1), { scale: 1.2, color: a.color });
        const R = this.def.arena.radius * 0.8;
        const ang = Math.random() * Math.PI * 2;
        const far = (a.range[0] ?? 0) > 6;
        const rr = far ? R : rand(6, 11);
        const base = far ? this.center : pl.position;
        let x = base.x + Math.cos(ang) * rr;
        let z = base.z + Math.sin(ang) * rr;
        const dc = Math.hypot(x - this.center.x, z - this.center.z);
        if (dc > R) {
          x = this.center.x + ((x - this.center.x) / dc) * R;
          z = this.center.z + ((z - this.center.z) / dc) * R;
        }
        p.set(x, groundAt(ctx, x, z, this.center.y + 6) + this.hoverY, z);
        vfx.burst('teleport', this.getCenter(V1), { scale: 1.2, color: a.color });
        ctx.sys.audio.play('cast_teleport', { position: p, volume: 0.8 });
        break;
      }
      case 'charge':
      case 'dive':
      case 'rain':
        break;
    }
  }

  /** Onda em anel: pule ou esquive através dela. */
  private updateRing(dt: number, ctx: GameContext) {
    if (this.ringR < 0 || !this.ringAtk) return;
    this.ringR += this.ringSpeed * dt;
    const pl = ctx.sys.player;
    const pe = pl.entity;
    if (!this.ringHit && pe.alive) {
      const d = distXZ(pe.position, this.ringCenter);
      const airborne = pl.heightAboveGround > 0.55 || pl.isFlying();
      if (Math.abs(d - this.ringR) < 1.1 + pe.radius && !airborne) {
        this.ringHit = true;
        V1.set(pe.position.x - this.ringCenter.x, 0, pe.position.z - this.ringCenter.z).normalize();
        const a = this.ringAtk;
        ctx.sys.combat.applyDamage(pe, { amount: a.damage * 0.8, type: a.type, source: this, knockback: a.knockback ?? 6, poiseDamage: 25, unblockable: true, tag: 'shockwave', direction: V1.clone(), statuses: statusList(a) });
      }
    }
    if (this.ringR > this.ringMax) this.ringR = -1;
  }

  /** Círculos da chuva: cada um explode quando o tempo acaba. */
  private updateRain(dt: number, ctx: GameContext) {
    if (!this.rain.length) return;
    const a = this.def.attacks.find((x) => x.kind === 'rain');
    if (!a) {
      this.rain.length = 0;
      return;
    }
    for (let i = this.rain.length - 1; i >= 0; i--) {
      const r = this.rain[i];
      r.t -= dt;
      if (r.t > 0) continue;
      this.rain.splice(i, 1);
      const vfx = ctx.sys.vfx;
      ctx.sys.combat.explode(r.pos, a.radius ?? 2.6, { amount: a.damage, type: a.type, source: this, knockback: a.knockback ?? 4, poiseDamage: 20, tag: 'aoe', statuses: statusList(a) }, this, { falloff: false });
      if (a.type === 'lightning') {
        vfx.lightning(V1.copy(r.pos).setY(r.pos.y + 28), r.pos, { color: a.color, branches: 2, duration: 0.25, width: 0.22 });
        vfx.flash(r.pos, a.color, 30, 0.2);
        ctx.sys.audio.play('thunder', { position: r.pos, volume: 0.7 });
      } else {
        vfx.burst(burstFor(a), r.pos, { scale: 1.3, color: a.color });
        ctx.sys.audio.play('cast_explosion', { position: r.pos, volume: 0.6 });
      }
      vfx.groundFlash(r.pos, (a.radius ?? 2.6) * 1.2, a.color, 0.4);
    }
  }

  /** Eclipse do Rei: dia e noite alternam. */
  private updateEclipse(dt: number, ctx: GameContext) {
    if (this.eclipseCycle <= 0) return;
    this.eclipseT -= dt;
    if (this.eclipseT > 0) return;
    this.eclipseT = this.eclipseCycle;
    this.night = !this.night;
    ctx.clock.setTime(this.night ? 0.5 : 12.5);
    ctx.sys.env.lightningFlash(V1.copy(this.center).setY(this.center.y + 40));
    ctx.events.emit('ui:notify', { text: this.night ? 'Noite eterna: sombras caem do céu!' : 'Sol a pino: a luz do Rei queima!', kind: 'warning' });
  }

  private summonAdds(enemy: string, count: number, ctx: GameContext) {
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + Math.random();
      V1.set(this.position.x + Math.cos(ang) * 6, 0, this.position.z + Math.sin(ang) * 6);
      V1.y = groundAt(ctx, V1.x, V1.z, this.center.y + 6);
      const e = ctx.sys.ai.spawnEnemy(enemy, V1.clone(), { aggro: true, level: 9 });
      if (e) {
        this.summons.push(e);
        this.stats.summoned++;
        ctx.sys.vfx.burst('teleport', V1, { scale: 1.2, color: this.def.glow });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Fases
  // ---------------------------------------------------------------------
  override onDamaged(info: DamageInfo, result: DamageResult, ctx: GameContext): void {
    if (this.state === 'dead' || this.state === 'yield') return;
    if (result.dealt > 0) {
      this.hitFlash = Math.min(1, 0.4 + result.dealt / 60);
      this.anim.hit = 1;
    }
    const h = this.health;
    const d = this.def;
    if (this.state !== 'transition') {
      if (this.phase === 1 && this.phaseCount >= 2 && h.current <= Math.ceil(d.hp * d.phaseAt[0]) + 0.01) this.beginTransition(2, ctx);
      else if (this.phase === 2 && this.phaseCount >= 3 && h.current <= Math.ceil(d.hp * d.phaseAt[1]) + 0.01) this.beginTransition(3, ctx);
    }
    if (d.yieldAt && !this.yielded && h.current <= d.hp * d.yieldAt) this.yieldFight(ctx);
    void info;
  }

  private beginTransition(next: 2 | 3, ctx: GameContext) {
    this.cancelAttack();
    this.phase = next;
    this.stats.phases = next;
    this.setState('transition');
    const d = this.def;
    this.health.invulnerable = d.transition + 0.3;
    this.health.floor = next === 2 && this.phaseCount >= 3 ? Math.ceil(d.hp * d.phaseAt[1]) : d.yieldAt ? Math.ceil(d.hp * d.yieldAt) : 0;
    ctx.sys.audio.play('boss_roar', { position: this.position, volume: 1, pitch: next === 3 ? 0.8 : 1 });
    ctx.sys.camera.shake(0.8, 1.6);
    ctx.sys.env.lightningFlash(V1.copy(this.center).setY(this.center.y + 30));
    ctx.events.emit('boss:phase', { bossId: d.id, phase: next });
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 4, color: d.glow });
    const ev = d.phaseEvents?.[next];
    if (ev) this.applyPhaseEvent(ev, ctx);
    if (d.id === 'rei_aldric') this.allies(next, ctx);
  }

  private applyPhaseEvent(ev: StoryPhaseEvent, ctx: GameContext) {
    if (ev.notify) ctx.events.emit('ui:notify', { text: ev.notify, kind: 'warning' });
    if (ev.shout) ctx.sys.ui.showSubtitle(ev.shout, 4.5);
    if (ev.weather) ctx.sys.env.setWeather(ev.weather, 4);
    if (ev.scale) this.targetScale = this.baseScale * ev.scale;
    if (ev.summon) this.summonAdds(ev.summon.enemy, ev.summon.count, ctx);
    if (ev.hover !== undefined) this.hover = ev.hover;
    if (ev.eclipseCycle) {
      this.eclipseCycle = ev.eclipseCycle;
      this.eclipseT = 0;
    }
    if (ev.scale) {
      // corpo maior: raio e altura acompanham
      this.radius = this.def.radius * ev.scale;
      this.height = this.def.height * ev.scale;
      this.barHeight = this.height + 0.6;
    }
  }

  /** Aliados poupados ajudam na batalha final (Ravena, o Barão e Darian). */
  private allies(next: 2 | 3, ctx: GameContext) {
    const story = ctx.sys.story;
    const ui = ctx.sys.ui;
    const vfx = ctx.sys.vfx;
    if (next === 2 && story.is('ravena_poupada')) {
      this.later.push({ t: 0, fn: () => {
        if (!this.alive) return;
        ui.showSubtitle('Ravena: Ei, coroado! Lembra de mim? Não? Ótimo. (Bombas de fumaça cegam o Rei!)', 4);
        vfx.burst('smoke', this.position, { count: 40, scale: 2.4 });
        this.health.invulnerable = 0;
        ctx.sys.combat.applyDamage(this, { amount: this.def.hp * 0.05, type: 'physical', source: ctx.sys.player.entity, poiseDamage: 999, unblockable: true, tag: 'aliado' });
      } });
      this.later[this.later.length - 1].t = 3.6;
    }
    if (next === 2 && story.is('barao_redimido')) {
      for (let k = 0; k < 4; k++) {
        this.later.push({ t: 0, fn: () => {
          if (!this.alive) return;
          if (k === 0) ui.showSubtitle('Barão Teodric: Canhões de Ferroluz — FOGO! Pela cidade que eu quase vendi!', 4);
          V1.copy(this.position).add(V2.set(rand(-3, 3), 0, rand(-3, 3)));
          vfx.burst('fire', V1, { scale: 2, count: 30 });
          vfx.burst('shockwave', V1, { scale: 2, color: 0xff8a3a });
          ctx.sys.audio.play('explosion', { position: V1, volume: 0.9 });
          this.health.invulnerable = 0;
          ctx.sys.combat.applyDamage(this, { amount: this.def.hp * 0.025, type: 'fire', source: ctx.sys.player.entity, unblockable: true, tag: 'aliado' });
        } });
        this.later[this.later.length - 1].t = 5.2 + k * 0.7;
      }
    }
    if (next === 3 && story.is('darian_redimido')) {
      this.later.push({ t: 0, fn: () => {
        if (!this.alive) return;
        ui.showSubtitle('Darian: Desta vez eu fico, mestre. (Um escudo de luz envolve Kaelen.)', 4.5);
        const pl = ctx.sys.player;
        pl.health.heal(pl.health.max * 0.5);
        pl.restoreEnergy(60);
        vfx.burst('heal', pl.entity.position, { scale: 1.6 });
        vfx.runeCircle(pl.entity.position, 3, 0xffd880, 2, 1.4);
      } });
      this.later[this.later.length - 1].t = 3.6;
    }
  }

  /** Darian: para de lutar numa fração da vida (a conversa decide o resto). */
  private yieldFight(ctx: GameContext) {
    this.yielded = true;
    this.cancelAttack();
    this.setState('yield');
    this.health.invulnerable = 9999;
    this.barVisible = false;
    this.rain.length = 0;
    this.ringR = -1;
    for (const s of this.summons) if (s.alive && !s.removed) ctx.sys.combat.kill(s);
    ctx.sys.ui.showSubtitle(`${this.def.name} cai de joelhos.`, 3);
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 2, color: this.def.glow });
    this.ai.onStoryBossDefeated(this, true);
  }

  /** Remove sem morrer (redenção) — some num clarão. */
  depart(ctx: GameContext) {
    if (this.removed) return;
    this.state = 'dead';
    this.deadT = 0;
    this.dissolving = true;
    this.cleanup(ctx);
    ctx.sys.vfx.burst('time', this.getCenter(V1), { scale: 2, count: 50, color: 0xffd880 });
    ctx.sys.vfx.dissolve(this.object3d, { duration: 2.2, color: 0xffd880, height: this.height, onDone: () => ctx.entities.remove(this) });
  }

  // ---------------------------------------------------------------------
  private locomotion(dt: number, ctx: GameContext) {
    const p = this.position;
    const h = this.health;
    if (this.state === 'idle' && this.moveSpeed !== 0 && h.canAct()) {
      const sp = this.moveSpeed * h.moveMultiplier();
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      p.x += fx * sp * dt;
      p.z += fz * sp * dt;
      // à distância, rodeia o jogador
      if (!this.hasMelee()) {
        p.x += fz * this.strafe * this.def.walk * 0.6 * dt;
        p.z -= fx * this.strafe * this.def.walk * 0.6 * dt;
      }
      this.anim.speed = Math.abs(sp);
    } else this.anim.speed = Math.max(0, this.anim.speed - dt * 6);
    if (this.state === 'attack' && (this.attack?.kind === 'charge' || this.attack?.kind === 'dive') && this.atkPhase === 1) this.anim.speed = (this.attack.speed ?? 16) * 0.5;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    this.velocity.multiplyScalar(Math.exp(-6 * dt));
    // presa à arena
    const R = this.def.arena.radius;
    const dc = Math.hypot(p.x - this.center.x, p.z - this.center.z);
    if (dc > R) {
      p.x = this.center.x + ((p.x - this.center.x) / dc) * R;
      p.z = this.center.z + ((p.z - this.center.z) / dc) * R;
    }
    ctx.physics.resolveCapsule(V4.set(p.x, p.y - this.hoverY, p.z), this.radius, this.height);
    p.x = V4.x;
    p.z = V4.z;
    // voo: sobe/desce suave até a altura pedida
    const isDive = this.attack?.kind === 'dive' && this.state === 'attack';
    if (!isDive) this.hoverY += (this.hover - this.hoverY) * Math.min(1, dt * 1.5);
    const g = groundAt(ctx, p.x, p.z, Math.max(p.y, this.center.y) + 2);
    const want = g + Math.max(0, this.hoverY) + (this.hoverY > 0.5 ? Math.sin(this.stateT * 1.7) * 0.25 : 0);
    p.y += (want - p.y) * Math.min(1, dt * 8);
    this.object3d.rotation.y = this.yaw;
    // escala (fusão do Rei)
    const s = this.rig.root.scale.x;
    if (Math.abs(s - this.targetScale) > 0.001) this.rig.root.scale.setScalar(s + (this.targetScale - s) * Math.min(1, dt * 1.2));
  }

  private updateVisual(dt: number, ctx: GameContext) {
    const a = this.anim;
    const h = this.health;
    a.time += dt;
    a.timeScale = h.actionMultiplier();
    a.combat = true;
    a.localZ = this.moveSpeed >= 0 ? 1 : -1;
    a.localX = 0;
    a.run = this.anim.speed > this.def.walk * 1.3 ? 1 : 0;
    a.stagger = h.staggered;
    a.hit = Math.max(0, a.hit - dt * 3);
    a.flying = this.hoverY > 1.5;
    a.dive = this.attack?.kind === 'dive' && this.atkPhase === 1 ? 1 : 0;
    const pl = ctx.sys.player.entity;
    a.lookYaw = angleDiff(this.yaw, yawTo(this.position.x, this.position.z, pl.position.x, pl.position.z));
    this.rig.update(dt, a);
    const u = this.mat.rig;
    u.uHit.value = this.hitFlash;
    u.uCharge.value = this.charge;
    u.uChargeColor.value.setHex(this.chargeColor);
    u.uGlowMul.value = this.phase === 3 ? 1.6 : this.phase === 2 ? 1.3 : 1;
    u.uGlowTintMix.value = this.phase === 3 ? 0.5 : 0;
    u.uGlowTint.value.setHex(this.def.glow);
    this.barVisible = this.state !== 'dead' && this.state !== 'yield';
  }

  // ---------------------------------------------------------------------
  override onDeath(_info: DamageInfo | undefined, ctx: GameContext): void {
    this.cancelAttack();
    this.setState('dead');
    this.deadT = 0;
    this.ringR = -1;
    this.rain.length = 0;
    this.barVisible = false;
    this.light?.cancel();
    this.light = null;
    if (this.eclipseCycle > 0) {
      this.eclipseCycle = 0;
      ctx.clock.setTime(12.5);
    }
    ctx.sys.audio.play('boss_roar', { position: this.position, pitch: 0.6, volume: 1 });
    ctx.sys.camera.shake(1, 2);
    ctx.sys.vfx.burst('shockwave', this.position, { scale: 4, color: this.def.glow });
    ctx.sys.env.lightningFlash(V1.copy(this.center).setY(this.center.y + 30));
    if (!this.yielded) this.ai.onStoryBossDefeated(this, false);
  }

  private updateDead(dt: number, ctx: GameContext) {
    this.deadT += dt;
    const a = this.anim;
    a.time += dt;
    a.kneel = false;
    a.action = 'none';
    a.flying = false;
    a.dead = clamp(this.deadT / 1.6, 0, 1);
    // voadores caem
    if (this.hoverY > 0) {
      this.hoverY = Math.max(0, this.hoverY - dt * 9);
      const g = groundAt(ctx, this.position.x, this.position.z, this.position.y + 2);
      this.position.y = g + this.hoverY;
    }
    this.rig.update(dt, a);
    const u = this.mat.rig;
    u.uGlowMul.value = Math.max(0.15, 1.4 - this.deadT * 0.4);
    u.uCharge.value = 0;
    u.uHit.value = 0;
    if (!this.dissolving && this.deadT > 4 && !this.removed) {
      this.dissolving = true;
      ctx.sys.vfx.dissolve(this.object3d, { duration: 2.5, color: this.def.glow, height: this.height, onDone: () => ctx.entities.remove(this) });
    }
  }

  /** Remove invocações, feixes e luzes (fim da luta ou reset). */
  cleanup(ctx: GameContext) {
    for (const s of this.summons) if (!s.removed && s.alive) ctx.entities.remove(s);
    this.summons.length = 0;
    this.beam?.cancel();
    this.beam = null;
    this.tele?.cancel();
    this.tele = null;
    for (const r of this.rain) r.handle?.cancel();
    this.rain.length = 0;
    this.light?.cancel();
    this.light = null;
    if (this.eclipseCycle > 0) {
      this.eclipseCycle = 0;
      ctx.clock.setTime(12.5);
    }
  }

  override dispose(): void {
    this.beam?.cancel();
    this.tele?.cancel();
    this.light?.cancel();
    super.dispose();
    this.mat.dispose();
    this.rig.dispose?.();
  }

  debug() {
    return { id: this.bossId, phase: this.phase, state: this.state, attack: this.attack?.kind ?? null, hp: Math.round(this.health.current), max: this.health.max, hover: +this.hoverY.toFixed(1), stats: this.stats };
  }
}

function statusList(a: StoryAttack): StatusApply[] | undefined {
  return a.statuses ? a.statuses.map((s) => ({ id: s.id, duration: s.duration, magnitude: s.magnitude })) : undefined;
}

function animFor(a: StoryAttack): ExtraAnim {
  switch (a.kind) {
    case 'slash':
      return 'slash';
    case 'slam':
    case 'nova':
      return 'slam';
    case 'ring':
      return 'smash';
    case 'charge':
      return 'charge';
    case 'dive':
      return 'dive';
    case 'beam':
      return 'beam';
    case 'volley':
      return 'volley';
    case 'rain':
    case 'summon':
      return 'castUp';
    case 'gust':
    case 'blink':
      return 'cast';
  }
}

function burstFor(a: StoryAttack) {
  switch (a.type) {
    case 'fire':
      return 'fire' as const;
    case 'lightning':
      return 'lightning' as const;
    case 'void':
      return 'void' as const;
    case 'time':
      return 'time' as const;
    case 'arcane':
      return 'crystalShatter' as const;
    default:
      return 'dust' as const;
  }
}
