import type { GameContext } from '../../core/context';
import type { MenuName } from '../../core/EventBus';
import type { MapBaseRenderer, FogRenderer } from '../mapRender';
import { el } from '../dom';
import { setWidgetContext, sfx, type Panel } from './widgets';
import { InventoryPanel } from './InventoryPanel';
import { SkillsPanel } from './SkillsPanel';
import { JournalPanel } from './JournalPanel';
import { MapPanel } from './MapPanel';
import { SettingsPanel } from './SettingsPanel';
import { ShopPanel } from './ShopPanel';
import { StashPanel } from './StashPanel';
import { CookingPanel } from './CookingPanel';
import { MainMenu, PausePanel, SavePanel, GameOverPanel, CreditsPanel } from './screens';

/**
 * CONTRATO entre a fachada da interface (src/ui/UI.ts + HUD) e os menus (src/ui/menus/**).
 * A UI chama createMenuHost uma vez no init e delega a ele abrir/fechar/atualizar os menus.
 * O módulo de menus substitui esta implementação mínima mantendo a assinatura.
 */
export interface MenuHost {
  /** Menu aberto agora (null = nenhum). */
  readonly current: MenuName | null;
  /** Monta/mostra o painel do menu. Devolve false se o menu não existir. */
  open(menu: MenuName): boolean;
  /** Esconde o painel atual (não muda o estado do jogo: isso é da UI). */
  close(): void;
  /** Atualização com limite de frequência (chamada todo quadro pela UI enquanto um menu estiver aberto). */
  update(dt: number): void;
  /** Tecla pressionada com um menu aberto; devolve true se consumiu (ex.: Esc volta um nível). */
  handleKey(code: string): boolean;
}

/** Ações que só a fachada da UI sabe fazer (estado do jogo, transições). */
export interface MenuHooks {
  base: MapBaseRenderer;
  fog: FogRenderer;
  /** Fecha todos os menus e volta ao jogo. */
  resume(): void;
  newGame(): void;
  continueGame(slot?: string): void;
  quitToMenu(): void;
  respawn(): void;
  travel(locationId: string): void;
  /** Troca de menu pela UI (para manter estado e eventos consistentes). */
  open(menu: MenuName): void;
}

/** Abas do menu principal do jogo (como o menu do Zelda: troca com Q/E). */
const TABS: { id: MenuName; label: string }[] = [
  { id: 'map', label: 'Mapa' },
  { id: 'inventory', label: 'Inventário' },
  { id: 'skills', label: 'Habilidades' },
  { id: 'journal', label: 'Diário' },
  { id: 'settings', label: 'Opções' },
];

