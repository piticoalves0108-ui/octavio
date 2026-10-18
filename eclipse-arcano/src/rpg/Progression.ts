import type { GameContext, GameSystem, Saveable } from '../core/context';
import {
  BASE_STATS,
  DISCOVERY_XP,
  LEVELING,
  PER_LEVEL_STATS,
  RESPEC,
  STAT_IDS,
  STAT_LIMITS,
  applyXp,
  respecCost,
  talentPointsForLevel,
  xpToNextLevel,
  type StatId,
  type StatMods,
} from '../data/progression';
import {
  TALENTS,
  TALENT_BY_ID,
  TALENT_BLOCK_TEXT,
  branchPoints,
  checkTalent,
  isTalentId,
  sanitizeTalentRanks,
  spentPoints,
  talentMods,
  type TalentBlockReason,
  type TalentBranchId,
} from '../data/talents';
import { ABILITIES, MAX_RANK, isAbilityId } from '../data/abilities';
import { ITEMS } from '../data/items';
import { LOCATION_BY_ID } from '../data/world';
import { PLACES } from '../data/places';

export type { StatId, StatMods } from '../data/progression';

/** Efeito temporário de atributos (elixires, bênçãos). */
export interface ActiveBuff {
  id: string;
  name: string;
  /** Segundos restantes. */
  remaining: number;
  duration: number;
  mods: StatMods;
}

/** Decomposição de um atributo (ficha do personagem na UI). */
export interface StatBreakdown {
  base: number;
  level: number;
  talents: number;
  equipment: number;
  buffs: number;
  other: number;
  total: number;
}

/** Concessões de habilidades feitas por talentos (para desfazer na redistribuição). */
interface AbilityGrant {
  /** O talento desbloqueou a habilidade antes do nível normal. */
  unlocked: boolean;
  /** Ranks extras concedidos. */
  upgrades: number;
}

/**
 * Nível, experiência, pontos de talento, árvore de talentos e atributos agregados
 * (base + nível + talentos + equipamentos + efeitos temporários + bônus de história).
 * `getStat` é barato (cache invalidado quando algo muda) — usado pelo jogador e pelo combate.
 */
export class Progression implements GameSystem, Saveable {
  readonly name = 'progression';
  readonly saveKey = 'progression';
  level = 1;
  /** XP acumulado dentro do nível atual (0..xpToNext()). */
  xp = 0;
  /** Pontos de talento livres. */
  skillPoints = 0;
  talentRanks = new Map<string, number>();
  /** Efeitos temporários ativos (UI lista com tempo restante). */
  buffs: ActiveBuff[] = [];
  /** Bônus permanentes vindos da história (ex.: absorver o núcleo do Guardião). */
  externalMods = new Map<string, StatMods>();
  /** XP total ganho na partida (estatística). */
  totalXp = 0;
  protected ctx!: GameContext;
  private grants = new Map<string, AbilityGrant>();
  private cache = {} as Record<StatId, number>;
  private dirty = true;
  /** Acumuladores reutilizados (sem alocação por recálculo além do necessário). */
  private accTalents: Record<string, number> = {};
  private accEquip: Record<string, number> = {};
  private accBuffs: Record<string, number> = {};
  private accOther: Record<string, number> = {};
  /** Estatísticas (testes). */
  readonly stats = { levelUps: 0, xpEvents: 0, recomputes: 0, respecs: 0 };

  init(ctx: GameContext) {
    this.ctx = ctx;
    ctx.events.on('equip:changed', () => this.invalidate());
    ctx.events.on('location:discovered', (e) => {
      const loc = LOCATION_BY_ID[e.locationId];
      const xp = loc ? DISCOVERY_XP[loc.kind] ?? 0 : 0;
      if (xp > 0) this.addXp(xp, `descoberta:${e.locationId}`);
    });
  }

  // =====================================================================
  // Experiência e nível
  // =====================================================================
  xpToNext(): number {
    return xpToNextLevel(this.level);
  }

  /** Fração da barra de XP (0..1). */
  xpFraction(): number {
    const need = this.xpToNext();
    return need > 0 ? Math.min(1, this.xp / need) : 1;
  }

  isMaxLevel() {
    return this.level >= LEVELING.maxLevel;
  }

  /** Concede XP (inimigos, missões, descobertas). Sobe de nível quantas vezes couber. */
  addXp(amount: number, reason: string) {
    if (!(amount > 0) || !isFinite(amount)) return;
    const amt = Math.round(amount);
    const before = this.level;
    const r = applyXp(this.level, this.xp, amt);
    this.level = r.level;
    this.xp = r.xp;
    this.totalXp += amt;
    this.stats.xpEvents++;
    this.ctx?.events.emit('xp:gained', { amount: amt, reason });
    for (let l = before + 1; l <= r.level; l++) this.onLevelReached(l);
  }

