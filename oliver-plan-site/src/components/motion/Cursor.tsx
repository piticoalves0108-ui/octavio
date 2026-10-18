"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";

/**
 * Cursor customizado: ponto preciso + anel com atraso.
 * - `a`, `button` e `[data-cursor]` ampliam o anel;
 * - `[data-cursor-label="Ver"]` mostra um rótulo dentro do anel;
 * - em telas de toque ou com movimento reduzido, nada é renderizado.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  const [state, setState] = useState<{ hover: boolean; label: string | null; dark: boolean; down: boolean; hidden: boolean }>({
    hover: false,
    label: null,
    dark: false,
    down: false,
    hidden: true,
  });
  const last = useRef<Element | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as Element | null;
      if (target === last.current) {
        setState((s) => (s.hidden ? { ...s, hidden: false } : s));
        return;
      }
      last.current = target;
      const interactive = target?.closest("a, button, [role='button'], [data-cursor], label, summary, select");
      const labelEl = target?.closest("[data-cursor-label]");
      const darkEl = target?.closest("[data-cursor-theme='dark']");
      setState((s) => ({
        ...s,
        hidden: false,
        hover: !!interactive,
        label: labelEl?.getAttribute("data-cursor-label") ?? null,
        dark: !!darkEl,
      }));
    };
    const onDown = () => setState((s) => ({ ...s, down: true }));
    const onUp = () => setState((s) => ({ ...s, down: false }));
    const onLeave = () => setState((s) => ({ ...s, hidden: true }));

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = state.label ? 92 : state.hover ? 56 : 34;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: ringX, y: ringY }}
        animate={{ opacity: state.hidden ? 0 : 1 }}
      >
        <motion.div
          className={cn(
            "flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-[1px]",
            state.dark ? "border-linen/70" : "border-graphite/50",
            state.label && (state.dark ? "bg-linen text-graphite" : "bg-graphite text-linen"),
          )}
          animate={{ width: size, height: size, scale: state.down ? 0.86 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          {state.label && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-[0.6rem] tracking-[0.18em]">
              {state.label}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x, y }} animate={{ opacity: state.hidden || state.label ? 0 : 1 }}>
        <div className={cn("h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full", state.dark ? "bg-linen" : "bg-wood")} />
      </motion.div>
    </div>
  );
}
