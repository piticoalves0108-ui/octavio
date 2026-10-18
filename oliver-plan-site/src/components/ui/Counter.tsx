"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

/** Número que conta até o valor final quando entra na tela. */
export function Counter({ value, prefix = "", suffix = "", className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const fmt = new Intl.NumberFormat("pt-BR");
    const controls = animate(0, value, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${fmt.format(Math.round(v))}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, value, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {new Intl.NumberFormat("pt-BR").format(value)}
      {suffix}
    </span>
  );
}
