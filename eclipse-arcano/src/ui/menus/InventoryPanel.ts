/**
 * Inventário: equipamento (arma, vestes, amuleto), atributos do personagem, ouro,
 * filtros por categoria, grade da mochila e painel de detalhes com ações.
 * Teclado: setas movem a seleção, Enter usa/equipa, X descarta.
 */
import type { GameContext } from '../../core/context';
import { ITEMS, CATEGORY_NAMES, type ItemCategory } from '../../data/items';
import { STAT_INFO, type StatId } from '../../data/progression';
import type { ItemStack, EquipSlot } from '../../rpg/Inventory';
import { el, htmlEl, fmtInt } from '../dom';
import { goldIcon, itemIcon } from '../icons';
import { button, confirmBox, type Panel } from './widgets';
import { itemCell, emptyCell, renderDetails } from './itemView';

const FILTERS: { id: ItemCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'weapon', label: 'Armas' },
  { id: 'armor', label: 'Vestes' },
  { id: 'amulet', label: 'Amuletos' },
  { id: 'consumable', label: 'Consumíveis' },
  { id: 'material', label: 'Materiais' },
  { id: 'quest', label: 'Missão' },
];

const SLOT_NAMES: Record<EquipSlot, string> = { weapon: 'Arma', armor: 'Vestes', amulet: 'Amuleto' };
const SHOWN_STATS: StatId[] = ['maxHealth', 'maxEnergy', 'spellPower', 'meleePower', 'critChance', 'damageReduction', 'moveSpeed', 'flightSpeed'];
const COLS = 8;

