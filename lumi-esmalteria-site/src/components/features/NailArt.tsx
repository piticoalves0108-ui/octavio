"use client";

import { useId, useRef } from "react";
import { motion, useInView } from "motion/react";
import type { NailShape } from "@/data/colors";
import type { NailDesign } from "@/data/gallery";
import { cn } from "@/lib/utils";
import { hash01, r2 } from "@/lib/random";

/**
 * Nail art desenhada em SVG: cinco unhas em leque, como um kit de unhas posiçado para foto.
 * Formato (amendoada, quadrada, redonda, stiletto), comprimento e desenho são parâmetros,
 * então a mesma peça muda de cor na hora e nunca "quebra" como uma foto.
 */

export const NAIL_LENGTH = { curta: 82, media: 110, longa: 150 } as const;

/** Contorno de uma unha com a cutícula em y=0 e a ponta em y=-L (coordenadas locais). */
export function nailPath(shape: NailShape, w: number, L: number) {
  const h = w / 2;
  const base = `M ${-h} -10 C ${-h} 6 ${h} 6 ${h} -10`;
  switch (shape) {
    case "quadrada":
      return `${base} L ${h} ${-L + 8} Q ${h} ${-L} ${h - 8} ${-L} L ${-h + 8} ${-L} Q ${-h} ${-L} ${-h} ${-L + 8} Z`;
    case "redonda":
      return `${base} L ${h} ${-L + h} A ${h} ${h} 0 0 0 ${-h} ${-L + h} Z`;
    case "stiletto":
      return `${base} L ${h * 0.96} ${-L + w * 1.1} C ${h * 0.86} ${-L + w * 0.45} ${w * 0.07} ${-L + w * 0.08} 0 ${-L} C ${-w * 0.07} ${-L + w * 0.08} ${-h * 0.86} ${-L + w * 0.45} ${-h * 0.96} ${-L + w * 1.1} Z`;
    default:
      return `${base} L ${h * 0.97} ${-L + w * 0.8} C ${h * 0.92} ${-L + w * 0.22} ${w * 0.14} ${-L} 0 ${-L} C ${-w * 0.14} ${-L} ${-h * 0.92} ${-L + w * 0.22} ${-h * 0.97} ${-L + w * 0.8} Z`;
  }
}

/** Números pseudo-aleatórios estáveis (o desenho é igual no servidor e no navegador) */
const rand = (seed: number) => hash01(seed + 7);

function Decoration({ design, colors, w, L, i, uid }: { design: NailDesign; colors: string[]; w: number; L: number; i: number; uid: string }) {
  const [c0, c1 = "#ffffff", c2 = c1] = colors;
  const h = w / 2;
  switch (design) {
    case "french":
    case "micro-french": {
      const td = design === "french" ? L * 0.28 : 11;
      return <path d={`M ${-w} ${-L + td} Q 0 ${-L + td - (design === "french" ? 22 : 8)} ${w} ${-L + td} L ${w} ${-L - 20} L ${-w} ${-L - 20} Z`} fill={c1} />;
    }
    case "ombre":
      return <rect x={-w} y={-L - 10} width={w * 2} height={L + 30} fill={`url(#${uid}-ombre)`} />;
    case "chrome":
      return <rect x={-w} y={-L - 10} width={w * 2} height={L + 30} fill={`url(#${uid}-chrome)`} />;
    case "marble":
      return (
        <g fill="none" stroke={c1} strokeLinecap="round" opacity={0.65}>
          <path d={`M ${-h} ${-L * (0.2 + rand(i) * 0.2)} C ${-h * 0.2} ${-L * 0.45} ${h * 0.3} ${-L * 0.3} ${h} ${-L * (0.7 - rand(i + 3) * 0.2)}`} strokeWidth={2.2} />
          <path d={`M ${-h * 0.6} ${-L * 0.85} C ${-h * 0.1} ${-L * 0.6} ${h * 0.2} ${-L * 0.75} ${h * 0.4} ${-L * 0.5}`} strokeWidth={1.2} />
          <path d={`M ${-h} ${-L * 0.6} Q 0 ${-L * 0.5} ${h * 0.2} ${-L * 0.15}`} strokeWidth={0.8} opacity={0.6} />
        </g>
      );
    case "dots":
      return (
        <g fill={c1}>
          {[0.25, 0.42, 0.59].map((k, j) => (
            <circle key={j} cx={0} cy={-L * k} r={j === 1 ? 4.5 : 3.2} />
          ))}
        </g>
      );
    case "line":
      return (
        <g stroke={c1} strokeLinecap="round">
          <line x1={-h * 0.3 + (i % 2) * 8} y1={-4} x2={h * 0.2 + (i % 2) * 8} y2={-L} strokeWidth={2} />
          {i % 2 === 0 && <line x1={-h} y1={-L * 0.55} x2={h} y2={-L * 0.45} strokeWidth={1.4} />}
        </g>
      );
    case "floral": {
      if (i % 2 === 1) return null;
      const cy = -L * 0.5;
      return (
        <g>
          <path d={`M 2 ${cy + 4} Q 14 ${cy + 14} 6 ${cy + 26}`} stroke={c2} strokeWidth={2} fill="none" />
          {Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2;
            const px = r2(Math.cos(a) * 6.5);
            const py = r2(cy + Math.sin(a) * 6.5);
            return <ellipse key={k} cx={px} cy={py} rx={5.2} ry={3.6} transform={`rotate(${k * 72} ${px} ${py})`} fill={c1} />;
          })}
          <circle cx={0} cy={cy} r={3} fill="#fff4d6" />
        </g>
      );
    }
    case "glitter-tip":
      return (
        <g fill={c1}>
          {Array.from({ length: 46 }, (_, k) => {
            const y = -L + rand(k + i * 31) * L * 0.42 * rand(k * 7 + i);
            return <circle key={k} cx={r2((rand(k * 3 + i) - 0.5) * w)} cy={r2(y)} r={r2(0.8 + rand(k + 11) * 1.8)} opacity={r2(0.5 + rand(k + 5) * 0.5)} />;
          })}
        </g>
      );
    case "half-moon":
      return <path d={`M ${-h} -6 Q 0 ${-L * 0.42} ${h} -6 Z`} fill={c1} />;
    case "abstract":
      return (
        <g>
          <path d={`M ${-h} ${-L * 0.3} C ${-h * 0.2} ${-L * 0.55} ${h * 0.6} ${-L * 0.2} ${h} ${-L * 0.45} L ${h} ${-L - 10} L ${-h} ${-L - 10} Z`} fill={i % 2 ? c1 : c2} opacity={0.9} />
          <circle cx={h * 0.3 - (i % 3) * 6} cy={-L * 0.25} r={5} fill={c1} />
        </g>
      );
    default:
      return null;
  }
}

