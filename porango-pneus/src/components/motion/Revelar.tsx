"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Entrada suave (sobe e aparece) quando o bloco chega na tela.
 * Feita com IntersectionObserver + CSS: zero dependência e respeita movimento reduzido.
 * Sem JS o conteúdo já vem visível (a classe só é aplicada depois da hidratação).
 */
export function Revelar({
  children,
  className,
  atraso = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  atraso?: number;
  as?: "div" | "li" | "section" | "p";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let primeira = true;
    // A primeira resposta do observer diz se já está na tela (aí não esconde);
    // assim não há leitura de layout síncrona durante a hidratação.
    const io = new IntersectionObserver(
      ([e]) => {
        if (primeira) {
          primeira = false;
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            io.disconnect();
            return;
          }
          el.dataset.revelar = "oculto";
          return;
        }
        if (e.isIntersecting) {
          el.dataset.revelar = "visivel";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={{ transitionDelay: `${atraso}ms` }}
      className={cn(
        "transition-[opacity,translate] duration-[900ms] ease-[var(--ease-pneu)] data-[revelar=oculto]:translate-y-8 data-[revelar=oculto]:opacity-0 motion-reduce:translate-y-0 motion-reduce:duration-150",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
