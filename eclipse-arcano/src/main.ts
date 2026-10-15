import { Game } from './core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const game = new Game(canvas, uiRoot);
game.boot().catch((err) => {
  console.error('[Boot] falha ao iniciar', err);
  uiRoot.innerHTML = `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:#07060d;color:#ffb4b4;font-family:system-ui;padding:16px;text-align:center">
    <h2>Não foi possível iniciar o Eclipse Arcano</h2>
    <p>${String(err?.message ?? err)}</p>
    <p style="color:#aaa">Verifique se o navegador suporta WebGL2 e tente recarregar.</p></div>`;
});
