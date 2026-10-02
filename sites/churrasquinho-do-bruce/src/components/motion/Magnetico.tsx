"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Efeito magnético (Motion): o filho é puxado na direção do cursor e volta
 * com mola ao sair. Só com mouse e sem movimento reduzido.
 */
export function Magnetico({ children, forca = 0.32, className }: { children: ReactNode; forca?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzido = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mola = { stiffness: 240, damping: 15, mass: 0.5 };
  const sx = useSpring(x, mola);
  const sy = useSpring(y, mola);

  return (
    <m.div
      ref={ref}
      className={cn("inline-flex", className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduzido || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * forca);
        y.set((e.clientY - (r.top + r.height / 2)) * forca);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
