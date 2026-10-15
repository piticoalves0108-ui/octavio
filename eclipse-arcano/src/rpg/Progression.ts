import type { GameContext, GameSystem, Saveable } from '../core/context';

export type StatId =
  | 'maxHealth'
  | 'maxEnergy'
  | 'energyRegen'
  | 'healthRegen'
  | 'spellPower' // multiplicador de dano mágico (1 = base)
  | 'meleePower' // multiplicador de dano físico (1 = base)
  | 'critChance' // 0..1
  | 'critMultiplier'
  | 'cooldownReduction' // 0..0.5
  | 'damageReduction' // 0..0.6
  | 'moveSpeed' // multiplicador
  | 'flightSpeed' // multiplicador
  | 'flightCost' // multiplicador do custo de energia do voo
  | 'dodgeCost'
  | 'shieldPower' // multiplicador do Escudo Mágico
  | 'lifeSteal'; // fração do dano corpo a corpo convertida em vida

/**
 * STUB — nível, experiência, pontos de talento e atributos agregados
 * (base + nível + talentos + equipamentos). Talentos em data/talents.ts.
 */
export class Progression implements GameSystem, Saveable {
  readonly name = 'progression';
  readonly saveKey = 'progression';
  level = 1;
  xp = 0;
  skillPoints = 0;
  talentRanks = new Map<string, number>();
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  xpToNext(): number {
    return Math.round(100 * Math.pow(this.level, 1.5));
  }
  addXp(amount: number, reason: string) {
    this.xp += amount;
    this.ctx.events.emit('xp:gained', { amount, reason });
  }
  getStat(stat: StatId): number {
    const base: Record<StatId, number> = {
      maxHealth: 100,
      maxEnergy: 100,
      energyRegen: 8,
      healthRegen: 0.5,
      spellPower: 1,
      meleePower: 1,
      critChance: 0.05,
      critMultiplier: 1.5,
      cooldownReduction: 0,
      damageReduction: 0,
      moveSpeed: 1,
      flightSpeed: 1,
      flightCost: 1,
      dodgeCost: 1,
      shieldPower: 1,
      lifeSteal: 0,
    };
    return base[stat];
  }
  canUnlockTalent(_id: string): boolean {
    return false;
  }
  unlockTalent(_id: string): boolean {
    return false;
  }
  talentRank(id: string) {
    return this.talentRanks.get(id) ?? 0;
  }

  onNewGame() {
    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.talentRanks.clear();
  }
  serialize() {
    return { level: this.level, xp: this.xp, skillPoints: this.skillPoints, talents: Object.fromEntries(this.talentRanks) };
  }
  deserialize(data: any) {
    this.level = Math.max(1, Math.floor(data?.level ?? 1));
    this.xp = Math.max(0, data?.xp ?? 0);
    this.skillPoints = Math.max(0, Math.floor(data?.skillPoints ?? 0));
    this.talentRanks = new Map(Object.entries(data?.talents ?? {}).filter(([, v]) => typeof v === 'number') as [string, number][]);
  }
}
