/**
 * Lógica pura do inventário (sem three/DOM): pilhas, capacidade, adição/remoção,
 * comparação de atributos e saneamento de saves. Usada por rpg/Inventory.ts e pelos testes.
 */
import { ITEMS, INVENTORY_LIMITS, isItemId, type ItemDef, type ItemSlot } from '../../data/items';
import { STAT_IDS, STAT_INFO, type StatId, type StatMods } from '../../data/progression';
import { WEAPONS, WEAPON_UPGRADE, upgradeMultiplier } from '../../data/weapons';

export interface ItemStack {
  /** Id único da instância (para armas e itens não empilháveis). */
  uid: string;
  defId: string;
  qty: number;
  /** Nível de aprimoramento (ferreiro). */
  upgrade: number;
}

export type EquipSlot = ItemSlot;
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'amulet', 'armor'];

/** Item de missão não ocupa espaço na mochila. */
export function takesSpace(def: ItemDef | undefined): boolean {
  return !!def && def.category !== 'quest';
}

/** Gerador de uids ("i1", "i2"...). O contador avança para além dos uids carregados. */
export class UidGen {
  next = 1;
  make(): string {
    return `i${this.next++}`;
  }
  /** Garante que os próximos uids não colidam com `uid`. */
  observe(uid: string) {
    const m = /^i(\d+)$/.exec(uid);
    if (m) this.next = Math.max(this.next, Number(m[1]) + 1);
  }
}

/** Pilhas que ocupam espaço (exclui itens de missão e uids em `exclude`, ex.: equipados). */
export function usedSlots(list: readonly ItemStack[], exclude?: ReadonlySet<string>): number {
  let n = 0;
  for (const s of list) if (takesSpace(ITEMS[s.defId]) && !(exclude && exclude.has(s.uid))) n++;
  return n;
}

/** Quantas unidades de `defId` cabem na lista (até `qty`). */
export function spaceFor(list: readonly ItemStack[], defId: string, qty: number, capacity: number, exclude?: ReadonlySet<string>): number {
  const def = ITEMS[defId];
  if (!def || qty <= 0) return 0;
  let room = 0;
  if (def.stackable) {
    for (const s of list) if (s.defId === defId && s.upgrade === 0) room += Math.max(0, def.maxStack - s.qty);
  }
  if (room >= qty) return qty;
  const freeStacks = takesSpace(def) ? Math.max(0, capacity - usedSlots(list, exclude)) : Infinity;
  const perStack = def.stackable ? def.maxStack : 1;
  return Math.min(qty, room + (freeStacks === Infinity ? qty : freeStacks * perStack));
}

/**
 * Adiciona até `qty` unidades (completa pilhas existentes, depois cria novas).
 * Retorna as pilhas tocadas/criadas e quanto entrou. Não emite eventos.
 */
export function addToList(
  list: ItemStack[],
  defId: string,
  qty: number,
  capacity: number,
  uids: UidGen,
  opts: { upgrade?: number; exclude?: ReadonlySet<string> } = {},
): { added: number; stacks: ItemStack[] } {
  const def = ITEMS[defId];
  const out: ItemStack[] = [];
  if (!def || !(qty > 0)) return { added: 0, stacks: out };
  let left = Math.min(Math.floor(qty), spaceFor(list, defId, Math.floor(qty), capacity, opts.exclude));
  let added = 0;
  const upgrade = def.category === 'weapon' ? clampUpgrade(opts.upgrade ?? 0) : 0;
  if (def.stackable && upgrade === 0) {
    for (const s of list) {
      if (left <= 0) break;
      if (s.defId !== defId || s.upgrade !== 0 || s.qty >= def.maxStack) continue;
      const n = Math.min(left, def.maxStack - s.qty);
      s.qty += n;
      left -= n;
      added += n;
      out.push(s);
    }
  }
  while (left > 0) {
    const n = def.stackable ? Math.min(left, def.maxStack) : 1;
    const s: ItemStack = { uid: uids.make(), defId, qty: n, upgrade };
    list.push(s);
    out.push(s);
    left -= n;
    added += n;
  }
  return { added, stacks: out };
}

/** Total de unidades de `defId` na lista. */
export function countIn(list: readonly ItemStack[], defId: string): number {
  let n = 0;
  for (const s of list) if (s.defId === defId) n += s.qty;
  return n;
}

/**
 * Remove `qty` unidades por uid (só daquela pilha) ou por defId (das pilhas menores primeiro,
 * sem tocar nos uids `protect`, ex.: equipados). Tudo ou nada. Retorna os uids de pilhas esvaziadas.
 */
export function removeFromList(list: ItemStack[], defIdOrUid: string, qty: number, protect?: ReadonlySet<string>): string[] | null {
  const n = Math.max(1, Math.floor(qty || 1));
  const byUid = list.find((s) => s.uid === defIdOrUid);
  const emptied: string[] = [];
  if (byUid) {
    if (byUid.qty < n) return null;
    byUid.qty -= n;
    if (byUid.qty <= 0) {
      list.splice(list.indexOf(byUid), 1);
      emptied.push(byUid.uid);
    }
    return emptied;
  }
  const candidates = list.filter((s) => s.defId === defIdOrUid && !(protect && protect.has(s.uid)));
  let total = 0;
  for (const s of candidates) total += s.qty;
  if (total < n) return null;
  candidates.sort((a, b) => a.qty - b.qty || a.upgrade - b.upgrade);
  let left = n;
  for (const s of candidates) {
    if (left <= 0) break;
    const take = Math.min(left, s.qty);
    s.qty -= take;
    left -= take;
    if (s.qty <= 0) {
      list.splice(list.indexOf(s), 1);
      emptied.push(s.uid);
    }
  }
  return emptied;
}

