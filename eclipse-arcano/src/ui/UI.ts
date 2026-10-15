import type * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { MenuName } from '../core/EventBus';
import type { Entity } from '../core/Entity';
import type { DialogueView } from '../rpg/Dialogue';
import './ui.css';

/**
 * STUB — interface (HUD, menus, diálogos, inventário, mapa...). DOM sobre o canvas.
 * O módulo ui/ substitui a implementação mantendo a API pública.
 */
export class UI implements GameSystem {
  readonly name = 'ui';
  alwaysUpdate = true;
  openMenuName: MenuName | null = null;
  protected ctx!: GameContext;
  protected root!: HTMLElement;
  private promptEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private menuEl!: HTMLElement;

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.root = ctx.uiRoot;
    this.promptEl = this.el('div', 'ui-prompt');
    this.menuEl = this.el('div', 'ui-menu');
    this.menuEl.style.display = 'none';
  }

  /** Cria a tela de carregamento (chamado antes do init dos sistemas). */
  showLoading(progress: number, text: string) {
    if (!this.loadingEl) {
      this.loadingEl = document.createElement('div');
      this.loadingEl.className = 'ui-loading';
      (this.root ?? document.getElementById('ui-root')!).appendChild(this.loadingEl);
    }
    this.loadingEl.style.display = 'flex';
    this.loadingEl.textContent = `${text} ${Math.round(progress * 100)}%`;
  }
  hideLoading() {
    if (this.loadingEl) this.loadingEl.style.display = 'none';
  }

  showMainMenu() {
    this.openMenuName = 'main';
    this.menuEl.style.display = 'flex';
    this.menuEl.innerHTML = '';
    const title = this.el('h1', '', this.menuEl);
    title.textContent = 'Eclipse Arcano';
    const b1 = this.el('button', '', this.menuEl);
    b1.textContent = 'Novo jogo';
    b1.onclick = () => {
      this.closeMenu();
      void this.ctx.newGame();
    };
    if (this.ctx.sys.save.hasSave()) {
      const b2 = this.el('button', '', this.menuEl);
      b2.textContent = 'Continuar';
      b2.onclick = async () => {
        this.closeMenu();
        if (!(await this.ctx.continueGame())) this.showMainMenu();
      };
    }
  }

  openMenu(menu: MenuName) {
    if (menu === 'main') return this.showMainMenu();
    this.openMenuName = menu;
    this.ctx.events.emit('ui:menu', { menu });
  }
  closeMenu() {
    this.openMenuName = null;
    this.menuEl.style.display = 'none';
    this.ctx.events.emit('ui:menu', { menu: null });
  }
  isMenuOpen() {
    return this.openMenuName !== null;
  }

  setInteractPrompt(text: string | null) {
    if (!this.promptEl) return;
    this.promptEl.textContent = text ? `[E] ${text}` : '';
    this.promptEl.style.display = text ? 'block' : 'none';
  }
  notify(text: string, _kind: 'info' | 'quest' | 'loot' | 'warning' | 'level' | 'discovery' = 'info') {
    console.info('[UI]', text);
  }
  showDialogue(_view: DialogueView | null) {}
  showBossBar(_name: string | null, _entity?: Entity | null) {}
  showSubtitle(_text: string, _duration = 3) {}
  /** Escurece a tela (transições/cinemáticas). */
  async fadeOut(_duration = 0.5): Promise<void> {}
  async fadeIn(_duration = 0.5): Promise<void> {}
  /** Marcador temporário no mundo (ex.: "!" sobre NPC). */
  worldMarker(_id: string, _position: THREE.Vector3 | null, _label?: string) {}

  update(_dt: number, ctx: GameContext) {
    if (ctx.state === 'playing' && ctx.input.pressed('pause')) {
      ctx.setState('paused');
    } else if (ctx.state === 'paused' && ctx.input.pressed('pause')) {
      ctx.setState('playing');
    }
  }

  protected el(tag: string, cls: string, parent: HTMLElement = this.root): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    parent.appendChild(e);
    return e;
  }
}
