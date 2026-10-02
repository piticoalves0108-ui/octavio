"use client";

/**
 * Motion com carregamento enxuto (LazyMotion + domAnimation) e respeito ao
 * "reduzir movimento" do sistema em todas as microinterações.
 */
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
