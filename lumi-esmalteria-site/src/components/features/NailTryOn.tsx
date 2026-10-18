"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { finishLabel, getPolish, nailShapes, polishes, type NailShape, type Polish } from "@/data/colors";
import { PaintSwatch } from "./PaintSwatch";
import { nailPath } from "./NailArt";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/whatsapp";
import { hash01, r2 } from "@/lib/random";
import { cn } from "@/lib/utils";

/**
 * Provador de cores: uma mão ilustrada em SVG cujas unhas são "pintadas" na cor escolhida,
 * com formato, comprimento e estilo (lisa ou francesinha). Termina em "Agendar com esta cor".
 * <NailTryOn initialPolish="nude-lumi" compact />
 */

type Length = "curta" | "media" | "longa";
type Style = "lisa" | "francesinha";

const EXT: Record<Length, number> = { curta: 4, media: 18, longa: 40 };
const LENGTH_LABEL: Record<Length, string> = { curta: "Curta", media: "Média", longa: "Longa" };

// Dedos: base (x, y), ângulo, comprimento e largura, no espaço 0..420 × 0..560
const FINGERS = [
  { x: 166, y: 320, a: -9, len: 166, w: 44 },
  { x: 213, y: 302, a: -2, len: 188, w: 46 },
  { x: 259, y: 308, a: 5, len: 170, w: 43, ring: true },
  { x: 299, y: 334, a: 13, len: 132, w: 37 },
];
const THUMB = { x: 150, y: 418, a: -50, len: 126, w: 48 };

const fingerD = (w: number, len: number) => `M ${-w / 2} 0 L ${-w * 0.45} ${-len + w * 0.45} A ${w * 0.45} ${w * 0.45} 0 0 1 ${w * 0.45} ${-len + w * 0.45} L ${w / 2} 0 Z`;

function Nail({ uid, k, polish, prev, shape, length, style, w, len }: { uid: string; k: number; polish: Polish; prev: Polish; shape: NailShape; length: Length; style: Style; w: number; len: number }) {
  const nw = w * 0.72;
  const L = w * 1.02 + EXT[length];
  const y0 = -len + w * 1.02;
  const d = nailPath(shape, nw, L);
  const paint = (p: Polish) => (p.finish === "metalico" ? `url(#${uid}-chrome-${p.id})` : p.hex);
  const french = style === "francesinha";

  return (
    <g transform={`translate(0 ${r2(y0)})`}>
      <clipPath id={`${uid}-nail-${k}`}>
        <path d={d} />
      </clipPath>
      <path d={d} fill="#f2d3c6" />
      <g clipPath={`url(#${uid}-nail-${k})`}>
        {/* Camada anterior por baixo; a nova cor sobe da cutícula até a ponta */}
        <rect x={-nw} y={-L - 20} width={nw * 2} height={L + 40} fill={french ? "#f5e9e4" : paint(prev)} />
        {french && <path d={`M ${-nw} ${-L + L * 0.3} Q 0 ${-L + L * 0.3 - 12} ${nw} ${-L + L * 0.3} L ${nw} ${-L - 20} L ${-nw} ${-L - 20} Z`} fill={paint(prev)} />}
        <motion.g key={`${polish.id}-${style}-${shape}-${length}`} initial={{ y: L + 24 }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.06 * k, ease: [0.16, 1, 0.3, 1] }}>
          {french ? (
            <>
              <rect x={-nw} y={-L - 20} width={nw * 2} height={L + 40} fill="#f5e9e4" />
              <path d={`M ${-nw} ${-L + L * 0.3} Q 0 ${-L + L * 0.3 - 12} ${nw} ${-L + L * 0.3} L ${nw} ${-L - 20} L ${-nw} ${-L - 20} Z`} fill={paint(polish)} />
            </>
          ) : (
            <rect x={-nw} y={-L - 20} width={nw * 2} height={L + 40} fill={paint(polish)} />
          )}
          {polish.finish === "glitter" &&
            Array.from({ length: 24 }, (_, i) => (
              <circle key={i} cx={r2((hash01(i + k * 40) - 0.5) * nw)} cy={r2(-hash01(i * 3 + k) * L)} r={r2(0.6 + hash01(i + 9) * 1.2)} fill="#fff" opacity={r2(0.5 + hash01(i + 4) * 0.5)} />
            ))}
          {polish.finish === "perolado" && <rect x={-nw} y={-L - 20} width={nw * 2} height={L + 40} fill={`url(#${uid}-pearl)`} opacity={0.3} style={{ mixBlendMode: "screen" }} />}
        </motion.g>
        {/* Reflexo de gel */}
        <rect x={-nw * 0.3} y={-L * 0.92} width={nw * 0.2} height={L * 0.7} rx={4} fill={`url(#${uid}-gloss)`} />
      </g>
      <path d={d} fill="none" stroke="#000" strokeOpacity={0.07} strokeWidth={1} />
    </g>
  );
}

