"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { finishLabel, type Polish } from "@/data/colors";
import { cn } from "@/lib/utils";
import { hash01, r2 } from "@/lib/random";

/** Luminância relativa (WCAG) de um hex #rrggbb */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Swatch que "pinta": no hover (ou quando selecionado) o esmalte sobe com borda líquida
 * (filtro SVG "gooey": blur + contraste de alfa). Acabamentos metálico, perolado e glitter
 * ganham reflexos próprios.
 */
export function PaintSwatch({
  polish,
  selected,
  onSelect,
  size = 64,
  showLabel = true,
  className,
}: {
  polish: Polish;
  selected?: boolean;
  onSelect?: (id: string) => void;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[:«»]/g, "");
  const [hover, setHover] = useState(false);
  const filled = hover || selected;
  const finish = finishLabel[polish.finish];
  // Cores quase brancas (Porcelana) sumiriam sobre o fundo areia: fundo um tom mais escuro
  const base = luminance(polish.hex) > 0.7 ? "#dccbc0" : "#f5ede6";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(polish.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-pressed={selected}
      aria-label={`${polish.name}, acabamento ${finish.toLowerCase()}`}
      data-cursor
      className={cn("group flex flex-col items-center gap-2 text-center", className)}
    >
      <span className={cn("relative block rounded-full p-1 transition-shadow duration-500", selected ? "shadow-[0_0_0_1.5px_var(--color-wine)]" : "shadow-[0_0_0_1px_rgba(26,26,26,0.08)]")} style={{ width: size + 8, height: size + 8 }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="block" aria-hidden>
          <defs>
            <filter id={`${uid}-goo`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
            <clipPath id={`${uid}-clip`}>
              <circle cx="50" cy="50" r="50" />
            </clipPath>
            <radialGradient id={`${uid}-shine`} cx="0.3" cy="0.25" r="0.7">
              <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="0.4" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath={`url(#${uid}-clip)`}>
            <rect width="100" height="100" fill={base} />
            <g filter={`url(#${uid}-goo)`}>
              <motion.rect x="-10" width="120" height="140" fill={polish.hex} initial={false} animate={{ y: filled ? -10 : 78 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
              {[18, 42, 66, 88].map((cx, i) => (
                <motion.circle
                  key={cx}
                  cx={cx}
                  r={9 + (i % 2) * 4}
                  fill={polish.hex}
                  initial={false}
                  animate={{ cy: filled ? -12 : 80 - (i % 2) * 7 }}
                  transition={{ duration: 0.9 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </g>
            {polish.finish === "metalico" && <rect width="100" height="100" fill={`url(#${uid}-metal)`} opacity={filled ? 1 : 0.4} />}
            {polish.finish === "glitter" &&
              Array.from({ length: 28 }, (_, i) => {
                return <circle key={i} cx={r2(hash01(i * 2 + 1) * 100)} cy={r2(hash01(i * 2 + 2) * 100)} r={0.9 + (i % 3) * 0.6} fill="#fff" opacity={filled ? 0.8 : 0.3} />;
              })}
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-shine)`} />
            {/* Contorno interno sutil: define a borda mesmo nas cores claras */}
            <circle cx="50" cy="50" r="49" fill="none" stroke="#1a1a1a" strokeOpacity="0.12" strokeWidth="1.5" />
          </g>
        </svg>
        {polish.finish === "perolado" && <span className="pointer-events-none absolute inset-1 rounded-full bg-[conic-gradient(from_200deg,rgba(255,255,255,0)_0deg,rgba(255,228,240,0.45)_90deg,rgba(220,240,255,0.35)_180deg,rgba(255,255,255,0)_270deg)] mix-blend-screen" />}
      </span>
      {showLabel && (
        <span className="text-[0.72rem] leading-tight">
          {polish.name}
          <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-muted">{finish}</span>
        </span>
      )}
    </button>
  );
}
