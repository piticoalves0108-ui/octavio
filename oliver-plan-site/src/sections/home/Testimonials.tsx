"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { testimonials } from "@/data/content";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

/** Depoimentos em destaque, com troca automática (pausa ao passar o mouse ou focar). */
export function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[i];
  const go = (d: number) => setI((v) => (v + d + testimonials.length) % testimonials.length);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => go(1), 7000);
    return () => clearTimeout(id);
  }, [i, paused]);

  return (
    <section
      className="relative overflow-hidden bg-paper py-24 md:py-36"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carrossel"
      aria-label="Depoimentos de clientes"
    >
      <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 select-none font-display text-[28rem] leading-none text-sand">
        &ldquo;
      </span>
      <div className="container-x relative">
        <SectionLabel index="09" className="justify-center">
          Depoimentos
        </SectionLabel>
        <div className="mx-auto mt-12 min-h-[22rem] max-w-4xl text-center md:min-h-[18rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.figure key={i} initial={{ opacity: 0, y: 24, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(6px)" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <blockquote className="font-display text-[clamp(1.6rem,3.2vw,2.75rem)] font-light leading-[1.2] tracking-[-0.015em] text-balance">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-10">
                <p className="font-medium">{t.name}</p>
                <p className="mt-1 text-sm text-stone">
                  {t.project} · {t.location}
                </p>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6">
          <button type="button" onClick={() => go(-1)} aria-label="Depoimento anterior" className="flex h-12 w-12 items-center justify-center rounded-full border border-graphite/20 transition-colors hover:bg-graphite hover:text-linen">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`Depoimento ${k + 1}`} aria-current={k === i} className="relative h-1 w-10 overflow-hidden rounded-full bg-graphite/15">
                {k === i && <motion.span key={`${i}-${paused}`} className={cn("absolute inset-y-0 left-0 bg-wood")} initial={{ width: paused ? "100%" : "0%" }} animate={{ width: "100%" }} transition={{ duration: paused ? 0 : 7, ease: "linear" }} />}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label="Próximo depoimento" className="flex h-12 w-12 items-center justify-center rounded-full border border-graphite/20 transition-colors hover:bg-graphite hover:text-linen">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
