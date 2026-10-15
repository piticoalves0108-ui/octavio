import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { Entity, type Faction } from '../core/Entity';
import { Health, type DamageInfo, type DamageResult, type StatusId } from './Health';
import type { VfxHandle } from './VFX';

/**
 * Boneco de treino / inimigo de teste do módulo de combate. Não substitui a IA: serve para
 * treinar no jogo (vila, arena) e para os testes automatizados. Mostra o uso da API de
 * combate que a IA deve seguir: telegraph → golpe (meleeSweep/explode), projéteis, feixe,
 * reação a knockback/puxão, estados (raiz, lentidão, atordoamento) e dissolução na morte.
 */
export interface DummyOptions {
  faction?: Faction;
  hp?: number;
  kind?: 'enemy' | 'boss';
  name?: string;
  /** Ataca o jogador: 'melee' (cone telegrafado), 'ranged' (projéteis), 'slam' (círculo), 'beam' (laser) ou nenhum. */
  attack?: 'none' | 'melee' | 'ranged' | 'slam' | 'beam';
  /** Intervalo entre ataques (s). */
  attackInterval?: number;
  /** Dano dos ataques. */
  damage?: number;
  /** Projétil usado no modo 'ranged'. */
  projectile?: 'arrow' | 'enemyOrb' | 'fireball' | 'crystalShard';
  statusImmune?: StatusId[];
  resist?: Partial<Record<DamageInfo['type'], number>>;
  /** Remove o corpo após a dissolução (padrão true). */
  removeOnDeath?: boolean;
  scale?: number;
}

const FACTION_COLOR: Partial<Record<Faction, number>> = { bandit: 0x7a3a2a, corrupted: 0x4a2a5a, construct: 0x6a6a72, wild: 0x3a3a30 };

let sharedGeo: { body: THREE.BufferGeometry; head: THREE.BufferGeometry; arm: THREE.BufferGeometry } | null = null;

export class TrainingDummy extends Entity {
  opts: Required<Pick<DummyOptions, 'attack' | 'attackInterval' | 'damage' | 'projectile' | 'removeOnDeath'>>;
  private ctx: GameContext | null = null;
  private mat: THREE.MeshStandardMaterial;
  private flash = 0;
  private attackT = 0;
  private windup = 0;
  private tele: VfxHandle | null = null;
  private target = new THREE.Vector3();
  private beam: ReturnType<GameContext['sys']['vfx']['sustainedBeam']> = null;
  private beamHit = new Set<number>();
  private beamTick = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private dissolving = false;
  /** Último dano recebido (testes). */
  lastDamage: { amount: number; type: string; blocked: boolean; crit: boolean } | null = null;
  damageLog: number[] = [];

  constructor(opts: DummyOptions = {}) {
    super(opts.kind ?? 'enemy', opts.faction ?? 'bandit');
    this.name = opts.name ?? 'Boneco de treino';
    this.typeId = 'training_dummy';
    const s = opts.scale ?? 1;
    this.radius = 0.45 * s;
    this.height = 1.8 * s;
    this.health = new Health(opts.hp ?? 200);
    this.health.maxPoise = 40;
    this.health.poise = 40;
    for (const id of opts.statusImmune ?? []) this.health.statusImmune.add(id);
    if (opts.resist) this.health.resist = { ...opts.resist };
    this.opts = {
      attack: opts.attack ?? 'none',
      attackInterval: opts.attackInterval ?? 2.5,
      damage: opts.damage ?? 10,
      projectile: opts.projectile ?? 'enemyOrb',
      removeOnDeath: opts.removeOnDeath ?? true,
    };
    if (!sharedGeo) {
      sharedGeo = {
        body: new THREE.CylinderGeometry(0.32, 0.4, 1.25, 10).translate(0, 0.72, 0),
        head: new THREE.SphereGeometry(0.24, 12, 10).translate(0, 1.55, 0),
        arm: new THREE.BoxGeometry(1.3, 0.12, 0.12).translate(0, 1.15, 0),
      };
    }
    this.mat = new THREE.MeshStandardMaterial({ color: FACTION_COLOR[this.faction] ?? 0x8a6a4a, roughness: 0.8, emissive: 0xff2020, emissiveIntensity: 0 });
    const g = this.object3d;
    for (const geo of [sharedGeo.body, sharedGeo.head, sharedGeo.arm]) {
      const m = new THREE.Mesh(geo, this.mat);
      m.castShadow = true;
      g.add(m);
    }
    g.scale.setScalar(s);
    this.alwaysActive = true;
  }

