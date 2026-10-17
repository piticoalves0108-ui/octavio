import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import { Entity } from '../../core/Entity';
import { Health, type DamageInfo, type DamageResult } from '../../combat/Health';
import type { CreatureDef } from '../../data/creatures';
import { WATER_LEVEL } from '../../data/world';
import { createRigMaterial, type RigMaterial } from '../rigs/material';
import { createCreatureRig } from '../rigs/factory';
import { makeAnimInput, type AnimInput, type Rig } from '../rigs/anim';
import type { SerpentRig } from '../rigs/flyer';
import { V1, V2, V3, angleDiff, clamp, dist2XZ, distXZ, groundAt, isDeepWater, rand, turnTowards, yawTo } from '../shared';
import type { AI } from '../AI';

export type CreatureState = 'wander' | 'graze' | 'rest' | 'alert' | 'flee' | 'circle' | 'perch' | 'attack' | 'submerged' | 'follow' | 'leave' | 'cross' | 'dead';

export interface CreatureSpawnOptions {
  zoneId?: string;
  slot?: string;
  center?: THREE.Vector3;
  radius?: number;
  confined?: boolean;
  /** Altura fixa do poleiro (fênix). */
  perchY?: number;
  /** Direção de travessia (dragão). */
  heading?: number;
}

/**
 * Criaturas (fauna e seres ambientes) guiadas por src/data/creatures.ts:
 * vagar, pastar/descansar, reagir a sons, fugir de ameaças, defender território (grifo),
 * emergir e morder (serpente do lago), seguir à distância (espíritos), pousar e partir (fênix),
 * atravessar o céu (dragão distante). Neutras/fujonas/hostis conforme `temperament`.
 * Montaria/domar: NÃO implementado.
 */
export class Creature extends Entity {
  readonly def: CreatureDef;
  readonly rig: Rig;
  readonly mat: RigMaterial;
  readonly anim: AnimInput = makeAnimInput();
  ctx!: GameContext;
  ai!: AI;
  zoneId?: string;
  slot?: string;
  state: CreatureState = 'wander';
  stateT = 0;
  readonly home = new THREE.Vector3();
  roam: number;
  confined: boolean;
  perchY?: number;
  readonly goal = new THREE.Vector3();
  hasGoal = false;
  speed = 0;
  readonly moveVel = new THREE.Vector3();
  faceYaw = 0;
  threat: Entity | null = null;
  fleeT = 0;
  thinkT = Math.random();
  /** Ataque (grifo/serpente). */
  atkT = 0;
  atkPhase = 0;
  atkCd = 2;
  readonly atkTo = new THREE.Vector3();
  atkHit = false;
  flyY = 0;
  rise = 0;
  leaving = false;
  deadT = -1;
  hitFlash = 0;
  heading = 0;
  angry = false;
  life = 0;
  barVisible = false;
  barHeight: number;
  elite = false;
  level = 1;

  constructor(def: CreatureDef, opts: CreatureSpawnOptions = {}) {
    super('creature', def.temperament === 'hostile' ? 'wild' : 'neutral');
    this.def = def;
    this.typeId = def.id;
    this.name = def.name;
    this.radius = def.radius * def.scale;
    this.height = Math.max(0.3, def.height * def.scale);
    this.barHeight = this.height + 0.4;
    this.zoneId = opts.zoneId;
    this.slot = opts.slot;
    this.roam = opts.radius ?? def.wander;
    this.confined = !!opts.confined;
    this.perchY = opts.perchY;
    this.heading = opts.heading ?? 0;
    if (opts.center) this.home.copy(opts.center);
    if (def.temperament !== 'ambient') {
      const h = new Health(def.hp);
      h.maxPoise = h.poise = def.hp * 0.4;
      this.health = h;
    } else {
      this.queryable = false;
      this.solid = false;
      this.alwaysActive = true;
    }
    if (def.rig === 'spirit' || def.rig === 'serpent') this.solid = false;
    this.mat = createRigMaterial({ roughness: 0.85 });
    this.rig = createCreatureRig(def.rig, this.mat, def.id);
    this.rig.root.scale.setScalar(def.scale);
    this.object3d.add(this.rig.root);
    this.object3d.name = def.id;
    if (def.glow) this.mat.rig.uGlowMul.value = def.glow;
    this.state = def.rig === 'serpent' ? 'submerged' : def.rig === 'griffin' ? 'circle' : def.rig === 'phoenix' ? 'perch' : def.rig === 'dragon' ? 'cross' : 'wander';
  }

