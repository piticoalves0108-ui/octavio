"use client";

import { useRef, type ReactNode } from "react";
import { useMotor } from "@/hooks/useMotor";
import { cn } from "@/lib/utils";

/** Bloco que sobe com fade ao entrar na tela. Com movimento reduzido: só fade curto. */
export function Revelar({
  children,
  className,
  atraso = 0,
  filhos = false,
}: {
  children: ReactNode;
  className?: string;
  atraso?: number;
  /** Anima os filhos diretos em sequência em vez do bloco inteiro. */
  filhos?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useMotor(({ gsap, reduzido }) => {
    const el = ref.current;
    if (!el) return;
    const alvos = filhos ? Array.from(el.children) : el;
    gsap.from(alvos, {
      y: reduzido ? 0 : 48,
      opacity: 0,
      duration: reduzido ? 0.3 : 1.1,
      delay: atraso,
      ease: "expo.out",
      stagger: filhos ? 0.08 : 0,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  }, ref);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
