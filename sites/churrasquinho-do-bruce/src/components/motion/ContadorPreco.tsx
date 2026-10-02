"use client";

import { useRef } from "react";
import { useMotor } from "@/hooks/useMotor";

const real = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Preço que conta de 0 até o valor quando o card aparece.
 * Só é usado quando o preço está confirmado (número no cardápio).
 * O HTML do servidor já traz o valor final (SEO e sem JS).
 */
export function ContadorPreco({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useMotor(({ gsap, reduzido }) => {
    const el = ref.current;
    if (!el || reduzido) return;
    const estado = { v: 0 };
    gsap.to(estado, {
      v: valor,
      duration: 1.2,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = real.format(estado.v);
      },
      scrollTrigger: {
        trigger: el,
        start: "top 92%",
        once: true,
      },
      immediateRender: false,
    });
    // Abaixo da dobra, começa em R$ 0,00 para a contagem fazer sentido.
    if (el.getBoundingClientRect().top > window.innerHeight * 0.92) el.textContent = real.format(0);
  }, ref);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={real.format(valor)}>
      {real.format(valor)}
    </span>
  );
}
