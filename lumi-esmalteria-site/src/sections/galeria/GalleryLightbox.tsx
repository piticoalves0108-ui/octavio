"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { galleryCategories, type GalleryItem } from "@/data/gallery";
import { whatsappLink } from "@/lib/whatsapp";
import { GalleryArtwork } from "./GalleryArtwork";

interface Props {
  items: GalleryItem[];
  /** Posição da peça aberta na lista filtrada (null = fechado) */
  index: number | null;
  /** Posição da peça na galeria completa, para manter o mesmo fundo do mosaico */
  baseIndex: (item: GalleryItem) => number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const label = (id: GalleryItem["category"]) => galleryCategories.find((c) => c.id === id)?.label ?? id;
const pad = (n: number) => String(n).padStart(2, "0");

/** Visualização ampliada: diálogo acessível com ESC, setas ←/→, foco preso e rolagem travada. */
export function GalleryLightbox({ items, index, baseIndex, onClose, onNavigate }: Props) {
  const lenis = useLenis();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null;
  const item = open ? items[index] : null;
  const total = items.length;

  const prev = () => index !== null && onNavigate((index - 1 + total) % total);
  const next = () => index !== null && onNavigate((index + 1) % total);

  // Trava a rolagem (Lenis + fallback nativo) e devolve o foco ao fechar
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    lenis?.stop();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      lenis?.start();
      html.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, lenis]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Tab" && dialogRef.current) {
        // Mantém o foco dentro do diálogo
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <AnimatePresence>
      {item && index !== null && (
        <motion.div
          key="lightbox"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          aria-describedby="lightbox-caption"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-cream/95 backdrop-blur-xl"
        >
          {/* Clique no fundo fecha */}
          <div aria-hidden className="fixed inset-0" onClick={onClose} />

          <div className="relative mx-auto flex min-h-full max-w-[1320px] flex-col px-4 pb-10 pt-4 sm:px-8 lg:justify-center lg:py-10">
            <div className="relative z-10 mb-4 flex items-center justify-between lg:mb-6">
              <p className="font-display text-lg italic text-muted" aria-live="polite">
                {pad(index + 1)} <span className="text-wine/80">/ {pad(total)}</span>
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fechar visualização"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-cream text-ink transition-colors duration-300 hover:border-wine hover:bg-wine hover:text-cream"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14">
              <div className="relative lg:col-span-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.97, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -8 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="relative aspect-[4/5] max-h-[72svh] w-full overflow-hidden rounded-[28px] shadow-[0_40px_80px_-45px_rgba(139,41,66,0.45)] sm:aspect-[5/4] lg:max-h-[78svh]"
                  >
                    <GalleryArtwork item={item} index={baseIndex(item)} sizes="(min-width: 1024px) 58vw, 100vw" />
                  </motion.div>
                </AnimatePresence>

                {/* Navegação */}
                <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Peça anterior"
                    className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-cream/85 text-ink shadow-[0_10px_30px_-15px_rgba(139,41,66,0.5)] backdrop-blur transition-colors hover:bg-wine hover:text-cream"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Próxima peça"
                    className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-cream/85 text-ink shadow-[0_10px_30px_-15px_rgba(139,41,66,0.5)] backdrop-blur transition-colors hover:bg-wine hover:text-cream"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-5"
                >
                  <p className="eyebrow text-wine">{label(item.category)}</p>
                  <h2 id="lightbox-title" className="display-md mt-4 text-ink">
                    {item.title}
                  </h2>
                  <p id="lightbox-caption" className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                    {item.caption}
                  </p>
                  <div className="my-8 h-px w-16 bg-wine/30" />
                  <p className="max-w-md text-sm leading-relaxed text-muted">
                    Gostou? Mande para a gente pelo WhatsApp: ajustamos cor, formato e comprimento para combinar com as suas mãos.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    <Button
                      href={whatsappLink(`Olá, Lumi! Vi a "${item.title}" na galeria do site e quero fazer igual. Qual o próximo horário?`)}
                      external
                      variant="wine"
                      size="lg"
                      icon={<WhatsAppIcon className="h-5 w-5" />}
                    >
                      Quero essa
                    </Button>
                    <span className="text-xs text-muted">Use ← → para navegar · Esc para fechar</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