  private onLevelReached(level: number) {
    const pts = talentPointsForLevel(level);
    this.skillPoints += pts;
    this.stats.levelUps++;
    this.invalidate();
    const ctx = this.ctx;
    if (!ctx) return;
    // O jogador (refreshStats) e as habilidades (syncUnlocks) ouvem 'level:up'.
    ctx.events.emit('level:up', { level });
    const player = ctx.sys.player;
    if (player) {
      player.refreshStats?.();
      if (LEVELING.fullHealOnLevelUp && player.health?.alive) {
        player.health.current = player.health.max;
        player.energy.current = player.energy.max;
      }
      ctx.sys.vfx?.burst('levelUp', player.position);
    }
    ctx.events.emit('ui:notify', { text: `Nível ${level}! +${pts} ponto${pts > 1 ? 's' : ''} de talento`, kind: 'level' });
  }

  /** Pontos de talento extras (recompensas de história/missão). */
  addSkillPoints(n: number, reason = 'história') {
    const k = Math.floor(n);
    if (!(k > 0)) return;
    this.skillPoints += k;
    this.ctx?.events.emit('ui:notify', { text: `+${k} ponto${k > 1 ? 's' : ''} de talento (${reason})`, kind: 'level' });
  }

  // =====================================================================
  // Atributos
  // =====================================================================
  /** Marca o cache de atributos como sujo (equipamento/talento/efeito mudou). */
  invalidate() {
    this.dirty = true;
  }

  getStat(stat: StatId): number {
    if (this.dirty) this.recompute();
    const v = this.cache[stat];
    return v === undefined ? BASE_STATS[stat] ?? 0 : v;
  }

  /** Todos os atributos (cópia) — ficha do personagem. */
  allStats(): Record<StatId, number> {
    if (this.dirty) this.recompute();
    return { ...this.cache };
  }

  statBreakdown(stat: StatId): StatBreakdown {
    if (this.dirty) this.recompute();
    const base = BASE_STATS[stat];
    const level = (PER_LEVEL_STATS[stat] ?? 0) * (this.level - 1);
    const talents = this.accTalents[stat] ?? 0;
    const equipment = this.accEquip[stat] ?? 0;
    const buffs = this.accBuffs[stat] ?? 0;
    const other = this.accOther[stat] ?? 0;
    return { base, level, talents, equipment, buffs, other, total: this.cache[stat] };
  }

  private recompute() {
    this.dirty = false;
    this.stats.recomputes++;
    clearRec(this.accTalents);
    clearRec(this.accEquip);
    clearRec(this.accBuffs);
    clearRec(this.accOther);
    talentMods(this.talentRanks, this.accTalents);
    // equipamentos (lidos do inventário)
    const inv = this.ctx?.sys?.inventory;
    if (inv?.equipped) {
      for (const slot of ['weapon', 'amulet', 'armor'] as const) {
        const uid = inv.equipped[slot];
        if (!uid) continue;
        const st = inv.get(uid);
        const def = st ? ITEMS[st.defId] : undefined;
        if (def?.stats) addMods(this.accEquip, def.stats);
      }
    }
    for (const b of this.buffs) addMods(this.accBuffs, b.mods);
    for (const m of this.externalMods.values()) addMods(this.accOther, m);
    const lv = this.level - 1;
    for (const id of STAT_IDS) {
      const v = BASE_STATS[id] + (PER_LEVEL_STATS[id] ?? 0) * lv + (this.accTalents[id] ?? 0) + (this.accEquip[id] ?? 0) + (this.accBuffs[id] ?? 0) + (this.accOther[id] ?? 0);
      const [lo, hi] = STAT_LIMITS[id];
      this.cache[id] = Math.max(lo, Math.min(hi, v));
    }
  }

  /** Aplica (ou remove, com null) um bônus permanente nomeado — escolhas de história etc. */
  setExternalMod(sourceId: string, mods: StatMods | null) {
    if (mods) this.externalMods.set(sourceId, { ...mods });
    else this.externalMods.delete(sourceId);
    this.invalidate();
    this.ctx?.sys.player?.refreshStats?.();
  }

  // =====================================================================
  // Efeitos temporários
  // =====================================================================
  addBuff(id: string, name: string, duration: number, mods: StatMods) {
    const existing = this.buffs.find((b) => b.id === id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
      existing.mods = { ...mods };
    } else {
      this.buffs.push({ id, name, remaining: duration, duration, mods: { ...mods } });
    }
    this.invalidate();
    this.ctx?.sys.player?.refreshStats?.();
  }

  removeBuff(id: string) {
    const i = this.buffs.findIndex((b) => b.id === id);
    if (i < 0) return;
    this.buffs.splice(i, 1);
    this.invalidate();
    this.ctx?.sys.player?.refreshStats?.();
  }

