"use client";

import { useEffect } from "react";
import { loadGsap } from "@/lib/gsap";

/**
 * Lenis (smooth scroll) sincronizado com o ScrollTrigger, e a posição do
 * cursor em variáveis CSS para a grade de pontos do fundo.
 * Com "reduzir movimento" ligado, nada disso roda.
 */
export function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e: PointerEvent) => {
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return () => window.removeEventListener("pointermove", move);

    // Lenis e GSAP chegam depois do carregamento inicial.
    let cancelled = false;
    let stop = () => {};
    Promise.all([import("lenis"), loadGsap()]).then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
      if (cancelled) return;
      const lenis = new Lenis({ duration: 1.1, anchors: { offset: -72 } });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      // Todas as seções criam seus ScrollTriggers no mesmo instante; um refresh
      // no quadro seguinte recalcula as posições já com o espaço do pin.
      requestAnimationFrame(() => ScrollTrigger.refresh());
      stop = () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", move);
      stop();
    };
  }, []);

  return null;
}