  get flyer() {
    return this.def.flyHeight !== undefined && this.def.rig !== 'spirit';
  }

  override onAdded(ctx: GameContext): void {
    this.ctx = ctx;
    this.ai = ctx.sys.ai;
    const p = this.position;
    if (this.home.lengthSq() === 0) this.home.copy(p);
    if (this.perchY !== undefined) p.y = this.perchY;
    else if (this.def.rig === 'dragon') p.y = this.def.flyHeight ?? 190;
    else if (this.def.rig === 'griffin') p.y = groundAt(ctx, p.x, p.z, p.y + 2) + (this.def.flyHeight ?? 40) * 0.6;
    else p.y = groundAt(ctx, p.x, p.z, p.y + 1.5);
    if (this.def.rig === 'serpent') this.findWater(ctx);
    this.flyY = p.y;
    this.yaw = this.faceYaw = this.def.rig === 'dragon' ? this.heading : Math.random() * Math.PI * 2;
    this.anim.flying = this.def.rig === 'griffin' || this.def.rig === 'dragon';
    this.rig.setShadows(ctx.settings.q.shadowMapSize > 0 && this.def.rig !== 'dragon' && this.def.rig !== 'spirit');
    this.ai.registerCreature(this);
  }

  /** Serpente: posiciona na água funda mais próxima da âncora. */
  private findWater(ctx: GameContext) {
    const p = this.position;
    for (let r = 0; r < 40; r += 3) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = this.home.x + Math.cos(a) * r;
        const z = this.home.z + Math.sin(a) * r;
        if (isDeepWater(ctx, x, z, 2)) {
          p.set(x, WATER_LEVEL, z);
          this.home.copy(p);
          return;
        }
      }
    }
  }

  /** Sai de cena (fim do horário): voa embora ou desvanece. */
  leave() {
    if (this.leaving || this.deadT >= 0) return;
    this.leaving = true;
    this.setState('leave');
  }

  setState(s: CreatureState) {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
  }

  // =====================================================================
  override update(dt: number, ctx: GameContext): void {
    this.life += dt;
    if (this.deadT >= 0) {
      this.deadT += dt;
      this.anim.dead = clamp(this.deadT / 0.8, 0, 1);
      this.rig.update(dt, this.anim);
      if (this.deadT > 0.9 && !this.dissolving) this.fadeOut(ctx);
      if (this.deadT > 6) ctx.entities.remove(this);
      return;
    }
    this.stateT += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
    switch (this.def.rig) {
      case 'dragon':
        this.updateDragon(dt, ctx);
        break;
      case 'serpent':
        this.updateSerpent(dt, ctx);
        break;
      case 'griffin':
        this.updateGriffin(dt, ctx);
        break;
      case 'phoenix':
        this.updatePhoenix(dt, ctx);
        break;
      case 'spirit':
        this.updateSpirit(dt, ctx);
        break;
      default:
        this.updateGround(dt, ctx);
    }
    this.updateVisual(dt, ctx);
  }

  override farUpdate(_dt: number, ctx: GameContext): void {
    if (this.leaving && this.deadT < 0) ctx.entities.remove(this);
  }

  /** Ameaça percebida: jogador perto (mais longe se correndo/voando baixo) ou hostil próximo. */
  private perceiveThreat(ctx: GameContext): number {
    const pl = ctx.sys.player.entity;
    if (!pl.alive) return Infinity;
    const d = distXZ(this.position, pl.position);
    const p = ctx.sys.player;
    const loud = p.horizontalSpeed > 5 || (p.isFlying() && p.heightAboveGround < 12);
    this.threat = pl;
    return loud ? d * 0.6 : d;
  }

  /** Som alto por perto (magia, combate). */
  hear(pos: THREE.Vector3, loud: boolean) {
    if (this.deadT >= 0 || this.leaving) return;
    const d = distXZ(this.position, pos);
    if (this.def.temperament === 'skittish' && (loud || d < this.def.flee * 1.5)) {
      this.startFlee(pos, rand(3, 6));
    } else if (this.def.temperament === 'neutral' && loud && d < 10 && this.def.rig !== 'spirit' && this.def.rig !== 'phoenix') {
      this.startFlee(pos, rand(2, 4));
    }
  }

  private startFlee(from: THREE.Vector3, t: number) {
    if (this.state === 'flee' && this.fleeT > 1) return;
    const p = this.position;
    const d = Math.max(0.1, distXZ(p, from));
    let gx = p.x + ((p.x - from.x) / d) * 30;
    let gz = p.z + ((p.z - from.z) / d) * 30;
    if (this.confined) {
      // no cercado: corre para o lado oposto, dentro do raio
      const hx = this.home.x - from.x;
      const hz = this.home.z - from.z;
      const hl = Math.max(0.1, Math.hypot(hx, hz));
      gx = this.home.x + (hx / hl) * this.roam * 0.7;
      gz = this.home.z + (hz / hl) * this.roam * 0.7;
    }
    this.goal.set(gx, p.y, gz);
    this.hasGoal = true;
    this.fleeT = t;
    this.setState('flee');
    if (this.def.rig === 'chicken' || this.def.rig === 'deer') this.ctx.sys.audio.play('creature_call', { position: p, pitch: this.def.rig === 'chicken' ? 2 : 1.3, volume: 0.35 });
  }

  // ---------------------------------------------------------------------
  // Animais de chão (cervo, coelho, cavalo, ovelha, galinha)
  // ---------------------------------------------------------------------
  private updateGround(dt: number, ctx: GameContext) {
    const def = this.def;
    const dThreat = this.perceiveThreat(ctx);
    if (this.leaving) {
      // desvanece (cervo luminoso ao amanhecer) ou some longe da vista
      if (this.stateT > 0.1 && !this.dissolving) this.fadeOut(ctx);
      this.speed = 0;
      this.move(dt, ctx);
      return;
    }
    // reação a ameaças
    if (this.state !== 'flee') {
      if (def.temperament === 'skittish' && dThreat < def.flee) this.startFlee(this.threat!.position, rand(3, 6));
      else if (def.temperament === 'neutral' && dThreat < def.flee) {
        // afasta-se com calma
        const tp = this.threat!.position;
        const d = Math.max(0.1, distXZ(this.position, tp));
        this.goal.set(this.position.x + ((this.position.x - tp.x) / d) * 8, this.position.y, this.position.z + ((this.position.z - tp.z) / d) * 8);
        this.clampGoal();
        this.hasGoal = true;
        this.setState('wander');
        this.speed = def.walk * 1.4;
      } else if (dThreat < def.notice && (this.state === 'graze' || this.state === 'wander') && this.stateT > 1.5 && Math.random() < dt * 0.6) {
        this.setState('alert');
      }
    }
    switch (this.state) {
      case 'flee':
        this.fleeT -= dt;
        this.speed = def.run;
        if (this.fleeT <= 0 || (this.hasGoal && dist2XZ(this.position, this.goal) < 2)) {
          this.home.copy(this.confined ? this.home : this.position);
          this.setState('alert');
        }
        break;
      case 'alert':
        this.speed = 0;
        if (this.threat) this.faceYaw = yawTo(this.position.x, this.position.z, this.threat.position.x, this.threat.position.z);
        if (this.stateT > rand(1.5, 3) || dThreat > def.notice * 1.3) this.setState('wander');
        break;
      case 'graze':
      case 'rest':
        this.speed = 0;
        if (this.stateT > (this.state === 'rest' ? 14 : 6) * (0.6 + Math.random() * 0.002)) this.setState('wander');
        break;
      case 'wander':
      default: {
        this.thinkT -= dt;
        if (!this.hasGoal || this.thinkT <= 0 || dist2XZ(this.position, this.goal) < 1) {
          this.thinkT = rand(4, 9);
          if (Math.random() < def.idleBias && this.stateT > 1) {
            this.hasGoal = false;
            this.setState(Math.random() < 0.25 && def.rig !== 'chicken' ? 'rest' : 'graze');
            break;
          }
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * this.roam * (this.confined ? 0.8 : 1);
          this.goal.set(this.home.x + Math.cos(a) * r, this.position.y, this.home.z + Math.sin(a) * r);
          this.hasGoal = true;
          this.speed = def.walk * rand(0.8, 1.1);
        }
        break;
      }
    }
    this.move(dt, ctx);
  }

  private clampGoal() {
    if (!this.confined) return;
    const dx = this.goal.x - this.home.x;
    const dz = this.goal.z - this.home.z;
    const d = Math.hypot(dx, dz);
    const R = this.roam * 0.85;
    if (d > R) {
      this.goal.x = this.home.x + (dx / d) * R;
      this.goal.z = this.home.z + (dz / d) * R;
    }
  }

  private move(dt: number, ctx: GameContext) {
    const p = this.position;
    let vx = 0;
    let vz = 0;
    if (this.hasGoal && this.speed > 0 && (this.state === 'wander' || this.state === 'flee' || this.state === 'follow')) {
      if (this.confined) this.clampGoal();
      const dx = this.goal.x - p.x;
      const dz = this.goal.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const s = Math.min(this.speed, d * 2);
        vx = (dx / d) * s;
        vz = (dz / d) * s;
        this.faceYaw = Math.atan2(dx, dz);
      } else this.hasGoal = false;
    }
    const k = Math.min(1, dt * 5);
    this.moveVel.x += (vx - this.moveVel.x) * k;
    this.moveVel.z += (vz - this.moveVel.z) * k;
    const nx = p.x + (this.moveVel.x + this.velocity.x) * dt;
    const nz = p.z + (this.moveVel.z + this.velocity.z) * dt;
    this.velocity.multiplyScalar(Math.exp(-6 * dt));
    if (!isDeepWater(ctx, nx, nz, 0.6)) {
      p.x = nx;
      p.z = nz;
    } else {
      this.hasGoal = false;
      this.moveVel.set(0, 0, 0);
    }
    if (this.tier === 0) ctx.physics.resolveCapsule(p, this.radius, this.height);
    const g = groundAt(ctx, p.x, p.z, p.y + 0.7);
    p.y += (g - p.y) * Math.min(1, dt * 12);
    this.yaw = turnTowards(this.yaw, this.faceYaw, 5 * dt);
    this.object3d.rotation.y = this.yaw;
  }

  // ---------------------------------------------------------------------
  // Espírito da floresta: segue o viajante a distância respeitosa
  // ---------------------------------------------------------------------
  private updateSpirit(dt: number, ctx: GameContext) {
    const def = this.def;
    if (this.leaving) {
      if (!this.dissolving) this.fadeOut(ctx);
      return;
    }
    const pl = ctx.sys.player.entity;
    const d = pl.alive ? distXZ(this.position, pl.position) : Infinity;
    const p = this.position;
    if (d < def.flee) {
      const k = Math.max(0.1, d);
      this.goal.set(p.x + ((p.x - pl.position.x) / k) * 5, p.y, p.z + ((p.z - pl.position.z) / k) * 5);
      this.speed = def.run;
      this.hasGoal = true;
    } else if (d < def.notice && dist2XZ(pl.position, this.home) < (this.roam + 20) ** 2) {
      // mantém 6–9 m, girando em volta
      const a = yawTo(pl.position.x, pl.position.z, p.x, p.z) + dt * 0.3;
      this.goal.set(pl.position.x + Math.sin(a) * 7.5, p.y, pl.position.z + Math.cos(a) * 7.5);
      this.speed = def.walk * 1.4;
      this.hasGoal = true;
    } else {
      this.thinkT -= dt;
      if (this.thinkT <= 0 || !this.hasGoal) {
        this.thinkT = rand(3, 7);
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * this.roam;
        this.goal.set(this.home.x + Math.cos(a) * r, p.y, this.home.z + Math.sin(a) * r);
        this.speed = def.walk;
        this.hasGoal = true;
      }
    }
    const dx = this.goal.x - p.x;
    const dz = this.goal.z - p.z;
    const dd = Math.hypot(dx, dz);
    const s = dd > 0.3 ? Math.min(this.speed, dd) : 0;
    this.moveVel.set(dd > 0.3 ? (dx / dd) * s : 0, 0, dd > 0.3 ? (dz / dd) * s : 0);
    p.x += this.moveVel.x * dt;
    p.z += this.moveVel.z * dt;
    const g = ctx.heightfield.heightAt(p.x, p.z);
    p.y += (Math.max(g, WATER_LEVEL) + (def.flyHeight ?? 1.5) - 1.4 - p.y) * Math.min(1, dt * 2);
    if (dd > 0.3) this.faceYaw = Math.atan2(dx, dz);
    this.yaw = turnTowards(this.yaw, this.faceYaw, 3 * dt);
    this.object3d.rotation.y = this.yaw;
    if (this.tier === 0 && Math.random() < dt * 3) {
      this.rig.muzzle(V1);
      ctx.sys.vfx.spark(V1, 0x9fffd0, 0.12, 1.2, rand(-0.3, 0.3), rand(0.2, 0.6), rand(-0.3, 0.3));
    }
  }

  // ---------------------------------------------------------------------
  // Fênix: pousada no santuário ao amanhecer; parte se alguém chega perto
  // ---------------------------------------------------------------------
  private updatePhoenix(dt: number, ctx: GameContext) {
    const def = this.def;
    const p = this.position;
    const pl = ctx.sys.player.entity;
    const d = pl.alive ? Math.hypot(p.x - pl.position.x, p.z - pl.position.z, (p.y - pl.position.y) * 0.5) : Infinity;
    if (this.state === 'perch') {
      this.anim.flying = false;
      this.moveVel.set(0, 0, 0);
      if (pl.alive) this.faceYaw = yawTo(p.x, p.z, pl.position.x, pl.position.z) + Math.sin(this.life * 0.3) * 0.5;
      if (d < def.flee || this.leaving) {
        this.setState('leave');
        this.leaving = true;
        this.heading = pl.alive ? yawTo(pl.position.x, pl.position.z, p.x, p.z) : Math.random() * 6;
        ctx.sys.audio.play('creature_call', { position: p, pitch: 1.8, volume: 0.8 });
        ctx.sys.vfx.burst('fire', p, { scale: 1.5, color: 0xffa040 });
      }
    } else {
      // voa para longe subindo
      this.anim.flying = true;
      this.moveVel.set(Math.sin(this.heading) * def.run, 0, Math.cos(this.heading) * def.run);
      p.x += this.moveVel.x * dt;
      p.z += this.moveVel.z * dt;
      p.y += 6 * dt;
      this.faceYaw = this.heading;
      if (this.stateT > 14) ctx.entities.remove(this);
    }
    this.yaw = turnTowards(this.yaw, this.faceYaw, 2.5 * dt);
    this.object3d.rotation.y = this.yaw;
    if (this.tier === 0 && Math.random() < dt * 10) {
      V1.set(p.x + rand(-0.6, 0.6), p.y + rand(0.3, 1.2), p.z + rand(-0.6, 0.6));
      ctx.sys.vfx.spark(V1, Math.random() < 0.5 ? 0xffb040 : 0xff6020, 0.14, 0.9, 0, rand(0.5, 1.4), 0);
    }
  }

  // ---------------------------------------------------------------------
  // Grifo: circula o ninho; territorial (mergulha em quem invade)
  // ---------------------------------------------------------------------
  private updateGriffin(dt: number, ctx: GameContext) {
    const def = this.def;
    const p = this.position;
    const pl = ctx.sys.player.entity;
    const P = ctx.sys.player;
    const dNest = pl.alive ? distXZ(pl.position, this.home) : Infinity;
    const groundHome = ctx.heightfield.heightAt(this.home.x, this.home.z);
    const intruder = pl.alive && (dNest < def.flee || (P.isFlying() && dNest < def.notice && pl.position.y > groundHome - 10));
    this.atkCd -= dt;
    if (!this.angry && intruder) {
      this.angry = true;
      this.tags.add(`aggro:${pl.id}`);
      ctx.sys.audio.play('creature_call', { position: p, pitch: 0.8, volume: 1 });
      ctx.events.emit('ui:notify', { text: 'O Grifo defende o ninho!', kind: 'warning' });
    } else if (this.angry && (!pl.alive || dNest > def.notice * 1.4)) {
      this.angry = false;
      this.tags.delete(`aggro:${pl.id}`);
      this.setState('circle');
    }
    this.anim.flying = this.state !== 'rest';
    switch (this.state) {
      case 'rest':
        this.moveVel.set(0, 0, 0);
        p.y += (groundAt(ctx, p.x, p.z, p.y + 2) - p.y) * Math.min(1, dt * 3);
        if (this.angry || this.stateT > 25) this.setState('circle');
        break;
      case 'attack': {
        const a = def.attack!;
        if (this.atkPhase === 0) {
          // antecipação: paira e grita, mirando
          this.moveVel.multiplyScalar(Math.exp(-3 * dt));
          if (pl.alive) {
            this.faceYaw = yawTo(p.x, p.z, pl.position.x, pl.position.z);
            V1.set(pl.position.x, pl.position.y + 1, pl.position.z);
            this.atkTo.copy(V1);
          }
          if (this.stateT > a.windup) {
            this.atkPhase = 1;
            this.atkHit = false;
            this.stateT = 0;
          }
        } else if (this.atkPhase === 1) {
          const dx = this.atkTo.x - p.x;
          const dy = this.atkTo.y - p.y;
          const dz = this.atkTo.z - p.z;
          const d = Math.hypot(dx, dy, dz);
          const sp = def.run * 1.6;
          if (d > 1 && this.stateT < 3) {
            this.moveVel.set((dx / d) * sp, 0, (dz / d) * sp);
            p.y += (dy / d) * sp * dt;
          } else {
            this.atkPhase = 2;
            this.stateT = 0;
          }
          if (!this.atkHit && pl.alive) {
            V2.set(pl.position.x, pl.position.y + pl.height * 0.5, pl.position.z);
            if (p.distanceTo(V2) < a.reach + pl.radius) {
              this.atkHit = true;
              ctx.sys.combat.applyDamage(pl, { amount: a.damage, type: a.type, source: this, knockback: a.knockback, poiseDamage: 30, tag: 'melee', direction: V3.set(dx, 0, dz).normalize().clone() });
              ctx.sys.audio.play('hit_flesh', { position: p });
            }
          }
          this.anim.dive = 1;
        } else {
          // sobe de volta
          this.anim.dive = 0;
          p.y += 9 * dt;
          this.moveVel.multiplyScalar(Math.exp(-1.5 * dt));
          if (this.stateT > a.recovery) {
            this.atkCd = a.cooldown;
            this.setState('circle');
          }
        }
        p.x += this.moveVel.x * dt;
        p.z += this.moveVel.z * dt;
        break;
      }
      case 'circle':
      default: {
        this.anim.dive = 0;
        const r = this.roam * 0.8;
        const ang = this.life * (def.walk / Math.max(5, r)) * 3;
        let gx = this.home.x + Math.cos(ang) * r;
        let gz = this.home.z + Math.sin(ang) * r;
        let gy = groundHome + (def.flyHeight ?? 40);
        if (this.angry && pl.alive) {
          // circula em volta do invasor, mais baixo
          gx = pl.position.x + Math.cos(ang * 1.6) * 16;
          gz = pl.position.z + Math.sin(ang * 1.6) * 16;
          gy = Math.max(ctx.heightfield.heightAt(gx, gz) + 8, pl.position.y + 9);
          if (this.atkCd <= 0 && this.stateT > 1.5) {
            this.atkPhase = 0;
            this.setState('attack');
            ctx.sys.audio.play('creature_call', { position: p, pitch: 0.9, volume: 1 });
          }
        } else if (this.stateT > 40 && Math.random() < dt * 0.05) {
          this.setState('rest');
          this.goal.copy(this.home);
        }
        const dx = gx - p.x;
        const dz = gz - p.z;
        const d = Math.hypot(dx, dz) || 1;
        const sp = this.angry ? def.run : def.walk * 4;
        this.moveVel.x += ((dx / d) * Math.min(sp, d * 1.5) - this.moveVel.x) * Math.min(1, dt * 1.5);
        this.moveVel.z += ((dz / d) * Math.min(sp, d * 1.5) - this.moveVel.z) * Math.min(1, dt * 1.5);
        p.x += this.moveVel.x * dt;
        p.z += this.moveVel.z * dt;
        p.y += clamp(gy - p.y, -5 * dt, 5 * dt);
        if (this.moveVel.lengthSq() > 0.5) this.faceYaw = Math.atan2(this.moveVel.x, this.moveVel.z);
        if ((this.state as CreatureState) === 'rest') {
          this.moveVel.set(0, 0, 0);
          p.x = this.home.x;
          p.z = this.home.z;
        }
        break;
      }
    }
    const g = ctx.heightfield.heightAt(p.x, p.z);
    if (p.y < g + 0.5) p.y = g + 0.5;
    this.yaw = turnTowards(this.yaw, this.faceYaw, 2.4 * dt);
    this.object3d.rotation.y = this.yaw;
    this.anim.combat = this.angry;
  }

  // ---------------------------------------------------------------------
  // Serpente do lago: emerge, morde e volta a submergir
  // ---------------------------------------------------------------------
  private updateSerpent(dt: number, ctx: GameContext) {
    const def = this.def;
    const a = def.attack!;
    const p = this.position;
    const pl = ctx.sys.player.entity;
    const d = pl.alive ? distXZ(p, pl.position) : Infinity;
    const rig = this.rig as SerpentRig;
    this.atkCd -= dt;
    this.queryable = this.rise > 0.4;
    switch (this.state) {
      case 'submerged':
        this.rise = Math.max(0, this.rise - dt * 0.8);
        if (d < def.notice && pl.position.y < WATER_LEVEL + 4) {
          this.setState('alert');
          ctx.sys.vfx.burst('splash', V1.set(p.x, WATER_LEVEL, p.z), { scale: 2.2 });
          ctx.sys.audio.play('creature_call', { position: p, pitch: 0.45, volume: 1 });
        }
        break;
      case 'alert':
        this.rise = Math.min(1, this.rise + dt * 1.2);
        if (pl.alive) this.faceYaw = yawTo(p.x, p.z, pl.position.x, pl.position.z);
        if (d > 25 && this.stateT > 4) this.setState('submerged');
        else if (this.rise >= 1 && this.atkCd <= 0 && d < a.reach + 3) {
          this.setState('attack');
          this.atkPhase = 0;
          V1.set(p.x + Math.sin(this.faceYaw) * a.reach * 0.6, p.y, p.z + Math.cos(this.faceYaw) * a.reach * 0.6);
          ctx.sys.vfx.telegraph({ type: 'cone', position: p, yaw: this.faceYaw, radius: a.reach + 0.8, angle: 70, duration: a.windup, color: 0xff6020 });
        } else if (d < 30 && pl.alive) {
          // aproxima-se pela água
          const nx = p.x + Math.sin(this.faceYaw) * def.walk * dt;
          const nz = p.z + Math.cos(this.faceYaw) * def.walk * dt;
          if (d > a.reach && isDeepWater(ctx, nx, nz, 1.5)) {
            p.x = nx;
            p.z = nz;
          }
        }
        break;
      case 'attack':
        if (this.atkPhase === 0 && this.stateT >= a.windup) {
          this.atkPhase = 1;
          this.stateT = 0;
          V1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
          ctx.sys.combat.meleeSweep(this, p, V1, a.reach + 0.8, 80, { amount: a.damage, type: a.type, source: this, knockback: a.knockback, poiseDamage: 25, tag: 'melee' }, { verticalReach: 4 });
          ctx.sys.vfx.burst('splash', V2.copy(p).addScaledVector(V1, a.reach * 0.7).setY(WATER_LEVEL), { scale: 1.4 });
          ctx.sys.audio.play('swing_heavy', { position: p, pitch: 0.6 });
        } else if (this.atkPhase === 1 && this.stateT >= 0.25) {
          this.atkPhase = 2;
          this.stateT = 0;
        } else if (this.atkPhase === 2 && this.stateT >= a.recovery) {
          this.atkCd = a.cooldown * rand(0.85, 1.2);
          this.setState('alert');
        }
        break;
      case 'leave':
        this.rise = Math.max(0, this.rise - dt);
        if (this.rise <= 0) ctx.entities.remove(this);
        break;
    }
    rig.rise = this.rise;
    this.anim.action = this.state === 'attack' ? 'bite' : 'none';
    this.anim.phase = this.atkPhase as 0 | 1 | 2;
    this.anim.phaseT = clamp(this.stateT / Math.max(0.1, a.windup), 0, 1);
    this.yaw = turnTowards(this.yaw, this.faceYaw, (this.state === 'attack' ? 0.6 : 2) * dt);
    this.object3d.rotation.y = this.yaw;
    p.y = WATER_LEVEL;
  }

  // ---------------------------------------------------------------------
  // Dragão distante: atravessa o céu e some
  // ---------------------------------------------------------------------
  private updateDragon(dt: number, ctx: GameContext) {
    const def = this.def;
    const p = this.position;
    this.moveVel.set(Math.sin(this.heading) * def.run, 0, Math.cos(this.heading) * def.run);
    p.x += this.moveVel.x * dt;
    p.z += this.moveVel.z * dt;
    p.y = (def.flyHeight ?? 190) + Math.sin(this.life * 0.25) * 8;
    this.yaw = this.heading + Math.sin(this.life * 0.15) * 0.05;
    this.object3d.rotation.y = this.yaw;
    if (this.life > 45) ctx.entities.remove(this);
  }

  // ---------------------------------------------------------------------
  private dissolving = false;
  private fadeOut(ctx: GameContext) {
    this.dissolving = true;
    this.queryable = false;
    ctx.sys.vfx.dissolve(this.object3d, { duration: 1.8, color: this.def.glow ? 0x9ff4ff : 0xd8d0c0, height: this.height, onDone: () => ctx.entities.remove(this) });
  }

  private updateVisual(dt: number, ctx: GameContext) {
    const a = this.anim;
    a.time += dt;
    a.timeScale = this.health?.actionMultiplier() ?? 1;
    const spd = Math.hypot(this.moveVel.x, this.moveVel.z);
    a.speed = spd;
    a.run = clamp((spd - this.def.walk) / Math.max(0.5, this.def.run - this.def.walk), 0, 1);
    a.localZ = 1;
    a.localX = 0;
    a.graze = this.state === 'graze';
    a.rest = this.state === 'rest' && this.def.rig !== 'griffin';
    a.hit = Math.max(0, a.hit - dt * 3);
    if (this.threat && this.state === 'alert') {
      a.lookYaw = angleDiff(this.yaw, yawTo(this.position.x, this.position.z, this.threat.position.x, this.threat.position.z));
    } else a.lookYaw *= 0.95;
    if (this.tier === 0 || this.def.rig === 'dragon' || (ctx.frame + this.id) % 2 === 0) this.rig.update(dt, a);
    this.mat.rig.uHit.value = this.hitFlash;
    const pl = ctx.sys.player.entity;
    this.barVisible = (this.angry || this.def.temperament === 'hostile') && this.queryable && dist2XZ(this.position, pl.position) < 40 * 40 && this.state !== 'submerged';
  }

  override onDamaged(info: DamageInfo, result: DamageResult, ctx: GameContext): void {
    this.hitFlash = 1;
    this.anim.hit = 1;
    const src = info.source;
    if (this.def.temperament === 'territorial' && src) {
      this.angry = true;
      this.tags.add(`aggro:${src.id}`);
    } else if (this.def.temperament !== 'hostile' && src && this.def.rig !== 'serpent') {
      this.startFlee(src.position, rand(4, 7));
    }
    void result;
    void ctx;
  }

  override onDeath(_info: DamageInfo | undefined, ctx: GameContext): void {
    this.deadT = 0;
    this.barVisible = false;
    this.ai.onCreatureDeath(this);
    void ctx;
  }

  override dispose(): void {
    this.ai?.unregisterCreature(this);
    super.dispose();
    this.mat.dispose();
  }
}
