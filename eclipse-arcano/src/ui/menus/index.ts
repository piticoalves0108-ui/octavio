import type { GameContext } from '../../core/context';
import type { MenuName } from '../../core/EventBus';

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

export function createMenuHost(ctx: GameContext, root: HTMLElement): MenuHost {
  const el = document.createElement('div');
  el.className = 'ui-menu';
  el.style.display = 'none';
  root.appendChild(el);
  let current: MenuName | null = null;
  return {
    get current() {
      return current;
    },
    open(menu) {
      current = menu;
      el.style.display = 'flex';
      el.textContent = menu;
      void ctx;
      return true;
    },
    close() {
      current = null;
      el.style.display = 'none';
    },
    update() {},
    handleKey() {
      return false;
    },
  };
}
