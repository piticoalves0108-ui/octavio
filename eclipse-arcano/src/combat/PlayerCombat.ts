import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import type { DamageInfo, DamageResult } from './Health';
import {
  BLOCK,
  COMBOS,
  DEFAULT_WEAPON_ID,
  HEAVY_ATTACK,
  HIT_STOP,
  MELEE_GENERAL,
  STAFF_SHOT,
  WEAPONS,
  getWeaponDef,
  upgradeMultiplier,
  type ComboStep,
  type WeaponDef,
} from '../data/weapons';
import { chargeFraction, chargedValue, nextComboStep, rollDamage, type DamageRoll } from './combatMath';
import { getWeaponModel, type WeaponModel } from './weaponModels';
import { getWeaponBehavior, type CombatApi, type SwingContext, type WeaponBehavior, type WeaponRuntime } from './weaponBehaviors';
import type { TrailHandle } from './VFX';

type Phase = 'idle' | 'swing' | 'shot' | 'charge' | 'heavy';

/**
 * Há um menu de jogo aberto por cima da partida (inventário, mapa...)? O menu principal não
 * conta: ele não coexiste com o estado 'playing' (se ficar marcado, é resto da tela inicial).
 */
export function gameplayMenuOpen(ctx: GameContext): boolean {
  const ui = ctx.sys.ui as unknown as { openMenuName?: string | null } | undefined;
  const m = ui?.openMenuName ?? null;
  return m !== null && m !== 'main';
}

interface Scheduled {
  t: number;
  fn: () => void;
}

const DAMAGE_COLOR: Record<string, number> = {
  physical: 0xfff0c0,
  arcane: 0x7fe8ff,
  fire: 0xff8a30,
  lightning: 0xbfe4ff,
  void: 0xc080ff,
  time: 0x9fd0ff,
  frost: 0xbff0ff,
};

/**
 * Controle de combate do jogador (atualizado pelo sistema Abilities):
 * - LMB: combos leves por tipo de arma (janelas de tempo, buffer), cajado/artefato disparam à distância
 *   (e golpeiam se houver inimigo colado); segurar LMB carrega o ataque pesado / disparo carregado;
 * - RMB: bloqueio com janela de parry (Health.parryWindow) e quebra de guarda sem energia;
 * - no voo só há disparos (cajado ou raio da mão);
 * - quadros de impacto sincronizados com a duração de player.playAnimation;
 * - dano = arma × poder (meleePower/spellPower) × aprimoramento × golpe, com crítico e hit-stop;
 * - comportamento especial da arma equipada (weaponBehaviors) e modelo procedural (weaponModels).
 */
export class PlayerCombat implements CombatApi {
  readonly ctx: GameContext;
  weaponId = '';
  def!: WeaponDef;
  model: WeaponModel | null = null;
  behavior: WeaponBehavior | null = null;
  runtime!: WeaponRuntime;
  /** Estado por arma, mantido entre trocas (energia solar etc.). */
  private weaponStates = new Map<string, Record<string, number>>();

