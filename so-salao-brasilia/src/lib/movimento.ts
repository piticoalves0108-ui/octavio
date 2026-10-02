"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function assinar(callback: () => void) {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/**
 * true quando a pessoa pediu menos movimento no sistema.
 * No servidor, assume movimento permitido (o caso da maioria): assim a hidratação não
 * precisa refazer a página inteira de forma síncrona. Quem pediu menos movimento recebe
 * a troca logo após a hidratação (e o CSS já desliga as animações antes disso).
 */
export function useMovimentoReduzido() {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}

export function movimentoReduzidoAgora() {
  return typeof window === "undefined" || window.matchMedia(CONSULTA).matches;
}
