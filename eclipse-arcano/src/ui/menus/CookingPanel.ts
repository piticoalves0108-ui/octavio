/**
 * Panela da fogueira: clique nos ingredientes da mochila para pôr na panela (até 4),
 * clique na panela para tirar, e "Cozinhar". Mostra o prato provável e, depois, o resultado.
 */
import type { GameContext } from '../../core/context';
import { ITEMS } from '../../data/items';
import { MAX_INGREDIENTS } from '../../data/interactive';
import { cookResult } from '../../interactive/cooking';
import { el, htmlEl } from '../dom';
import { itemIcon } from '../icons';
import { button, sfx, type Panel } from './widgets';
import { emptyCell, itemCell, renderDetails } from './itemView';

export class CookingPanel implements Panel {
  readonly el: HTMLElement;
  private title: HTMLElement;
  private bagEl: HTMLElement;
  private potEl: HTMLElement;
  private previewEl: HTMLElement;
  private resultEl: HTMLElement;
  private detEl: HTMLElement;
  private cookBtn: HTMLButtonElement;
  private pot: string[] = [];
  private dirty = true;
  private offs: (() => void)[] = [];
  onExit: (() => void) | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-stash ui-cook');
    const head = el('div', 'ui-shop-head', this.el);
    const names = el('div', '', head);
    this.title = el('div', 'ui-shop-name', names, 'Fogueira');
    el('div', 'ui-shop-keeper', names, 'Escolha até 4 ingredientes e cozinhe. Cada combinação dá um prato diferente.');
    const cols = el('div', 'ui-stash-cols', this.el);
    const a = el('div', 'ui-stash-col', cols);
    el('h3', 'ui-heading', a, 'Ingredientes na mochila');
    this.bagEl = el('div', 'ui-grid', a);
    const b = el('div', 'ui-stash-col ui-cook-pot', cols);
    el('h3', 'ui-heading', b, 'Panela');
    this.potEl = el('div', 'ui-grid', b);
    this.previewEl = el('div', 'ui-cook-preview', b);
    const row = el('div', 'ui-cook-actions', b);
    this.cookBtn = button(row, 'Cozinhar', () => this.cook(), 'primary');
    button(row, 'Esvaziar', () => {
      this.pot = [];
      this.dirty = true;
    }, 'ghost');
    this.resultEl = el('div', 'ui-cook-result', b);
    const foot = el('div', 'ui-stash-foot', this.el);
    this.detEl = el('div', 'ui-details small', foot);
    button(foot, 'Sair da fogueira', () => this.onExit?.(), 'ghost');
  }

  onOpen() {
    this.pot = [];
    this.resultEl.innerHTML = '';
    this.dirty = true;
    const c = this.ctx.sys.interactive.cookingAt;
    this.title.textContent = c ? c.spot.name : 'Fogueira';
    this.offs.push(this.ctx.events.on('inventory:changed', () => (this.dirty = true)));
  }

  onClose() {
    for (const off of this.offs.splice(0)) off();
  }

  update() {
    if (this.dirty) this.render();
  }

  handleKey(code: string) {
    if (code === 'Enter' || code === 'KeyC') {
      this.cook();
      return true;
    }
    return false;
  }

  private inPot(id: string) {
    let n = 0;
    for (const x of this.pot) if (x === id) n++;
    return n;
  }

  private render() {
    this.dirty = false;
    const inter = this.ctx.sys.interactive;
    const have = inter.availableIngredients();
    // mochila (o que sobra fora da panela)
    this.bagEl.innerHTML = '';
    let shown = 0;
    for (const { itemId, qty } of have) {
      const left = qty - this.inPot(itemId);
      const def = ITEMS[itemId];
      if (!def || left <= 0) continue;
      const c = itemCell(this.bagEl, def, left);
      c.addEventListener('mouseenter', () => renderDetails(this.ctx, this.detEl, itemId));
      c.addEventListener('click', () => {
        if (this.pot.length >= MAX_INGREDIENTS) {
          sfx('ui_error');
          return;
        }
        this.pot.push(itemId);
        sfx('ui_click');
        this.dirty = true;
      });
      shown++;
    }
    for (let i = shown; i < 16; i++) emptyCell(this.bagEl);
    if (!have.length) el('p', 'ui-empty-note', this.bagEl, 'Sem ingredientes. Maçãs caem dos carvalhos, frutas dos arbustos, cogumelos crescem nas florestas e a caça dá carne.');
    // panela
    this.potEl.innerHTML = '';
    for (let i = 0; i < MAX_INGREDIENTS; i++) {
      const id = this.pot[i];
      if (!id) {
        emptyCell(this.potEl);
        continue;
      }
      const c = itemCell(this.potEl, ITEMS[id], 1);
      c.addEventListener('mouseenter', () => renderDetails(this.ctx, this.detEl, id));
      c.addEventListener('click', () => {
        this.pot.splice(i, 1);
        sfx('ui_click');
        this.dirty = true;
      });
    }
    // prato provável
    this.previewEl.innerHTML = '';
    if (this.pot.length) {
      const res = ITEMS[cookResult(this.pot)];
      if (res) {
        const p = el('div', 'ui-cook-guess', this.previewEl);
        el('span', '', p, 'Vai sair: ');
        const n = el('b', '', p, res.name);
        n.style.color = res.icon.color;
      }
    }
    this.cookBtn.disabled = this.pot.length === 0;
  }

  private cook() {
    if (!this.pot.length) {
      sfx('ui_error');
      return;
    }
    const made = this.ctx.sys.interactive.cook(this.pot);
    if (!made) {
      sfx('ui_error');
      return;
    }
    this.pot = [];
    const def = ITEMS[made];
    this.resultEl.innerHTML = '';
    if (def) {
      const card = el('div', 'ui-cook-card', this.resultEl);
      htmlEl('ui-det-icon', itemIcon(def.icon.shape, def.icon.color), card);
      const t = el('div', '', card);
      el('div', 'ui-cook-made', t, 'Você cozinhou');
      const n = el('div', 'ui-det-name', t, def.name);
      n.style.color = def.icon.color;
      el('div', 'ui-det-desc', t, def.description);
      renderDetails(this.ctx, this.detEl, made);
    }
    this.dirty = true;
  }
}
