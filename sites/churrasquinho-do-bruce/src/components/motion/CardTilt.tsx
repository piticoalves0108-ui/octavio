"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card com tilt 3D no hover (Motion) e um reflexo âmbar que segue o cursor. */
export function CardTilt({ children, className, como = "div" }: { children: ReactNode; className?: string; como?: "div" | "li" | "article" }) {
  const ref = useRef<HTMLElement>(null);
  const reduzido = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mola = { stiffness: 170, damping: 17, mass: 0.6 };
  const srx = useSpring(rx, mola);
  const sry = useSpring(ry, mola);
  const Componente = m[como];

  return (
    <Componente
      ref={ref as never}
      className={cn("group relative [transform-style:preserve-3d]", className)}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        if (reduzido || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry.set((px - 0.5) * 14);
        rx.set((0.5 - py) * 11);
        ref.current.style.setProperty("--brilho-x", `${px * 100}%`);
        ref.current.style.setProperty("--brilho-y", `${py * 100}%`);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at var(--brilho-x,50%) var(--brilho-y,50%), rgba(255,179,71,0.16), transparent 55%)" }}
      />
    </Componente>
  );
}