  hasBuff(id: string) {
    return this.buffs.some((b) => b.id === id);
  }

  update(dt: number) {
    if (this.buffs.length === 0) return;
    let expired = false;
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.remaining -= dt;
      if (b.remaining <= 0) {
        this.buffs.splice(i, 1);
        expired = true;
        this.ctx?.events.emit('ui:notify', { text: `${b.name} terminou.`, kind: 'info' });
      }
    }
    if (expired) {
      this.invalidate();
      this.ctx?.sys.player?.refreshStats?.();
    }
  }

  // =====================================================================
  // Talentos
  // =====================================================================
  talentRank(id: string) {
    return this.talentRanks.get(id) ?? 0;
  }

  /** Motivo pelo qual o talento não pode subir (null = pode). */
  talentBlockReason(id: string): TalentBlockReason | null {
    return checkTalent(id, this.talentRanks, this.skillPoints, this.level);
  }

  /** Texto do bloqueio para a UI (null = disponível). */
  talentBlockText(id: string): string | null {
    const r = this.talentBlockReason(id);
    return r ? TALENT_BLOCK_TEXT[r] : null;
  }

  canUnlockTalent(id: string): boolean {
    return this.talentBlockReason(id) === null;
  }

  /** Compra 1 rank do talento. Aplica atributos e melhorias de habilidade. */
  unlockTalent(id: string): boolean {
    if (!this.canUnlockTalent(id)) return false;
    const t = TALENT_BY_ID[id];
    const rank = this.talentRank(id) + 1;
    this.talentRanks.set(id, rank);
    this.skillPoints--;
    if (t.ability) this.grantAbility(t.ability);
    this.invalidate();
    this.ctx?.events.emit('talent:unlocked', { talentId: id, rank });
    this.ctx?.events.emit('ui:notify', { text: `${t.name}${t.maxRank > 1 ? ` (${rank}/${t.maxRank})` : ''}`, kind: 'level' });
    this.ctx?.sys.player?.refreshStats?.();
    return true;
  }

  private grantAbility(abilityId: string) {
    const ab = this.ctx?.sys?.abilities;
    if (!ab || !isAbilityId(abilityId)) return;
    const g = this.grants.get(abilityId) ?? { unlocked: false, upgrades: 0 };
    if (!ab.isUnlocked(abilityId)) {
      ab.unlock(abilityId);
      g.unlocked = true;
    } else if (ab.rank(abilityId) < MAX_RANK) {
      ab.upgrade(abilityId);
      g.upgrades++;
    }
    this.grants.set(abilityId, g);
  }

  spentTalentPoints(): number {
    return spentPoints(this.talentRanks);
  }

  branchPoints(branch: TalentBranchId): number {
    return branchPoints(this.talentRanks, branch);
  }

  // =====================================================================
  // Redistribuição (santuário)
  // =====================================================================
  respecCost(): number {
    return respecCost(this.level);
  }

  /** O jogador está no santuário (perto da âncora de redistribuição)? */
  nearShrine(): boolean {
    const a = PLACES[RESPEC.shrineAnchor];
    const p = this.ctx?.sys?.player?.position;
    if (!a || !p) return false;
    return Math.hypot(p.x - a.x, p.z - a.z) <= RESPEC.shrineRange;
  }

  /** Pode redistribuir agora (tem talentos e ouro)? `anywhere` ignora a exigência do santuário. */
  canRespec(anywhere = false): boolean {
    if (this.spentTalentPoints() <= 0) return false;
    if (!anywhere && !this.nearShrine()) return false;
    const inv = this.ctx?.sys?.inventory;
    return !!inv && inv.gold >= this.respecCost();
  }

  /**
   * Devolve todos os pontos gastos em troca de ouro. Desfaz as melhorias de habilidade
   * dadas pelos talentos. Por padrão exige estar no santuário (`anywhere` para scripts/testes).
   */
  respec(anywhere = false): boolean {
    const ctx = this.ctx;
    const spent = this.spentTalentPoints();
    if (spent <= 0) return false;
    if (!anywhere && !this.nearShrine()) {
      ctx?.events.emit('ui:notify', { text: 'A redistribuição só pode ser feita no Santuário da Aurora.', kind: 'warning' });
      return false;
    }
    const cost = this.respecCost();
    if (!ctx?.sys.inventory.spendGold(cost)) {
      ctx?.events.emit('ui:notify', { text: `Ouro insuficiente (${cost}).`, kind: 'warning' });
      return false;
    }
    this.revokeAbilityGrants();
    this.talentRanks.clear();
    this.skillPoints += spent;
    this.stats.respecs++;
    this.invalidate();
    ctx.events.emit('talent:respec', { refunded: spent, cost });
    ctx.events.emit('ui:notify', { text: `Talentos redistribuídos: ${spent} ponto${spent > 1 ? 's' : ''} devolvido${spent > 1 ? 's' : ''}.`, kind: 'level' });
    ctx.sys.player?.refreshStats?.();
    return true;
  }

  private revokeAbilityGrants() {
    const ab = this.ctx?.sys?.abilities;
    if (ab) {
      for (const [id, g] of this.grants) {
        if (!isAbilityId(id)) continue;
        const r = ab.ranks.get(id);
        if (r !== undefined && g.upgrades > 0) ab.ranks.set(id, Math.max(1, r - g.upgrades));
        if (g.unlocked && ABILITIES[id].unlockLevel > this.level) {
          ab.unlocked.delete(id);
          ab.ranks.delete(id);
          for (let i = 0; i < ab.slots.length; i++) if (ab.slots[i] === id) ab.slots[i] = null;
          if (ab.ultimate === id) ab.ultimate = null;
        }
      }
    }
    this.grants.clear();
  }

  // =====================================================================
  // Ciclo de vida / save
  // =====================================================================
  onNewGame() {
    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.totalXp = 0;
    this.talentRanks.clear();
    this.grants.clear();
    this.buffs = [];
    this.externalMods.clear();
    this.invalidate();
  }

  serialize() {
    return {
      level: this.level,
      xp: this.xp,
      skillPoints: this.skillPoints,
      totalXp: this.totalXp,
      talents: Object.fromEntries(this.talentRanks),
      grants: Object.fromEntries(this.grants),
      buffs: this.buffs.map((b) => ({ id: b.id, name: b.name, remaining: Math.round(b.remaining * 10) / 10, duration: b.duration, mods: b.mods })),
      external: Object.fromEntries(this.externalMods),
    };
  }

  deserialize(data: any) {
    if (data === null || typeof data !== 'object') throw new Error('dados de progressão inválidos');
    const lv = Number(data.level);
    this.level = isFinite(lv) ? Math.max(1, Math.min(LEVELING.maxLevel, Math.floor(lv))) : 1;
    const xp = Number(data.xp);
    this.xp = isFinite(xp) ? Math.max(0, Math.min(Math.max(0, this.xpToNext() - 1), xp)) : 0;
    const sp = Number(data.skillPoints);
    this.skillPoints = isFinite(sp) ? Math.max(0, Math.min(200, Math.floor(sp))) : 0;
    const tx = Number(data.totalXp);
    this.totalXp = isFinite(tx) ? Math.max(0, tx) : 0;
    this.talentRanks = sanitizeTalentRanks(data.talents && typeof data.talents === 'object' ? data.talents : {});
    this.grants.clear();
    if (data.grants && typeof data.grants === 'object') {
      for (const [k, v] of Object.entries(data.grants as Record<string, any>)) {
        if (!isAbilityId(k) || !v || typeof v !== 'object') continue;
        this.grants.set(k, { unlocked: !!v.unlocked, upgrades: Math.max(0, Math.min(MAX_RANK, Math.floor(Number(v.upgrades) || 0))) });
      }
    }
    this.buffs = [];
    if (Array.isArray(data.buffs)) {
      for (const b of data.buffs.slice(0, 16)) {
        if (!b || typeof b.id !== 'string' || !(Number(b.remaining) > 0)) continue;
        this.buffs.push({ id: b.id, name: String(b.name ?? b.id), remaining: Math.min(3600, Number(b.remaining)), duration: Math.max(1, Number(b.duration) || 1), mods: cleanMods(b.mods) });
      }
    }
    this.externalMods.clear();
    if (data.external && typeof data.external === 'object') {
      for (const [k, v] of Object.entries(data.external)) this.externalMods.set(k, cleanMods(v));
    }
    this.invalidate();
  }

  /** Diagnóstico (testes). */
  debugInfo() {
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext(),
      skillPoints: this.skillPoints,
      spent: this.spentTalentPoints(),
      talents: Object.fromEntries(this.talentRanks),
      buffs: this.buffs.map((b) => b.id),
      stats: this.allStats(),
    };
  }
}

/** Lista de talentos (atalho para a UI). */
export { TALENTS, TALENT_BY_ID, isTalentId };

function clearRec(r: Record<string, number>) {
  for (const k in r) r[k] = 0;
}

function addMods(acc: Record<string, number>, mods: StatMods) {
  for (const k in mods) {
    const v = (mods as Record<string, number>)[k];
    if (typeof v === 'number' && isFinite(v)) acc[k] = (acc[k] ?? 0) + v;
  }
}

function cleanMods(raw: unknown): StatMods {
  const out: StatMods = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of STAT_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === 'number' && isFinite(v)) out[id] = Math.max(-10, Math.min(10000, v));
  }
  return out;
}
