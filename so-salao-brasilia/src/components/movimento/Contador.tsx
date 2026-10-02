"use client";

/**
 * Número que conta ao entrar na tela ("até 7 dias úteis", "12x sem juros").
 * O valor final já vem no HTML; leitores de tela leem só o texto final.
 */
import { useEffect, useRef, useState } from "react";
import { movimentoReduzidoAgora } from "@/lib/movimento";

export function Contador({ valor, inicio = 0, duracao = 1.6 }: { valor: number; inicio?: number; duracao?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [atual, setAtual] = useState(valor);

  useEffect(() => {
    const el = ref.current;
    if (!el || movimentoReduzidoAgora()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) return; // já visível: não reinicia o número
    setAtual(inicio);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const passo = (agora: number) => {
          const t = Math.min(1, (agora - t0) / (duracao * 1000));
          const suave = 1 - Math.pow(2, -10 * t);
          setAtual(Math.round(inicio + (valor - inicio) * (t === 1 ? 1 : suave)));
          if (t < 1) raf = requestAnimationFrame(passo);
        };
        raf = requestAnimationFrame(passo);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor, inicio, duracao]);

  return (
    <span ref={ref} aria-hidden className="tabular-nums">
      {atual}
    </span>
  );
}
