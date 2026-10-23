/**
 * Loja: comprar (estoque do dia), vender (o que o comerciante aceita), recomprar e, no
 * ferreiro, aprimorar armas. Mostra o ouro e compara equipáveis com o que está em uso.
 */
import type { GameContext } from '../../core/context';
import { ITEMS } from '../../data/items';
import type { ItemStack } from '../../rpg/Inventory';
import { el, htmlEl, fmtInt } from '../dom';
import { goldIcon, itemIcon } from '../icons';
import { button, type Panel } from './widgets';
import { itemCell, renderDetails } from './itemView';

type Tab = 'buy' | 'sell' | 'buyback' | 'upgrade';

export class ShopPanel implements Panel {
  readonly el: HTMLElement;
  private tab: Tab = 'buy';
  private sel: string | null = null;
  private dirty = true;
  private offs: (() => void)[] = [];
  private head: HTMLElement;
  private tabsEl: HTMLElement;
  private listEl: HTMLElement;
  private detEl: HTMLElement;
  private actEl: HTMLElement;
  /** Fechar (a UI fecha a loja e volta ao jogo). */
  onExit: (() => void) | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-shop');
    this.head = el('div', 'ui-shop-head', this.el);
    this.tabsEl = el('div', 'ui-subtabs', this.el);
    const body = el('div', 'ui-shop-body', this.el);
    this.listEl = el('div', 'ui-grid shop', body);
    const right = el('div', 'ui-inv-right', body);
    this.detEl = el('div', 'ui-details', right);
    this.actEl = el('div', 'ui-actions', right);
  }

  onOpen() {
    this.tab = 'buy';
    this.sel = null;
    this.dirty = true;
    const mark = () => (this.dirty = true);
    this.offs.push(this.ctx.events.on('inventory:changed', mark), this.ctx.events.on('gold:changed', mark), this.ctx.events.on('shop:transaction', mark));
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
    const shop = inv.activeShop;
    if (!shop) return;
    this.head.innerHTML = '';
    const t = el('div', 'ui-shop-title', this.head);
    el('div', 'ui-shop-name', t, shop.def.name);
    el('div', 'ui-shop-keeper', t, `${shop.def.keeper}: “${shop.def.greeting}”`);
    const gold = el('div', 'ui-inv-gold', this.head);
    htmlEl('ui-gold-icon', goldIcon(), gold);
    el('span', '', gold, fmtInt(inv.gold));
    if (inv.freeUpgrades > 0) el('span', 'ui-inv-cap', gold, `${inv.freeUpgrades} aprimoramento(s) grátis`);

    const tabs: [Tab, string][] = [
      ['buy', 'Comprar'],
      ['sell', 'Vender'],
    ];
    if (shop.buyback.length) tabs.push(['buyback', `Recomprar (${shop.buyback.length})`]);
    if (shop.def.upgrades) tabs.push(['upgrade', 'Aprimorar armas']);
    if (!tabs.some(([id]) => id === this.tab)) this.tab = 'buy';
    this.tabsEl.innerHTML = '';
    for (const [id, label] of tabs) {
      const b = el('button', `ui-subtab${id === this.tab ? ' on' : ''}`, this.tabsEl, label);
      b.addEventListener('click', () => {
        this.tab = id;
        this.sel = null;
        this.dirty = true;
      });
    }
    button(this.tabsEl, 'Sair da loja', () => this.onExit?.(), 'ghost small right');

    this.listEl.innerHTML = '';
    this.detEl.innerHTML = '';
    this.actEl.innerHTML = '';
    if (this.tab === 'buy') this.renderBuy();
    else if (this.tab === 'sell') this.renderSell();
    else if (this.tab === 'buyback') this.renderBuyback();
    else this.renderUpgrade();
  }

  private renderBuy() {
    const inv = this.ctx.sys.inventory;
    const shop = inv.activeShop!;
    if (!this.sel && shop.stock.length) this.sel = shop.stock[0].itemId;
    for (const s of shop.stock) {
      const def = ITEMS[s.itemId];
      if (!def) continue;
      const c = itemCell(this.listEl, def, s.qty, { price: s.price });
      if (s.qty <= 0) c.classList.add('soldout');
      if (s.price > inv.gold) c.classList.add('expensive');
      if (s.itemId === this.sel) c.classList.add('sel');
      c.addEventListener('click', () => {
        this.sel = s.itemId;
        this.dirty = true;
      });
      c.addEventListener('dblclick', () => this.buy(s.itemId, 1));
    }
    if (!shop.stock.length) el('p', 'ui-empty-note', this.listEl, 'Nada à venda hoje.');
    const s = shop.stock.find((x) => x.itemId === this.sel);
    if (!s) return;
    renderDetails(this.ctx, this.detEl, s.itemId, inv.compareDef(s.itemId));
    const price = el('div', 'ui-price', this.detEl);
    price.innerHTML = `${goldIcon()}<b>${fmtInt(s.price)}</b> cada · ${s.qty} em estoque · você tem ${inv.count(s.itemId)}`;
    const b1 = button(this.actEl, 'Comprar', () => this.buy(s.itemId, 1), 'primary');
    b1.disabled = s.qty <= 0 || inv.gold < s.price;
    if (ITEMS[s.itemId].stackable && s.qty > 1) {
      const n = Math.min(5, s.qty, Math.floor(inv.gold / Math.max(1, s.price)));
      if (n > 1) button(this.actEl, `Comprar ${n}`, () => this.buy(s.itemId, n));
    }
  }

  private buy(itemId: string, qty: number) {
    this.ctx.sys.inventory.buy(itemId, qty);
    this.dirty = true;
  }

  private renderSell() {
    const inv = this.ctx.sys.inventory;
    const list = inv.sorted().filter((st) => !ITEMS[st.defId]?.bound);
    if (!this.sel || !list.some((x) => x.uid === this.sel)) this.sel = list[0]?.uid ?? null;
    for (const st of list) {
      const def = ITEMS[st.defId];
      const ok = inv.canSell(st.uid).ok;
      const c = itemCell(this.listEl, def, st.qty, { equipped: inv.isEquipped(st.uid), upgrade: st.upgrade, price: ok ? inv.sellPrice(st.uid) : undefined });
      if (!ok) c.classList.add('soldout');
      if (st.uid === this.sel) c.classList.add('sel');
      c.addEventListener('click', () => {
        this.sel = st.uid;
        this.dirty = true;
      });
      c.addEventListener('dblclick', () => this.sell(st, 1));
    }
    if (!list.length) el('p', 'ui-empty-note', this.listEl, 'Você não tem nada para vender.');
    const st = this.sel ? inv.get(this.sel) : null;
    if (!st) return;
    renderDetails(this.ctx, this.detEl, st);
    const chk = inv.canSell(st.uid);
    const price = el('div', 'ui-price', this.detEl);
    if (chk.ok) price.innerHTML = `${goldIcon()}<b>${fmtInt(inv.sellPrice(st.uid))}</b> cada`;
    else price.textContent = chk.reason ?? 'O comerciante não compra isto.';
    const b = button(this.actEl, 'Vender', () => this.sell(st, 1), 'primary');
    b.disabled = !chk.ok;
    if (chk.ok && st.qty > 1) button(this.actEl, `Vender todos (${st.qty})`, () => this.sell(st, st.qty));
  }

  private sell(st: ItemStack, qty: number) {
    this.ctx.sys.inventory.sell(st.uid, qty);
    this.dirty = true;
  }

  private renderBuyback() {
    const inv = this.ctx.sys.inventory;
    const bb = inv.activeShop!.buyback;
    bb.forEach((e, i) => {
      const def = ITEMS[e.stack.defId];
      if (!def) return;
      const c = itemCell(this.listEl, def, e.stack.qty, { upgrade: e.stack.upgrade, price: e.price });
      if (String(i) === this.sel) c.classList.add('sel');
      c.addEventListener('click', () => {
        this.sel = String(i);
        this.dirty = true;
      });
    });
    const i = Number(this.sel ?? 0);
    const e = bb[i];
    if (!e) return;
    renderDetails(this.ctx, this.detEl, e.stack);
    const b = button(this.actEl, `Recomprar por ${fmtInt(e.price)}`, () => {
      inv.buyback(i);
      this.sel = null;
      this.dirty = true;
    }, 'primary');
    b.disabled = inv.gold < e.price;
  }

  private renderUpgrade() {
    const inv = this.ctx.sys.inventory;
    const weapons = inv.sorted().filter((st) => ITEMS[st.defId]?.category === 'weapon');
    if (!this.sel || !weapons.some((x) => x.uid === this.sel)) this.sel = weapons[0]?.uid ?? null;
    for (const st of weapons) {
      const c = itemCell(this.listEl, ITEMS[st.defId], 1, { equipped: inv.isEquipped(st.uid), upgrade: st.upgrade });
      if (st.uid === this.sel) c.classList.add('sel');
      c.addEventListener('click', () => {
        this.sel = st.uid;
        this.dirty = true;
      });
    }
    if (!weapons.length) el('p', 'ui-empty-note', this.listEl, 'Você não carrega nenhuma arma que possa ser aprimorada.');
    const st = this.sel ? inv.get(this.sel) : null;
    if (!st) return;
    renderDetails(this.ctx, this.detEl, st);
    const cost = inv.upgradeCost(st.uid);
    const box = el('div', 'ui-upgrade', this.detEl);
    if (!cost) {
      el('p', '', box, 'Esta arma já está no aprimoramento máximo.');
      return;
    }
    el('div', 'ui-det-compare-title', box, `Aprimorar +${cost.from} → +${cost.to}`);
    const req = el('div', 'ui-upgrade-req', box);
    if (inv.freeUpgrades > 0) el('div', 'ok', req, 'Grátis (presente de Doran)');
    else {
      const g = el('div', inv.gold >= cost.gold ? 'ok' : 'no', req);
      g.innerHTML = `${goldIcon()} ${fmtInt(cost.gold)} de ouro`;
      for (const m of cost.materials) {
        const def = ITEMS[m.itemId];
        const have = inv.count(m.itemId);
        const r = el('div', have >= m.qty ? 'ok' : 'no', req);
        r.innerHTML = `${def ? itemIcon(def.icon.shape, def.icon.color) : ''} ${def?.name ?? m.itemId} ${have}/${m.qty}`;
      }
    }
    const chk = inv.canUpgrade(st.uid);
    const b = button(this.actEl, 'Aprimorar', () => {
      inv.upgradeWeapon(st.uid);
      this.dirty = true;
    }, 'primary');
    if (!chk.ok) {
      b.disabled = true;
      el('p', 'ui-map-card-why', this.actEl, chk.reason ?? '');
    }
  }
}
