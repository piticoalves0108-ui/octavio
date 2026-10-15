import type { GameContext, GameSystem, Saveable } from '../core/context';

export interface ItemStack {
  /** Id único da instância (para armas e itens não empilháveis). */
  uid: string;
  defId: string;
  qty: number;
  /** Nível de aprimoramento (ferreiro). */
  upgrade: number;
}

export type EquipSlot = 'weapon' | 'amulet' | 'armor';

/**
 * STUB — inventário, equipamentos, ouro, baú (armazenamento) e itens únicos coletados.
 * Definições de itens em data/items.ts e data/weapons.ts.
 */
export class Inventory implements GameSystem, Saveable {
  readonly name = 'inventory';
  readonly saveKey = 'inventory';
  items: ItemStack[] = [];
  stash: ItemStack[] = [];
  gold = 0;
  capacity = 40;
  equipped: Record<EquipSlot, string | null> = { weapon: null, amulet: null, armor: null };
  /** Ids de itens únicos do mundo já coletados (baús, relíquias) — não reaparecem. */
  collectedUniques = new Set<string>();
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  add(_defId: string, _qty = 1, _opts?: { silent?: boolean; uniqueId?: string }): boolean {
    return false;
  }
  remove(_defIdOrUid: string, _qty = 1): boolean {
    return false;
  }
  count(defId: string): number {
    return this.items.filter((i) => i.defId === defId).reduce((s, i) => s + i.qty, 0);
  }
  has(defId: string, qty = 1) {
    return this.count(defId) >= qty;
  }
  get(uid: string) {
    return this.items.find((i) => i.uid === uid);
  }
  equip(_uid: string): boolean {
    return false;
  }
  unequip(_slot: EquipSlot) {}
  use(_uid: string): boolean {
    return false;
  }
  discard(_uid: string): boolean {
    return false;
  }
  /** Usa a melhor poção de vida disponível (tecla H). */
  quickUsePotion(): boolean {
    return false;
  }
  addGold(n: number) {
    this.gold = Math.max(0, this.gold + n);
    this.ctx.events.emit('gold:changed', { gold: this.gold });
  }
  spendGold(n: number): boolean {
    if (this.gold < n) return false;
    this.addGold(-n);
    return true;
  }
  /** Arma equipada (id de definição) ou null = mãos nuas/cajado inicial. */
  equippedWeaponDefId(): string | null {
    const uid = this.equipped.weapon;
    return uid ? this.get(uid)?.defId ?? null : null;
  }

  onNewGame() {
    this.items = [];
    this.stash = [];
    this.gold = 0;
    this.equipped = { weapon: null, amulet: null, armor: null };
    this.collectedUniques.clear();
  }
  serialize() {
    return { items: this.items, stash: this.stash, gold: this.gold, equipped: this.equipped, collectedUniques: [...this.collectedUniques] };
  }
  deserialize(data: any) {
    this.items = Array.isArray(data?.items) ? data.items : [];
    this.stash = Array.isArray(data?.stash) ? data.stash : [];
    this.gold = typeof data?.gold === 'number' ? Math.max(0, data.gold) : 0;
    this.equipped = { weapon: null, amulet: null, armor: null, ...(data?.equipped ?? {}) };
    this.collectedUniques = new Set(Array.isArray(data?.collectedUniques) ? data.collectedUniques : []);
  }
}
