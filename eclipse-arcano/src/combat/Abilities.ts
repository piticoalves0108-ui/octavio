import type { GameContext, GameSystem, Saveable } from '../core/context';

/**
 * STUB — sistema de habilidades do jogador (definições em data/abilities.ts).
 * O módulo combat/ substitui a implementação mantendo a API pública.
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
  /** Forma Ascendente ativa. */
  ascended = false;
  /** Carga Arcana (0..100) acumulada causando dano — necessária para a Forma Ascendente. */
  ultimateCharge = 0;
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  tryCast(_abilityId: string): boolean {
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
  cooldownFraction(_id: string): number {
    return 0;
  }
  isUnlocked(id: string) {
    return this.unlocked.has(id);
  }
  rank(id: string) {
    return this.ranks.get(id) ?? (this.unlocked.has(id) ? 1 : 0);
  }
  unlock(id: string) {
    this.unlocked.add(id);
  }
  upgrade(id: string) {
    this.ranks.set(id, this.rank(id) + 1);
  }
  setSlot(i: number, id: string | null) {
    this.slots[i] = id;
  }

  onNewGame() {
    this.unlocked.clear();
    this.ranks.clear();
    this.cooldowns.clear();
    this.slots = [null, null, null, null];
    this.ultimate = null;
    this.ascended = false;
  }
  serialize() {
    return { slots: this.slots, ultimate: this.ultimate, unlocked: [...this.unlocked], ranks: Object.fromEntries(this.ranks) };
  }
  deserialize(data: any) {
    this.unlocked = new Set(Array.isArray(data?.unlocked) ? data.unlocked : []);
    this.ranks = new Map(Object.entries(data?.ranks ?? {}).filter(([, v]) => typeof v === 'number') as [string, number][]);
    if (Array.isArray(data?.slots)) this.slots = [0, 1, 2, 3].map((i) => (typeof data.slots[i] === 'string' ? data.slots[i] : null));
    this.ultimate = typeof data?.ultimate === 'string' ? data.ultimate : null;
  }
}
