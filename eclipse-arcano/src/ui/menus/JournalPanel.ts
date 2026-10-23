/**
 * Diário de missões: lista (ativas, concluídas, fracassadas) e detalhes com objetivos,
 * próximo passo, recompensas e registro. Permite rastrear a missão no HUD e abrir o
 * mapa centrado no objetivo.
 */
import type { GameContext } from '../../core/context';
import type { JournalEntry } from '../../rpg/Quests';
import { el } from '../dom';
import { button, type Panel } from './widgets';

const CAT_NAMES: Record<string, string> = {
  main: 'Missão principal',
  side: 'Missão secundária',
  contract: 'Contrato',
  personal: 'Missão pessoal',
  mystery: 'Mistério',
};
const CAT_ORDER = ['main', 'side', 'personal', 'contract', 'mystery'];

export class JournalPanel implements Panel {
  readonly el: HTMLElement;
  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private selected: string | null = null;
  private entries: JournalEntry[] = [];
  private dirty = true;
  private offs: (() => void)[] = [];
  /** Chamado por "Ver no mapa" (a UI abre o mapa centrado no ponto). */
  onShowOnMap: ((questId: string) => void) | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-journal');
    this.listEl = el('div', 'ui-journal-list', this.el);
    this.detailEl = el('div', 'ui-journal-detail', this.el);
  }

  onOpen() {
    this.dirty = true;
    const q = this.ctx.sys.quests;
    if (!this.selected) this.selected = q.tracked;
    const mark = () => (this.dirty = true);
    this.offs.push(this.ctx.events.on('quest:updated', mark), this.ctx.events.on('quest:started', mark), this.ctx.events.on('quest:completed', mark), this.ctx.events.on('quest:tracked', mark));
  }

  onClose() {
    for (const off of this.offs.splice(0)) off();
  }

  update() {
    if (this.dirty) this.render();
  }

  private render() {
    this.dirty = false;
    const q = this.ctx.sys.quests;
    this.entries = q.getJournal();
    const active = this.entries.filter((e) => e.status === 'active').sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));
    const done = this.entries.filter((e) => e.status === 'completed');
    const failed = this.entries.filter((e) => e.status === 'failed');
    if (!this.selected || !this.entries.some((e) => e.id === this.selected)) this.selected = active[0]?.id ?? done[0]?.id ?? null;

    this.listEl.innerHTML = '';
    const group = (title: string, list: JournalEntry[]) => {
      if (!list.length) return;
      el('h3', 'ui-heading', this.listEl, `${title} (${list.length})`);
      for (const e of list) {
        const row = el('div', `ui-quest-row cat-${e.category} st-${e.status}${e.id === this.selected ? ' sel' : ''}`, this.listEl);
        el('span', 'ui-quest-mark', row, e.id === q.tracked ? '◆' : e.category === 'main' ? '✦' : '•');
        el('span', 'ui-quest-title', row, e.title);
        row.addEventListener('click', () => {
          this.selected = e.id;
          this.dirty = true;
        });
        row.addEventListener('dblclick', () => {
          if (e.status === 'active') q.setTracked(e.id);
        });
      }
    };
    group('Em andamento', active);
    group('Concluídas', done);
    group('Fracassadas', failed);
    if (!this.entries.length) el('p', 'ui-empty-note', this.listEl, 'Nenhuma missão ainda. Converse com as pessoas.');

    this.renderDetail();
  }

  private renderDetail() {
    const q = this.ctx.sys.quests;
    const d = this.detailEl;
    d.innerHTML = '';
    const e = this.entries.find((x) => x.id === this.selected);
    if (!e) return;
    el('div', 'ui-quest-cat', d, `${CAT_NAMES[e.category] ?? e.category}${e.status === 'completed' ? ' · concluída' : e.status === 'failed' ? ' · fracassada' : ''}`);
    el('h2', 'ui-quest-name', d, e.title);
    el('p', 'ui-quest-desc', d, e.description);
    if (e.status === 'active' && e.nextStep) {
      const next = el('div', 'ui-quest-next', d);
      el('span', 'k', next, 'Próximo passo');
      el('span', '', next, e.nextStep);
    }
    if (e.objectives.length) {
      const ul = el('ul', 'ui-objectives', d);
      for (const o of e.objectives) {
        const li = el('li', `${o.done ? 'done' : ''}${o.optional ? ' opt' : ''}`, ul);
        el('span', 'box', li, o.done ? '✓' : '');
        el('span', 't', li, `${o.text}${o.optional ? ' (opcional)' : ''}`);
        if (o.target && o.target > 1) el('span', 'p', li, `${o.progress ?? 0}/${o.target}`);
      }
    }
    if (e.rewardsText) {
      const r = el('div', 'ui-quest-rewards', d);
      el('span', 'k', r, 'Recompensa');
      el('span', '', r, e.rewardsText);
    }
    if (e.status === 'active') {
      const row = el('div', 'ui-actions', d);
      if (q.tracked === e.id) button(row, 'Parar de rastrear', () => q.setTracked(null), 'ghost');
      else button(row, 'Rastrear', () => q.setTracked(e.id), 'primary');
      if (q.getMarkers().some((m) => m.questId === e.id)) button(row, 'Ver no mapa', () => this.onShowOnMap?.(e.id), 'ghost');
    }
    if (e.log.length) {
      el('h3', 'ui-heading', d, 'Registro');
      const log = el('ol', 'ui-quest-log', d);
      for (const line of e.log.slice().reverse()) el('li', '', log, line);
    }
  }

  handleKey(code: string): boolean {
    const ids = Array.from(this.listEl.querySelectorAll('.ui-quest-row')).map((r, i) => ({ r, i }));
    if (!ids.length) return false;
    const order = this.entries
      .filter((e) => e.status === 'active')
      .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category))
      .concat(this.entries.filter((e) => e.status === 'completed'), this.entries.filter((e) => e.status === 'failed'));
    const i = Math.max(0, order.findIndex((e) => e.id === this.selected));
    if (code === 'ArrowDown' || code === 'ArrowUp') {
      const n = Math.max(0, Math.min(order.length - 1, i + (code === 'ArrowDown' ? 1 : -1)));
      this.selected = order[n].id;
      this.dirty = true;
      return true;
    }
    if (code === 'Enter' || code === 'KeyT') {
      const e = order[i];
      if (e?.status === 'active') this.ctx.sys.quests.setTracked(this.ctx.sys.quests.tracked === e.id ? null : e.id);
      return true;
    }
    return false;
  }
}
