/**
 * Camadas de aviso da interface: notificações, itens coletados (com ícone), faixas
 * grandes (lugar descoberto, nova missão, missão concluída, nível), legendas, cartões
 * de título, escurecimento de tela, indicador de salvamento e nomes de combinações.
 */
import type { GameContext } from '../core/context';
import { ITEMS } from '../data/items';
import { el, htmlEl, show } from './dom';
import { itemIcon } from './icons';

const CATEGORY_OVER: Record<string, string> = {
  main: 'Missão principal',
  side: 'Nova missão',
  contract: 'Novo contrato',
  personal: 'Missão pessoal',
  mystery: 'Mistério',
};

export type NotifyKind = 'info' | 'quest' | 'loot' | 'warning' | 'level' | 'discovery';

interface Banner {
  kind: string;
  over: string;
  title: string;
  sub?: string;
  duration: number;
}

export class Overlays {
  private toasts: HTMLElement;
  private loot: HTMLElement;
  private bannerEl: HTMLElement;
  private bannerQueue: Banner[] = [];
  private bannerBusy = false;
  private subtitle: HTMLElement;
  private subtitleTimer: number | null = null;
  private title: HTMLElement;
  private titleTimer: number | null = null;
  private fader: HTMLElement;
  private saveEl: HTMLElement;
  private saveTimer: number | null = null;
  private combo: HTMLElement;
  private comboTimer: number | null = null;
  private placeEl: HTMLElement;
  private placeTimer: number | null = null;
  private lastPickup = { defId: '', t: 0 };
  private recent = new Map<string, number>();

  constructor(private ctx: GameContext, parent: HTMLElement) {
    this.toasts = el('div', 'ui-toasts', parent);
    this.loot = el('div', 'ui-loot', parent);
    this.bannerEl = el('div', 'ui-banner', parent);
    this.placeEl = el('div', 'ui-place', parent);
    this.subtitle = el('div', 'ui-subtitle', parent);
    this.title = el('div', 'ui-titlecard', parent);
    this.combo = el('div', 'ui-combo', parent);
    this.saveEl = el('div', 'ui-saving', parent);
    this.saveEl.innerHTML = `<span class="ui-saving-rune"></span><span>Salvando…</span>`;
    this.fader = el('div', 'ui-fader', parent);
    this.bind();
  }

  private bind() {
    const ev = this.ctx.events;
    ev.on('ui:notify', ({ text, kind }) => this.notify(text, kind ?? 'info'));
    ev.on('item:pickup', ({ defId }) => {
      this.lastPickup.defId = defId;
      this.lastPickup.t = performance.now();
    });
    ev.on('location:discovered', ({ locationId, name }) => {
      this.recent.set(locationId, performance.now());
      this.banner({ kind: 'discovery', over: 'Lugar descoberto', title: name, duration: 4.2 });
    });
    ev.on('location:entered', ({ locationId, name }) => {
      if (this.ctx.state !== 'playing') return;
      // a primeira visita já mostra a faixa grande
      const t = this.recent.get(locationId) ?? -1e9;
      if (performance.now() - t < 12000) return;
      this.showPlace(name);
    });
    ev.on('level:up', ({ level }) => {
      this.banner({ kind: 'level', over: 'Novo nível', title: `Nível ${level}`, sub: 'Vida e energia restauradas · ponto de talento', duration: 3.6 });
    });
    ev.on('quest:started', ({ questId }) => {
      const q = this.ctx.sys.quests.def(questId);
      if (q) this.banner({ kind: 'quest', over: CATEGORY_OVER[q.category] ?? 'Nova missão', title: q.title, duration: 3.6 });
    });
    ev.on('quest:completed', ({ questId }) => {
      const q = this.ctx.sys.quests.def(questId);
      if (q) this.banner({ kind: 'done', over: 'Missão concluída', title: q.title, duration: 3.8 });
    });
    ev.on('quest:failed', ({ questId }) => {
      const q = this.ctx.sys.quests.def(questId);
      if (q) this.banner({ kind: 'failed', over: 'Missão fracassada', title: q.title, duration: 3.4 });
    });
    ev.on('quest:updated', ({ questId }) => {
      if (questId !== this.ctx.sys.quests.tracked) return;
      const entry = this.ctx.sys.quests.getJournal().find((j) => j.id === questId);
      if (entry?.nextStep) this.notify(entry.nextStep, 'quest');
    });
    ev.on('game:saved', () => this.showSaving());
    ev.on('combat:combo', ({ name }) => this.showCombo(name));
    ev.on('combat:parry', ({ defender }) => {
      if (defender === this.ctx.sys.player.entity) this.showCombo('Aparo perfeito!', 'parry');
    });
    ev.on('cinematic:title', ({ title, subtitle, duration }) => this.showTitleCard(title, subtitle, duration));
  }

  // ---------------------------------------------------------------------------
  // Notificações
  // ---------------------------------------------------------------------------

