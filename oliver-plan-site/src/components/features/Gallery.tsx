"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLenis } from "lenis/react";
import { SmartImage } from "@/components/ui/SmartImage";
import { MaskReveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/** Galeria editorial assimétrica com lightbox (teclado: ← → Esc). */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const lenis = useLenis();

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open, close, step, lenis]);

  const spans = ["md:col-span-8 aspect-[16/10]", "md:col-span-4 aspect-[3/4] md:mt-24", "md:col-span-5 aspect-[4/5]", "md:col-span-7 aspect-[16/11] md:mt-16", "md:col-span-6 md:col-start-4 aspect-[16/10]"];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            className={cn("group relative block overflow-hidden bg-sand text-left", spans[i % spans.length])}
            data-cursor-label="Ampliar"
            aria-label={`Ampliar foto ${i + 1} de ${images.length}: ${title}`}
          >
            <MaskReveal className="absolute inset-0" delay={(i % 2) * 0.1}>
              <div className="relative h-full w-full transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.04]">
                <SmartImage src={src} alt={`${title}, foto ${i + 1}`} sizes="(min-width: 768px) 60vw, 100vw" fallbackLabel={title} />
              </div>
            </MaskReveal>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title}: galeria`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/95 p-4 md:p-12"
            data-cursor-theme="dark"
            onClick={close}
          >
            <motion.div key={open} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative h-full w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
              <SmartImage src={images[open]} alt={`${title}, foto ${open + 1}`} sizes="100vw" className="!object-contain" fallbackLabel={title} />
            </motion.div>
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm tabular-nums text-concrete">
              {open + 1} / {images.length}
            </p>
            <button type="button" onClick={close} aria-label="Fechar galeria" className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-linen text-graphite">
              <X className="h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => (e.stopPropagation(), step(-1))} aria-label="Foto anterior" className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-linen/30 text-linen hover:bg-linen hover:text-graphite">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => (e.stopPropagation(), step(1))} aria-label="Próxima foto" className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-linen/30 text-linen hover:bg-linen hover:text-graphite">
              <ChevronRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
