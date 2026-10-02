"use client";

import { useEffect, type RefObject } from "react";
import { cena, pedirFrame, type SecaoCena } from "@/lib/cena";

/** Marca quando uma seção com 3D está na tela. Se nenhuma estiver, a cena pausa o render. */
export function useSecaoCena(ref: RefObject<HTMLElement | null>, secao: SecaoCena) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        cena.secoes[secao] = entrada.isIntersecting;
        pedirFrame();
      },
      { rootMargin: "10% 0px 10% 0px" },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      cena.secoes[secao] = false;
    };
  }, [ref, secao]);
}
