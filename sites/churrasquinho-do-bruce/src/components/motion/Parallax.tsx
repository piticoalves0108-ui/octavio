"use client";

import { useRef, type ReactNode } from "react";
import { useMotor } from "@/hooks/useMotor";

/** Parallax leve com scrub. Desligado com movimento reduzido. */
export function Parallax({ children, velocidade = 0.1, className }: { children: ReactNode; velocidade?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useMotor(({ gsap, reduzido }) => {
    if (!ref.current || reduzido) return;
    gsap.fromTo(
      ref.current,
      { yPercent: velocidade * 100 },
      { yPercent: -velocidade * 100, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } },
    );
  }, ref);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