  phase: Phase = 'idle';
  comboStep = -1;
  private sinceEnd = 99;
  private t = 0;
  private dur = 0;
  private impactAt = 0;
  private impactDone = true;
  private cancelAt = 0;
  private queued = false;
  private step: ComboStep | null = null;
  private heavyCharge = 0;
  private attackHeld = false;
  private holdT = 0;
  charge = 0;
  private chargeKind: 'melee' | 'shot' = 'melee';
  private chargeFullFx = false;
  private shotCd = 0;
  private shotCharged = false;
  private blocking = false;
  private parryCd = 0;
  /** Tempo restante da janela de contra-ataque após um parry. */
  riposteT = 0;
  private weaponCheck = 0;
  private alreadyHit = new Set<number>();
  private collect: { target: Entity; info: DamageInfo; result: DamageResult }[] | null = null;
  private scheduled: Scheduled[] = [];
  private trail: TrailHandle | null = null;
  private roll: DamageRoll = { amount: 0, crit: false };
  private swing: SwingContext = {
    step: 0,
    finisher: false,
    heavy: false,
    charge: 0,
    info: { amount: 0, type: 'physical' },
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, 1),
    range: 2,
    procDone: false,
  };
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private list: Entity[] = [];
  /** Ajuste por alvo do golpe atual (gancho onBeforeHit da arma) — criado uma vez, sem alocar por golpe. */
  private beforeHit = (e: Entity, info: DamageInfo) => this.behavior?.onBeforeHit?.(this.runtime, e, info, this.swing);
  /** Estatísticas (testes automatizados). */
  readonly stats = { swings: 0, hits: 0, shots: 0, heavies: 0, chargedShots: 0, parries: 0, blocks: 0, guardBreaks: 0, crits: 0, kills: 0, ripostes: 0, lastDamage: 0 };

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    ctx.events.on('equip:changed', (e) => {
      if (e.slot === 'weapon') this.syncWeapon(true);
    });
    ctx.events.on('damage', (e) => this.onDamageEvent(e.target, e.info, e.result));
    this.equip(DEFAULT_WEAPON_ID);
  }

  get player(): Entity {
    return this.ctx.sys.player.entity;
  }

  // =====================================================================
  // Arma equipada
  // =====================================================================
  /**
   * Lê a arma equipada no inventário (null → Cajado Ancestral). Só troca quando o valor do
   * inventário muda (ou `force`), para não desfazer um `equip()` feito por script/teste.
   */
  syncWeapon(force = false) {
    const inv = this.ctx.sys.inventory as unknown as { equippedWeaponDefId?: () => string | null };
    let id: string | null = null;
    try {
      id = inv?.equippedWeaponDefId?.() ?? null;
    } catch {
      id = null;
    }
    if (!force && id === this.lastInventoryId) return;
    this.lastInventoryId = id;
    const resolved = id && WEAPONS[id] ? id : DEFAULT_WEAPON_ID;
    if (force || resolved !== this.weaponId) this.equip(resolved);
  }
  private lastInventoryId: string | null | undefined = undefined;

  /** Equipa uma arma pelo id (troca modelo e comportamento). */
  equip(id: string) {
    const def = getWeaponDef(id);
    if (this.behavior?.onUnequip && this.runtime) this.behavior.onUnequip(this.runtime);
    this.cancelAction();
    this.weaponId = def.id;
    this.def = def;
    this.model = def.id === DEFAULT_WEAPON_ID ? null : getWeaponModel(def);
    this.model?.setGlow(1);
    const player = this.ctx.sys.player;
    player.setWeaponModel?.(this.model ? this.model.root : null, def.type);
    let state = this.weaponStates.get(def.id);
    if (!state) {
      state = {};
      this.weaponStates.set(def.id, state);
    }
    this.runtime = { def, model: this.model, state, api: this };
    this.behavior = getWeaponBehavior(def.behavior);
    this.behavior?.onEquip?.(this.runtime);
    this.comboStep = -1;
    // rastro do golpe (base → ponta da arma)
    this.trail?.cancel();
    const glow = def.model.glow;
    this.trail = this.ctx.sys.vfx.bladeTrail((a, b) => this.bladePoints(a, b), def.rarity === 'common' ? 0xcfd8e8 : glow, 0.16, def.rarity === 'common' ? 0.45 : 0.85);
    this.trail.setEmitting(false);
  }

  private bladePoints(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const p = this.ctx.sys.player;
    if (this.model) {
      const m = this.model.root.matrixWorld;
      a.copy(this.model.base).applyMatrix4(m);
      b.copy(this.model.tip).applyMatrix4(m);
    } else {
      p.getHandWorldPosition('right', a);
      p.getWeaponTipWorldPosition(b);
    }
    return true;
  }

  /** Nível de aprimoramento da arma equipada (inventário). */
  private upgradeLevel(): number {
    const inv = this.ctx.sys.inventory;
    const uid = inv?.equipped?.weapon;
    if (!uid) return 0;
    const st = inv.get?.(uid);
    return typeof st?.upgrade === 'number' ? st.upgrade : 0;
  }

  private power(): number {
    const prog = this.ctx.sys.progression;
    const isSpell = this.def.scaling === 'spell';
    const base = prog.getStat(isSpell ? 'spellPower' : 'meleePower');
    const abil = this.ctx.sys.abilities as unknown as { spellPowerMultiplier?: () => number };
    return base * (isSpell ? abil.spellPowerMultiplier?.() ?? 1 : 1);
  }

  /** Dano base (sem crítico) para comportamentos. */
  baseDamage(mul: number): number {
    return this.def.damage * this.power() * upgradeMultiplier(this.upgradeLevel()) * mul;
  }

  private rollFor(mul: number, bonusCrit = 0): DamageRoll {
    const prog = this.ctx.sys.progression;
    const riposte = this.riposteT > 0;
    const crit = prog.getStat('critChance') + this.def.critBonus + bonusCrit + (riposte ? 1 : 0);
    return rollDamage(this.def.damage, this.power(), upgradeMultiplier(this.upgradeLevel()), mul * (riposte ? BLOCK.riposteDamageMul : 1), crit, prog.getStat('critMultiplier'), Math.random(), this.roll);
  }

  // =====================================================================
  // CombatApi (para comportamentos de armas)
  // =====================================================================
  aimDirection(origin: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const p = this.ctx.sys.player;
    const lt = p.lockTarget;
    if (lt && lt.alive && !lt.removed) {
      // alvo travado: mira no centro do corpo
      lt.getCenter(out).sub(origin);
      if (out.lengthSq() > 0.25) return out.normalize();
    }
    p.getAimPoint(STAFF_SHOT.range, this.v3);
    out.subVectors(this.v3, origin);
    if (out.lengthSq() < 0.25) {
      p.getAimRay(this.v2, out);
      return out.normalize();
    }
    return out.normalize();
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    const p = this.ctx.sys.player;
    p.getAimRay(this.v2, out);
    out.y = 0;
    if (out.lengthSq() < 1e-6) this.player.getForward(out);
    return out.normalize();
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    const p = this.ctx.sys.player;
    if (this.isShooter()) return p.getWeaponTipWorldPosition(out);
    if (p.isFlying()) return p.getHandWorldPosition('left', out);
    return p.getWeaponTipWorldPosition(out);
  }

  chainLightning(from: Entity, jumps: number, range: number, damage: number, exclude?: Set<number>): number {
    const hits = this.ctx.sys.combat.chainLightning(this.player, from, jumps, range, { amount: damage, type: 'lightning', poiseDamage: damage * 0.5, statuses: [{ id: 'shock', duration: 1.5, magnitude: 2 }], tag: 'chainLightning' }, exclude, 0x8fd0ff);
    return hits.length;
  }

  coneAttack(range: number, angleDeg: number, info: DamageInfo): Entity[] {
    const fwd = this.forward(this.v1);
    return this.ctx.sys.combat.meleeSweep(this.player, this.player.position, fwd, range, angleDeg, info, { verticalReach: 3, maxTargets: 12 });
  }

  private healFxT = 0;
  healPlayer(amount: number): number {
    if (!(amount > 0)) return 0;
    const healed = this.player.health?.heal(amount) ?? 0;
    if (healed > 0.5 && this.healFxT <= 0) {
      this.healFxT = 0.4;
      this.ctx.sys.vfx.burst('heal', this.player.position, { count: 8, scale: 0.8, color: this.def.behavior === 'vampiric' ? 0xff3050 : 0x5dff8a });
    }
    return healed;
  }

  schedule(delay: number, fn: () => void) {
    this.scheduled.push({ t: Math.max(0, delay), fn });
  }

  // =====================================================================
  // Loop
  // =====================================================================
  /** `locked`: uma habilidade está sendo conjurada (não inicia ataques). */
  update(dt: number, locked: boolean) {
    const ctx = this.ctx;
    const p = ctx.sys.player;
    const input = ctx.input;
    if (this.shotCd > 0) this.shotCd -= dt;
    if (this.parryCd > 0) this.parryCd -= dt;
    if (this.riposteT > 0) this.riposteT -= dt;
    if (this.healFxT > 0) this.healFxT -= dt;
    // agendados (quadros de impacto de comportamentos)
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const s = this.scheduled[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.scheduled.splice(i, 1);
        try {
          s.fn();
        } catch (err) {
          console.error('[PlayerCombat] efeito agendado', err);
        }
      }
    }
    this.weaponCheck -= dt;
    if (this.weaponCheck <= 0) {
      this.weaponCheck = 0.5;
      this.syncWeapon();
    }
    this.behavior?.update?.(this.runtime, dt);

    const alive = p.entity.alive && p.state !== 'dead';
    const canAct = alive && p.canAct() && input.gameplayEnabled && !gameplayMenuOpen(ctx);
    if (!canAct) {
      // esquiva/atordoamento/morte cancelam o golpe em andamento
      if (this.phase !== 'idle' && (!alive || p.state === 'dodge' || p.state === 'stagger')) this.cancelAction();
      if (this.blocking && (!alive || !input.down('block'))) this.setBlock(false);
      if (!input.down('attack')) this.attackHeld = false;
      return;
    }

    this.updateBlock(locked);

    // --- ataque ---
    if (input.pressed('attack') && !this.blocking) {
      this.attackHeld = true;
      this.holdT = 0;
      if (!locked) this.onAttackPressed();
    }
    if (this.attackHeld) {
      if (input.down('attack')) {
        this.holdT += dt;
        if (this.phase !== 'charge' && !locked && this.holdT >= HEAVY_ATTACK.holdThreshold && this.canStartCharge()) this.startCharge();
      } else {
        this.attackHeld = false;
        if (this.phase === 'charge') this.releaseCharge();
      }
    }

    if (this.phase === 'charge') this.updateCharge(dt);
    else if (this.phase !== 'idle') this.updateAction(dt);
    else {
      this.sinceEnd += dt;
      if (this.queued && this.shotCd <= 0 && !locked) {
        this.queued = false;
        this.startLight();
      }
    }
  }

  private isShooter(): boolean {
    return this.def.type === 'staff' || this.def.type === 'artifact';
  }

  private canStartCharge(): boolean {
    const p = this.ctx.sys.player;
    if (p.isFlying() && !this.isShooter()) return false;
    if (p.isSwimming() || p.isClimbing()) return false;
    if (this.phase === 'idle') return !p.isBusy();
    return (this.phase === 'swing' || this.phase === 'shot') && this.impactDone;
  }

  /** Inimigo hostil colado à frente (cajado golpeia em vez de disparar). */
  private enemyClose(): boolean {
    const fwd = this.forward(this.v1);
    const pos = this.player.position;
    const cos = Math.cos((STAFF_SHOT.meleeConeDeg * Math.PI) / 360);
    const list = this.ctx.entities.queryRadius(pos, STAFF_SHOT.meleeRange, this.list);
    const combat = this.ctx.sys.combat;
    for (const e of list) {
      if (e === this.player || !e.health || !e.alive || !combat.isHostile(this.player, e)) continue;
      const dx = e.position.x - pos.x;
      const dz = e.position.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d - e.radius > STAFF_SHOT.meleeRange) continue;
      if (Math.abs(e.position.y - pos.y) > 2) continue;
      if (d < 0.8 || (dx * fwd.x + dz * fwd.z) / d >= cos) return true;
    }
    return false;
  }

  private onAttackPressed() {
    if (this.phase === 'charge' || this.phase === 'heavy') return;
    if (this.phase === 'swing' || this.phase === 'shot') {
      this.queued = true;
      return;
    }
    if (this.ctx.sys.player.isBusy()) {
      this.queued = true;
      return;
    }
    if (this.phase === 'idle' && this.shotCd > 0 && this.wantsShot()) {
      this.queued = true;
      return;
    }
    this.startLight();
  }

  private wantsShot(): boolean {
    const p = this.ctx.sys.player;
    if (p.isFlying()) return true;
    if (p.isSwimming() || p.isClimbing()) return this.isShooter();
    return this.isShooter() && !this.enemyClose();
  }

  private startLight() {
    const p = this.ctx.sys.player;
    if (p.isClimbing()) return;
    if (this.wantsShot()) {
      if (this.shotCd > 0) {
        this.queued = true;
        return;
      }
      this.startShot(false, 0);
      return;
    }
    if (p.isFlying()) return;
    const combo = COMBOS[this.def.type];
    const chained = this.phase !== 'idle';
    const next = chained ? (this.comboStep + 1) % combo.steps.length : nextComboStep(this.comboStep, this.sinceEnd, combo.window, combo.steps.length);
    this.startSwing(next, false, 0);
  }

  private startSwing(stepIdx: number, heavy: boolean, charge: number) {
    const ctx = this.ctx;
    const p = ctx.sys.player;
    const combo = COMBOS[this.def.type];
    const step = heavy ? null : combo.steps[stepIdx];
    const actMul = this.player.health?.actionMultiplier() ?? 1;
    const speed = (heavy ? HEAVY_ATTACK.speed : step!.speed) * this.def.speed * actMul;
    const anim = heavy ? HEAVY_ATTACK.anim : step!.anim;
    this.dur = p.playAnimation(anim, { speed });
    this.impactAt = this.dur * (heavy ? HEAVY_ATTACK.impact : step!.impact);
    this.cancelAt = this.dur * (heavy ? 0.95 : combo.cancelAt);
    this.t = 0;
    this.impactDone = false;
    this.queued = false;
    this.step = step;
    this.heavyCharge = charge;
    this.phase = heavy ? 'heavy' : 'swing';
    this.comboStep = heavy ? -1 : stepIdx;
    this.alreadyHit.clear();
    p.lockMovement(this.impactAt + (heavy ? 0.2 : 0.05));
    // avanço do corpo (lunge)
    const lunge = heavy ? 0.9 : step!.lunge;
    if (lunge > 0 && p.state === 'ground') p.applyKnockback(this.forward(this.v1), lunge * 7);
    ctx.sys.audio.play(heavy ? 'swing_heavy' : 'swing', { position: this.player.position, pitch: 0.9 + Math.random() * 0.2 });
    ctx.events.emit('player:attack', { weaponId: this.def.id, heavy });
    this.stats.swings++;
    if (heavy) this.stats.heavies++;
  }

  private startShot(charged: boolean, charge: number) {
    const ctx = this.ctx;
    const p = ctx.sys.player;
    const actMul = this.player.health?.actionMultiplier() ?? 1;
    const anim = charged ? STAFF_SHOT.chargedAnim : STAFF_SHOT.anim;
    const speed = (charged ? STAFF_SHOT.chargedAnimSpeed : STAFF_SHOT.animSpeed) * this.def.speed * actMul;
    this.dur = p.playAnimation(anim, { speed });
    this.impactAt = this.dur * (charged ? STAFF_SHOT.chargedImpact : STAFF_SHOT.impact);
    this.cancelAt = this.impactAt + 0.05;
    this.t = 0;
    this.impactDone = false;
    this.queued = false;
    this.phase = 'shot';
    this.shotCharged = charged;
    this.heavyCharge = charge;
    this.shotCd = STAFF_SHOT.interval / Math.max(0.3, this.def.speed * actMul);
    if (charged) p.lockMovement(this.impactAt);
    ctx.events.emit('player:attack', { weaponId: this.def.id, heavy: charged });
  }

  private updateAction(dt: number) {
    this.t += dt;
    const emitting = (this.phase === 'swing' || this.phase === 'heavy') && this.t >= this.impactAt - 0.16 && this.t <= this.impactAt + 0.1;
    this.trail?.setEmitting(emitting);
    if (!this.impactDone && this.t >= this.impactAt) {
      this.impactDone = true;
      if (this.phase === 'shot') this.fireShot();
      else this.meleeImpact();
    }
    if (this.queued && this.impactDone && this.t >= this.cancelAt && this.phase !== 'heavy') {
      if (this.phase === 'swing' && !this.wantsShot()) {
        this.queued = false;
        this.startLight();
        return;
      }
      if (this.phase === 'shot' && this.shotCd <= 0) {
        this.queued = false;
        this.phase = 'idle';
        this.startLight();
        return;
      }
    }
    if (this.t >= this.dur) {
      this.phase = 'idle';
      this.sinceEnd = 0;
      this.trail?.setEmitting(false);
    }
  }

  private meleeImpact() {
    const ctx = this.ctx;
    const heavy = this.phase === 'heavy';
    const step = this.step;
    const H = HEAVY_ATTACK;
    const hitMul = heavy ? chargedValue(H.damageMulMin, H.damageMulMax, this.heavyCharge) : step!.damageMul;
    const r = this.rollFor(hitMul);
    const s = this.swing;
    s.step = heavy ? -1 : this.comboStep;
    s.finisher = heavy || !!step?.finisher;
    s.heavy = heavy;
    s.charge = this.heavyCharge;
    s.procDone = false;
    s.origin.copy(this.player.position);
    this.forward(s.forward);
    s.range = this.def.range * (heavy ? H.rangeMul : step!.rangeMul);
    s.info = {
      amount: r.amount,
      type: this.def.damageType,
      source: this.player,
      knockback: heavy ? H.knockback : step!.knockback,
      poiseDamage: this.def.poise * (heavy ? H.poiseMul : step!.poiseMul),
      crit: r.crit,
      tag: 'melee',
    };
    this.behavior?.onSwing?.(this.runtime, s);
    const arc = this.def.arc * (heavy ? H.arcMul : step!.arcMul);
    this.collect = [];
    const hits = ctx.sys.combat.meleeSweep(this.player, s.origin, s.forward, s.range, arc, s.info, {
      alreadyHit: this.alreadyHit,
      maxTargets: MELEE_GENERAL.maxTargets,
      verticalReach: MELEE_GENERAL.verticalReach,
      modify: this.behavior?.onBeforeHit ? this.beforeHit : undefined,
    });
    const results = this.collect;
    this.collect = null;
    let anyCrit = false;
    const prog = ctx.sys.progression;
    const lifeSteal = prog.getStat('lifeSteal');
    for (const h of results) {
      if (h.result.dealt <= 0 && !h.result.blocked) continue;
      this.stats.hits++;
      this.stats.lastDamage = h.result.dealt;
      if (h.info.crit) {
        anyCrit = true;
        this.stats.crits++;
      }
      if (lifeSteal > 0) this.healPlayer(h.result.dealt * lifeSteal);
      ctx.sys.player.restoreEnergy(MELEE_GENERAL.energyOnHit);
      const pt = h.info.point ?? h.target.getCenter(this.v2);
      const metal = h.target.faction === 'construct';
      ctx.sys.vfx.burst(metal ? 'metalSpark' : 'impact', pt, { color: DAMAGE_COLOR[h.info.type] ?? 0xfff0c0, scale: s.finisher ? 1.4 : 1, direction: this.v3.copy(s.forward).negate().setY(0.3) });
      if (h.result.blocked) ctx.sys.vfx.burst('blockSpark', pt, { scale: 0.8 });
      ctx.sys.audio.play(h.result.blocked ? 'block' : metal ? 'hit_metal' : 'hit_flesh', { position: pt });
      this.behavior?.onHit?.(this.runtime, h.target, h.info, h.result, s);
    }
    if (hits.length > 0) {
      if (this.riposteT > 0) {
        this.riposteT = 0;
        this.stats.ripostes++;
      }
      const stop = s.finisher ? HIT_STOP.finisher : anyCrit ? HIT_STOP.crit : HIT_STOP.light;
      ctx.sys.combat.hitStop(heavy ? HEAVY_ATTACK.hitStop : stop);
      if (s.finisher || anyCrit) this.shake(heavy ? 0.45 : 0.25, 0.25);
    }
    if (heavy) {
      ctx.sys.vfx.burst('dust', this.v1.copy(s.origin).addScaledVector(s.forward, 1.6), { scale: 0.8, count: 8 });
      this.shake(0.3, 0.25);
    }
    this.behavior?.onSwingEnd?.(this.runtime, s, hits);
  }

  private fireShot() {
    const ctx = this.ctx;
    const p = ctx.sys.player;
    const charged = this.shotCharged;
    const origin = this.muzzle(this.v1);
    const dir = this.aimDirection(origin, this.v2);
    const handShot = !this.isShooter();
    const mul = charged ? chargedValue(STAFF_SHOT.chargedDamageMulMin, STAFF_SHOT.chargedDamageMulMax, this.heavyCharge) : STAFF_SHOT.damageMul;
    let amount: number;
    let crit = false;
    if (handShot) {
      const prog = ctx.sys.progression;
      const abil = ctx.sys.abilities as unknown as { spellPowerMultiplier?: () => number };
      const r = rollDamage(STAFF_SHOT.handShotDamage, prog.getStat('spellPower') * (abil.spellPowerMultiplier?.() ?? 1), 1, mul, prog.getStat('critChance'), prog.getStat('critMultiplier'), Math.random(), this.roll);
      amount = r.amount;
      crit = r.crit;
    } else {
      const r = this.rollFor(mul);
      amount = r.amount;
      crit = r.crit;
    }
    this.stats.shots++;
    if (charged) this.stats.chargedShots++;
    let handled = false;
    if (!charged && !handShot && this.behavior?.onShoot) handled = this.behavior.onShoot(this.runtime, origin, dir, amount, crit);
    if (!handled) {
      ctx.sys.combat.spawnProjectile({
        kind: charged ? 'chargedBolt' : 'arcaneBolt',
        source: this.player,
        origin: origin.clone(),
        direction: dir.clone(),
        speed: charged ? STAFF_SHOT.speed * 0.85 : STAFF_SHOT.speed,
        range: STAFF_SHOT.range,
        radius: charged ? STAFF_SHOT.radius * 1.6 : STAFF_SHOT.radius,
        damage: { amount, type: handShot ? 'arcane' : this.def.damageType === 'physical' ? 'arcane' : this.def.damageType, crit, poiseDamage: amount * (charged ? 1.2 : 0.6), knockback: charged ? 6 : 1.5, tag: charged ? 'chargedShot' : 'staffShot' },
        explodeRadius: charged ? STAFF_SHOT.chargedExplodeRadius * (0.7 + 0.3 * this.heavyCharge) : 0,
        visualScale: handShot ? 0.75 : charged ? 0.8 + this.heavyCharge * 0.5 : 1,
        color: this.isShooter() ? this.def.model.glow : undefined,
      });
    }
    ctx.sys.vfx.burst('arcaneSpark', origin, { count: charged ? 14 : 5, color: this.isShooter() ? this.def.model.glow : 0x7fe8ff, direction: dir, scale: charged ? 1.4 : 0.8 });
    ctx.sys.audio.play(charged ? 'cast_lance' : 'cast_arcane', { position: origin, volume: charged ? 1 : 0.6, pitch: 1.1 + Math.random() * 0.15 });
    if (charged) this.shake(0.2, 0.2);
    void p;
  }

  // ---------------------------------------------------------------------
  // Carga (segurar LMB)
  // ---------------------------------------------------------------------
  private startCharge() {
    const p = this.ctx.sys.player;
    this.chargeKind = p.isFlying() || this.wantsShot() ? 'shot' : 'melee';
    this.phase = 'charge';
    this.charge = 0;
    this.chargeFullFx = false;
    this.queued = false;
    this.trail?.setEmitting(false);
    const total = HEAVY_ATTACK.maxCharge + 0.25;
    // 'thrust' lento: chega à pose de recuo (30% do clipe) com a carga completa; sem trava de
    // compromisso, então a esquiva continua cancelando a carga.
    if (this.chargeKind === 'melee') p.playAnimation('thrust', { speed: 0.15 / total });
    else p.playAnimation('castChannel', { speed: 1.2 / (total + 0.4) });
  }

  private updateCharge(dt: number) {
    const ctx = this.ctx;
    const p = ctx.sys.player;
    this.charge = chargeFraction(this.holdT, HEAVY_ATTACK.holdThreshold, HEAVY_ATTACK.maxCharge);
    if (!p.isFlying()) p.lockMovement(0.12);
    const tip = this.muzzle(this.v1);
    const col = this.def.model.glow;
    ctx.sys.vfx.sprite(tip, 0.25 + this.charge * 0.75, col, 0.6 + this.charge * 0.4);
    if (Math.random() < dt * (12 + this.charge * 30)) {
      // centelhas convergindo para a ponta
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 0.4;
      this.v2.set(tip.x + Math.cos(a) * r, tip.y + (Math.random() - 0.5) * r, tip.z + Math.sin(a) * r);
      ctx.sys.vfx.spark(this.v2, col, 0.09, 0.22, (tip.x - this.v2.x) * 4, (tip.y - this.v2.y) * 4, (tip.z - this.v2.z) * 4, 0, 0.03);
    }
    if (this.charge >= 1 && !this.chargeFullFx) {
      this.chargeFullFx = true;
      ctx.sys.vfx.burst('arcaneSpark', tip, { color: col, count: 14, scale: 1.3 });
      ctx.sys.vfx.flash(tip, col, 20, 0.25);
      ctx.sys.audio.play('ui_click', { position: tip, pitch: 1.6, volume: 0.5 });
    }
    // segurar demais: solta sozinho (3 s)
    if (this.holdT > HEAVY_ATTACK.holdThreshold + HEAVY_ATTACK.maxCharge + 2) this.releaseCharge();
  }

  private releaseCharge() {
    const p = this.ctx.sys.player;
    let charge = this.charge;
    this.phase = 'idle';
    this.attackHeld = false;
    if (!p.spendEnergy(HEAVY_ATTACK.energyCost)) charge *= 0.4;
    if (this.behavior?.onHeavyRelease?.(this.runtime, charge)) {
      this.stats.heavies++;
      this.shotCd = 0.5;
      this.sinceEnd = 0;
      return;
    }
    if (this.chargeKind === 'shot') this.startShot(true, charge);
    else this.startSwing(-1, true, charge);
  }

  // ---------------------------------------------------------------------
  // Bloqueio / parry
  // ---------------------------------------------------------------------
  private updateBlock(locked: boolean) {
    const p = this.ctx.sys.player;
    const input = this.ctx.input;
    const want = input.down('block') && !p.isFlying() && !p.isSwimming() && !p.isClimbing() && this.phase !== 'charge' && this.phase !== 'heavy' && !locked;
    if (want && !this.blocking) {
      // bloquear cancela golpes leves antes do impacto
      if ((this.phase === 'swing' || this.phase === 'shot') && !this.impactDone) this.cancelAction();
      if (this.phase === 'idle' || this.impactDone) {
        this.phase = 'idle';
        this.setBlock(true);
      }
    } else if (!want && this.blocking) this.setBlock(false);
  }

  private setBlock(on: boolean) {
    const p = this.ctx.sys.player;
    this.blocking = on;
    p.setBlocking(on);
    if (on) {
      const h = this.player.health!;
      if (this.parryCd <= 0) {
        h.parryWindow = BLOCK.parryWindow;
        this.parryCd = BLOCK.parryCooldown;
      }
      this.stats.blocks++;
    }
  }

  /** Reage a danos: coleta acertos do golpe atual, parry/bloqueio do jogador e abates. */
  private onDamageEvent(target: Entity, info: DamageInfo, result: DamageResult) {
    const player = this.player;
    if (this.collect && info.source === player && info.tag === 'melee') this.collect.push({ target, info, result });
    if (info.source === player && result.killed && target !== player) {
      this.stats.kills++;
      this.behavior?.onKill?.(this.runtime, target);
    }
    if (target !== player) return;
    const ctx = this.ctx;
    const pt = this.v3.copy(player.position).setY(player.position.y + 1.3).addScaledVector(player.getForward(this.v2), 0.5);
    if (result.parried) {
      this.stats.parries++;
      this.riposteT = BLOCK.riposteWindow;
      ctx.sys.player.restoreEnergy(BLOCK.parryEnergy);
      const abil = ctx.sys.abilities as unknown as { addUltimateCharge?: (n: number) => void };
      abil.addUltimateCharge?.(BLOCK.parryUltimateCharge);
      ctx.sys.vfx.burst('blockSpark', pt, { scale: 1.8, direction: player.getForward(this.v2) });
      ctx.sys.vfx.runeCircle(player.position, 1.2, 0xffe0a0, 0.5, 4);
      ctx.sys.audio.play('parry', { position: pt });
      ctx.sys.combat.hitStop(BLOCK.hitStop);
      this.shake(0.3, 0.2);
    } else if (result.blocked) {
      const prevented = Math.max(0, info.amount - result.dealt);
      ctx.sys.vfx.burst('blockSpark', pt, { scale: 1, direction: player.getForward(this.v2) });
      ctx.sys.audio.play('block', { position: pt });
      if (!ctx.sys.player.spendEnergy(prevented * BLOCK.energyPerDamage)) {
        // guarda quebrada
        ctx.sys.player.energy.current = 0;
        this.setBlock(false);
        player.health!.staggerTimer = Math.max(player.health!.staggerTimer, BLOCK.guardBreakStagger);
        this.stats.guardBreaks++;
        ctx.sys.vfx.burst('metalSpark', pt, { scale: 1.4 });
        this.shake(0.35, 0.3);
      }
    }
  }

  private shake(i: number, d: number) {
    (this.ctx.sys.camera as unknown as { shake?: (i: number, d: number) => void }).shake?.(i, d);
  }

  /** Cancela o golpe/carga atual (esquiva, atordoamento, troca de arma). */
  cancelAction() {
    this.phase = 'idle';
    this.queued = false;
    this.charge = 0;
    this.impactDone = true;
    this.trail?.setEmitting(false);
  }

  /**
   * Cópia do modelo procedural de uma arma (compartilha geometria/material) — para prévias
   * 3D no inventário/loja ou armas largadas no chão. null = id desconhecido.
   */
  previewWeapon(id: string): THREE.Object3D | null {
    const def = WEAPONS[id];
    if (!def) return null;
    const root = getWeaponModel(def).root.clone();
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.setScalar(1);
    root.visible = true;
    return root;
  }

  /** Está no meio de um ataque (para a IA/UI). */
  isAttacking(): boolean {
    return this.phase !== 'idle';
  }

  reset() {
    this.lastInventoryId = undefined;
    this.cancelAction();
    this.comboStep = -1;
    this.sinceEnd = 99;
    this.riposteT = 0;
    this.scheduled.length = 0;
    if (this.blocking) this.setBlock(false);
    for (const st of this.weaponStates.values()) for (const k of Object.keys(st)) delete st[k];
    this.behavior?.onEquip?.(this.runtime);
  }

  /** Diagnóstico. */
  debugInfo() {
    return { weapon: this.weaponId, phase: this.phase, combo: this.comboStep, charge: +this.charge.toFixed(2), blocking: this.blocking, riposte: this.riposteT > 0, state: { ...this.runtime.state }, stats: { ...this.stats } };
  }
}
