/**
 * Marcadores {{CONFIRMAR: ...}}.
 *
 * Em desenvolvimento (ou com NEXT_PUBLIC_MOSTRAR_PENDENCIAS=true) o marcador
 * aparece na tela, destacado, para o Bruce revisar. Em produção, o que não
 * foi confirmado some do site em vez de aparecer quebrado.
 */
const MARCADOR = /\{\{CONFIRMAR:\s*([^}]*)\}\}/;

export const mostrarPendencias =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_MOSTRAR_PENDENCIAS === "true";

/** true se o texto existe e não tem marcador. */
export function confirmado(texto: string | null | undefined): texto is string {
  return typeof texto === "string" && texto.trim() !== "" && !MARCADOR.test(texto);
}

/** O que falta confirmar, sem as chaves (ex.: "nome do hambúrguer 1"). */
export function oQueFalta(texto: string): string {
  return texto.match(MARCADOR)?.[1]?.trim() ?? texto;
}

/** Deve renderizar? Confirmado sempre; pendente só quando as pendências estão visíveis. */
export function visivel(texto: string | null | undefined): texto is string {
  return confirmado(texto) || (typeof texto === "string" && mostrarPendencias);
}