  notify(text: string, kind: NotifyKind = 'info') {
    if (!text) return;
    // evita repetir a mesma frase em sequência (vários sistemas avisando a mesma coisa)
    const now = performance.now();
    const key = `${kind}|${text}`;
    if (now - (this.recent.get(key) ?? -1e9) < 900) return;
    this.recent.set(key, now);
    if (kind === 'loot') return this.lootLine(text);
    if (kind === 'discovery') return this.banner({ kind: 'discovery', over: 'Descoberta', title: text, duration: 3.5 });
    const t = el('div', `ui-toast ${kind}`, this.toasts);
    el('span', 'ui-toast-mark', t, kind === 'warning' ? '!' : kind === 'quest' ? '◆' : kind === 'level' ? '✦' : '•');
    el('span', 'ui-toast-text', t, text);
    while (this.toasts.childElementCount > 4) this.toasts.firstElementChild?.remove();
    const life = Math.min(9000, 3200 + text.length * 45);
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 450);
  }

  private lootLine(text: string) {
    const row = el('div', 'ui-loot-row', this.loot);
    // ícone do item recém-coletado, se a frase é dele
    const def = ITEMS[this.lastPickup.defId];
    const fresh = performance.now() - this.lastPickup.t < 120;
    if (def && fresh && text.startsWith(def.name)) {
      htmlEl('ui-loot-icon', itemIcon(def.icon.shape, def.icon.color), row);
      row.style.setProperty('--rar', `var(--rar-${def.rarity})`);
    } else if (/ouro/i.test(text)) htmlEl('ui-loot-icon', itemIcon('coin', '#ffd36a'), row);
    else el('span', 'ui-loot-dot', row, '✦');
    el('span', 'ui-loot-text', row, text);
    while (this.loot.childElementCount > 6) this.loot.firstElementChild?.remove();
    setTimeout(() => row.classList.add('out'), 3800);
    setTimeout(() => row.remove(), 4300);
  }

  // ---------------------------------------------------------------------------
  // Faixas grandes (uma por vez, em fila)
  // ---------------------------------------------------------------------------

  banner(b: Banner) {
    if (b.kind === 'discovery') this.recent.set(`disc|${b.title}`, performance.now());
    this.bannerQueue.push(b);
    if (!this.bannerBusy) this.nextBanner();
  }

  private nextBanner() {
    const b = this.bannerQueue.shift();
    if (!b) {
      this.bannerBusy = false;
      return;
    }
    this.bannerBusy = true;
    const e = this.bannerEl;
    e.className = `ui-banner ${b.kind}`;
    e.innerHTML = '';
    el('div', 'ui-banner-over', e, b.over);
    el('div', 'ui-banner-title', e, b.title);
    el('div', 'ui-banner-line', e);
    if (b.sub) el('div', 'ui-banner-sub', e, b.sub);
    void e.offsetWidth;
    e.classList.add('in');
    setTimeout(() => e.classList.remove('in'), b.duration * 1000);
    setTimeout(() => this.nextBanner(), b.duration * 1000 + 600);
  }

  private showPlace(name: string) {
    this.placeEl.textContent = name;
    this.placeEl.classList.remove('in');
    void this.placeEl.offsetWidth;
    this.placeEl.classList.add('in');
    if (this.placeTimer) clearTimeout(this.placeTimer);
    this.placeTimer = window.setTimeout(() => this.placeEl.classList.remove('in'), 2600);
  }

  // ---------------------------------------------------------------------------
  // Legendas e títulos
  // ---------------------------------------------------------------------------

  showSubtitle(text: string, duration = 3) {
    if (this.subtitleTimer) clearTimeout(this.subtitleTimer);
    if (!text || duration <= 0.02) {
      this.subtitle.classList.remove('in');
      return;
    }
    // "Nome: fala" → nome destacado
    const m = /^([^:()]{2,32}):\s(.+)$/s.exec(text);
    this.subtitle.innerHTML = '';
    if (m) {
      el('span', 'who', this.subtitle, m[1]);
      el('span', 'what', this.subtitle, m[2]);
    } else el('span', `what${text.startsWith('(') ? ' narr' : ''}`, this.subtitle, text);
    this.subtitle.classList.add('in');
    this.subtitleTimer = window.setTimeout(() => this.subtitle.classList.remove('in'), duration * 1000);
  }

  showTitleCard(title: string, subtitle?: string, duration = 4) {
    if (this.titleTimer) clearTimeout(this.titleTimer);
    this.title.innerHTML = '';
    el('div', 'ui-titlecard-line', this.title);
    el('div', 'ui-titlecard-title', this.title, title);
    if (subtitle) el('div', 'ui-titlecard-sub', this.title, subtitle);
    el('div', 'ui-titlecard-line', this.title);
    this.title.classList.remove('in');
    void this.title.offsetWidth;
    this.title.classList.add('in');
    this.titleTimer = window.setTimeout(() => this.title.classList.remove('in'), Math.max(1, duration) * 1000);
  }

  private showCombo(name: string, cls = '') {
    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.combo.className = `ui-combo ${cls}`;
    this.combo.textContent = name;
    void this.combo.offsetWidth;
    this.combo.classList.add('in');
    this.comboTimer = window.setTimeout(() => this.combo.classList.remove('in'), 1400);
  }

  private showSaving() {
    show(this.saveEl, true, 'flex');
    this.saveEl.classList.add('in');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.saveEl.classList.remove('in'), 1800);
  }

  // ---------------------------------------------------------------------------
  // Escurecimento
  // ---------------------------------------------------------------------------

  fade(to: 0 | 1, duration: number, color: 'black' | 'white' = 'black'): Promise<void> {
    const f = this.fader;
    // a cor só muda ao escurecer; ao clarear mantém a cor atual até sumir
    if (to) f.classList.toggle('white', color === 'white');
    // título escuro sobre o clarão branco
    this.title.classList.toggle('on-white', !!to && color === 'white');
    f.style.transitionDuration = `${Math.max(0.01, duration)}s`;
    f.style.pointerEvents = to ? 'auto' : 'none';
    void f.offsetWidth;
    f.style.opacity = String(to);
    return new Promise((r) => setTimeout(r, Math.max(10, duration * 1000)));
  }

  get faded(): boolean {
    return this.fader.style.opacity === '1';
  }
}
