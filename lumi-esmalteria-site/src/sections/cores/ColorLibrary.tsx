"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useLenis } from "lenis/react";
import { CalendarHeart } from "lucide-react";
import { collections, finishLabel, polishes, polishMap, type Polish } from "@/data/colors";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { PaintSwatch } from "@/components/features/PaintSwatch";
import { NailArt } from "@/components/features/NailArt";
import { finishBackground, finishDesign } from "./finishStyles";

type Filter = "Todas" | (typeof collections)[number];

const filters: Filter[] = ["Todas", ...collections];
const countOf = (f: Filter) => (f === "Todas" ? polishes.length : polishes.filter((p) => p.collection === f).length);
const bookHref = (p: Polish) => `/agendamento?cor=${p.id}`;
const askMessage = (p: Polish) => `Olá, Lumi! Quero fazer as unhas na cor ${p.name} (${finishLabel[p.finish]}). Tem horário?`;

/**
 * Cartela completa: filtro por coleção, swatches que "pintam" e painel com os detalhes da cor
 * escolhida. Aceita `?cor=<id>` na URL (vindo dos posts) para abrir já com a cor selecionada.
 */
export function ColorLibrary() {
  const [filter, setFilter] = useState<Filter>("Todas");
  const [selectedId, setSelectedId] = useState("nude-lumi");
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInView = useInView(panelRef, { amount: 0.25 });
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  const selected = polishMap[selectedId] ?? polishes[0];
  const visible = useMemo(() => (filter === "Todas" ? polishes : polishes.filter((p) => p.collection === filter)), [filter]);

  // Cor vinda da URL (?cor=cafe): seleciona e leva até a cartela
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("cor");
    if (!id || !polishMap[id]) return;
    setSelectedId(id);
    const t = setTimeout(() => {
      const el = sectionRef.current;
      if (!el) return;
      if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -40 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const art = finishDesign(selected.finish);

  return (
    <section ref={sectionRef} id="cartela" aria-labelledby="cartela-titulo" className="container-x scroll-mt-28 py-20 md:py-28">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="flex items-center gap-4 text-muted">
            <span className="font-display text-sm italic">02</span>
            <span className="h-px w-10 bg-wine/30" />
            <span className="eyebrow">Cartela completa</span>
          </p>
          <h2 id="cartela-titulo" className="display-lg mt-6 text-balance text-ink">
            {polishes.length} cores, <span className="serif-accent text-wine">uma é a sua.</span>
          </h2>
        </div>
        <p className="leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
          Passe o dedo (ou o mouse) sobre cada frasco e veja o esmalte subir. Toque para ver os detalhes e reservar a cor no seu horário.
        </p>
      </div>

      {/* Filtro por coleção */}
      <div role="group" aria-label="Filtrar cores por coleção" className="no-scrollbar -mx-5 mt-12 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {filters.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors duration-500",
                active ? "border-wine bg-wine text-cream" : "border-wine/15 bg-cream text-ink-soft hover:border-wine/50",
              )}
            >
              {f}
              <span className={cn("text-[0.7rem] tabular-nums", active ? "text-blush" : "text-muted")}>{countOf(f)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Grade de swatches */}
        <div className="lg:col-span-7 xl:col-span-8">
          <motion.ul layout className="grid grid-cols-3 gap-x-2 gap-y-8 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6" aria-label={`Cores: ${filter}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex justify-center"
                >
                  <PaintSwatch polish={p} size={76} selected={p.id === selectedId} onSelect={setSelectedId} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          {/* Barra fixa no celular: a cor escolhida sempre à mão */}
          <AnimatePresence>
            {!panelInView && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="sticky bottom-5 z-20 mr-[72px] mt-10 lg:hidden"
              >
                <div className="flex h-14 items-center gap-3 rounded-full bg-cream/90 py-2 pl-2 pr-2 shadow-[0_20px_40px_-20px_rgba(139,41,66,0.45)] ring-1 ring-wine/10 backdrop-blur-xl">
                  <span aria-hidden className="h-10 w-10 shrink-0 rounded-full ring-1 ring-black/5" style={{ background: finishBackground(selected.finish, selected.hex) }} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm text-ink">{selected.name}</span>
                    <span className="block text-[0.65rem] uppercase tracking-[0.14em] text-muted">{finishLabel[selected.finish]}</span>
                  </span>
                  <TransitionLink
                    href={bookHref(selected)}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-wine px-4 text-[0.8rem] font-medium text-cream"
                    aria-label={`Agendar com a cor ${selected.name}`}
                  >
                    <CalendarHeart className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Agendar
                  </TransitionLink>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Painel de detalhes da cor escolhida */}
        <div ref={panelRef} className="lg:col-span-5 xl:col-span-4">
          <div className="overflow-hidden rounded-[28px] bg-sand shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] lg:sticky lg:top-28">
            <div
              className="relative aspect-[4/3] transition-[background] duration-700"
              style={{ background: `radial-gradient(90% 70% at 50% 85%, ${selected.hex}38, transparent 70%), radial-gradient(60% 50% at 15% 10%, #ffffffaa, transparent 70%), #F5EDE6` }}
            >
              <div className="absolute inset-x-[8%] bottom-[6%] top-[10%]">
                <NailArt key={selected.id} design={art.design} shape="amendoada" colors={art.colors(selected.hex)} length="media" label={`Unhas pintadas na cor ${selected.name}, acabamento ${finishLabel[selected.finish].toLowerCase()}`} />
              </div>
              <span className="absolute left-5 top-5 rounded-full bg-cream/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-soft backdrop-blur">
                Coleção {selected.collection}
              </span>
            </div>

            <div className="p-6 md:p-8">
              <div aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-4xl leading-none text-ink md:text-5xl">{selected.name}</h3>
                      <span aria-hidden className="mt-1 h-9 w-9 shrink-0 rounded-full ring-1 ring-black/5" style={{ background: finishBackground(selected.finish, selected.hex) }} />
                    </div>
                    <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-muted">Acabamento</dt>
                        <dd className="text-ink">{finishLabel[selected.finish]}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted">Coleção</dt>
                        <dd className="text-ink">{selected.collection}</dd>
                      </div>
                    </dl>
                    <p className="mt-5 font-display text-xl italic leading-snug text-ink-soft md:text-2xl">“{selected.mood}”</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button href={bookHref(selected)} variant="wine" className="w-full sm:w-auto lg:w-full" magnetic={false}>
                  Agendar com esta cor
                </Button>
                <Button
                  href={whatsappLink(askMessage(selected))}
                  external
                  variant="outline"
                  arrow={false}
                  magnetic={false}
                  icon={<WhatsAppIcon className="h-4 w-4" />}
                  className="w-full sm:w-auto lg:w-full"
                  aria-label={`Perguntar pelo WhatsApp sobre a cor ${selected.name}`}
                >
                  Perguntar no WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
