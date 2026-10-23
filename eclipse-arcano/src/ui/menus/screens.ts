/** Telas simples: título, pausa, salvar/carregar, derrota e créditos. */
import type { GameContext } from '../../core/context';
import type { SaveMeta } from '../../save/SaveSystem';
import { el, fmtPlayTime, fmtTime } from '../dom';
import { button, confirmBox, type Panel } from './widgets';

const SLOT_NAMES: Record<string, string> = { auto: 'Salvamento automático', quick: 'Salvamento rápido (F5)', slot1: 'Espaço 1', slot2: 'Espaço 2', slot3: 'Espaço 3' };

function dateLabel(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Tela de título
// ---------------------------------------------------------------------------

export interface MainMenuActions {
  newGame(): void;
  continueGame(): void;
  openLoad(): void;
  openSettings(): void;
  openCredits(): void;
}

export class MainMenu implements Panel {
  readonly el: HTMLElement;
  private list: HTMLElement;
  private sel = 0;

  constructor(private ctx: GameContext, private actions: MainMenuActions) {
    this.el = el('div', 'ui-title-screen');
    const logo = el('div', 'ui-logo', this.el);
    el('div', 'ui-logo-rune', logo);
    el('div', 'ui-logo-top', logo, 'Eclipse');
    el('div', 'ui-logo-main', logo, 'Arcano');
    el('div', 'ui-logo-sub', logo, 'O Mago do Tempo Perdido');
    this.list = el('div', 'ui-title-menu', this.el);
    el('div', 'ui-title-foot', this.el, 'Versão 0.2 · Mouse e teclado · Todo o conteúdo é gerado por código');
  }

  onOpen() {
    this.list.innerHTML = '';
    const save = this.ctx.sys.save;
    const has = save.hasSave();
    if (has) {
      const latest = save.listSaves()[0];
      const b = button(this.list, 'Continuar', () => this.actions.continueGame(), 'title');
      if (latest) el('span', 'ui-title-meta', b, `Nível ${latest.level} · ${latest.location || '—'} · ${dateLabel(latest.timestamp)}`);
    }
    button(this.list, 'Novo jogo', () => {
      if (has) confirmBox(this.el, 'Começar uma nova aventura? Seus salvamentos continuam guardados.', 'Começar', () => this.actions.newGame());
      else this.actions.newGame();
    }, 'title');
    if (has) button(this.list, 'Carregar jogo', () => this.actions.openLoad(), 'title');
    button(this.list, 'Opções', () => this.actions.openSettings(), 'title');
    button(this.list, 'Créditos', () => this.actions.openCredits(), 'title');
    this.sel = 0;
    this.mark();
  }

  private mark() {
    const items = Array.from(this.list.children) as HTMLElement[];
    items.forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  }

  handleKey(code: string): boolean {
    const items = Array.from(this.list.children) as HTMLButtonElement[];
    if (code === 'ArrowDown' || code === 'KeyS') this.sel = (this.sel + 1) % items.length;
    else if (code === 'ArrowUp' || code === 'KeyW') this.sel = (this.sel - 1 + items.length) % items.length;
    else if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
      items[this.sel]?.click();
      return true;
    } else return false;
    this.mark();
    return true;
  }
}

// ---------------------------------------------------------------------------
// Pausa
// ---------------------------------------------------------------------------

export interface PauseActions {
  resume(): void;
  open(tab: 'map' | 'inventory' | 'skills' | 'journal' | 'settings'): void;
  openSave(): void;
  openLoad(): void;
  quit(): void;
}

export class PausePanel implements Panel {
  readonly el: HTMLElement;
  private list: HTMLElement;
  private info: HTMLElement;
  private sel = 0;

  constructor(private ctx: GameContext, private actions: PauseActions) {
    this.el = el('div', 'ui-pause');
    const left = el('div', 'ui-pause-left', this.el);
    el('div', 'ui-pause-title', left, 'Pausa');
    this.list = el('div', 'ui-pause-menu', left);
    this.info = el('div', 'ui-pause-info', this.el);
  }

