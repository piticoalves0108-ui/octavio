"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Plus } from "lucide-react";
import { gallery, galleryCategories, type GalleryCategory, type GalleryItem } from "@/data/gallery";
import { cn } from "@/lib/utils";
import { aspects } from "./artStyles";
import { GalleryArtwork } from "./GalleryArtwork";
import { GalleryLightbox } from "./GalleryLightbox";

type Filter = "todas" | GalleryCategory;

const ease = [0.16, 1, 0.3, 1] as const;
const baseIndex = (item: GalleryItem) => gallery.findIndex((g) => g.id === item.id);
const categoryLabel = (id: GalleryCategory) => galleryCategories.find((c) => c.id === id)?.label ?? id;

/** Galeria filtrável em mosaico editorial, com transições de layout e visualização ampliada. */
export function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>("todas");
  const [open, setOpen] = useState<number | null>(null);

  const items = useMemo(() => (filter === "todas" ? gallery : gallery.filter((g) => g.category === filter)), [filter]);
  const filters = useMemo(
    () => [
      { id: "todas" as Filter, label: "Todas", count: gallery.length },
      ...galleryCategories.map((c) => ({ id: c.id as Filter, label: c.label, count: gallery.filter((g) => g.category === c.id).length })),
    ],
    [],
  );

  const close = useCallback(() => setOpen(null), []);

  return (
    <section aria-label="Galeria de trabalhos" className="container-x pb-24 md:pb-32">
      {/* Filtros */}
      <div className="mb-10 md:mb-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <LayoutGroup id="gallery-filters">
            <div
              role="group"
              aria-label="Filtrar por categoria"
              className="-mx-1 flex snap-x gap-2 overflow-x-auto rounded-full p-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {filters.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(f.id);
                      setOpen(null);
                    }}
                    className={cn(
                      "relative flex shrink-0 snap-start items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors duration-500 ease-out-expo",
                      active ? "border-transparent text-cream" : "border-ink/12 bg-cream/80 text-ink-soft backdrop-blur hover:border-wine/40 hover:text-wine",
                    )}
                  >
                    {active && <motion.span layoutId="gallery-pill" className="absolute inset-0 rounded-full bg-wine" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                    <span className="relative">{f.label}</span>
                    <span className={cn("relative font-display text-base italic leading-none", active ? "text-blush" : "text-mauve")}>{String(f.count).padStart(2, "0")}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <p className="hidden text-sm text-muted md:block" aria-live="polite">
            {items.length} {items.length === 1 ? "peça" : "peças"} · toque para ampliar
          </p>
        </div>
      </div>

      {/* Mosaico */}
      <motion.ul layout className="relative columns-1 gap-5 sm:columns-2 lg:columns-3 lg:gap-7">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, i) => {
            const bi = baseIndex(item);
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.7, ease, delay: Math.min(i, 8) * 0.03 }}
                className="mb-5 break-inside-avoid lg:mb-7"
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  data-cursor-label="Ver"
                  aria-label={`Ampliar ${item.title}`}
                  className="group block w-full text-left"
                >
                  <span className={cn("relative block overflow-hidden rounded-[28px] shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]", aspects[bi % aspects.length])}>
                    <span className="absolute inset-0 block transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
                      <GalleryArtwork item={item} index={bi} sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw" />
                    </span>
                    {/* Legenda revelada no hover */}
                    <span className="absolute inset-x-3 bottom-3 block translate-y-3 rounded-2xl bg-cream/85 p-4 opacity-0 backdrop-blur-md transition-all duration-700 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <span className="block text-sm leading-snug text-ink-soft">{item.caption}</span>
                    </span>
                    <span
                      aria-hidden
                      className="absolute right-4 top-4 flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-cream/80 text-wine opacity-0 backdrop-blur transition-all duration-500 ease-out-expo group-hover:scale-100 group-hover:opacity-100"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  </span>
                  <span className="mt-4 flex items-baseline justify-between gap-4 px-1">
                    <span className="font-display text-2xl leading-tight text-ink transition-colors duration-500 group-hover:text-wine">{item.title}</span>
                    <span className="eyebrow shrink-0 text-muted">{categoryLabel(item.category)}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      <GalleryLightbox items={items} index={open} baseIndex={baseIndex} onClose={close} onNavigate={setOpen} />
    </section>
  );
}