export function createMenuHost(ctx: GameContext, root: HTMLElement, maybeHooks?: MenuHooks): MenuHost {
  if (!maybeHooks) return minimalHost(ctx, root);
  const hooks: MenuHooks = maybeHooks;
  setWidgetContext(ctx);

  const shell = el('div', 'ui-menus', root);
  shell.style.display = 'none';
  // moldura com abas (mapa, inventário, habilidades, diário, opções)
  const frame = el('div', 'ui-frame', shell);
  const tabBar = el('div', 'ui-tabbar', frame);
  const prevKey = el('span', 'ui-key ui-tab-key', tabBar, 'Q');
  const tabsEl = el('div', 'ui-tabs', tabBar);
  const nextKey = el('span', 'ui-key ui-tab-key', tabBar, 'E');
  const closeBtn = el('button', 'ui-close', tabBar, '✕');
  closeBtn.title = 'Fechar (Esc)';
  const frameBody = el('div', 'ui-frame-body', frame);
  const solo = el('div', 'ui-solo', shell);

  const map = new MapPanel(ctx, hooks.base, hooks.fog);
  map.onTravel = (id) => hooks.travel(id);
  const journal = new JournalPanel(ctx);
  journal.onShowOnMap = (qid) => {
    host.open('map');
    map.focusQuest(qid);
  };
  const settings = new SettingsPanel(ctx);
  const skills = new SkillsPanel(ctx);
  const tabPanels: Partial<Record<MenuName, Panel>> = {
    map,
    inventory: new InventoryPanel(ctx),
    skills,
    journal,
    settings,
  };
  const shop = new ShopPanel(ctx);
  shop.onExit = () => hooks.resume();
  const stash = new StashPanel(ctx);
  stash.onExit = () => hooks.resume();
  const cooking = new CookingPanel(ctx);
  cooking.onExit = () => hooks.resume();
  const saves = new SavePanel(ctx);
  saves.onLoad = (slot) => hooks.continueGame(slot);
  saves.onBack = () => back();
  const credits = new CreditsPanel();
  credits.onBack = () => back();
  const main = new MainMenu(ctx, {
    newGame: () => hooks.newGame(),
    continueGame: () => hooks.continueGame(),
    openLoad: () => {
      saves.mode = 'load';
      showSolo(saves, 'main');
    },
    openSettings: () => showSolo(settings, 'main'),
    openCredits: () => showSolo(credits, 'main'),
  });
  const pause = new PausePanel(ctx, {
    resume: () => hooks.resume(),
    open: (tab) => {
      returnTo = 'pause';
      hooks.open(tab);
    },
    openSave: () => {
      saves.mode = 'save';
      showSolo(saves, 'pause');
    },
    openLoad: () => {
      saves.mode = 'load';
      showSolo(saves, 'pause');
    },
    quit: () => hooks.quitToMenu(),
  });
  const gameover = new GameOverPanel(ctx, {
    retry: () => hooks.respawn(),
    loadLast: () => hooks.continueGame(),
    quit: () => hooks.quitToMenu(),
  });
  const soloPanels: Partial<Record<MenuName, Panel>> = { main, pause, shop, stash, credits, gameover, cooking };

  let current: MenuName | null = null;
  let active: Panel | null = null;
  /** Para onde Esc volta (pausa → abas; título → opções/créditos). */
  let returnTo: MenuName | null = null;
  /** Subtela temporária (salvar/carregar/opções/créditos a partir do título ou da pausa). */
  let subOf: MenuName | null = null;

  for (const t of TABS) {
    const b = el('button', 'ui-tab', tabsEl, t.label);
    b.dataset.id = t.id;
    b.addEventListener('click', () => {
      if (current !== t.id) {
        sfx('ui_click');
        hooks.open(t.id);
      }
    });
  }
  prevKey.addEventListener('click', () => cycleTab(-1));
  nextKey.addEventListener('click', () => cycleTab(1));
  closeBtn.addEventListener('click', () => back());

  function mount(container: HTMLElement, p: Panel) {
    if (active && active !== p) {
      active.onClose?.();
      active.el.remove();
    }
    if (p.el.parentElement !== container) container.appendChild(p.el);
    if (active !== p) {
      active = p;
      p.onOpen?.();
    }
  }

  function showSolo(p: Panel, parent: MenuName) {
    subOf = parent;
    shell.style.display = 'flex';
    frame.style.display = 'none';
    solo.style.display = 'flex';
    shell.className = `ui-menus solo sub-${parent}`;
    mount(solo, p);
  }

  function cycleTab(dir: number) {
    if (!current || !tabPanels[current] || ctx.state === 'menu') return;
    const i = TABS.findIndex((t) => t.id === current);
    const n = TABS[(i + dir + TABS.length) % TABS.length].id;
    sfx('ui_click');
    hooks.open(n);
  }

  /** Esc / ✕: volta um nível ou fecha. */
  function back() {
    if (subOf) {
      const parent = subOf;
      subOf = null;
      if (parent === 'main') host.open('main');
      else hooks.open(parent);
      return;
    }
    if (current && tabPanels[current] && returnTo === 'pause') {
      returnTo = null;
      hooks.open('pause');
      return;
    }
    if (current === 'main' || current === 'gameover') return;
    hooks.resume();
  }

  const host: MenuHost & { back(): void; showTalents(): void; readonly capturing: boolean } = {
    get current() {
      return current;
    },
    open(menu) {
      subOf = null;
      const tab = tabPanels[menu];
      // fora do jogo (título), as opções abrem sozinhas, sem as abas
      if (tab && ctx.state === 'menu') {
        if (menu !== 'settings') return false;
        current = menu;
        showSolo(tab, 'main');
        return true;
      }
      const p = tab ?? soloPanels[menu];
      if (!p) return false;
      if (menu === 'pause' || menu === 'main' || menu === 'gameover') returnTo = null;
      current = menu;
      shell.style.display = 'flex';
      shell.className = `ui-menus m-${menu}${tab ? ' tabbed' : ' solo'}`;
      if (tab) {
        frame.style.display = 'flex';
        solo.style.display = 'none';
        for (const b of Array.from(tabsEl.children) as HTMLElement[]) b.classList.toggle('on', b.dataset.id === menu);
        mount(frameBody, tab);
      } else {
        frame.style.display = 'none';
        solo.style.display = 'flex';
        mount(solo, p);
      }
      return true;
    },
    close() {
      if (active) {
        active.onClose?.();
        active.el.remove();
        active = null;
      }
      current = null;
      subOf = null;
      returnTo = null;
      shell.style.display = 'none';
    },
    update(dt) {
      active?.update?.(dt);
    },
    handleKey(code) {
      if (active === settings && settings.capturing) return settings.handleKey(code);
      if (code === 'Escape') {
        back();
        return true;
      }
      if (current && tabPanels[current] && !subOf && ctx.state !== 'menu') {
        if (code === 'KeyQ') {
          cycleTab(-1);
          return true;
        }
        if (code === 'KeyE') {
          cycleTab(1);
          return true;
        }
      }
      return active?.handleKey?.(code) ?? false;
    },
    back,
    get capturing() {
      return active === settings && settings.capturing;
    },
    showTalents() {
      skills.showTalents();
    },
  };
  return host;
}

/** Implementação mínima (testes/compatibilidade): mostra só o nome do menu. */
function minimalHost(ctx: GameContext, root: HTMLElement): MenuHost {
  const e = document.createElement('div');
  e.className = 'ui-menu';
  e.style.display = 'none';
  root.appendChild(e);
  let current: MenuName | null = null;
  return {
    get current() {
      return current;
    },
    open(menu) {
      current = menu;
      e.style.display = 'flex';
      e.textContent = menu;
      void ctx;
      return true;
    },
    close() {
      current = null;
      e.style.display = 'none';
    },
    update() {},
    handleKey() {
      return false;
    },
  };
}