  onOpen() {
    const a = this.actions;
    this.list.innerHTML = '';
    button(this.list, 'Continuar', () => a.resume(), 'menu');
    button(this.list, 'Mapa', () => a.open('map'), 'menu');
    button(this.list, 'Inventário', () => a.open('inventory'), 'menu');
    button(this.list, 'Habilidades', () => a.open('skills'), 'menu');
    button(this.list, 'Diário', () => a.open('journal'), 'menu');
    button(this.list, 'Salvar jogo', () => a.openSave(), 'menu');
    button(this.list, 'Carregar jogo', () => a.openLoad(), 'menu');
    button(this.list, 'Opções', () => a.open('settings'), 'menu');
    button(this.list, 'Sair para o menu principal', () => confirmBox(this.el, 'Sair para o menu principal? O que não foi salvo será perdido.', 'Sair', () => a.quit()), 'menu');
    this.sel = 0;
    this.mark();
    this.renderInfo();
  }

  private renderInfo() {
    const { sys, clock } = this.ctx;
    const i = this.info;
    i.innerHTML = '';
    el('div', 'ui-pause-where', i, sys.world.currentLocation?.name ?? 'Terras de Brumafria');
    el('div', 'ui-pause-when', i, `Dia ${clock.day} · ${fmtTime(clock.hours)} · ${sys.env.weatherLabel()}`);
    const grid = el('div', 'ui-pause-stats', i);
    const stat = (k: string, v: string) => {
      const d = el('div', '', grid);
      el('span', '', d, k);
      el('b', '', d, v);
    };
    stat('Nível', String(sys.progression.level));
    stat('Tempo de jogo', fmtPlayTime(sys.save.playTime));
    stat('Mapa explorado', `${Math.round(sys.world.exploration.fraction() * 100)}%`);
    stat('Ouro', String(sys.inventory.gold));
    const t = sys.quests.tracked;
    const entry = t ? sys.quests.getJournal().find((j) => j.id === t) : null;
    if (entry) {
      const q = el('div', 'ui-pause-quest', i);
      el('span', 'k', q, 'Missão rastreada');
      el('div', 'n', q, entry.title);
      el('div', 's', q, entry.nextStep);
    }
  }

  private mark() {
    (Array.from(this.list.children) as HTMLElement[]).forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  }

  handleKey(code: string): boolean {
    const items = Array.from(this.list.children) as HTMLButtonElement[];
    if (code === 'ArrowDown' || code === 'KeyS') this.sel = (this.sel + 1) % items.length;
    else if (code === 'ArrowUp' || code === 'KeyW') this.sel = (this.sel - 1 + items.length) % items.length;
    else if (code === 'Enter' || code === 'NumpadEnter') {
      items[this.sel]?.click();
      return true;
    } else return false;
    this.mark();
    return true;
  }
}

// ---------------------------------------------------------------------------
// Salvar / carregar
// ---------------------------------------------------------------------------

