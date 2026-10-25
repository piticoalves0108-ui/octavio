import type * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { GameStateName, MenuName } from '../core/EventBus';
import type { Entity } from '../core/Entity';
import type { DialogueView } from '../rpg/Dialogue';
import { el, show, toggleClass } from './dom';
import { Hud } from './Hud';
import { Minimap } from './Minimap';
import { Overlays, type NotifyKind } from './Overlays';
import { WorldOverlay } from './WorldOverlay';
import { DialogueBox } from './DialogueBox';
import { MapBaseRenderer, FogRenderer } from './mapRender';
import { createMenuHost, type MenuHost } from './menus';
import { fastTravel } from './fastTravel';
import './fonts.css';
import './ui.css';

/** Menus que pausam o jogo enquanto abertos. */
const PAUSING: MenuName[] = ['pause', 'inventory', 'skills', 'journal', 'map', 'settings', 'shop', 'stash', 'cooking'];

const TIPS = [
  'Voar gasta energia. Pouse antes que a roda azul se esvazie.',
  'Explore do alto: voando, a névoa do mapa some muito mais longe.',
  'Aperte M para o mapa. Lugares descobertos permitem viagem rápida.',
  'Magias em sequência criam combinações. Experimente Explosão Rúnica dentro da Fenda.',
  'Defender no momento exato do golpe aplica um Aparo perfeito.',
  'Ervas-lúmen brilham à noite na Floresta de Lúmen.',
  'O ferreiro Doran aprimora armas com ouro e materiais.',
  'Usar magia dentro dos muros de Brumafria assusta os moradores.',
  'Carimbe o mapa com o que encontrar: clique no mapa para marcar.',
];

/**
 * Interface do jogo (DOM sobre o canvas): HUD, minimapa, barras sobre inimigos,
 * diálogos, avisos, legendas, cartões de título, escurecimento, menus (título,
 * pausa, mapa, inventário, habilidades, diário, opções, loja, baú, salvar/carregar,
 * derrota, créditos). Mantém a API pública do contrato original.
 */
