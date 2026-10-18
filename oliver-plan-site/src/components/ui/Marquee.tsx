"use client";

import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useLenis } from "lenis/react";
import { useRef } from "react";
import { useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";

/**
 * Faixa infinita. A velocidade acelera com a rolagem e a direção acompanha o sentido do scroll.
 */
export function Marquee({ items, speed = 50, className, separator = "·" }: { items: string[]; speed?: number; className?: string; separator?: string }) {
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const velocity = useRef(0);
  const direction = useRef(-1);

  useLenis(({ velocity: v }) => {
    velocity.current = v;
    if (Math.abs(v) > 0.2) direction.current = v > 0 ? -1 : 1;
  });

  useAnimationFrame((_, delta) => {
    if (reduced || !track.current) return;
    const half = track.current.scrollWidth / 2;
    if (!half) return;
    const boost = 1 + Math.min(Math.abs(velocity.current) * 0.12, 5);
    let next = x.get() + direction.current * speed * boost * (delta / 1000);
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
    velocity.current *= 0.92;
  });

  const row = (hidden: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-[0.45em]">{item}</span>
          <span className="px-[0.45em] text-wood">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("overflow-hidden whitespace-nowrap", className)}>
      <motion.div ref={track} style={{ x }} className="flex w-max will-change-transform">
        {row(false)}
        {row(true)}
      </motion.div>
    </div>
  );
}