export class SavePanel implements Panel {
  readonly el: HTMLElement;
  private body: HTMLElement;
  private titleEl: HTMLElement;
  mode: 'save' | 'load' = 'load';
  onBack: (() => void) | null = null;
  onLoad: ((slot: string) => void) | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-saves');
    this.titleEl = el('h2', 'ui-panel-title', this.el);
    this.body = el('div', 'ui-save-list', this.el);
    const foot = el('div', 'ui-actions', this.el);
    button(foot, 'Voltar', () => this.onBack?.(), 'ghost');
  }

  onOpen() {
    this.render();
  }

  private render() {
    const save = this.ctx.sys.save;
    this.titleEl.textContent = this.mode === 'save' ? 'Salvar jogo' : 'Carregar jogo';
    this.body.innerHTML = '';
    const metas = new Map<string, SaveMeta>(save.listSaves().map((m) => [m.slot, m]));
    const slots = this.mode === 'save' ? ['slot1', 'slot2', 'slot3'] : ['auto', 'quick', 'slot1', 'slot2', 'slot3'];
    for (const slot of slots) {
      const m = metas.get(slot);
      if (this.mode === 'load' && !m) continue;
      const row = el('div', `ui-save-row${m ? '' : ' empty'}`, this.body);
      const txt = el('div', 'ui-save-txt', row);
      el('div', 'ui-save-name', txt, SLOT_NAMES[slot] ?? slot);
      el('div', 'ui-save-meta', txt, m ? `Nível ${m.level} · ${m.location || '—'}${m.quest ? ` · ${m.quest}` : ''}` : 'Vazio');
      if (m) el('div', 'ui-save-date', txt, `${dateLabel(m.timestamp)} · ${fmtPlayTime(m.playTime)} de jogo`);
      const act = el('div', 'ui-save-act', row);
      if (this.mode === 'save') {
        button(act, m ? 'Sobrescrever' : 'Salvar aqui', () => {
          const go = () => {
            if (this.ctx.sys.save.save(slot)) this.ctx.sys.ui.notify('Jogo salvo.', 'info');
            this.render();
          };
          if (m) confirmBox(this.el, `Sobrescrever ${SLOT_NAMES[slot]}?`, 'Sobrescrever', go);
          else go();
        }, 'primary small');
      } else {
        button(act, 'Carregar', () => this.onLoad?.(slot), 'primary small');
      }
      if (m && slot !== 'auto') {
        button(act, 'Apagar', () => confirmBox(this.el, `Apagar ${SLOT_NAMES[slot]}? Não dá para desfazer.`, 'Apagar', () => {
          this.ctx.sys.save.deleteSave(slot);
          this.render();
        }), 'ghost danger small');
      }
    }
    if (!this.body.childElementCount) el('p', 'ui-empty-note', this.body, 'Nenhum salvamento encontrado.');
  }
}

// ---------------------------------------------------------------------------
// Derrota
// ---------------------------------------------------------------------------

export interface GameOverActions {
  retry(): void;
  loadLast(): void;
  quit(): void;
}

export class GameOverPanel implements Panel {
  readonly el: HTMLElement;
  private list: HTMLElement;

  constructor(private ctx: GameContext, private actions: GameOverActions) {
    this.el = el('div', 'ui-gameover');
    el('div', 'ui-gameover-title', this.el, 'Você caiu');
    el('div', 'ui-gameover-sub', this.el, 'O selo ainda precisa de você, Kaelen.');
    this.list = el('div', 'ui-gameover-menu', this.el);
  }

  onOpen() {
    this.list.innerHTML = '';
    button(this.list, 'Renascer no último ponto seguro', () => this.actions.retry(), 'primary');
    if (this.ctx.sys.save.hasSave()) button(this.list, 'Carregar o último salvamento', () => this.actions.loadLast());
    button(this.list, 'Menu principal', () => this.actions.quit(), 'ghost');
  }

  handleKey(code: string): boolean {
    if (code === 'Enter' || code === 'Space' || code === 'KeyE') {
      this.actions.retry();
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Créditos
// ---------------------------------------------------------------------------

export class CreditsPanel implements Panel {
  readonly el: HTMLElement;
  onBack: (() => void) | null = null;

  constructor() {
    this.el = el('div', 'ui-credits');
    const roll = el('div', 'ui-credits-roll', this.el);
    const block = (title: string, lines: string[]) => {
      el('h3', '', roll, title);
      for (const l of lines) el('p', '', roll, l);
    };
    el('div', 'ui-logo-main small', roll, 'Eclipse Arcano');
    el('div', 'ui-logo-sub', roll, 'O Mago do Tempo Perdido');
    block('Criação', ['Projeto Octavio', 'com Claude (Anthropic)']);
    block('Mundo, criaturas, música e efeitos', ['Tudo gerado por código, sem arquivos de terceiros.']);
    block('Tecnologia', ['Three.js · TypeScript · Vite · Web Audio']);
    block('Fontes', ['Cinzel — The Cinzel Project Authors (SIL OFL 1.1)', 'Manrope — The Manrope Project Authors (SIL OFL 1.1)']);
    block('Agradecimentos', ['A quem jogar até o fim do eclipse.']);
    const foot = el('div', 'ui-actions', this.el);
    button(foot, 'Voltar', () => this.onBack?.(), 'ghost');
  }
}
