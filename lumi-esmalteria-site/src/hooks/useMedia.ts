"use client";

import { useSyncExternalStore } from "react";

function subscribeQuery(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

/** Media query reativa e segura para SSR (no servidor retorna `fallback`). */
export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    subscribeQuery(query),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Dispositivo com mouse de precisão (desktop). Cursor customizado e tilt só aparecem aqui. */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
