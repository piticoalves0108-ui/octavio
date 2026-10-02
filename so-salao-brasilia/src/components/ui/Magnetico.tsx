"use client";

/**
 * Efeito magnético nos botões principais (Motion): o botão segue levemente o cursor.
 * Desligado no toque e com movimento reduzido.
 */
import { useRef, type ReactNode } from "react";
import { useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";

export function Magnetico({
  children,
  forca = 0.28,
  className,
}: {
  children: ReactNode;
  forca?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });

  const ativo = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <m.span
      ref={ref}
      className={className ?? "inline-flex"}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (!ativo() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * forca);
        y.set((e.clientY - (r.top + r.height / 2)) * forca * 1.2);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.span>
  );
}
