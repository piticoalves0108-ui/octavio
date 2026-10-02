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
    carregarMotor();
  }, []);

  return (
    <LazyMotion features={recursos} strict>
      {children}
    </LazyMotion>
  );
}