export class InventoryPanel implements Panel {
  readonly el: HTMLElement;
  private filter: ItemCategory | 'all' = 'all';
  private selectedUid: string | null = null;
  private list: ItemStack[] = [];
  private gridEl!: HTMLElement;
  private detailEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private equipEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private goldEl!: HTMLElement;
  private capEl!: HTMLElement;
  private filtersEl!: HTMLElement;
  private dirty = true;
  private offs: (() => void)[] = [];

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-inventory');
    const left = el('div', 'ui-inv-left', this.el);
    this.equipEl = el('div', 'ui-inv-equip', left);
    this.statsEl = el('div', 'ui-inv-stats', left);
    const mid = el('div', 'ui-inv-mid', this.el);
    const top = el('div', 'ui-inv-top', mid);
    this.filtersEl = el('div', 'ui-filters', top);
    const right = el('div', 'ui-inv-gold', top);
    htmlEl('ui-gold-icon', goldIcon(), right);
    this.goldEl = el('span', '', right);
    this.capEl = el('span', 'ui-inv-cap', right);
    this.gridEl = el('div', 'ui-grid', mid);
    const bottom = el('div', 'ui-inv-bottom', mid);
    button(bottom, 'Organizar', () => {
      ctx.sys.inventory.sortItems();
      this.dirty = true;
    }, 'ghost small');
    const det = el('div', 'ui-inv-right', this.el);
    this.detailEl = el('div', 'ui-details', det);
    this.actionsEl = el('div', 'ui-actions', det);
    for (const f of FILTERS) {
      const b = el('button', 'ui-filter', this.filtersEl, f.label);
      b.dataset.id = f.id;
      b.addEventListener('click', () => {
        this.filter = f.id;
        this.dirty = true;
      });
    }
  }

  onOpen() {
    this.dirty = true;
    this.offs.push(this.ctx.events.on('inventory:changed', () => (this.dirty = true)));
    this.offs.push(this.ctx.events.on('gold:changed', () => (this.dirty = true)));
  }

  onClose() {
    for (const off of this.offs.splice(0)) off();
  }

  update() {
    if (this.dirty) this.render();
  }

  private render() {
    this.dirty = false;
    const inv = this.ctx.sys.inventory;
    for (const b of Array.from(this.filtersEl.children) as HTMLElement[]) b.classList.toggle('on', b.dataset.id === this.filter);
    this.goldEl.textContent = fmtInt(inv.gold);
    this.capEl.textContent = `${inv.usedSlots()} / ${inv.capacity}`;

    // equipamento
    this.equipEl.innerHTML = '';
    el('h3', 'ui-heading', this.equipEl, 'Equipamento');
    for (const slot of ['weapon', 'armor', 'amulet'] as EquipSlot[]) {
      const st = inv.equippedItem(slot);
      const row = el('div', 'ui-equip-row', this.equipEl);
      const def = st ? ITEMS[st.defId] : null;
      const icon = htmlEl(`ui-equip-icon${def ? ` rar-${def.rarity}` : ' empty'}`, def ? itemIcon(def.icon.shape, def.icon.color) : '', row);
      const txt = el('div', 'ui-equip-txt', row);
      el('div', 'ui-equip-slot', txt, SLOT_NAMES[slot]);
      el('div', 'ui-equip-name', txt, st ? inv.displayName(st) : slot === 'weapon' ? 'Cajado de Kaelen' : '—');
      if (st) {
        row.classList.add('clickable');
        row.addEventListener('click', () => {
          this.selectedUid = st.uid;
          this.dirty = true;
        });
      }
      void icon;
    }

    // atributos
    this.statsEl.innerHTML = '';
    el('h3', 'ui-heading', this.statsEl, 'Atributos');
    const pr = this.ctx.sys.progression;
    const lv = el('div', 'ui-stat-row lvl', this.statsEl);
    lv.innerHTML = `<span>Nível</span><b>${pr.level}</b>`;
    for (const id of SHOWN_STATS) {
      const v = pr.getStat(id);
      const info = STAT_INFO[id];
      const row = el('div', 'ui-stat-row', this.statsEl);
      const val = info.format === 'pct' ? `${Math.round(v * 100)}%` : info.format === 'dec' ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
      row.innerHTML = `<span>${info.name}</span><b>${val}</b>`;
    }

    // grade
    const all = inv.sorted();
    this.list = this.filter === 'all' ? all : all.filter((s) => ITEMS[s.defId]?.category === this.filter);
    if (this.selectedUid && !inv.get(this.selectedUid)) this.selectedUid = null;
    if (!this.selectedUid && this.list.length) this.selectedUid = this.list[0].uid;
    this.gridEl.innerHTML = '';
    const total = Math.max(this.filter === 'all' ? inv.capacity : 0, Math.ceil(Math.max(1, this.list.length) / COLS) * COLS);
    for (let i = 0; i < total; i++) {
      const st = this.list[i];
      if (!st) {
        emptyCell(this.gridEl);
        continue;
      }
      const def = ITEMS[st.defId];
      if (!def) continue;
      const c = itemCell(this.gridEl, def, st.qty, { equipped: inv.isEquipped(st.uid), upgrade: st.upgrade });
      if (st.uid === this.selectedUid) c.classList.add('sel');
      c.addEventListener('click', () => {
        this.selectedUid = st.uid;
        this.dirty = true;
      });
      c.addEventListener('dblclick', () => this.primary(st));
    }
    if (!this.list.length) el('div', 'ui-empty-note', this.gridEl, `Nada em ${this.filter === 'all' ? 'sua mochila' : CATEGORY_NAMES[this.filter as ItemCategory].toLowerCase()}.`);
    this.renderDetails();
  }

  private renderDetails() {
    const inv = this.ctx.sys.inventory;
    const st = this.selectedUid ? inv.get(this.selectedUid) : null;
    this.actionsEl.innerHTML = '';
    if (!st) {
      this.detailEl.innerHTML = '<p class="ui-empty-note">Selecione um item.</p>';
      return;
    }
    const def = ITEMS[st.defId];
    renderDetails(this.ctx, this.detailEl, st, def.slot && !inv.isEquipped(st.uid) ? inv.compare(st.uid) : []);
    if (def.slot) {
      if (inv.isEquipped(st.uid)) {
        button(this.actionsEl, 'Desequipar', () => {
          inv.unequip(def.slot!);
          this.dirty = true;
        });
      } else {
        const chk = inv.canEquip(st.uid);
        const b = button(this.actionsEl, 'Equipar', () => this.primary(st), 'primary');
        if (!chk.ok) {
          b.disabled = true;
          b.title = chk.reason ?? '';
        }
      }
    } else if (def.use) {
      const cd = inv.cooldownRemaining(def.use.cooldownGroup);
      const b = button(this.actionsEl, cd > 0 ? `Usar (${Math.ceil(cd)} s)` : 'Usar', () => this.primary(st), 'primary');
      b.disabled = cd > 0;
    }
    if (!def.bound) {
      button(this.actionsEl, 'Descartar', () => this.discard(st), 'ghost danger');
    }
  }

  private primary(st: ItemStack) {
    const inv = this.ctx.sys.inventory;
    const def = ITEMS[st.defId];
    if (!def) return;
    if (def.slot) inv.equip(st.uid);
    else if (def.use) inv.use(st.uid);
    this.dirty = true;
  }

  private discard(st: ItemStack) {
    const inv = this.ctx.sys.inventory;
    const def = ITEMS[st.defId];
    const name = inv.displayName(st);
    confirmBox(this.el, `Descartar ${name}${st.qty > 1 ? ` (×${st.qty})` : ''}? O item será destruído.`, 'Descartar', () => {
      inv.discard(st.uid, st.qty);
      this.selectedUid = null;
      this.dirty = true;
    });
    void def;
  }

  handleKey(code: string): boolean {
    if (!this.list.length) return false;
    const i = Math.max(0, this.list.findIndex((s) => s.uid === this.selectedUid));
    let n = i;
    if (code === 'ArrowRight') n = i + 1;
    else if (code === 'ArrowLeft') n = i - 1;
    else if (code === 'ArrowDown') n = i + COLS;
    else if (code === 'ArrowUp') n = i - COLS;
    else if (code === 'Enter' || code === 'NumpadEnter') {
      this.primary(this.list[i]);
      return true;
    } else if (code === 'KeyX' || code === 'Delete') {
      if (!ITEMS[this.list[i].defId]?.bound) this.discard(this.list[i]);
      return true;
    } else return false;
    n = Math.max(0, Math.min(this.list.length - 1, n));
    this.selectedUid = this.list[n].uid;
    this.dirty = true;
    return true;
  }
}
