import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Action } from '../core/Input';
import {
  ABILITIES,
  ABILITY_IDS,
  MAX_RANK,
  STARTING_ABILITY,
  ULTIMATE,
  ULTIMATE_ID,
  abilityValue,
  isAbilityId,
  type AbilityDef,
  type AbilityId,
} from '../data/abilities';
import { addUltimateCharge, chargeFraction, effectiveCooldown } from './combatMath';
import { PlayerCombat, gameplayMenuOpen } from './PlayerCombat';
import { AbilityEffects } from './abilityEffects';

type FailReason = 'cooldown' | 'energy' | 'locked' | 'state';

interface Casting {
  id: AbilityId;
  def: AbilityDef;
  rank: number;
  t: number;
  impactAt: number;
  /** Lança de Energia: carregando enquanto a tecla está segurada. */
  channel: boolean;
  /** Tecla que iniciou a conjuração (null = chamada por código). */
  action: Action | null;
  charge: number;
}

const SLOT_ACTIONS: Action[] = ['ability1', 'ability2', 'ability3', 'ability4'];

/**
 * Sistema de habilidades do jogador (definições em data/abilities.ts):
 * teclas 1–4 e R, custos, recargas (progression.cooldownReduction), conjuração com quadro de
 * impacto sincronizado à animação, desbloqueio por nível (ouve 'level:up' e notifica),
 * ranks 1–3, Carga Arcana e Forma Ascendente, combinações entre magias.
 * Também atualiza o controle de combate do jogador (PlayerCombat: armas, combos, bloqueio).
 */
