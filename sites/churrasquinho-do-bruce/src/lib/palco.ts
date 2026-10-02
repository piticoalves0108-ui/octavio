"use client";

import { useSyncExternalStore } from "react";

/**
 * Qual "palco" o hero está usando:
 * - poster: imagem estática (padrão, LCP, movimento reduzido, sem WebGL)
 * - carregando: chunk do 3D baixando, pôster ainda na tela
 * - 3d: WebGL rodando (o pôster some com fade)
 * - video: aparelho fraco, loop em vídeo gravado da própria cena
 */
export type ModoPalco = "poster" | "carregando" | "3d" | "video";

let modo: ModoPalco = "poster";
const ouvintes = new Set<() => void>();

export const palco = {
  get: () => modo,
  set(novo: ModoPalco) {
    if (novo === modo) return;
    modo = novo;
    document.documentElement.dataset.palco = novo;
    ouvintes.forEach((f) => f());
  },
  subscribe(f: () => void) {
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  },
};

export function usePalco() {
  return useSyncExternalStore(palco.subscribe, palco.get, () => "poster" as ModoPalco);
}
