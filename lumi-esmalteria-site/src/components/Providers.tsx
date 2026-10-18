"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { TransitionProvider } from "@/components/motion/PageTransition";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>
        <TransitionProvider>{children}</TransitionProvider>
      </SmoothScroll>
    </MotionConfig>
  );
}
