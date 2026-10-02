"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

// As features do Motion (animações, gestos) carregam em segundo plano,
// fora do JavaScript inicial da página.
const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
