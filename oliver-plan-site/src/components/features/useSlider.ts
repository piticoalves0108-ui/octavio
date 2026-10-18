"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Lógica do divisor arrastável (mouse, toque e teclado), compartilhada pelos comparadores.
 * `ref` guarda o valor atual para consumo dentro do loop de renderização 3D sem re-render.
 */
export function useSlider(initial = 0.5) {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const dragging = useRef(false);
  const box = useRef<HTMLElement | null>(null);

  const set = useCallback((v: number) => {
    const c = Math.min(0.98, Math.max(0.02, v));
    ref.current = c;
    setValue(c);
  }, []);

  const fromEvent = (e: PointerEvent) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  };

  const bind = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      box.current = e.currentTarget;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      fromEvent(e);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (dragging.current) fromEvent(e);
    },
    onPointerUp: () => (dragging.current = false),
    onPointerCancel: () => (dragging.current = false),
    style: { touchAction: "pan-y" as const },
  };

  const handleProps = {
    role: "slider" as const,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": Math.round(value * 100),
    "aria-valuetext": `${Math.round(value * 100)}% antes`,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") set(ref.current - 0.04);
      if (e.key === "ArrowRight") set(ref.current + 0.04);
      if (e.key === "Home") set(0.02);
      if (e.key === "End") set(0.98);
    },
  };

  return { value, ref, bind, handleProps, set };
}
