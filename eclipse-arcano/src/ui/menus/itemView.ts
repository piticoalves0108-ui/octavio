/** Desenho de itens compartilhado por inventário, loja e baú. */
import type { GameContext } from '../../core/context';
import { ITEMS, CATEGORY_NAMES, type ItemDef } from '../../data/items';
import { RARITIES } from '../../data/weapons';
import type { ItemStack, StatDelta } from '../../rpg/Inventory';
import { el, htmlEl } from '../dom';
import { itemIcon } from '../icons';
import { escapeHtml } from './widgets';

export function itemCell(parent: HTMLElement, def: ItemDef, qty: number, opts: { equipped?: boolean; upgrade?: number; price?: number } = {}): HTMLElement {
  const c = el('div', `ui-cell rar-${def.rarity}`, parent);
  htmlEl('ui-cell-icon', itemIcon(def.icon.shape, def.icon.color), c);
  if (qty > 1) el('span', 'ui-cell-qty', c, `×${qty}`);
  if (opts.upgrade) el('span', 'ui-cell-up', c, `+${opts.upgrade}`);
  if (opts.equipped) el('span', 'ui-cell-eq', c, 'E');
  if (opts.price !== undefined) el('span', 'ui-cell-price', c, String(opts.price));
  return c;
}

export function emptyCell(parent: HTMLElement): HTMLElement {
  return el('div', 'ui-cell empty', parent);
}

/** Painel de detalhes (ícone grande, nome, linhas, história e comparação). */
export function renderDetails(ctx: GameContext, target: HTMLElement, src: ItemStack | string, deltas: StatDelta[] = []) {
  target.innerHTML = '';
  const defId = typeof src === 'string' ? src : src.defId;
  const def = ITEMS[defId];
  if (!def) return;
  const inv = ctx.sys.inventory;
  const rar = RARITIES[def.rarity];
  const top = el('div', 'ui-det-top', target);
  htmlEl(`ui-det-icon rar-${def.rarity}`, itemIcon(def.icon.shape, def.icon.color), top);
  const names = el('div', 'ui-det-names', top);
  const name = el('div', 'ui-det-name', names, typeof src === 'string' ? def.name : inv.displayName(src));
  name.style.color = rar.css;
  el('div', 'ui-det-cat', names, `${CATEGORY_NAMES[def.category]} · ${rar.name}`);
  el('p', 'ui-det-desc', target, def.description);
  const lines = inv.describe(src);
  if (lines.length) {
    const ul = el('ul', 'ui-det-lines', target);
    for (const l of lines.slice(1)) el('li', '', ul, l);
  }
  if (deltas.length) {
    const box = el('div', 'ui-det-compare', target);
    el('div', 'ui-det-compare-title', box, 'Comparado ao equipado');
    for (const d of deltas) {
      if (d.better === null) continue;
      const row = el('div', `ui-delta ${d.better ? 'up' : 'down'}`, box);
      row.innerHTML = `<span>${escapeHtml(d.label)}</span><span>${d.better ? '▲' : '▼'} ${fmtDelta(d)}</span>`;
    }
    if (!box.querySelector('.ui-delta')) el('div', 'ui-delta same', box, 'Sem diferença.');
  }
  if (def.lore) el('p', 'ui-det-lore', target, `“${def.lore}”`);
}

function fmtDelta(d: StatDelta): string {
  const v = d.delta;
  const abs = Math.abs(v);
  const sign = v > 0 ? '+' : '−';
  switch (d.format) {
    case 'pct':
      return `${sign}${Math.round(abs * 100)}%`;
    case 'mul':
      return `${sign}${abs.toFixed(2).replace('.', ',')}×`;
    case 'dec':
      return `${sign}${abs.toFixed(1).replace('.', ',')}`;
    default:
      return `${sign}${Math.round(abs)}`;
  }
}