export function clampUpgrade(v: unknown): number {
  const n = typeof v === 'number' && isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, Math.min(WEAPON_UPGRADE.maxLevel, n));
}

// ---------------------------------------------------------------------------
// Comparação de atributos
// ---------------------------------------------------------------------------

export interface StatDelta {
  /** Atributo (StatId) ou chave de arma ('damage', 'speed', 'range', 'crit', 'dps'). */
  stat: string;
  label: string;
  current: number;
  candidate: number;
  delta: number;
  /** true = melhora, false = piora, null = igual. */
  better: boolean | null;
  format: 'int' | 'pct' | 'mul' | 'dec';
}

/** Dano efetivo de uma arma por golpe com aprimoramento. */
export function weaponDamage(weaponId: string, upgrade: number): number {
  const w = WEAPONS[weaponId];
  return w ? w.damage * upgradeMultiplier(upgrade) : 0;
}

function delta(stat: string, label: string, cur: number, cand: number, format: StatDelta['format'], lowerIsBetter = false): StatDelta {
  const d = cand - cur;
  const eps = 1e-6;
  return { stat, label, current: cur, candidate: cand, delta: d, better: Math.abs(d) < eps ? null : lowerIsBetter ? d < 0 : d > 0, format };
}

/**
 * Compara um item candidato com o equipado no mesmo slot (null = nada equipado / cajado padrão).
 * Armas: dano, velocidade, alcance, crítico e dano por segundo estimado. Outros: atributos.
 */
export function compareStacks(candidate: ItemStack, equipped: ItemStack | null, defaultWeaponId: string): StatDelta[] {
  const cdef = ITEMS[candidate.defId];
  if (!cdef?.slot) return [];
  const out: StatDelta[] = [];
  if (cdef.slot === 'weapon') {
    const cw = WEAPONS[cdef.weaponId ?? ''];
    const ew = WEAPONS[equipped ? ITEMS[equipped.defId]?.weaponId ?? '' : defaultWeaponId];
    if (!cw) return out;
    const cu = candidate.upgrade;
    const eu = equipped?.upgrade ?? 0;
    const cDmg = weaponDamage(cw.id, cu);
    const eDmg = ew ? weaponDamage(ew.id, eu) : 0;
    out.push(delta('damage', 'Dano', eDmg, cDmg, 'int'));
    out.push(delta('speed', 'Velocidade', ew?.speed ?? 1, cw.speed, 'pct'));
    out.push(delta('range', 'Alcance', ew?.range ?? 0, cw.range, 'dec'));
    out.push(delta('crit', 'Crítico', ew?.critBonus ?? 0, cw.critBonus, 'pct'));
    out.push(delta('dps', 'Dano por segundo (estim.)', eDmg * (ew?.speed ?? 1), cDmg * cw.speed, 'int'));
  }
  // atributos (amuletos, vestes e eventuais bônus de armas)
  const cs: StatMods = cdef.stats ?? {};
  const es: StatMods = equipped ? ITEMS[equipped.defId]?.stats ?? {} : {};
  for (const id of STAT_IDS) {
    const a = es[id] ?? 0;
    const b = cs[id] ?? 0;
    if (a === 0 && b === 0) continue;
    const info = STAT_INFO[id];
    out.push(delta(id, info.name, a, b, info.format === 'int' ? 'int' : info.format, !!info.lowerIsBetter));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Saneamento de saves
// ---------------------------------------------------------------------------

/**
 * Valida uma lista de pilhas vinda de um save: descarta defIds desconhecidos, limita
 * quantidades ao máximo da pilha, normaliza aprimoramento e remove uids duplicados
 * (`seen` é compartilhado entre mochila e baú para nunca duplicar um item).
 */
export function sanitizeStacks(raw: unknown, seen: Set<string>, uids: UidGen, maxStacks = 500): ItemStack[] {
  const out: ItemStack[] = [];
  if (!Array.isArray(raw)) return out;
  for (const r of raw) {
    if (out.length >= maxStacks) break;
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const defId = o.defId;
    if (!isItemId(defId)) continue;
    const def = ITEMS[defId];
    let qty = typeof o.qty === 'number' && isFinite(o.qty) ? Math.floor(o.qty) : 1;
    if (qty <= 0) continue;
    qty = Math.min(qty, def.stackable ? def.maxStack : 1);
    let uid = typeof o.uid === 'string' && o.uid.length > 0 && o.uid.length < 64 ? o.uid : '';
    if (!uid || seen.has(uid)) {
      // uid ausente: gera um novo; uid duplicado: é o MESMO item salvo duas vezes → descarta.
      if (uid && seen.has(uid)) continue;
      uid = uids.make();
    }
    seen.add(uid);
    uids.observe(uid);
    out.push({ uid, defId, qty, upgrade: def.category === 'weapon' ? clampUpgrade(o.upgrade) : 0 });
  }
  return out;
}

/** Ouro válido (inteiro, 0..máx). */
export function sanitizeGold(v: unknown): number {
  if (typeof v !== 'number' || !isFinite(v)) return 0;
  return Math.max(0, Math.min(INVENTORY_LIMITS.maxGold, Math.floor(v)));
}