interface Props {
  design: NailDesign;
  shape: NailShape;
  colors: string[];
  length?: keyof typeof NAIL_LENGTH;
  className?: string;
  /** Anima a "pintura" ao entrar na tela */
  paint?: boolean;
  label?: string;
}

export function NailArt({ design, shape, colors, length = "media", className, paint = true, label }: Props) {
  const uid = useId().replace(/[:«»]/g, "");
  const L = NAIL_LENGTH[length];
  const w = 54;
  const angles = [-26, -13, 0, 13, 26];
  const sizes = [0.86, 0.96, 1.04, 0.96, 0.84];
  const base = colors[0];
  // O gatilho fica no <svg>: o grupo de tinta começa fora da área visível e nunca "entraria na tela"
  const svg = useRef<SVGSVGElement>(null);
  const inView = useInView(svg, { once: true, amount: 0.3 });

  return (
    <svg ref={svg} viewBox="-200 -230 400 290" className={cn("h-full w-full", className)} role="img" aria-label={label ?? `Nail art ${design}, formato ${shape}`}>
      <defs>
        <linearGradient id={`${uid}-ombre`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1] ?? colors[0]} />
        </linearGradient>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={colors[0]} />
          <stop offset="0.75" stopColor="#fff7f4" />
          <stop offset="1" stopColor={colors[0]} />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#8b2942" floodOpacity="0.18" />
        </filter>
      </defs>

      {angles.map((a, i) => {
        const s = sizes[i];
        const x = r2(Math.sin((a * Math.PI) / 180) * 260);
        const y = r2(40 - Math.cos((a * Math.PI) / 180) * 30 + Math.abs(a) * 0.4);
        const d = nailPath(shape, w, L);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} filter={`url(#${uid}-shadow)`}>
            <clipPath id={`${uid}-clip-${i}`}>
              <path d={d} />
            </clipPath>
            {/* Unha "nua" por baixo */}
            <path d={d} fill="#f2dcd3" />
            <g clipPath={`url(#${uid}-clip-${i})`}>
              <motion.g
                initial={paint ? { y: L + 20 } : false}
                animate={!paint || inView ? { y: 0 } : { y: L + 20 }}
                transition={{ duration: 1.1, delay: 0.12 * i, ease: [0.16, 1, 0.3, 1] }}
              >
                <rect x={-w} y={-L - 20} width={w * 2} height={L + 40} fill={base} />
                <Decoration design={design} colors={colors} w={w} L={L} i={i} uid={uid} />
              </motion.g>
              {/* Reflexo de gel */}
              <rect x={-w * 0.32} y={-L} width={w * 0.22} height={L * 0.8} rx={6} fill={`url(#${uid}-gloss)`} opacity={0.75} transform={`skewY(-4)`} />
            </g>
            <path d={d} fill="none" stroke="#000" strokeOpacity={0.06} strokeWidth={1.2} />
          </g>
        );
      })}
    </svg>
  );
}
