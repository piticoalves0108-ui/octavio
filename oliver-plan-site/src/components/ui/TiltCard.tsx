"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useFinePointer, useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";

/**
 * Card com inclinação 3D que acompanha o cursor e um brilho suave.
 * A imagem interna deve usar `group-hover:scale-[1.06]` para o zoom.
 */
export function TiltCard({ children, className, intensity = 7, glare = true }: { children: ReactNode; className?: string; intensity?: number; glare?: boolean }) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,250,240,0.35), transparent 55%)`;

  const onMove = (e: PointerEvent) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * intensity * 2);
    rx.set(-(py - 0.5) * intensity * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={enabled ? { rotateX: rx, rotateY: ry, transformPerspective: 1200 } : undefined}
      className={cn("group relative [transform-style:preserve-3d]", className)}
    >
      {children}
      {glare && enabled && (
        <motion.div
          aria-hidden
          style={{ background: glareBg }}
          className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
    </motion.div>
  );
}