function Hand({ polish, prev, shape, length, style }: { polish: Polish; prev: Polish; shape: NailShape; length: Length; style: Style }) {
  const uid = useId().replace(/[:«»]/g, "");
  const chromes = [polish, prev].filter((p, i, a) => p.finish === "metalico" && a.findIndex((q) => q.id === p.id) === i);

  return (
    <svg viewBox="0 0 420 560" className="h-full w-full" role="img" aria-label={`Mão com unhas ${shape}s, ${LENGTH_LABEL[length].toLowerCase()}s, ${style}, na cor ${polish.name}`}>
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9a891" />
          <stop offset="0.45" stopColor="#efc9b5" />
          <stop offset="1" stopColor="#e2b49e" />
        </linearGradient>
        <radialGradient id={`${uid}-palm`} cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f3d3c2" />
          <stop offset="1" stopColor="#dcab94" />
        </radialGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-pearl`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd6e7" stopOpacity="0" />
          <stop offset="0.45" stopColor="#ffe4f0" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#d6ecff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff2cf" stopOpacity="0" />
        </linearGradient>
        {chromes.map((p) => (
          <linearGradient key={p.id} id={`${uid}-chrome-${p.id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={p.hex} />
            <stop offset="0.38" stopColor="#ffffff" />
            <stop offset="0.55" stopColor={p.hex} />
            <stop offset="0.8" stopColor="#fff6f2" />
            <stop offset="1" stopColor={p.hex} />
          </linearGradient>
        ))}
        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#8b2942" floodOpacity="0.16" />
        </filter>
      </defs>

      <g filter={`url(#${uid}-shadow)`}>
        {/* Punho e palma (dorso da mão) */}
        <path d="M 150 560 L 158 452 C 140 410 132 362 142 330 C 160 296 300 290 318 330 C 334 368 318 420 296 452 L 300 560 Z" fill={`url(#${uid}-palm)`} />
        {/* Polegar */}
        <g transform={`translate(${THUMB.x} ${THUMB.y}) rotate(${THUMB.a})`}>
          <path d={fingerD(THUMB.w, THUMB.len)} fill={`url(#${uid}-skin)`} />
          <path d={`M ${-THUMB.w * 0.3} ${-THUMB.len * 0.45} Q 0 ${-THUMB.len * 0.45 - 4} ${THUMB.w * 0.3} ${-THUMB.len * 0.45}`} stroke="#b9826a" strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
          <Nail uid={uid} k={4} polish={polish} prev={prev} shape={shape} length={length} style={style} w={THUMB.w} len={THUMB.len} />
        </g>
        {/* Dedos */}
        {FINGERS.map((f, k) => (
          <g key={k} transform={`translate(${f.x} ${f.y}) rotate(${f.a})`}>
            <path d={fingerD(f.w, f.len)} fill={`url(#${uid}-skin)`} />
            {[0.36, 0.66].map((t) => (
              <path key={t} d={`M ${-f.w * 0.28} ${-f.len * t} Q 0 ${-f.len * t - 4} ${f.w * 0.28} ${-f.len * t}`} stroke="#b9826a" strokeOpacity={0.32} strokeWidth={1.4} fill="none" />
            ))}
            {f.ring && (
              <g transform={`translate(0 ${-f.len * 0.22})`}>
                <rect x={-f.w * 0.52} y={-5} width={f.w * 1.04} height={10} rx={5} fill="#d4b08a" />
                <rect x={-f.w * 0.52} y={-5} width={f.w * 1.04} height={4} rx={2} fill="#fff" opacity={0.35} />
                <circle cx={0} cy={-6} r={4.5} fill="#fff" stroke="#d4b08a" strokeWidth={1.5} />
              </g>
            )}
            <Nail uid={uid} k={k} polish={polish} prev={prev} shape={shape} length={length} style={style} w={f.w} len={f.len} />
          </g>
        ))}
        {/* Punho de tricô */}
        <path d="M 132 478 C 190 466 262 466 318 478 L 326 560 L 124 560 Z" fill="#f4ece3" />
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1={140 + i * 11.5} y1={482} x2={136 + i * 12} y2={560} stroke="#e2d6c9" strokeWidth={3} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
}

