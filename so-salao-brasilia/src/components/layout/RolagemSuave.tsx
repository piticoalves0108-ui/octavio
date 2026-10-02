"use client";

/**
 * Rolagem suave com Lenis, sincronizada com o ScrollTrigger (mesmo relógio do GSAP).
 * Carregada na primeira interação (fora do JS inicial) e desligada com movimento reduzido.
 */
import { useEffect } from "react";
import { carregarGsap } from "@/lib/gsap";
import { definirLenis } from "@/lib/rolagem";
import { useMovimentoReduzido } from "@/lib/movimento";
import { useInteragiu } from "@/components/cena3d/carregar";

export function RolagemSuave() {
  const reduzido = useMovimentoReduzido();
  // Carrega na primeira interação: a carga inicial fica livre, e a rolagem suave
  // assume a partir do primeiro gesto.
  const interagiu = useInteragiu();

  useEffect(() => {
    if (reduzido || !interagiu) return;
    let cancelado = false;
    let limpar = () => {};

    Promise.all([import("lenis"), carregarGsap()]).then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
      if (cancelado) return;
      const lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 0.95, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (tempo: number) => lenis.raf(tempo * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      definirLenis(lenis);
      limpar = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        definirLenis(null);
      };
    });

    return () => {
      cancelado = true;
      limpar();
    };
  }, [reduzido, interagiu]);

  return null;
}
