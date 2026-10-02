"use client";

import { LazyMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { carregarMotor } from "@/lib/motor";

const recursos = () => import("@/lib/motion-recursos").then((m) => m.default);

/**
 * Liga o motor de animação depois da hidratação (GSAP + Lenis em chunk
 * separado) e carrega os recursos do Motion de forma assíncrona (LazyMotion).
 */
export function MotorDeMovimento({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Depois do primeiro paint e com a main thread livre.
    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 200));
    const id = ocioso(() => carregarMotor(), { timeout: 1500 });
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, []);

  return (
    <LazyMotion features={recursos} strict>
      {children}
    </LazyMotion>
  );
}