  override onAdded(ctx: GameContext): void {
    this.ctx = ctx;
    this.position.y = ctx.physics.groundHeight(this.position.x, this.position.z, this.position.y + 2);
    this.attackT = this.opts.attackInterval * (0.5 + Math.random() * 0.5);
  }

  override onDamaged(info: DamageInfo, result: DamageResult): void {
    this.flash = 1;
    this.lastDamage = { amount: result.dealt, type: info.type, blocked: result.blocked, crit: !!info.crit };
    this.damageLog.push(result.dealt);
    if (this.damageLog.length > 200) this.damageLog.shift();
  }

  override onDeath(): void {
    const ctx = this.ctx;
    this.tele?.cancel();
    this.beam?.cancel();
    if (!ctx) return;
    this.dissolving = true;
    ctx.sys.vfx.dissolve(this.object3d, {
      duration: 1.4,
      color: this.faction === 'construct' ? 0x58d8ff : 0xff7a40,
      height: this.height,
      onDone: () => {
        if (this.opts.removeOnDeath) ctx.entities.remove(this);
      },
    });
  }

  override update(dt: number, ctx: GameContext): void {
    if (this.dissolving) return;
    const h = this.health!;
    // knockback/puxão: integra a velocidade com amortecimento
    // enraizado não é deslocado; atordoado/cambaleando ainda sofre empurrões
    if (h.has('root')) this.velocity.set(0, 0, 0);
    const p = this.position;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    const k = Math.exp(-6 * dt);
    this.velocity.x *= k;
    this.velocity.z *= k;
    ctx.physics.resolveCapsule(p, this.radius, this.height);
    p.y = ctx.physics.groundHeight(p.x, p.z, p.y + 0.6);
    // visual: clarão de dano, inclinação no atordoamento
    this.flash = Math.max(0, this.flash - dt * 6);
    this.mat.emissiveIntensity = this.flash * 1.2 + (h.has('root') ? 0.25 : 0);
    this.mat.emissive.setHex(h.has('root') ? 0x30ffc0 : h.has('timeSlow') ? 0x60a0ff : 0xff2020);
    this.object3d.rotation.z = h.staggered ? Math.sin(ctx.elapsed * 20) * 0.12 : 0;
    this.object3d.rotation.y = this.yaw;
    if (this.opts.attack === 'none' || !h.canAct()) {
      if (this.windup > 0 && !h.canAct()) this.interrupt();
      return;
    }
    const player = ctx.sys.player.entity;
    if (!player.alive) return;
    this.yaw = Math.atan2(player.position.x - p.x, player.position.z - p.z);
    const act = h.actionMultiplier();
    if (this.windup > 0) {
      this.windup -= dt * act;
      if (this.opts.attack === 'beam') this.updateBeam(ctx, dt);
      if (this.windup <= 0) this.strike(ctx);
      return;
    }
    this.attackT -= dt * act;
    if (this.attackT <= 0) {
      this.attackT = this.opts.attackInterval;
      this.beginAttack(ctx);
    }
  }

  private interrupt() {
    this.windup = 0;
    this.tele?.cancel();
    this.tele = null;
    this.beam?.cancel();
    this.beam = null;
  }

