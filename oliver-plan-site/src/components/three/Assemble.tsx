"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

/**
 * Animação de "montagem": cada módulo nasce do piso, desce do teto ou encosta na parede,
 * em sequência, como se a marcenaria estivesse sendo instalada diante do visitante.
 */

type Ctx = { start: RefObject<number | null>; instant: boolean };
const AssemblyContext = createContext<Ctx>({ start: { current: 0 }, instant: true });

export function AssemblyProvider({ active, instant = false, children }: { active: boolean; instant?: boolean; children: ReactNode }) {
  const start = useRef<number | null>(null);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    if (active && start.current === null) start.current = clock.elapsedTime;
  }, [active, clock]);
  return <AssemblyContext.Provider value={{ start, instant }}>{children}</AssemblyContext.Provider>;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

export function Assemble({ delay = 0, from = "floor", duration = 1.2, children }: { delay?: number; from?: "floor" | "ceiling" | "wall" | "fade"; duration?: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const { start, instant } = useContext(AssemblyContext);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || g.userData.done) return;
    const t = instant ? 1 : start.current === null ? 0 : Math.min(1, Math.max(0, (clock.elapsedTime - start.current - delay) / duration));
    const e = easeOut(t);
    g.visible = t > 0;
    if (from === "floor") g.scale.y = Math.max(0.0001, e);
    else if (from === "ceiling") g.position.y = (1 - e) * 1.6;
    else if (from === "wall") {
      g.position.z = -(1 - e) * 0.6;
      g.scale.setScalar(0.92 + 0.08 * e);
    } else g.scale.setScalar(0.6 + 0.4 * e);
    if (t >= 1) g.userData.done = true;
  });

  return <group ref={ref}>{children}</group>;
}
