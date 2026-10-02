/**
 * Marcadores {{CONFIRMAR: ...}}: tudo que ainda depende do dono da loja.
 */

export const REGEX_MARCADOR = /\{\{CONFIRMAR:[^}]*\}\}/g;

/**
 * Modo prévia (padrão). Mostra os marcadores destacados, exibe itens não confirmados
 * com selo e marca a página como noindex. Para publicar: NEXT_PUBLIC_MODO_PREVIA=false.
 */
export const MODO_PREVIA = process.env.NEXT_PUBLIC_MODO_PREVIA !== "false";

/** true se o valor está vazio ou ainda tem marcador. */
export function pendente(valor: string | null | undefined): boolean {
  if (valor == null || valor.trim() === "") return true;
  return valor.includes("{{CONFIRMAR");
}

/** Itens confirmados sempre aparecem; os não confirmados só no modo prévia. */
export function visiveis<T extends { confirmado: boolean }>(itens: readonly T[]): T[] {
  return itens.filter((i) => i.confirmado || MODO_PREVIA);
}

/** Lista de strings: tira as pendentes fora do modo prévia. */
export function visiveisTexto(itens: readonly string[]): string[] {
  return MODO_PREVIA ? [...itens] : itens.filter((i) => !pendente(i));
}

/** Remove os marcadores de um texto (para metadata, alt e JSON-LD). */
export function semMarcador(texto: string): string {
  return texto.replace(REGEX_MARCADOR, "").replace(/\s{2,}/g, " ").trim();
}

export function soNumeros(valor: string): string {
  return pendente(valor) ? "" : valor.replace(/\D/g, "");
}