  private beginAttack(ctx: GameContext) {
    const vfx = ctx.sys.vfx;
    const player = ctx.sys.player.entity;
    const p = this.position;
    const dist = Math.hypot(player.position.x - p.x, player.position.z - p.z);
    switch (this.opts.attack) {
      case 'melee':
        if (dist > 4) return;
        this.windup = 0.8;
        this.tele = vfx.telegraph({ type: 'cone', position: p, yaw: this.yaw, radius: 3.2, angle: 90, duration: this.windup, color: 0xff8a20 });
        break;
      case 'slam':
        this.target.copy(player.position);
        this.windup = 1.0;
        this.tele = vfx.telegraph({ type: 'circle', position: this.target, radius: 2.5, duration: this.windup });
        break;
      case 'ranged':
        this.windup = 0.4;
        break;
      case 'beam':
        this.windup = 1.6;
        this.beamHit.clear();
        this.tele = vfx.telegraph({ type: 'line', position: p, yaw: this.yaw, width: 1.2, length: 18, duration: 0.6, color: 0xff3020 });
        this.beam = vfx.sustainedBeam(0xff4030, 0.35, 'beam');
        break;
    }
  }

  private updateBeam(ctx: GameContext, dt: number) {
    if (this.windup > 1.0) return; // aviso antes de disparar
    // laser contínuo: pode acertar de novo a cada 0,25 s
    this.beamTick -= dt;
    if (this.beamTick <= 0) {
      this.beamTick = 0.25;
      this.beamHit.clear();
    }
    const o = this.getCenter(this.tmp).setY(this.position.y + 1.4);
    const dir = this.tmp2.set(Math.sin(this.yaw), -0.04, Math.cos(this.yaw));
    const res = ctx.sys.combat.beamAttack(this, o, dir, 18, 0.35, { amount: this.opts.damage * 0.25, type: 'fire', poiseDamage: 2, tag: 'dummyBeam' }, { visual: false, alreadyHit: this.beamHit });
    this.beam?.set(o, res.end);
  }

  private strike(ctx: GameContext) {
    const combat = ctx.sys.combat;
    const p = this.position;
    this.tele = null;
    switch (this.opts.attack) {
      case 'melee': {
        const fwd = this.getForward(this.tmp);
        combat.meleeSweep(this, p, fwd, 3.2, 90, { amount: this.opts.damage, type: 'physical', knockback: 4, poiseDamage: 15, tag: 'melee' });
        ctx.sys.vfx.burst('dust', this.tmp2.copy(p).addScaledVector(fwd, 1.8), { scale: 0.6 });
        break;
      }
      case 'slam': {
        combat.explode(this.target, 2.5, { amount: this.opts.damage, type: 'physical', knockback: 6, poiseDamage: 20, unblockable: true, tag: 'slam' }, this, { falloff: false });
        ctx.sys.vfx.burst('shockwave', this.target, { scale: 0.5, color: 0xff8040 });
        break;
      }
      case 'ranged': {
        const o = this.tmp.copy(p).setY(p.y + 1.4);
        const player = ctx.sys.player.entity;
        const d = player.getCenter(this.tmp2).sub(o).normalize();
        const kind = this.opts.projectile;
        combat.spawnProjectile({
          kind,
          source: this,
          origin: o,
          direction: d,
          speed: kind === 'arrow' ? 38 : 20,
          range: 50,
          radius: 0.25,
          damage: { amount: this.opts.damage, type: kind === 'fireball' ? 'fire' : kind === 'arrow' || kind === 'crystalShard' ? 'physical' : 'void', poiseDamage: 8, tag: 'projectile' },
          gravity: kind === 'arrow' ? 3 : 0,
          explodeRadius: kind === 'fireball' ? 2 : 0,
        });
        break;
      }
      case 'beam':
        this.beam?.cancel();
        this.beam = null;
        break;
    }
  }

  override dispose(): void {
    this.interrupt();
    super.dispose();
    this.mat.dispose();
  }
}
