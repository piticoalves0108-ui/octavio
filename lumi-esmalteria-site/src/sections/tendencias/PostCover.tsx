"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { nailPath, NAIL_LENGTH } from "@/components/features/NailArt";
import { nailShapes } from "@/data/colors";
import { cn } from "@/lib/utils";
import { r2 } from "@/lib/random";

/** Cor com transparência; tons muito escuros ficam mais leves para não "sujar" o fundo */
function soft(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const a = lum < 0.25 ? Math.round(alpha * 0.4) : alpha;
  return `${hex.slice(0, 7)}${a.toString(16).padStart(2, "0")}`;
}

/**
 * Capa gerada a partir da paleta do post: cinco unhas em leque, cada uma numa cor da paleta,
 * sobre um fundo de manchas suaves das mesmas cores. `seed` varia o formato e a composição.
 */
export function PostCover({
  palette,
  seed = 0,
  className,
  label,
  number,
  decorative = false,
}: {
  palette: string[];
  seed?: number;
  className?: string;
  label?: string;
  number?: string;
  /** Dentro de um link que já tem o título: a capa fica fora da leitura de tela */
  decorative?: boolean;
}) {
  const uid = useId().replace(/[:«»]/g, "");
  const shape = nailShapes[seed % nailShapes.length].id;
  const L = seed % 2 === 0 ? NAIL_LENGTH.media : NAIL_LENGTH.longa * 0.9;
  const w = 52;
  const angles = [-28, -14, 0, 14, 28];
  const sizes = [0.86, 0.96, 1.04, 0.96, 0.86];
  const colorAt = (i: number) => palette[(i + seed) % palette.length];
  const [c0, c1 = c0, c2 = c1] = palette;

  const background = [
    `radial-gradient(55% 60% at ${18 + (seed % 3) * 8}% 22%, ${soft(c0, 0x55)}, transparent 70%)`,
    `radial-gradient(50% 55% at 88% ${70 - (seed % 2) * 20}%, ${soft(c1, 0x50)}, transparent 70%)`,
    `radial-gradient(45% 50% at 55% 105%, ${soft(c2, 0x45)}, transparent 70%)`,
    "radial-gradient(40% 40% at 70% 10%, #ffffffcc, transparent 70%)",
    "#F5EDE6",
  ].join(", ");

  return (
    <div className={cn("absolute inset-0", className)} style={{ background }}>
      {number && (
        <span aria-hidden className="absolute bottom-[6%] left-[5%] font-display text-[clamp(3.5rem,9vw,8rem)] italic leading-none text-white/90 mix-blend-soft-light">
          {number}
        </span>
      )}
      <motion.svg
        viewBox="-210 -250 420 300"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-[6%] h-[88%] w-[88%] overflow-visible"
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? "Composição de unhas com as cores da paleta" })}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <defs>
          <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0.6" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#8b2942" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Arco dourado de fundo */}
        <circle cx="0" cy="30" r="190" fill="none" stroke="#C8A27A" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="0" cy="30" r="170" fill={`url(#${uid}-halo)`} />

        {angles.map((a, i) => {
          const s = sizes[i];
          const x = r2(Math.sin((a * Math.PI) / 180) * 250);
          const y = r2(40 - Math.cos((a * Math.PI) / 180) * 30 + Math.abs(a) * 0.4);
          const d = nailPath(shape, w, L);
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} filter={`url(#${uid}-shadow)`}>
              <clipPath id={`${uid}-clip-${i}`}>
                <path d={d} />
              </clipPath>
              <path d={d} fill="#f2dcd3" />
              <g clipPath={`url(#${uid}-clip-${i})`}>
                <motion.g variants={{ hidden: { y: L + 20 }, show: { y: 0, transition: { duration: 1.1, delay: 0.15 + 0.1 * i, ease: [0.16, 1, 0.3, 1] } } }}>
                  <rect x={-w} y={-L - 20} width={w * 2} height={L + 40} fill={colorAt(i)} />
                </motion.g>
                <rect x={-w * 0.32} y={-L} width={w * 0.22} height={L * 0.8} rx={6} fill={`url(#${uid}-gloss)`} opacity={0.75} transform="skewY(-4)" />
              </g>
              <path d={d} fill="none" stroke="#000" strokeOpacity={0.07} strokeWidth={1.2} />
            </g>
          );
        })}
      </motion.svg>
    </div>
  );
}