export class Abilities implements GameSystem, Saveable {
  readonly name = 'abilities';
  readonly saveKey = 'abilities';
  /** Habilidades equipadas nas teclas 1–4. */
  slots: (string | null)[] = [null, null, null, null];
  /** Habilidade da tecla R (Forma Ascendente quando desbloqueada). */
  ultimate: string | null = null;
  unlocked = new Set<string>();
  ranks = new Map<string, number>();
  protected cooldowns = new Map<string, number>();
  /** Recarga total da última conjuração (para a fração exibida na UI). */
  protected cooldownTotals = new Map<string, number>();
  /** Forma Ascendente ativa. */
  ascended = false;
  /** Tempo restante da Forma Ascendente (s). */
  ascendedTime = 0;
  ascendedDuration = 0;
  /** Carga Arcana (0..100) acumulada causando dano — necessária para a Forma Ascendente. */
  ultimateCharge = 0;
  protected ctx!: GameContext;
  /** Controle de armas/combos/bloqueio do jogador. */
  combat!: PlayerCombat;
  /** Efeitos e zonas das habilidades. */
  effects!: AbilityEffects;
  private casting: Casting | null = null;
  private lastChargeEmit = -1;
  private ascendBonus = 0;
  private tmp = new THREE.Vector3();
  /** Marcador de mira no chão (Tempestade/Fenda) enquanto a magia de área está sendo conjurada. */
  private zoneMarker: { cancel(): void } | null = null;
  /** Estatísticas (testes). */
  readonly stats = { casts: 0, fails: 0, unlocks: 0, zoneMarkers: 0, byId: {} as Record<string, number> };

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.combat = new PlayerCombat(ctx);
    this.effects = new AbilityEffects(ctx);
    ctx.events.on('level:up', (e) => this.syncUnlocks(e.level, true));
    ctx.events.on('damage', (e) => {
      const player = ctx.sys.player.entity;
      if (e.info.source === player && e.target !== player && e.result.dealt > 0 && !this.ascended) {
        this.setCharge(addUltimateCharge(this.ultimateCharge, e.result.dealt, ULTIMATE.perDamage, ULTIMATE.max));
      }
    });
    ctx.events.on('enemy:killed', (e) => {
      if (e.killer === ctx.sys.player.entity && !this.ascended) this.setCharge(Math.min(ULTIMATE.max, this.ultimateCharge + ULTIMATE.perKill));
    });
    this.resetToStart();
  }

  // =====================================================================
  // Loop
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    if (dt <= 0) return;
    const p = ctx.sys.player;
    // Recargas (mais rápidas na Forma Ascendente)
    const cdMul = this.ascended ? 1 / Math.max(0.1, abilityValue(ABILITIES.ascendantForm, 'cooldownMul', this.rank(ULTIMATE_ID))) : 1;
    for (const [id, t] of this.cooldowns) {
      const nt = t - dt * (id === ULTIMATE_ID ? 1 : cdMul);
      if (nt <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, nt);
    }
    // Forma Ascendente
    if (this.ascended) {
      this.ascendedTime -= dt;
      const def = ABILITIES.ascendantForm;
      const r = this.rank(ULTIMATE_ID);
      const h = p.health;
      if (h.alive) h.heal(h.max * abilityValue(def, 'regenPerSecond', r) * dt);
      p.restoreEnergy(abilityValue(def, 'energyRegen', r) * dt);
      if (this.ascendedTime <= 0 || !h.alive) this.endAscension();
    }
    if (ULTIMATE.passivePerSecond > 0 && !this.ascended) this.setCharge(Math.min(ULTIMATE.max, this.ultimateCharge + ULTIMATE.passivePerSecond * dt));

    this.effects.update(dt);
    const playing = ctx.state === 'playing';
    this.combat.update(dt, !!this.casting || !playing);
    if (!playing) {
      if (this.casting) this.cancelCast();
      return;
    }

    // Entrada: 1–4 e R
    const input = ctx.input;
    if (!gameplayMenuOpen(ctx)) {
      for (let i = 0; i < 4; i++) {
        if (input.pressed(SLOT_ACTIONS[i])) {
          const id = this.slots[i];
          if (id) this.tryCastWith(id, SLOT_ACTIONS[i]);
        }
      }
      if (input.pressed('ultimate')) {
        if (this.ultimate) this.tryCastWith(this.ultimate, 'ultimate');
        else this.fail(ULTIMATE_ID, 'locked');
      }
    }
    this.updateCasting(dt);
  }

  private updateCasting(dt: number) {
    const c = this.casting;
    if (!c) return;
    const p = this.ctx.sys.player;
    if (!p.entity.alive || p.state === 'dead' || p.state === 'stagger' || (p.state === 'dodge' && c.id !== 'blink')) {
      this.cancelCast();
      return;
    }
    c.t += dt;
    if (c.channel) {
      // Lança de Energia: carrega enquanto a tecla está segurada
      const def = c.def;
      const held = c.action ? this.ctx.input.down(c.action) : false;
      const chargeTime = abilityValue(def, 'chargeTime', c.rank);
      c.charge = chargeFraction(c.t, 0, chargeTime);
      const tip = p.getWeaponTipWorldPosition(this.tmp);
      this.ctx.sys.vfx.sprite(tip, 0.3 + c.charge * 0.9, def.color, 0.7 + c.charge * 0.3);
      if (Math.random() < dt * 25) this.ctx.sys.vfx.spark(tip, def.color, 0.1, 0.25, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      if (!p.isFlying()) p.lockMovement(0.1);
      const minT = abilityValue(def, 'minCharge', c.rank) * chargeTime;
      if ((!held && c.t >= Math.min(minT, def.castTime)) || c.t >= abilityValue(def, 'maxHold', c.rank)) {
        // custo extra proporcional à carga
        const extra = abilityValue(def, 'extraCostCharged', c.rank) * c.charge;
        if (extra > 0 && !p.spendEnergy(extra)) c.charge *= 0.5;
        p.playAnimation('cast', { speed: 1.6 });
        this.execute(c);
      }
      return;
    }
    if (c.t >= c.impactAt) this.execute(c);
  }

  private execute(c: Casting) {
    this.casting = null;
    this.zoneMarker = null; // o telegraph termina sozinho no instante do impacto
    // a Forma Ascendente começa antes do pulso (o dano dele não recarrega a Carga Arcana)
    if (c.id === ULTIMATE_ID) this.startAscension(c.rank);
    const pos = this.effects.execute({ id: c.id, rank: c.rank, charge: c.charge, power: this.spellPower() });
    this.ctx.sys.audio.play(c.def.sfx, { position: pos });
    this.ctx.events.emit('ability:cast', { abilityId: c.id, caster: this.ctx.sys.player.entity, position: pos });
    // magia em público alarma civis e guardas
    const ai = this.ctx.sys.ai as unknown as { alarm?: (p: THREE.Vector3, r: number, reason: 'magic') => void };
    ai.alarm?.(this.ctx.sys.player.entity.position, 25, 'magic');
  }

  private cancelCast() {
    const c = this.casting;
    if (!c) return;
    this.casting = null;
    this.zoneMarker?.cancel();
    this.zoneMarker = null;
    // interrompida: recarga curta em vez da completa
    const cd = this.cooldowns.get(c.id) ?? 0;
    if (cd > 1.5) {
      this.cooldowns.set(c.id, 1.5);
      this.cooldownTotals.set(c.id, 1.5);
    }
  }

  // =====================================================================
  // Conjuração
  // =====================================================================
  tryCast(abilityId: string): boolean {
    return this.tryCastWith(abilityId, null);
  }

  private tryCastWith(abilityId: string, action: Action | null): boolean {
    const ctx = this.ctx;
    if (!isAbilityId(abilityId)) return false;
    const def = ABILITIES[abilityId];
    const p = ctx.sys.player;
    if (!this.unlocked.has(abilityId)) return this.fail(abilityId, 'locked');
    if (this.cooldownRemaining(abilityId) > 0) return this.fail(abilityId, 'cooldown');
    if (this.casting) return this.fail(abilityId, 'state');
    if (!p.entity.alive || !p.canAct() || p.isClimbing()) return this.fail(abilityId, 'state');
    if (def.heavy && !p.canCastHeavy()) return this.fail(abilityId, 'state');
    if (!def.canFly && p.isFlying()) return this.fail(abilityId, 'state');
    if (p.isBusy() && !this.combat.isAttacking()) return this.fail(abilityId, 'state');
    const rank = this.rank(abilityId);
    if (abilityId === ULTIMATE_ID && this.ultimateCharge < ULTIMATE.max) {
      this.notifyOnce('Carga Arcana insuficiente.');
      return this.fail(abilityId, 'energy');
    }
    const pre = this.effects.precheck(abilityId, rank);
    if (pre) {
      this.notifyOnce(pre);
      return this.fail(abilityId, 'state');
    }
    const cost = abilityValue(def, 'cost', rank);
    if (!p.spendEnergy(cost)) return this.fail(abilityId, 'energy');
    if (abilityId === ULTIMATE_ID) this.setCharge(0);
    // recarga começa ao conjurar
    const cdr = ctx.sys.progression.getStat('cooldownReduction');
    const cdMul = this.ascended && abilityId !== ULTIMATE_ID ? abilityValue(ABILITIES.ascendantForm, 'cooldownMul', this.rank(ULTIMATE_ID)) : 1;
    const cd = effectiveCooldown(abilityValue(def, 'cooldown', rank), cdr, cdMul);
    this.cooldowns.set(abilityId, cd);
    this.cooldownTotals.set(abilityId, cd);
    // interrompe ataques
    this.combat.cancelAction();
    const actMul = p.health.actionMultiplier();
    const animSpeed = abilityValue(def, 'animSpeed', rank) || 1;
    const channel = abilityValue(def, 'chargeTime', rank) > 0;
    if (!channel && def.anim) p.playAnimation(def.anim, { speed: animSpeed * actMul });
    else if (channel) p.playAnimation('castChannel', { speed: 0.7 });
    const impactAt = def.castTime / Math.max(0.1, actMul);
    if (def.anim === 'castHeavy' && !p.isFlying()) p.lockMovement(impactAt + 0.15);
    this.casting = { id: abilityId, def, rank, t: 0, impactAt, channel, action, charge: 0 };
    // magias de área: marca no chão onde a zona vai surgir (mesma regra de mira dos efeitos)
    if (def.category === 'zona' && !channel && impactAt > 0) {
      this.zoneMarker?.cancel();
      const lt = p.lockTarget;
      const range = abilityValue(def, 'range', rank);
      const at = lt && lt.alive && !lt.removed && lt.position.distanceTo(p.entity.position) <= range + 2 ? this.tmp.copy(lt.position) : p.getAimPoint(range, this.tmp);
      this.zoneMarker = ctx.sys.vfx.telegraph({ type: 'circle', position: at, radius: abilityValue(def, 'radius', rank), duration: impactAt, color: def.color });
      this.stats.zoneMarkers++;
    }
    this.stats.casts++;
    this.stats.byId[abilityId] = (this.stats.byId[abilityId] ?? 0) + 1;
    if (impactAt <= 0 && !channel) this.execute(this.casting);
    return true;
  }

  private failNotifyT = 0;
  private notifyOnce(text: string) {
    const now = this.ctx.elapsed;
    if (now - this.failNotifyT < 1.5) return;
    this.failNotifyT = now;
    this.ctx.events.emit('ui:notify', { text, kind: 'warning' });
  }

  private fail(abilityId: string, reason: FailReason): false {
    this.stats.fails++;
    this.ctx.events.emit('ability:fail', { abilityId, reason });
    return false;
  }

  castSlot(i: number): boolean {
    const id = this.slots[i];
    return id ? this.tryCast(id) : false;
  }
  cooldownRemaining(id: string): number {
    return this.cooldowns.get(id) ?? 0;
  }
  /** 0 = pronta, 1 = acabou de usar. */
  cooldownFraction(id: string): number {
    const r = this.cooldowns.get(id);
    if (!r) return 0;
    const total = this.cooldownTotals.get(id) ?? r;
    return total > 0 ? Math.min(1, r / total) : 0;
  }
  isUnlocked(id: string) {
    return this.unlocked.has(id);
  }
  rank(id: string) {
    return this.ranks.get(id) ?? (this.unlocked.has(id) ? 1 : 0);
  }
  /** Desbloqueia (por nível, história ou talento), coloca num slot livre e notifica. */
  unlock(id: string) {
    this.unlockInternal(id, true);
  }
  /** Sobe o rank (máx. 3) de uma habilidade aprendida. */
  upgrade(id: string) {
    if (!isAbilityId(id) || !this.unlocked.has(id)) return;
    const r = Math.min(MAX_RANK, this.rank(id) + 1);
    if (r === this.rank(id)) return;
    this.ranks.set(id, r);
    this.ctx?.events.emit('ability:unlocked', { abilityId: id, rank: r });
    this.ctx?.events.emit('ui:notify', { text: `${ABILITIES[id].name} — rank ${r}: ${ABILITIES[id].rankNotes[r - 1]}`, kind: 'level' });
  }
  setSlot(i: number, id: string | null) {
    if (i < 0 || i > 3) return;
    if (id !== null && (!isAbilityId(id) || id === ULTIMATE_ID || !this.unlocked.has(id))) return;
    // mesma habilidade não fica em dois slots
    if (id) for (let k = 0; k < 4; k++) if (this.slots[k] === id) this.slots[k] = null;
    this.slots[i] = id;
  }

  // =====================================================================
  // Carga Arcana / Forma Ascendente
  // =====================================================================
  private setCharge(v: number) {
    this.ultimateCharge = Math.max(0, Math.min(ULTIMATE.max, v));
    const q = Math.floor(this.ultimateCharge);
    if (q !== this.lastChargeEmit) {
      this.lastChargeEmit = q;
      this.ctx.events.emit('ultimate:charge', { value: this.ultimateCharge, max: ULTIMATE.max });
    }
  }

  /** Soma Carga Arcana (parry, eventos de história...). */
  addUltimateCharge(n: number) {
    if (!this.ascended) this.setCharge(this.ultimateCharge + n);
  }

  private startAscension(rank: number) {
    const def = ABILITIES.ascendantForm;
    this.ascended = true;
    this.ascendedDuration = this.ascendedTime = abilityValue(def, 'duration', rank);
    this.ascendBonus = abilityValue(def, 'spellPowerBonus', rank);
    this.ctx.events.emit('ui:notify', { text: 'Forma Ascendente!', kind: 'level' });
  }

  private endAscension() {
    if (!this.ascended) return;
    this.ascended = false;
    this.ascendedTime = 0;
    this.ascendBonus = 0;
    const pos = this.ctx.sys.player.entity.position;
    this.ctx.sys.vfx.burst('arcaneSpark', this.tmp.copy(pos).setY(pos.y + 1), { color: 0xffc040, count: 20, scale: 1.5 });
  }

  /** Multiplicador de poder mágico vindo da Forma Ascendente (1 = normal). */
  spellPowerMultiplier(): number {
    return this.ascended ? 1 + this.ascendBonus : 1;
  }

  /** spellPower total usado pelas habilidades. */
  spellPower(): number {
    return this.ctx.sys.progression.getStat('spellPower') * this.spellPowerMultiplier();
  }

  /** Conjurando agora (id) ou null. */
  currentCast(): { id: string; progress: number; charge: number } | null {
    const c = this.casting;
    return c ? { id: c.id, progress: c.channel ? c.charge : Math.min(1, c.t / Math.max(0.01, c.impactAt)), charge: c.charge } : null;
  }

  // =====================================================================
  // Desbloqueio por nível
  // =====================================================================
  private unlockInternal(id: string, notify: boolean) {
    if (!isAbilityId(id) || this.unlocked.has(id)) return;
    this.unlocked.add(id);
    if (!this.ranks.has(id)) this.ranks.set(id, 1);
    if (id === ULTIMATE_ID) this.ultimate = id;
    else if (!this.slots.includes(id)) {
      const free = this.slots.indexOf(null);
      if (free >= 0) this.slots[free] = id;
    }
    this.stats.unlocks++;
    if (notify && this.ctx) {
      const def = ABILITIES[id];
      const key = id === ULTIMATE_ID ? 'R' : this.slots.includes(id) ? String(this.slots.indexOf(id) + 1) : null;
      this.ctx.events.emit('ability:unlocked', { abilityId: id, rank: 1 });
      this.ctx.events.emit('ui:notify', { text: `Nova habilidade: ${def.name}${key ? ` [${key}]` : ''}`, kind: 'level' });
    }
  }

  /** Desbloqueia todas as habilidades com nível ≤ `level`. */
  syncUnlocks(level: number, notify: boolean) {
    for (const id of ABILITY_IDS) if (ABILITIES[id].unlockLevel <= level) this.unlockInternal(id, notify);
  }

  private resetToStart() {
    this.unlocked.clear();
    this.ranks.clear();
    this.cooldowns.clear();
    this.cooldownTotals.clear();
    this.slots = [null, null, null, null];
    this.ultimate = null;
    this.ascended = false;
    this.ascendedTime = 0;
    this.ascendBonus = 0;
    this.casting = null;
    this.ultimateCharge = 0;
    this.lastChargeEmit = -1;
    this.unlockInternal(STARTING_ABILITY, false);
    const level = this.ctx?.sys.progression?.level ?? 1;
    this.syncUnlocks(level, false);
  }

  onNewGame() {
    this.resetToStart();
    this.effects?.clear();
    this.combat?.reset();
    this.setCharge(0);
  }

  serialize() {
    return {
      slots: this.slots,
      ultimate: this.ultimate,
      unlocked: [...this.unlocked],
      ranks: Object.fromEntries(this.ranks),
      ultimateCharge: Math.round(this.ultimateCharge * 10) / 10,
      // recargas em andamento (salvar/carregar não zera recargas)
      cooldowns: Object.fromEntries([...this.cooldowns].filter(([, v]) => v > 0.05).map(([k, v]) => [k, [Math.round(v * 100) / 100, Math.round((this.cooldownTotals.get(k) ?? v) * 100) / 100]])),
    };
  }

  deserialize(data: any) {
    if (data !== undefined && (typeof data !== 'object' || data === null)) throw new Error('dados de habilidades inválidos');
    const unlocked = Array.isArray(data?.unlocked) ? data.unlocked.filter(isAbilityId) : [];
    this.unlocked = new Set(unlocked);
    this.ranks = new Map(
      Object.entries(data?.ranks ?? {})
        .filter(([k, v]) => isAbilityId(k) && typeof v === 'number' && isFinite(v))
        .map(([k, v]) => [k, Math.max(1, Math.min(MAX_RANK, Math.floor(v as number)))] as [string, number]),
    );
    if (Array.isArray(data?.slots)) this.slots = [0, 1, 2, 3].map((i) => (typeof data.slots[i] === 'string' && isAbilityId(data.slots[i]) && data.slots[i] !== ULTIMATE_ID ? data.slots[i] : null));
    this.ultimate = data?.ultimate === ULTIMATE_ID ? ULTIMATE_ID : null;
    const ch = Number(data?.ultimateCharge);
    this.ultimateCharge = isFinite(ch) ? Math.max(0, Math.min(ULTIMATE.max, ch)) : 0;
    this.cooldowns.clear();
    this.cooldownTotals.clear();
    const cds = data?.cooldowns;
    if (cds && typeof cds === 'object') {
      for (const [k, v] of Object.entries(cds as Record<string, unknown>)) {
        if (!isAbilityId(k) || !Array.isArray(v)) continue;
        const rem = Number(v[0]);
        const tot = Number(v[1]);
        if (!isFinite(rem) || rem <= 0 || rem > 600) continue;
        this.cooldowns.set(k, rem);
        this.cooldownTotals.set(k, isFinite(tot) && tot >= rem ? tot : rem);
      }
    }
    this.casting = null;
    this.zoneMarker?.cancel();
    this.zoneMarker = null;
    this.ascended = false;
    this.ascendedTime = 0;
    this.ascendBonus = 0;
    this.effects?.clear();
    this.combat?.reset();
    // garante o inicial e o que o nível atual já permite (progressão é carregada antes)
    this.unlockInternal(STARTING_ABILITY, false);
    if (this.ctx) this.syncUnlocks(this.ctx.sys.progression.level, false);
    if (this.unlocked.has(ULTIMATE_ID)) this.ultimate = ULTIMATE_ID;
    this.lastChargeEmit = -1;
    if (this.ctx) this.setCharge(this.ultimateCharge);
  }

  /** Diagnóstico (testes). */
  debugInfo() {
    return {
      slots: [...this.slots],
      ultimate: this.ultimate,
      unlocked: [...this.unlocked],
      ranks: Object.fromEntries(this.ranks),
      cooldowns: Object.fromEntries([...this.cooldowns].map(([k, v]) => [k, +v.toFixed(2)])),
      ascended: this.ascended,
      ascendedTime: +this.ascendedTime.toFixed(2),
      ultimateCharge: +this.ultimateCharge.toFixed(1),
      casting: this.currentCast(),
      zones: this.effects.activeZones(),
      effects: { ...this.effects.stats },
      combat: this.combat.debugInfo(),
      stats: { ...this.stats, byId: { ...this.stats.byId } },
    };
  }
}
