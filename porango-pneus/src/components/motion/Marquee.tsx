"use client";

import { useEffect, useRef } from "react";
import { movimentoReduzido } from "@/lib/gsap";
import { velocidadeRolagem } from "@/lib/rolagem";

/**
 * Faixa corrida das marcas. Anda sozinha e acelera conforme a velocidade da rolagem
 * (lida do Lenis). Só roda enquanto está na tela; com movimento reduzido fica parada.
 */
export function Marquee({ children, velocidadeBase = 60 }: { children: React.ReactNode; velocidadeBase?: number }) {
  const trilho = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trilho.current;
    const box = caixa.current;
    if (!el || !box || movimentoReduzido()) return;

    let x = 0;
    let extra = 0;
    let raf = 0;
    let anterior = performance.now();
    let rodando = false;
    let ultimoScroll = window.scrollY;

    const passo = (agora: number) => {
      const dt = Math.min(0.05, (agora - anterior) / 1000);
      anterior = agora;
      // Velocidade do Lenis; sem ele, deriva do próprio scroll.
      const v = velocidadeRolagem() || window.scrollY - ultimoScroll;
      ultimoScroll = window.scrollY;
      extra += (Math.min(Math.abs(v) * 28, 900) - extra) * Math.min(1, dt * 6);
      const metade = el.scrollWidth / 2;
      x -= (velocidadeBase + extra) * dt;
      if (metade > 0 && -x >= metade) x += metade;
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      raf = requestAnimationFrame(passo);
    };

    const io = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting && !rodando) {
        rodando = true;
        anterior = performance.now();
        raf = requestAnimationFrame(passo);
      } else if (!entrada.isIntersecting && rodando) {
        rodando = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(box);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [velocidadeBase]);

  return (
    <div ref={caixa} className="overflow-hidden" aria-hidden="true">
      <div ref={trilho} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center">{children}</div>
      </div>
    </div>
  );
}