export function NailTryOn({ initialPolish = "nude-lumi", compact = false }: { initialPolish?: string; compact?: boolean }) {
  const [polishId, setPolishId] = useState(initialPolish);
  const prevRef = useRef(initialPolish);
  const [prevId, setPrevId] = useState(initialPolish);
  const [shape, setShape] = useState<NailShape>("amendoada");
  const [length, setLength] = useState<Length>("media");
  const [style, setStyle] = useState<Style>("lisa");
  const polish = getPolish(polishId);
  const list = compact ? polishes.filter((_, i) => i % 2 === 0 || i < 4).slice(0, 10) : polishes;

  const choose = (id: string) => {
    if (id === polishId) return;
    setPrevId(prevRef.current);
    prevRef.current = id;
    setPolishId(id);
  };

  const summary = `cor ${polish.name} (${finishLabel[polish.finish]}), formato ${shape}, ${LENGTH_LABEL[length].toLowerCase()}${style === "francesinha" ? ", francesinha" : ""}`;
  const pill = (active: boolean) => cn("rounded-full border px-3.5 py-1.5 text-xs transition-colors", active ? "border-wine bg-wine text-cream" : "border-ink/15 bg-cream/60 hover:border-wine/50");

  return (
    <div className={cn("grid items-stretch gap-6", compact ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-[1.15fr_1fr]")}>
      <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(160deg,#faf7f2,#f1e3dc)]">
        <div aria-hidden className="absolute left-1/2 top-[36%] h-[60%] w-[70%] -translate-x-1/2 rounded-full opacity-35 blur-[70px] transition-colors duration-1000" style={{ background: polish.hex }} />
        <div className={cn("relative mx-auto", compact ? "aspect-[3/4] max-h-[560px]" : "aspect-[3/4] max-h-[640px]")}>
          <Hand polish={polish} prev={getPolish(prevId)} shape={shape} length={length} style={style} />
        </div>
        <span className="eyebrow absolute left-5 top-5 rounded-full bg-cream/80 px-3 py-1.5 text-[0.6rem] text-muted backdrop-blur">Provador de cores</span>
      </div>

      <div className="flex flex-col gap-6 rounded-[36px] bg-cream p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={polish.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} aria-live="polite">
            <p className="eyebrow text-muted">
              {polish.collection} · {finishLabel[polish.finish]}
            </p>
            <p className="mt-2 font-display text-4xl leading-none">{polish.name}</p>
            <p className="mt-2 text-sm text-muted">{polish.mood}</p>
          </motion.div>
        </AnimatePresence>

        <div role="group" aria-label="Cores" className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {list.map((p) => (
            <PaintSwatch key={p.id} polish={p} size={38} showLabel={false} selected={p.id === polishId} onSelect={choose} />
          ))}
        </div>

        <fieldset>
          <legend className="eyebrow mb-2 text-muted">Formato</legend>
          <div className="flex flex-wrap gap-2">
            {nailShapes.map((s) => (
              <button key={s.id} type="button" aria-pressed={shape === s.id} onClick={() => setShape(s.id)} className={pill(shape === s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </fieldset>

        {!compact && (
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="eyebrow mb-2 text-muted">Comprimento</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(EXT) as Length[]).map((l) => (
                  <button key={l} type="button" aria-pressed={length === l} onClick={() => setLength(l)} className={pill(length === l)}>
                    {LENGTH_LABEL[l]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-2 text-muted">Estilo</legend>
              <div className="flex flex-wrap gap-2">
                {(["lisa", "francesinha"] as Style[]).map((s) => (
                  <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)} className={pill(style === s)}>
                    {s === "lisa" ? "Lisa" : "Francesinha"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 sm:flex-row">
          <Button href={`/agendamento?cor=${polish.id}`} variant="wine" magnetic={false} className="flex-1">
            Agendar com esta cor
          </Button>
          <Button
            href={whatsappLink(`Olá, Lumi! Montei no provador do site: ${summary}. Tem horário disponível?`)}
            external
            variant="outline"
            arrow={false}
            magnetic={false}
            icon={<WhatsAppIcon className="h-4 w-4" />}
            className="flex-1"
          >
            Enviar no WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
