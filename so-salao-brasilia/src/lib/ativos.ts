/**
 * Caminhos de arquivos de /public e da página do configurador.
 * No site normal, devolvem o próprio caminho. Na versão em arquivo HTML único
 * (`npm run html`), as imagens e o vídeo vêm embutidos e as páginas viram rotas com #.
 */
type JanelaSpa = Window & { __SPA__?: boolean };

export function ativo(caminho: string): string {
  const mapa = (globalThis as { __ATIVOS__?: Record<string, string> }).__ATIVOS__;
  return mapa?.[caminho] ?? caminho;
}

/** Endereço base do configurador (para o link compartilhável da configuração). */
export function baseDoConfigurador(): string {
  const w = window as JanelaSpa;
  if (w.__SPA__) return `${window.location.href.split("#")[0]}#/configurador`;
  return `${window.location.origin}/configurador`;
}
