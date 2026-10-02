/**
 * EDIÇÃO HTML (npm run html): o mesmo site exportado como arquivos .html estáticos.
 *
 * - Caminhos relativos: abre com dois cliques no index.html e funciona em qualquer pasta.
 * - Cada página é um arquivo (index.html, servicos.html, guia-do-pneu.html); a troca de
 *   página carrega o arquivo novo, com a mesma cortina amarela na saída e na entrada.
 *
 * Fora da edição HTML, as funções abaixo devolvem os caminhos como estão.
 */
export const EDICAO_HTML = process.env.NEXT_PUBLIC_EDICAO_HTML === "1";

/** Arquivo de /public: "/images/x.avif" vira "images/x.avif" na edição HTML. */
export function ativo(caminho: string): string {
  return EDICAO_HTML ? caminho.replace(/^\/+/, "") : caminho;
}

/** Rota interna -> arquivo: "/servicos" -> "servicos.html", "/#medida" -> "index.html#medida". */
export function hrefPagina(href: string): string {
  if (!EDICAO_HTML) return href;
  const [caminho, ancora] = href.split("#");
  const limpo = (caminho || "/").replace(/^\/+|\/+$/g, "");
  const arquivo = limpo ? `${limpo}.html` : "index.html";
  return ancora !== undefined ? `${arquivo}#${ancora}` : arquivo;
}

/** Nome do arquivo da página aberta agora (index.html, servicos.html...). */
export function paginaAtual(): string {
  const ultimo = window.location.pathname.split("/").pop() || "";
  if (!ultimo) return "index.html";
  return ultimo.endsWith(".html") ? ultimo : `${ultimo}.html`;
}
