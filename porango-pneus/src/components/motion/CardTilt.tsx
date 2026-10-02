"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { movimentoReduzido } from "@/lib/gsap";
import { carregarMotion } from "@/lib/motion";

const MOLA_TILT = { type: "spring", stiffness: 180, damping: 20 } as const;

/**
 * Card com tilt 3D seguindo o mouse, com mola do Motion (só mouse; no toque fica
 * parado). O Motion chega no primeiro hover.
 */
export function CardTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useRef<Awaited<ReturnType<typeof carregarMotion>> | null>(null);

  const inclinar = (rotateX: number, rotateY: number) => {
    if (motion.current && ref.current) {
      motion.current.animate(ref.current, { rotateX, rotateY, transformPerspective: 900 }, MOLA_TILT);
    }
  };

  return (
    <article
      ref={ref}
      className={cn("group will-change-transform", className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || movimentoReduzido()) return;
        carregarMotion().then((m) => (motion.current = m));
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        inclinar(-py * 10, px * 12);
      }}
      onPointerLeave={() => inclinar(0, 0)}
    >
      {children}
    </article>
  );
}
