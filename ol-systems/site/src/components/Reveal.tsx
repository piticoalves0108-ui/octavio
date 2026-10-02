"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { observeEnter } from "@/lib/inview";
import { prefersReducedMotion } from "@/lib/gsap";

/**
 * Entra suavemente (sobe + aparece) quando chega na tela.
 * IntersectionObserver + transição CSS: nenhum JavaScript roda por quadro.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    return observeEnter(el, () => el.setAttribute("data-reveal", "in"), {
      onBelowAtStart: () => el.setAttribute("data-reveal", "hidden"),
    });
  }, []);
  return (
    <div ref={ref} className={className} style={{ "--rd": `${delay}s`, "--ry": `${y}px` } as CSSProperties}>
      {children}
    </div>
  );
}
