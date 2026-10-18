import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import { CONSUMABLE_COOLDOWNS, INVENTORY_LIMITS, ITEMS, CATEGORY_ORDER, CATEGORY_NAMES, isItemId, weaponLines, type CooldownGroup, type ItemDef } from '../data/items';
import { RARITIES, WEAPONS, DEFAULT_WEAPON_ID, upgradeMultiplier } from '../data/weapons';
import { SHOPS, SHOP_RULES, buyPrice, sellPrice, weaponUpgradeCost, type ShopDef, type UpgradeCost } from '../data/shops';
import { formatStatMod, type StatId } from '../data/progression';
import {
  EQUIP_SLOTS,
  UidGen,
  addToList,
  compareStacks,
  countIn,
  removeFromList,
  sanitizeGold,
  sanitizeStacks,
  spaceFor,
  takesSpace,
  usedSlots,
  type ItemStack,
  type EquipSlot,
  type StatDelta,
} from './inventory/core';
import { LootWorld } from './loot/LootWorld';

export type { ItemStack, EquipSlot, StatDelta } from './inventory/core';
export type { UpgradeCost } from '../data/shops';

/** Item à venda na loja aberta. */
export interface ShopStockView {
  itemId: string;
  qty: number;
  price: number;
}

/** Item vendido pelo jogador, disponível para recompra até a renovação do estoque. */
export interface BuybackEntry {
  stack: ItemStack;
  price: number;
}

/** Estado de uma loja (estoque do dia + recompra). `activeShop` aponta para a loja aberta. */
export interface ShopState {
  id: string;
  def: ShopDef;
  /** Dia de jogo da última renovação. */
  day: number;
  stock: ShopStockView[];
  buyback: BuybackEntry[];
}

/** Resultado de uma checagem (equipar, aprimorar...). */
export interface CheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * Inventário, equipamentos, ouro, baú pessoal, consumíveis (poção rápida [H]), lojas,
 * aprimoramento no ferreiro, itens únicos coletados e o saque no mundo (baús, itens
 * soltos, ervas, recompensas de inimigos — contrato C1). Definições em data/items.ts.
 */
