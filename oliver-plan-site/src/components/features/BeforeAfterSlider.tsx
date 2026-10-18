"use client";

import { MoveHorizontal } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { useSlider } from "./useSlider";
import { cn } from "@/lib/utils";

/** Comparador de fotos antes/depois com divisor arrastável. */
export function BeforeAfterSlider({ before, after, alt, className }: { before: string; after: string; alt: string; className?: string }) {
  const { value, bind, handleProps } = useSlider(0.5);
  return (
    <div className={cn("relative aspect-[4/3] select-none overflow-hidden bg-sand", className)} {...bind} data-cursor-label="Arraste">
      <div className="absolute inset-0">
        <SmartImage src={after} alt={`${alt}: depois`} sizes="(min-width: 1024px) 50vw, 100vw" fallbackLabel="Depois" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - value * 100}% 0 0)` }}>
        <SmartImage src={before} alt={`${alt}: antes`} sizes="(min-width: 1024px) 50vw, 100vw" className="grayscale-[35%]" fallbackLabel="Antes" />
      </div>
      <span className="eyebrow pointer-events-none absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1.5 text-[0.6rem] text-graphite">Antes</span>
      <span className="eyebrow pointer-events-none absolute right-3 top-3 rounded-full bg-graphite px-3 py-1.5 text-[0.6rem] text-linen">Depois</span>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-paper" style={{ left: `${value * 100}%` }} />
      <button
        type="button"
        {...handleProps}
        aria-label={`Comparar antes e depois: ${alt}`}
        className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-graphite shadow-lg"
        style={{ left: `${value * 100}%` }}
      >
        <MoveHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