export class UI implements GameSystem {
  readonly name = 'ui';
  alwaysUpdate = true;
  openMenuName: MenuName | null = null;
  protected ctx!: GameContext;
  protected root!: HTMLElement;
  private loadingEl!: HTMLElement;
  private loadingBar!: HTMLElement;
  private loadingText!: HTMLElement;
  private built = false;
  private hud!: Hud;
  private minimap!: Minimap;
  private overlays!: Overlays;
  private world!: WorldOverlay;
  private dialogue!: DialogueBox;
  private menus!: MenuHost & { back?: () => void; showTalents?: () => void };
  private base!: MapBaseRenderer;
  private fog!: FogRenderer;
  private letterbox!: HTMLElement;
  private skipHint!: HTMLElement;
  /** Pedidos feitos antes da interface ficar pronta. */
  private pendingPrompt: string | null = null;
  private deadTimer = 0;
  /** O próximo quadro não abre menus por tecla (a tecla que acabou de fechar um menu). */
  private ignoreKeys = false;

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.root = ctx.uiRoot;
    this.applyScale();
    ctx.events.on('settings:changed', () => this.applyScale());
  }

  // ---------------------------------------------------------------------------
  // Construção (depois que o mundo existe)
  // ---------------------------------------------------------------------------

  private build() {
    if (this.built) return;
    this.built = true;
    const ctx = this.ctx;
    this.base = new MapBaseRenderer(ctx.heightfield, ctx.sys.world.maps);
    this.fog = new FogRenderer(ctx.sys.world.exploration);
    // o mapa base é desenhado em fatias enquanto o título aparece
    void this.base.build();

    this.world = new WorldOverlay(ctx, this.root);
    this.hud = new Hud(ctx, this.root);
    this.minimap = new Minimap(ctx, this.hud.root, this.base, this.fog);
    this.letterbox = el('div', 'ui-letterbox', this.root);
    el('div', 'top', this.letterbox);
    el('div', 'bottom', this.letterbox);
    this.skipHint = el('div', 'ui-skip', this.root);
    this.dialogue = new DialogueBox(ctx, this.root);
    this.overlays = new Overlays(ctx, this.root);
    this.menus = createMenuHost(ctx, this.root, {
      base: this.base,
      fog: this.fog,
      resume: () => this.closeMenu(),
      newGame: () => this.startNewGame(),
      continueGame: (slot) => void this.loadGame(slot),
      quitToMenu: () => {
        this.closeMenu();
        ctx.quitToMenu();
      },
      respawn: () => {
        this.closeMenu();
        ctx.sys.player.respawn();
        ctx.input.requestPointerLock();
      },
      travel: (id) => void this.travel(id),
      open: (m) => this.openMenu(m),
    }) as MenuHost & { back?: () => void; showTalents?: () => void };
    if (this.pendingPrompt) this.world.setPrompt(this.pendingPrompt);
    window.addEventListener('keydown', this.onKeyDown, true);
    ctx.events.on('player:respawn', () => {
      if (this.openMenuName === 'gameover') this.closeMenu();
    });
  }

  private applyScale() {
    const s = this.ctx?.settings.data.hudScale ?? 1;
    this.root?.style.setProperty('--hud-scale', String(s));
  }

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------

  /** Cria a tela de carregamento (chamado antes do init dos sistemas). */
  showLoading(progress: number, text: string) {
    if (!this.loadingEl) {
      const root = this.root ?? (document.getElementById('ui-root') as HTMLElement);
      this.loadingEl = el('div', 'ui-loading', root);
      const logo = el('div', 'ui-logo small', this.loadingEl);
      el('div', 'ui-logo-rune', logo);
      el('div', 'ui-logo-top', logo, 'Eclipse');
      el('div', 'ui-logo-main', logo, 'Arcano');
      const track = el('div', 'ui-loading-track', this.loadingEl);
      this.loadingBar = el('div', 'ui-loading-fill', track);
      this.loadingText = el('div', 'ui-loading-text', this.loadingEl);
      el('div', 'ui-loading-tip', this.loadingEl, TIPS[Math.floor(Math.random() * TIPS.length)]);
    }
    this.loadingEl.style.display = 'flex';
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
    this.loadingText.textContent = text;
  }

  hideLoading() {
    if (!this.loadingEl) return;
    this.loadingEl.classList.add('out');
    setTimeout(() => {
      if (this.loadingEl) this.loadingEl.style.display = 'none';
    }, 700);
  }

  // ---------------------------------------------------------------------------
  // Menus
  // ---------------------------------------------------------------------------

  showMainMenu() {
    this.build();
    this.dialogue.show(null);
    this.world.setBoss(null, null);
    this.openMenuName = 'main';
    this.menus.open('main');
    this.ctx.events.emit('ui:menu', { menu: 'main' });
  }

  openMenu(menu: MenuName) {
    this.build();
    if (menu === 'main') return this.showMainMenu();
    const ctx = this.ctx;
    if (ctx.state === 'playing' && PAUSING.includes(menu)) ctx.setState('paused');
    const prev = this.openMenuName;
    if (!this.menus.open(menu)) return;
    this.openMenuName = menu;
    if (prev !== menu) ctx.events.emit('ui:menu', { menu });
  }

  closeMenu() {
    if (!this.built) return;
    const ctx = this.ctx;
    const was = this.openMenuName;
    this.openMenuName = null;
    this.menus.close();
    // a loja e o baú têm estado no inventário
    if (was === 'shop' && ctx.sys.inventory.activeShop) ctx.sys.inventory.closeShop();
    if (was === 'stash') (ctx.sys.inventory as { stashOpen: boolean }).stashOpen = false;
    ctx.events.emit('ui:menu', { menu: null });
    if (ctx.state === 'paused') {
      ctx.setState('playing');
      ctx.input.requestPointerLock();
    }
  }

  isMenuOpen() {
    return this.openMenuName !== null;
  }

  private startNewGame() {
    this.ctx.input.requestPointerLock();
    void this.ctx.newGame();
  }

  private async loadGame(slot?: string) {
    const ok = await this.ctx.continueGame(slot);
    if (ok) this.ctx.input.requestPointerLock();
  }

  private async travel(id: string) {
    await fastTravel(this.ctx, id, (to, d) => this.overlays.fade(to, d), () => this.closeMenu());
  }

  // ---------------------------------------------------------------------------
  // API do contrato
  // ---------------------------------------------------------------------------

  setInteractPrompt(text: string | null) {
    this.pendingPrompt = text;
    if (this.built) this.world.setPrompt(text);
  }

  notify(text: string, kind: NotifyKind = 'info') {
    if (!this.built) {
      console.info('[UI]', text);
      return;
    }
    this.overlays.notify(text, kind);
  }

  showDialogue(view: DialogueView | null) {
    this.build();
    this.dialogue.show(view);
    toggleClass(this.root, 'in-dialogue', !!view);
    if (!view && this.ctx.state === 'playing') this.ctx.input.requestPointerLock();
  }

  showBossBar(name: string | null, entity?: Entity | null) {
    this.build();
    this.world.setBoss(name, entity ?? null);
  }

  showSubtitle(text: string, duration = 3) {
    this.build();
    this.overlays.showSubtitle(text, duration);
  }

  /** Cartão de título grande (capítulos, chefes). */
  showTitleCard(title: string, subtitle?: string, duration = 4) {
    this.build();
    this.overlays.showTitleCard(title, subtitle, duration);
  }

  /** Escurece a tela (transições/cinemáticas). */
  async fadeOut(duration = 0.5, color: 'black' | 'white' = 'black'): Promise<void> {
    this.build();
    await this.overlays.fade(1, duration, color);
  }

  async fadeIn(duration = 0.5): Promise<void> {
    this.build();
    await this.overlays.fade(0, duration);
  }

  /** Marcador temporário no mundo (ex.: "!" sobre NPC). */
  worldMarker(id: string, position: THREE.Vector3 | null, label?: string) {
    this.build();
    this.world.marker(id, position, label);
  }

  // ---------------------------------------------------------------------------
  // Estado e entrada
  // ---------------------------------------------------------------------------

  onStateChange(from: GameStateName, to: GameStateName) {
    if (!this.built) return;
    this.root.dataset.state = to;
    // pausa automática (perdeu o foco, Esc do navegador): mostra a pausa
    if (to === 'paused' && !this.openMenuName) this.openMenu('pause');
    if (to === 'dead') this.deadTimer = 0.8;
    if (from === 'dead' && to === 'playing' && this.openMenuName === 'gameover') this.closeMenu();
    // o jogo voltou a rodar por outro caminho (atalho, teste): fecha o menu que pausava
    if (to === 'playing' && this.openMenuName && PAUSING.includes(this.openMenuName)) {
      const was = this.openMenuName;
      this.openMenuName = null;
      this.menus.close();
      if (was === 'shop' && this.ctx.sys.inventory.activeShop) this.ctx.sys.inventory.closeShop();
      this.ctx.events.emit('ui:menu', { menu: null });
    }
    if (to === 'menu') {
      this.dialogue.show(null);
      this.world.setBoss(null, null);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.openMenuName || e.repeat) return;
    const code = e.code;
    const b = this.ctx.input.bindings;
    const inGame = this.ctx.state === 'paused';
    const tabKey: [MenuName, string[]][] = [
      ['map', b.map],
      ['inventory', b.inventory],
      ['skills', b.skills],
      ['journal', b.journal],
    ];
    // a mesma tecla que abriu a aba fecha o menu (como no Zelda)
    const own = tabKey.find(([m]) => m === this.openMenuName);
    const capturing = (this.menus as { capturing?: boolean }).capturing === true;
    if (inGame && !capturing && own && own[1].includes(code)) {
      e.preventDefault();
      this.closeByKey();
      return;
    }
    const before = this.openMenuName;
    if (this.menus.handleKey(code)) {
      e.preventDefault();
      e.stopPropagation();
      // Esc fechou tudo: a mesma tecla não pode reabrir a pausa no próximo quadro
      if (before && !this.openMenuName) this.ignoreKeys = true;
      return;
    }
    if (!inGame) return;
    for (const [menu, codes] of tabKey) {
      if (!codes.includes(code)) continue;
      e.preventDefault();
      this.openMenu(menu);
      return;
    }
  };

  /** Fecha o menu por tecla e ignora a mesma tecla no próximo quadro do jogo. */
  private closeByKey() {
    this.ignoreKeys = true;
    this.closeMenu();
  }

  update(dt: number, ctx: GameContext) {
    if (!this.built) {
      if (ctx.state !== 'boot' && ctx.state !== 'loading') this.build();
      else return;
    }
    const st = ctx.state;
    this.root.dataset.state = st;
    if (this.ignoreKeys) {
      this.ignoreKeys = false;
    } else if (st === 'playing' && !this.openMenuName) {
      const i = ctx.input;
      if (i.pressed('pause')) this.openMenu('pause');
      else if (i.pressed('map')) this.openMenu('map');
      else if (i.pressed('inventory')) this.openMenu('inventory');
      else if (i.pressed('skills')) this.openMenu('skills');
      else if (i.pressed('journal')) this.openMenu('journal');
    } else if (st === 'paused' && !this.openMenuName) {
      this.openMenu('pause');
    }
    if (st === 'dead' && !this.openMenuName) {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.openMenu('gameover');
    }
    if (this.openMenuName) this.menus.update(dt);
    this.dialogue.update(dt);
    this.hud.update(dt);
    this.minimap.update(dt);
    this.world.update(dt);
    // cinemáticas: faixas pretas e dica para pular
    const cine = st === 'cinematic';
    toggleClass(this.letterbox, 'in', cine);
    show(this.skipHint, cine, 'flex');
    if (cine) this.skipHint.innerHTML = `<span class="ui-key">Esc</span> pular`;
  }
}