export class Inventory implements GameSystem, Saveable {
  readonly name = 'inventory';
  readonly saveKey = 'inventory';
  items: ItemStack[] = [];
  stash: ItemStack[] = [];
  gold = 0;
  capacity = INVENTORY_LIMITS.capacity;
  stashCapacity = INVENTORY_LIMITS.stashCapacity;
  equipped: Record<EquipSlot, string | null> = { weapon: null, amulet: null, armor: null };
  /** Ids de itens únicos do mundo já coletados (baús, relíquias) — não reaparecem. */
  collectedUniques = new Set<string>();
  /** Loja aberta (null = nenhuma). A UI lê estoque/preços daqui. */
  activeShop: ShopState | null = null;
  /** Baú pessoal aberto (menu 'stash'). */
  stashOpen = false;
  /** Aprimoramentos gratuitos concedidos pela história (ex.: Doran após o martelo). */
  freeUpgrades = 0;
  /** Recargas restantes dos consumíveis (s). */
  readonly cooldowns: Record<CooldownGroup, number> = { potion: 0, elixir: 0 };
  /** Saque no mundo (baús, itens soltos, ervas). */
  loot!: LootWorld;
  protected ctx!: GameContext;
  private uids = new UidGen();
  private shops = new Map<string, ShopState>();
  private equippedSet = new Set<string>();
  private tmpV = new THREE.Vector3();
  /** Estatísticas (testes). */
  readonly stats = { added: 0, used: 0, bought: 0, sold: 0, upgrades: 0, quickPotions: 0, overflowDrops: 0 };

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.loot = new LootWorld(ctx, this);
    ctx.events.on('ui:menu', (e) => {
      if (e.menu !== 'shop') this.activeShop = null;
      if (e.menu !== 'stash') this.stashOpen = false;
    });
  }

  // =====================================================================
  // Consultas
  // =====================================================================
  /** Definição de um item por defId ou uid. */
  def(defIdOrUid: string): ItemDef | undefined {
    return ITEMS[defIdOrUid] ?? ITEMS[this.get(defIdOrUid)?.defId ?? this.getStashed(defIdOrUid)?.defId ?? ''];
  }
  count(defId: string): number {
    return countIn(this.items, defId);
  }
  has(defId: string, qty = 1) {
    return this.count(defId) >= qty;
  }
  get(uid: string) {
    return this.items.find((i) => i.uid === uid);
  }
  getStashed(uid: string) {
    return this.stash.find((i) => i.uid === uid);
  }
  isEquipped(uid: string): boolean {
    return this.equipped.weapon === uid || this.equipped.amulet === uid || this.equipped.armor === uid;
  }
  equippedItem(slot: EquipSlot): ItemStack | null {
    const uid = this.equipped[slot];
    return uid ? this.get(uid) ?? null : null;
  }
  /** Pilhas ocupando espaço na mochila (equipados e itens de missão não contam). */
  usedSlots(): number {
    return usedSlots(this.items, this.equippedUidSet());
  }
  freeSlots(): number {
    return Math.max(0, this.capacity - this.usedSlots());
  }
  isFull(): boolean {
    return this.freeSlots() <= 0;
  }
  /** Quantas unidades de `defId` cabem na mochila (até `qty`). */
  spaceFor(defId: string, qty = 1): number {
    return spaceFor(this.items, defId, qty, this.capacity, this.equippedUidSet());
  }
  canAdd(defId: string, qty = 1): boolean {
    return this.spaceFor(defId, qty) >= qty;
  }

  private equippedUidSet(): Set<string> {
    const s = this.equippedSet;
    s.clear();
    for (const slot of EQUIP_SLOTS) {
      const u = this.equipped[slot];
      if (u) s.add(u);
    }
    return s;
  }

  /** Itens ordenados para exibição (categoria, raridade, nome). Não altera a lista salva. */
  sorted(list: readonly ItemStack[] = this.items): ItemStack[] {
    return list.slice().sort((a, b) => {
      const da = ITEMS[a.defId];
      const db = ITEMS[b.defId];
      const ca = CATEGORY_ORDER.indexOf(da.category);
      const cb = CATEGORY_ORDER.indexOf(db.category);
      if (ca !== cb) return ca - cb;
      const ra = RARITIES[da.rarity].order;
      const rb = RARITIES[db.rarity].order;
      if (ra !== rb) return rb - ra;
      return da.name.localeCompare(db.name, 'pt-BR') || b.upgrade - a.upgrade;
    });
  }

  /** Reordena a mochila (botão "Organizar"). */
  sortItems() {
    this.items = this.sorted(this.items);
    this.markChanged();
  }

  /** Nome exibido (com +N das armas aprimoradas). */
  displayName(stack: ItemStack): string {
    const d = ITEMS[stack.defId];
    if (!d) return stack.defId;
    return stack.upgrade > 0 ? `${d.name} +${stack.upgrade}` : d.name;
  }

  /**
   * Linhas de tooltip (pt-BR) de uma pilha ou definição: categoria, raridade, atributos,
   * números da arma, efeito de uso, requisito de nível e valor.
   */
  describe(stackOrDefId: ItemStack | string): string[] {
    const stack = typeof stackOrDefId === 'string' ? null : stackOrDefId;
    const d = ITEMS[stack ? stack.defId : (stackOrDefId as string)];
    if (!d) return [];
    const up = stack?.upgrade ?? 0;
    const out: string[] = [];
    if (d.weaponId) out.push(...weaponLines(d.weaponId, up, upgradeMultiplier(up)));
    else out.push(`${CATEGORY_NAMES[d.category]} · ${RARITIES[d.rarity].name}`);
    if (d.stats) for (const k in d.stats) out.push(formatStatMod(k as StatId, (d.stats as Record<string, number>)[k]));
    if (d.use) {
      const u = d.use;
      if (u.heal || u.healPct) out.push(`Uso: recupera ${u.heal ?? 0}${u.healPct ? ` + ${Math.round(u.healPct * 100)}%` : ''} de vida`);
      if (u.energy) out.push(`Uso: recupera ${u.energy} de energia`);
      if (u.buff) out.push(`Uso: ${u.buff.name} por ${u.buff.duration} s (${Object.entries(u.buff.mods).map(([k, v]) => formatStatMod(k as StatId, v as number)).join(', ')})`);
      out.push(`Recarga: ${CONSUMABLE_COOLDOWNS[u.cooldownGroup]} s`);
    }
    if (d.levelReq && d.levelReq > 1) out.push(`Requer nível ${d.levelReq}`);
    if (d.bound) out.push(d.category === 'quest' ? 'Item de missão' : 'Vinculado: não pode ser vendido');
    if (d.value > 0 && !d.bound) out.push(`Valor: ${d.value} de ouro`);
    return out;
  }

  // =====================================================================
  // Adicionar / remover
  // =====================================================================
  /**
   * Adiciona itens à mochila. O que não couber cai no chão perto do jogador (ou de `dropAt`).
   * Com `uniqueId`, só pode ser recebido uma vez (relíquias/baús de missão).
   * Retorna false se o item não existe ou se o uniqueId já foi coletado.
   */
  add(defId: string, qty = 1, opts?: { silent?: boolean; uniqueId?: string; upgrade?: number; dropAt?: THREE.Vector3 }): boolean {
    const def = ITEMS[defId];
    const n = Math.floor(qty);
    if (!def || !(n > 0)) return false;
    if (opts?.uniqueId) {
      if (this.collectedUniques.has(opts.uniqueId)) return false;
      this.collectedUniques.add(opts.uniqueId);
    }
    const added = this.addInternal(defId, n, opts?.upgrade ?? 0);
    const rest = n - added;
    if (added > 0) {
      this.ctx?.events.emit('item:pickup', { defId, qty: added, uniqueId: opts?.uniqueId });
      if (!opts?.silent) this.ctx?.events.emit('ui:notify', { text: `${def.name}${added > 1 ? ` ×${added}` : ''}`, kind: 'loot' });
    }
    if (rest > 0) {
      // mochila cheia: o excesso cai no chão (nunca se perde)
      const at = opts?.dropAt ?? this.ctx?.sys.player?.position;
      if (at && this.loot) {
        this.loot.pickups.spawn(defId, rest, at.x, at.y, at.z, { scatter: 0.8 });
        this.stats.overflowDrops += rest;
      }
      this.ctx?.events.emit('ui:notify', { text: `Inventário cheio: ${def.name}${rest > 1 ? ` ×${rest}` : ''} caiu no chão.`, kind: 'warning' });
    }
    return true;
  }

  /** Adiciona o que couber, sem derrubar o excesso. Retorna quanto entrou. */
  tryAdd(defId: string, qty = 1, opts?: { silent?: boolean; upgrade?: number }): number {
    const def = ITEMS[defId];
    if (!def || !(qty > 0)) return 0;
    const added = this.addInternal(defId, Math.floor(qty), opts?.upgrade ?? 0);
    if (added > 0) {
      this.ctx?.events.emit('item:pickup', { defId, qty: added });
      if (!opts?.silent) this.ctx?.events.emit('ui:notify', { text: `${def.name}${added > 1 ? ` ×${added}` : ''}`, kind: 'loot' });
    }
    return added;
  }

  private addInternal(defId: string, qty: number, upgrade: number): number {
    const r = addToList(this.items, defId, qty, this.capacity, this.uids, { upgrade, exclude: this.equippedUidSet() });
    if (r.added > 0) {
      this.stats.added += r.added;
      this.markChanged();
    }
    return r.added;
  }

  /** Remove por uid (daquela pilha) ou por defId (preserva itens equipados). Tudo ou nada. */
  remove(defIdOrUid: string, qty = 1): boolean {
    const emptied = removeFromList(this.items, defIdOrUid, qty, this.equippedUidSet());
    if (!emptied) return false;
    let unequipped = false;
    for (const uid of emptied) {
      for (const slot of EQUIP_SLOTS) {
        if (this.equipped[slot] === uid) {
          this.equipped[slot] = null;
          this.ctx?.events.emit('equip:changed', { slot, defId: null });
          unequipped = true;
        }
      }
    }
    if (unequipped) this.ctx?.sys.progression?.invalidate();
    this.markChanged();
    return true;
  }

  /** Emite 'inventory:changed' (UI). */
  markChanged() {
    this.ctx?.events.emit('inventory:changed', {});
  }

  // =====================================================================
  // Equipamento
  // =====================================================================
  canEquip(uid: string): CheckResult {
    const st = this.get(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def) return { ok: false, reason: 'Item não encontrado.' };
    if (!def.slot) return { ok: false, reason: 'Este item não pode ser equipado.' };
    const level = this.ctx?.sys.progression?.level ?? 1;
    if (def.levelReq && level < def.levelReq) return { ok: false, reason: `Requer nível ${def.levelReq}.` };
    return { ok: true };
  }

  /** Equipa (troca o que estava no slot). Exige o nível do item. */
  equip(uid: string): boolean {
    const chk = this.canEquip(uid);
    if (!chk.ok) {
      this.ctx?.events.emit('ui:notify', { text: chk.reason!, kind: 'warning' });
      this.ctx?.sys.audio?.play('ui_error');
      return false;
    }
    const st = this.get(uid)!;
    const def = ITEMS[st.defId];
    const slot = def.slot!;
    if (this.equipped[slot] === uid) return true;
    this.equipped[slot] = uid;
    this.afterEquipChange(slot, def.id);
    return true;
  }

  unequip(slot: EquipSlot) {
    if (!this.equipped[slot]) return;
    this.equipped[slot] = null;
    this.afterEquipChange(slot, null);
  }

  private afterEquipChange(slot: EquipSlot, defId: string | null) {
    this.ctx?.sys.progression?.invalidate();
    // combate (troca de arma) e jogador (refreshStats) ouvem este evento
    this.ctx?.events.emit('equip:changed', { slot, defId });
    this.markChanged();
  }

  /** Arma equipada (id de definição) ou null = mãos nuas/cajado inicial. */
  equippedWeaponDefId(): string | null {
    const uid = this.equipped.weapon;
    return uid ? this.get(uid)?.defId ?? null : null;
  }

  /** Comparação de atributos do item com o equipado no mesmo slot (deltas). */
  compare(uid: string): StatDelta[] {
    const st = this.get(uid) ?? this.getStashed(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def?.slot) return [];
    const cur = this.equippedItem(def.slot);
    return compareStacks(st, cur && cur.uid !== st.uid ? cur : cur?.uid === st.uid ? st : null, DEFAULT_WEAPON_ID);
  }

  /** Compara um item da loja (por defId) com o equipado. */
  compareDef(defId: string): StatDelta[] {
    const def = ITEMS[defId];
    if (!def?.slot) return [];
    return compareStacks({ uid: '', defId, qty: 1, upgrade: 0 }, this.equippedItem(def.slot), DEFAULT_WEAPON_ID);
  }

  // =====================================================================
  // Consumíveis
  // =====================================================================
  cooldownRemaining(group: CooldownGroup): number {
    return this.cooldowns[group] ?? 0;
  }
  cooldownFraction(group: CooldownGroup): number {
    const total = CONSUMABLE_COOLDOWNS[group];
    return total > 0 ? Math.min(1, (this.cooldowns[group] ?? 0) / total) : 0;
  }

  /** Usa um item: consumíveis aplicam o efeito; equipáveis são equipados. */
  use(uid: string): boolean {
    const st = this.get(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def) return false;
    if (def.slot) return this.equip(uid);
    if (!def.use) return false;
    const ctx = this.ctx;
    const u = def.use;
    const cd = this.cooldowns[u.cooldownGroup];
    if (cd > 0) {
      ctx?.events.emit('ui:notify', { text: `Aguarde ${cd.toFixed(1).replace('.', ',')} s.`, kind: 'warning' });
      ctx?.sys.audio?.play('ui_error');
      return false;
    }
    const player = ctx?.sys.player;
    const health = player?.health;
    if (!player || !health || !health.alive) return false;
    const healAmt = (u.heal ?? 0) + (u.healPct ?? 0) * health.max;
    const missingHp = health.max - health.current;
    const missingEn = player.energy.max - player.energy.current;
    const useful = !!u.buff || (healAmt > 0 && missingHp > 0.5) || ((u.energy ?? 0) > 0 && missingEn > 0.5);
    if (!useful) {
      ctx.events.emit('ui:notify', { text: healAmt > 0 ? 'Sua vida já está cheia.' : 'Sua energia já está cheia.', kind: 'info' });
      return false;
    }
    if (!this.remove(uid, 1)) return false;
    if (healAmt > 0) health.heal(healAmt);
    if (u.energy) player.restoreEnergy(u.energy);
    if (u.buff) ctx.sys.progression.addBuff(u.buff.id, u.buff.name, u.buff.duration, u.buff.mods);
    this.cooldowns[u.cooldownGroup] = CONSUMABLE_COOLDOWNS[u.cooldownGroup];
    this.stats.used++;
    // efeitos
    if (player.canAct?.() && !player.isBusy?.()) player.playAnimation?.('drink');
    const pos = this.tmpV.copy(player.position).setY(player.position.y + 1);
    if (healAmt > 0) ctx.sys.vfx.burst('heal', pos, { scale: 1 });
    if (u.energy) ctx.sys.vfx.burst('arcaneSpark', pos, { color: 0x4fb8ff, count: 18 });
    if (u.buff) ctx.sys.vfx.burst('arcaneBurst', pos, { color: 0xff8a2a, count: 24, scale: 0.9 });
    ctx.sys.audio.play('potion', { position: player.position });
    ctx.events.emit('item:used', { defId: def.id });
    if (u.buff) ctx.events.emit('ui:notify', { text: `${u.buff.name} por ${u.buff.duration} s!`, kind: 'info' });
    return true;
  }

  /** Usa a melhor poção de vida disponível (tecla H): a menor que cobre o que falta; senão a maior. */
  quickUsePotion(): boolean {
    const ctx = this.ctx;
    const health = ctx?.sys.player?.health;
    if (!health || !health.alive) return false;
    let best: ItemStack | null = null;
    let bestHeal = 0;
    let biggest: ItemStack | null = null;
    let biggestHeal = 0;
    const missing = health.max - health.current;
    for (const st of this.items) {
      const u = ITEMS[st.defId]?.use;
      if (!u || u.cooldownGroup !== 'potion') continue;
      const heal = (u.heal ?? 0) + (u.healPct ?? 0) * health.max;
      if (heal <= 0) continue;
      if (heal > biggestHeal) {
        biggest = st;
        biggestHeal = heal;
      }
      if (heal >= missing * 0.9 && (!best || heal < bestHeal)) {
        best = st;
        bestHeal = heal;
      }
    }
    const pick = best ?? biggest;
    if (!pick) {
      ctx.events.emit('ui:notify', { text: 'Sem poções de vida.', kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    }
    const ok = this.use(pick.uid);
    if (ok) this.stats.quickPotions++;
    return ok;
  }

  /** Descarta (destrói) itens. Itens de missão/vinculados não podem ser descartados. */
  discard(uid: string, qty?: number): boolean {
    const st = this.get(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def) return false;
    if (def.bound || def.category === 'quest') {
      this.ctx?.events.emit('ui:notify', { text: 'Este item não pode ser descartado.', kind: 'warning' });
      this.ctx?.sys.audio?.play('ui_error');
      return false;
    }
    const n = Math.max(1, Math.min(st.qty, Math.floor(qty ?? st.qty)));
    if (this.isEquipped(uid)) this.unequip(def.slot!);
    return this.remove(uid, n);
  }

  // =====================================================================
  // Ouro
  // =====================================================================
  addGold(n: number) {
    if (!isFinite(n)) return;
    this.gold = Math.max(0, Math.min(INVENTORY_LIMITS.maxGold, Math.floor(this.gold + n)));
    this.ctx?.events.emit('gold:changed', { gold: this.gold });
  }
  spendGold(n: number): boolean {
    if (!(n >= 0) || this.gold < n) return false;
    this.addGold(-n);
    return true;
  }

  // =====================================================================
  // Baú pessoal (armazenamento)
  // =====================================================================
  openStash() {
    this.stashOpen = true;
    this.ctx.sys.ui.openMenu('stash');
  }

  stashUsedSlots(): number {
    return usedSlots(this.stash);
  }

  /** Move da mochila para o baú (equipados são desequipados; itens de missão ficam na mochila). */
  moveToStash(uid: string, qty?: number): boolean {
    const st = this.get(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def) return false;
    if (def.category === 'quest') {
      this.ctx?.events.emit('ui:notify', { text: 'Itens de missão ficam com você.', kind: 'warning' });
      return false;
    }
    const n = Math.max(1, Math.min(st.qty, Math.floor(qty ?? st.qty)));
    if (spaceFor(this.stash, st.defId, n, this.stashCapacity) < n) {
      this.ctx?.events.emit('ui:notify', { text: 'O baú está cheio.', kind: 'warning' });
      return false;
    }
    if (this.isEquipped(uid)) this.unequip(def.slot!);
    if (!def.stackable || n === st.qty) {
      // move a pilha inteira (preserva uid e aprimoramento)
      this.items.splice(this.items.indexOf(st), 1);
      const merged = def.stackable ? addToList(this.stash, st.defId, n, this.stashCapacity, this.uids).added : 0;
      if (!merged) this.stash.push(st);
    } else {
      st.qty -= n;
      addToList(this.stash, st.defId, n, this.stashCapacity, this.uids);
    }
    this.markChanged();
    return true;
  }

  /** Move do baú para a mochila. */
  moveFromStash(uid: string, qty?: number): boolean {
    const st = this.getStashed(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def) return false;
    const n = Math.max(1, Math.min(st.qty, Math.floor(qty ?? st.qty)));
    if (this.spaceFor(st.defId, n) < n) {
      this.ctx?.events.emit('ui:notify', { text: 'Inventário cheio.', kind: 'warning' });
      return false;
    }
    if (!def.stackable) {
      this.stash.splice(this.stash.indexOf(st), 1);
      this.items.push(st);
    } else {
      st.qty -= n;
      if (st.qty <= 0) this.stash.splice(this.stash.indexOf(st), 1);
      addToList(this.items, st.defId, n, this.capacity, this.uids, { exclude: this.equippedUidSet() });
    }
    this.markChanged();
    return true;
  }

  // =====================================================================
  // Lojas
  // =====================================================================
  /** Estado da loja (renova o estoque se mudou o dia). */
  shopState(shopId: string): ShopState | null {
    const def = SHOPS[shopId];
    if (!def) return null;
    let s = this.shops.get(shopId);
    const day = this.ctx?.clock.day ?? 1;
    if (!s) {
      s = { id: shopId, def, day: -1, stock: [], buyback: [] };
      this.shops.set(shopId, s);
    }
    if (s.day !== day) this.restock(s, day);
    else this.refreshStockVisibility(s);
    return s;
  }

  private restock(s: ShopState, day: number) {
    s.day = day;
    s.buyback = [];
    s.stock = [];
    const level = this.ctx?.sys.progression?.level ?? 1;
    for (const e of s.def.stock) {
      const d = ITEMS[e.itemId];
      if (!d) continue;
      if (e.minLevel && level < e.minLevel) continue;
      s.stock.push({ itemId: e.itemId, qty: e.qty, price: buyPrice(d.value, s.def) });
    }
  }

  /** Itens com nível mínimo aparecem quando o jogador alcança o nível (no mesmo dia). */
  private refreshStockVisibility(s: ShopState) {
    const level = this.ctx?.sys.progression?.level ?? 1;
    for (const e of s.def.stock) {
      if (!e.minLevel || level < e.minLevel || !ITEMS[e.itemId]) continue;
      if (s.stock.some((x) => x.itemId === e.itemId)) continue;
      s.stock.push({ itemId: e.itemId, qty: e.qty, price: buyPrice(ITEMS[e.itemId].value, s.def) });
    }
  }

  /** Abre o menu de loja (contrato C7). */
  openShop(shopId: string): boolean {
    const s = this.shopState(shopId);
    if (!s) {
      console.warn(`[Inventário] loja desconhecida: ${shopId}`);
      return false;
    }
    this.activeShop = s;
    this.ctx.sys.ui.openMenu('shop');
    // a UI pode emitir 'ui:menu' de forma síncrona: reafirma a loja aberta
    this.activeShop = s;
    return true;
  }

  closeShop() {
    this.activeShop = null;
    if (this.ctx.sys.ui.openMenuName === 'shop') this.ctx.sys.ui.closeMenu();
  }

  /** Preço de compra na loja aberta (ou numa loja específica). */
  buyPrice(itemId: string, shopId?: string): number {
    const shop = shopId ? SHOPS[shopId] : this.activeShop?.def;
    const d = ITEMS[itemId];
    return shop && d ? buyPrice(d.value, shop) : 0;
  }

  /** Quanto a loja aberta paga por 1 unidade desta pilha (0 = não compra). */
  sellPrice(uid: string): number {
    const shop = this.activeShop?.def;
    const st = this.get(uid);
    const d = st ? ITEMS[st.defId] : undefined;
    if (!shop || !st || !d || d.bound || !shop.buys.includes(d.category)) return 0;
    return sellPrice(d.value, st.upgrade, shop);
  }

  /** A loja aberta compra esta pilha? Motivo legível se não. */
  canSell(uid: string): CheckResult {
    const shop = this.activeShop?.def;
    const st = this.get(uid);
    const d = st ? ITEMS[st.defId] : undefined;
    if (!shop) return { ok: false, reason: 'Nenhuma loja aberta.' };
    if (!st || !d) return { ok: false, reason: 'Item não encontrado.' };
    if (d.bound) return { ok: false, reason: d.category === 'quest' ? 'Itens de missão não podem ser vendidos.' : 'Este item é vinculado a você.' };
    if (!shop.buys.includes(d.category)) return { ok: false, reason: `${shop.keeper} não compra ${CATEGORY_NAMES[d.category].toLowerCase()}.` };
    if (d.value <= 0) return { ok: false, reason: 'Sem valor de venda.' };
    return { ok: true };
  }

  /** Compra `qty` do item na loja aberta. */
  buy(itemId: string, qty = 1): boolean {
    const s = this.activeShop;
    const ctx = this.ctx;
    const n = Math.max(1, Math.floor(qty));
    const entry = s?.stock.find((e) => e.itemId === itemId);
    const fail = (text: string) => {
      ctx.events.emit('ui:notify', { text, kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    };
    if (!s || !entry) return fail('Item indisponível.');
    if (entry.qty < n) return fail('Estoque insuficiente.');
    const total = entry.price * n;
    if (this.gold < total) return fail(`Ouro insuficiente (${total}).`);
    if (this.spaceFor(itemId, n) < n) return fail('Inventário cheio.');
    this.spendGold(total);
    this.addInternal(itemId, n, 0);
    entry.qty -= n;
    if (entry.qty <= 0) s.stock.splice(s.stock.indexOf(entry), 1);
    this.stats.bought += n;
    ctx.events.emit('item:pickup', { defId: itemId, qty: n });
    ctx.events.emit('shop:transaction', { shopId: s.id, kind: 'buy', itemId, qty: n, gold: -total });
    ctx.events.emit('ui:notify', { text: `Comprou ${ITEMS[itemId].name}${n > 1 ? ` ×${n}` : ''} por ${total} de ouro.`, kind: 'loot' });
    return true;
  }

  /** Vende `qty` (padrão: 1) da pilha para a loja aberta. Equipados não podem ser vendidos. */
  sell(uid: string, qty = 1): boolean {
    const s = this.activeShop;
    const ctx = this.ctx;
    const chk = this.canSell(uid);
    if (!chk.ok || !s) {
      ctx.events.emit('ui:notify', { text: chk.reason ?? 'Não é possível vender.', kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    }
    if (this.isEquipped(uid)) {
      ctx.events.emit('ui:notify', { text: 'Desequipe o item antes de vender.', kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    }
    const st = this.get(uid)!;
    const n = Math.max(1, Math.min(st.qty, Math.floor(qty)));
    const unit = this.sellPrice(uid);
    const total = unit * n;
    const snapshot: ItemStack = { uid: '', defId: st.defId, qty: n, upgrade: st.upgrade };
    if (!this.remove(uid, n)) return false;
    this.addGold(total);
    s.buyback.unshift({ stack: snapshot, price: unit });
    if (s.buyback.length > SHOP_RULES.buybackMax) s.buyback.length = SHOP_RULES.buybackMax;
    this.stats.sold += n;
    ctx.events.emit('shop:transaction', { shopId: s.id, kind: 'sell', itemId: snapshot.defId, qty: n, gold: total });
    ctx.events.emit('ui:notify', { text: `Vendeu ${ITEMS[snapshot.defId].name}${n > 1 ? ` ×${n}` : ''} por ${total} de ouro.`, kind: 'loot' });
    return true;
  }

  /** Recompra um item vendido (índice em activeShop.buyback), pelo mesmo preço. */
  buyback(index: number): boolean {
    const s = this.activeShop;
    const ctx = this.ctx;
    const e = s?.buyback[index];
    if (!s || !e) return false;
    const total = e.price * e.stack.qty;
    if (this.gold < total || this.spaceFor(e.stack.defId, e.stack.qty) < e.stack.qty) {
      ctx.events.emit('ui:notify', { text: this.gold < total ? `Ouro insuficiente (${total}).` : 'Inventário cheio.', kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    }
    this.spendGold(total);
    this.addInternal(e.stack.defId, e.stack.qty, e.stack.upgrade);
    s.buyback.splice(index, 1);
    ctx.events.emit('shop:transaction', { shopId: s.id, kind: 'buyback', itemId: e.stack.defId, qty: e.stack.qty, gold: -total });
    return true;
  }

  // =====================================================================
  // Ferreiro: aprimorar armas (+1 a +5)
  // =====================================================================
  /** Custo do próximo aprimoramento da arma (null se não é arma ou já está no máximo). */
  upgradeCost(uid: string): UpgradeCost | null {
    const st = this.get(uid) ?? this.getStashed(uid);
    const def = st ? ITEMS[st.defId] : undefined;
    if (!st || !def?.weaponId || !WEAPONS[def.weaponId]) return null;
    return weaponUpgradeCost(st.upgrade, def.rarity);
  }

  canUpgrade(uid: string): CheckResult {
    if (!this.activeShop?.def.upgrades) return { ok: false, reason: 'Só um ferreiro pode aprimorar armas.' };
    const st = this.get(uid);
    if (!st) return { ok: false, reason: 'A arma precisa estar na mochila.' };
    const def = ITEMS[st.defId];
    if (!def?.weaponId) return { ok: false, reason: 'Só armas podem ser aprimoradas.' };
    const cost = this.upgradeCost(uid);
    if (!cost) return { ok: false, reason: 'Aprimoramento máximo (+5).' };
    if (this.freeUpgrades > 0) return { ok: true };
    if (this.gold < cost.gold) return { ok: false, reason: `Ouro insuficiente (${cost.gold}).` };
    for (const m of cost.materials) {
      if (this.count(m.itemId) < m.qty) return { ok: false, reason: `Faltam materiais: ${ITEMS[m.itemId]?.name ?? m.itemId} (${this.count(m.itemId)}/${m.qty}).` };
    }
    return { ok: true };
  }

  /** Aprimora a arma no ferreiro (ouro + materiais, ou um aprimoramento gratuito). */
  upgradeWeapon(uid: string): boolean {
    const ctx = this.ctx;
    const chk = this.canUpgrade(uid);
    if (!chk.ok) {
      ctx.events.emit('ui:notify', { text: chk.reason!, kind: 'warning' });
      ctx.sys.audio.play('ui_error');
      return false;
    }
    const st = this.get(uid)!;
    const cost = this.upgradeCost(uid)!;
    let paid = 0;
    if (this.freeUpgrades > 0) {
      this.freeUpgrades--;
    } else {
      for (const m of cost.materials) this.remove(m.itemId, m.qty);
      this.spendGold(cost.gold);
      paid = cost.gold;
    }
    st.upgrade = cost.to;
    this.stats.upgrades++;
    ctx.sys.audio.play('hit_metal');
    const p = ctx.sys.player?.position;
    if (p) ctx.sys.vfx.burst('metalSpark', this.tmpV.copy(p).setY(p.y + 1.2), { count: 16 });
    ctx.events.emit('shop:transaction', { shopId: this.activeShop?.id ?? '', kind: 'upgrade', itemId: st.defId, qty: 1, gold: -paid });
    ctx.events.emit('ui:notify', { text: `${ITEMS[st.defId].name} aprimorada para +${st.upgrade}!`, kind: 'loot' });
    this.markChanged();
    return true;
  }

  /** Concede aprimoramentos gratuitos no ferreiro (recompensa de missão). */
  grantFreeUpgrade(n = 1) {
    const k = Math.floor(n);
    if (!(k > 0)) return;
    this.freeUpgrades += k;
    this.ctx?.events.emit('ui:notify', { text: `Doran vai aprimorar uma arma de graça${k > 1 ? ` (${k}×)` : ''}.`, kind: 'quest' });
  }

  // =====================================================================
  // Loop
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    if (this.cooldowns.potion > 0) this.cooldowns.potion = Math.max(0, this.cooldowns.potion - dt);
    if (this.cooldowns.elixir > 0) this.cooldowns.elixir = Math.max(0, this.cooldowns.elixir - dt);
    if (ctx.state === 'playing' && ctx.input.pressed('potion')) this.quickUsePotion();
    this.loot.update(dt, ctx);
  }

  // =====================================================================
  // Novo jogo / save
  // =====================================================================
  onNewGame() {
    this.items = [];
    this.stash = [];
    this.gold = 0;
    this.equipped = { weapon: null, amulet: null, armor: null };
    this.collectedUniques.clear();
    this.shops.clear();
    this.activeShop = null;
    this.stashOpen = false;
    this.freeUpgrades = 0;
    this.cooldowns.potion = 0;
    this.cooldowns.elixir = 0;
    this.uids = new UidGen();
    // kit inicial: Cajado Ancestral equipado + 2 poções menores
    addToList(this.items, DEFAULT_WEAPON_ID, 1, this.capacity, this.uids);
    addToList(this.items, 'pocao_vida_menor', 2, this.capacity, this.uids);
    this.equipped.weapon = this.items.find((s) => s.defId === DEFAULT_WEAPON_ID)?.uid ?? null;
    this.loot?.reset();
    this.ctx?.sys.progression?.invalidate();
    this.ctx?.events.emit('equip:changed', { slot: 'weapon', defId: DEFAULT_WEAPON_ID });
    this.ctx?.events.emit('gold:changed', { gold: this.gold });
    this.markChanged();
  }

  serialize() {
    const shops: Record<string, unknown> = {};
    for (const [id, s] of this.shops) {
      shops[id] = {
        day: s.day,
        stock: s.stock.map((e) => [e.itemId, e.qty]),
        buyback: s.buyback.map((b) => ({ defId: b.stack.defId, qty: b.stack.qty, upgrade: b.stack.upgrade, price: b.price })),
      };
    }
    return {
      v: 2,
      items: this.items.map((s) => ({ ...s })),
      stash: this.stash.map((s) => ({ ...s })),
      gold: this.gold,
      equipped: { ...this.equipped },
      collectedUniques: [...this.collectedUniques],
      freeUpgrades: this.freeUpgrades,
      cooldowns: { ...this.cooldowns },
      shops,
      world: this.loot ? this.loot.serialize() : undefined,
    };
  }

  deserialize(data: any) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new Error('dados de inventário inválidos');
    const uids = new UidGen();
    const seen = new Set<string>();
    const items = sanitizeStacks(data.items, seen, uids);
    const stash = sanitizeStacks(data.stash, seen, uids);
    this.uids = uids;
    this.items = items;
    this.stash = stash;
    this.gold = sanitizeGold(data.gold);
    // equipados: o uid precisa existir na mochila e o item precisa caber no slot
    const eq = data.equipped && typeof data.equipped === 'object' ? data.equipped : {};
    this.equipped = { weapon: null, amulet: null, armor: null };
    for (const slot of EQUIP_SLOTS) {
      const uid = eq[slot];
      if (typeof uid !== 'string') continue;
      const st = items.find((s) => s.uid === uid);
      if (st && ITEMS[st.defId]?.slot === slot) this.equipped[slot] = uid;
    }
    this.collectedUniques = new Set(Array.isArray(data.collectedUniques) ? data.collectedUniques.filter((x: unknown) => typeof x === 'string' && x.length < 128) : []);
    const fu = Number(data.freeUpgrades);
    this.freeUpgrades = isFinite(fu) ? Math.max(0, Math.min(20, Math.floor(fu))) : 0;
    const cds = data.cooldowns && typeof data.cooldowns === 'object' ? data.cooldowns : {};
    for (const g of Object.keys(this.cooldowns) as CooldownGroup[]) {
      const v = Number(cds[g]);
      this.cooldowns[g] = isFinite(v) ? Math.max(0, Math.min(CONSUMABLE_COOLDOWNS[g], v)) : 0;
    }
    // lojas
    this.shops.clear();
    this.activeShop = null;
    this.stashOpen = false;
    if (data.shops && typeof data.shops === 'object') {
      for (const [id, raw] of Object.entries(data.shops as Record<string, any>)) {
        const def = SHOPS[id];
        if (!def || !raw || typeof raw !== 'object') continue;
        const day = Math.floor(Number(raw.day));
        const s: ShopState = { id, def, day: isFinite(day) ? day : -1, stock: [], buyback: [] };
        if (Array.isArray(raw.stock)) {
          for (const e of raw.stock) {
            if (!Array.isArray(e) || !isItemId(e[0])) continue;
            const q = Math.floor(Number(e[1]));
            if (!(q > 0)) continue;
            s.stock.push({ itemId: e[0], qty: Math.min(99, q), price: buyPrice(ITEMS[e[0]].value, def) });
          }
        }
        if (Array.isArray(raw.buyback)) {
          for (const b of raw.buyback.slice(0, SHOP_RULES.buybackMax)) {
            if (!b || !isItemId(b.defId)) continue;
            const d = ITEMS[b.defId];
            const q = Math.max(1, Math.min(d.stackable ? d.maxStack : 1, Math.floor(Number(b.qty) || 1)));
            const price = Math.max(0, Math.floor(Number(b.price) || 0));
            s.buyback.push({ stack: { uid: '', defId: b.defId, qty: q, upgrade: d.category === 'weapon' ? Math.max(0, Math.min(5, Math.floor(Number(b.upgrade) || 0))) : 0 }, price });
          }
        }
        this.shops.set(id, s);
      }
    }
    this.loot?.deserialize(data.world);
    this.ctx?.sys.progression?.invalidate();
    for (const slot of EQUIP_SLOTS) this.ctx?.events.emit('equip:changed', { slot, defId: this.equippedItem(slot)?.defId ?? null });
    this.ctx?.events.emit('gold:changed', { gold: this.gold });
    this.markChanged();
  }

  /** Diagnóstico (testes). */
  debugInfo() {
    return {
      gold: this.gold,
      used: this.usedSlots(),
      capacity: this.capacity,
      items: this.items.map((s) => `${s.defId}${s.upgrade ? '+' + s.upgrade : ''}×${s.qty}`),
      stash: this.stash.map((s) => `${s.defId}×${s.qty}`),
      equipped: { ...this.equipped },
      weapon: this.equippedWeaponDefId(),
      collected: [...this.collectedUniques],
      pickups: this.loot?.pickups.activeCount() ?? 0,
      activeShop: this.activeShop?.id ?? null,
      cooldowns: { ...this.cooldowns },
    };
  }
}

export { takesSpace };
