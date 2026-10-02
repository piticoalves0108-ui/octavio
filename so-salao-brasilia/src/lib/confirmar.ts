/** Marcador de informação pendente: {{CONFIRMAR: descrição}}. */
export const REGEX_CONFIRMAR = /\{\{CONFIRMAR:[^}]*\}\}/g;

export function temPendencia(texto: string): boolean {
  return /\{\{CONFIRMAR:[^}]*\}\}/.test(texto);
}

/** Remove os marcadores (usado em metadados, JSON-LD e mensagens, onde não podem aparecer). */
export function semPendencias(texto: string): string {
  return texto
    .replace(REGEX_CONFIRMAR, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
