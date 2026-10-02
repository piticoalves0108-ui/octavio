"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function assinar(callback: () => void) {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/** true quando a pessoa pediu menos movimento no sistema. No servidor, assume movimento reduzido. */
export function useMovimentoReduzido() {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => true,
  );
}

export function movimentoReduzidoAgora() {
  return typeof window === "undefined" || window.matchMedia(CONSULTA).matches;
}
