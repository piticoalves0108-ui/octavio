/** Baú pessoal: mochila de um lado, baú do outro; clique move o item (a pilha inteira). */
import type { GameContext } from '../../core/context';
import { ITEMS } from '../../data/items';
import type { ItemStack } from '../../rpg/Inventory';
import { el } from '../dom';
import { button, type Panel } from './widgets';
import { itemCell, emptyCell, renderDetails } from './itemView';

export class StashPanel implements Panel {
  readonly el: HTMLElement;
  private bagEl: HTMLElement;
  private stashEl: HTMLElement;
  private bagHead: HTMLElement;
  private stashHead: HTMLElement;
  private detEl: HTMLElement;
  private dirty = true;
  private offs: (() => void)[] = [];
  onExit: (() => void) | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-stash');
    const cols = el('div', 'ui-stash-cols', this.el);
    const a = el('div', 'ui-stash-col', cols);
    this.bagHead = el('h3', 'ui-heading', a);
    this.bagEl = el('div', 'ui-grid', a);
    const b = el('div', 'ui-stash-col', cols);
    this.stashHead = el('h3', 'ui-heading', b);
    this.stashEl = el('div', 'ui-grid', b);
    const foot = el('div', 'ui-stash-foot', this.el);
    this.detEl = el('div', 'ui-details small', foot);
    button(foot, 'Fechar o baú', () => this.onExit?.(), 'ghost');
  }

  onOpen() {
    this.dirty = true;
    this.offs.push(this.ctx.events.on('inventory:changed', () => (this.dirty = true)));
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
    this.bagHead.textContent = `Mochila ${inv.usedSlots()}/${inv.capacity}`;
    this.stashHead.textContent = `Baú ${inv.stashUsedSlots()}/${inv.stashCapacity}`;
    this.fill(this.bagEl, inv.sorted(), 40, (st) => inv.moveToStash(st.uid), (st) => inv.isEquipped(st.uid) || !!ITEMS[st.defId]?.bound);
    this.fill(this.stashEl, inv.sorted(inv.stash), 40, (st) => inv.moveFromStash(st.uid), () => false);
  }

  private fill(grid: HTMLElement, list: ItemStack[], min: number, move: (st: ItemStack) => boolean, locked: (st: ItemStack) => boolean) {
    const inv = this.ctx.sys.inventory;
    grid.innerHTML = '';
    const total = Math.max(min, Math.ceil(list.length / 8) * 8);
    for (let i = 0; i < total; i++) {
      const st = list[i];
      if (!st) {
        emptyCell(grid);
        continue;
      }
      const def = ITEMS[st.defId];
      if (!def) continue;
      const c = itemCell(grid, def, st.qty, { equipped: inv.isEquipped(st.uid), upgrade: st.upgrade });
      if (locked(st)) c.classList.add('soldout');
      c.addEventListener('mouseenter', () => renderDetails(this.ctx, this.detEl, st));
      c.addEventListener('click', () => {
        if (locked(st)) {
          this.ctx.sys.audio.play('ui_error');
          return;
        }
        if (move(st)) this.ctx.sys.audio.play('ui_click');
        this.dirty = true;
      });
    }
  }
}
