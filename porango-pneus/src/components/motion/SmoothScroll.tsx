"use client";

import { useEffect } from "react";
import { aoInteragir, carregarGsap, movimentoReduzido } from "@/lib/gsap";
import { definirLenis } from "@/lib/rolagem";

/**
 * Lenis (smooth scroll) sincronizado com o ScrollTrigger do GSAP.
 * Com prefers-reduced-motion, nada disso liga: a rolagem fica nativa.
 * Carrega na primeira interação (a primeira rodada da roda já sai suave).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (movimentoReduzido()) return;
    let cancelado = false;
    let limpar = () => {};

    const iniciar = async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import("lenis"), carregarGsap()]);
      if (cancelado) return;

      const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: false, autoRaf: false });
      definirLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      limpar = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        definirLenis(null);
      };
    };

    // Liga na primeira interação: o carregamento inicial fica só com o essencial.
    const desistir = aoInteragir(() => void iniciar());

    return () => {
      cancelado = true;
      desistir();
      limpar();
    };
  }, []);

  return null;
}
