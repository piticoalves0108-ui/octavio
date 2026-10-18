"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";

/** Rastro de brilhos: estrelinhas de quatro pontas que nascem do cursor e se apagam (canvas, só anima enquanto há brilho). */
function SparkleTrail() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const colors = ["#ff6b7a", "#c8a27a", "#8b2942", "#ffd1d8"];
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; rot: number };
    let parts: P[] = [];
    let raf = 0;
    let lx = 0;
    let ly = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const star = (p: P) => {
      const k = p.life / p.max;
      const s = p.size * Math.sin(Math.PI * Math.min(1, (1 - k) * 1.4 + 0.1));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
      ctx.restore();
    };
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts = parts.filter((p) => (p.life -= 1) > 0);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rot += 0.04;
        star(p);
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    };
    const emit = (x: number, y: number, n: number, spread: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = Math.random() * spread;
        const max = 26 + Math.random() * 22;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: max, max, size: 3 + Math.random() * 4, color: colors[(Math.random() * colors.length) | 0], rot: Math.random() * Math.PI });
      }
      if (parts.length > 140) parts = parts.slice(-140);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < 28) return;
      lx = e.clientX;
      ly = e.clientY;
      emit(e.clientX, e.clientY, 1, 0.8);
    };
    const onDown = (e: PointerEvent) => emit(e.clientX, e.clientY, 10, 2.6);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} className="absolute inset-0 h-full w-full" />;
}

/**
 * Cursor customizado: ponto preciso + anel com atraso + rastro de brilhos.
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
      <SparkleTrail />
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: ringX, y: ringY }}
        animate={{ opacity: state.hidden ? 0 : 1 }}
      >
        <motion.div
          className={cn(
            "flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-[1px]",
            state.dark ? "border-cream/70" : "border-wine/40",
            state.label && (state.dark ? "bg-cream text-wine" : "bg-wine text-cream"),
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
        <div className={cn("h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full", state.dark ? "bg-cream" : "bg-coral")} />
      </motion.div>
    </div>
  );
}
