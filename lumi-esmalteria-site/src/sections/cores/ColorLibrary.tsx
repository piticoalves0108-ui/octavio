"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useLenis } from "lenis/react";
import { CalendarHeart, RotateCcw } from "lucide-react";
import { collections, finishLabel, polishes, polishMap, type Finish, type Polish } from "@/data/colors";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { PaintSwatch } from "@/components/features/PaintSwatch";
import { NailArt } from "@/components/features/NailArt";
import { finishBackground, finishDesign } from "./finishStyles";
import { FINISH_FILTER_EVENT } from "./FinishFilterButton";

type Collection = Polish["collection"];
type CollectionFilter = "Todas" | Collection;
type FinishFilter = "Todos" | Finish;

const finishOrder: Finish[] = ["cremoso", "perolado", "metalico", "glitter"];
const collectionFilters: CollectionFilter[] = ["Todas", ...collections];
const finishFilters: FinishFilter[] = ["Todos", ...finishOrder];

/** Adjetivo do acabamento concordando com "cor" (singular, plural) */
const finishAdj: Record<Finish, [string, string]> = {
  cremoso: ["cremosa", "cremosas"],
  perolado: ["perolada", "peroladas"],
  metalico: ["metálica", "metálicas"],
  glitter: ["com glitter", "com glitter"],
};

const matches = (p: Polish, c: CollectionFilter, f: FinishFilter) => (c === "Todas" || p.collection === c) && (f === "Todos" || p.finish === f);
const bookHref = (p: Polish) => `/agendamento?cor=${p.id}`;
const askMessage = (p: Polish) => `Olá, Lumi! Quero fazer as unhas na cor ${p.name} (${finishLabel[p.finish]}). Tem horário?`;
const ease = [0.16, 1, 0.3, 1] as const;

/** Tom neutro para mostrar o acabamento nos filtros */
const FINISH_DEMO_HEX = "#D9A3A0";

/**
 * Cartela completa: filtros por coleção e acabamento, swatches que "pintam" e painel com os
 * detalhes da cor escolhida. Aceita `?cor=<id>` na URL (vindo dos posts) para abrir já com a cor
 * selecionada, e o evento do guia de acabamentos para filtrar por acabamento.
 */
export function ColorLibrary() {
  const [collection, setCollection] = useState<CollectionFilter>("Todas");
  const [finish, setFinish] = useState<FinishFilter>("Todos");
  const [selectedId, setSelectedId] = useState("nude-lumi");
  const filtersRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInView = useInView(panelRef, { amount: 0.25 });
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  const selected = polishMap[selectedId] ?? polishes[0];
  const visible = useMemo(() => polishes.filter((p) => matches(p, collection, finish)), [collection, finish]);
  const filtered = collection !== "Todas" || finish !== "Todos";
  const siblings = polishes.filter((p) => p.collection === selected.collection);
  const number = String(polishes.indexOf(selected) + 1).padStart(2, "0");

  // Rolagem suave (Lenis respeita o scroll-margin dos alvos)
  const scrollTo = (el: HTMLElement | null) => {
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el);
    else el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  // Cor vinda da URL (?cor=cafe): seleciona e leva até a cor (grade + painel no desktop, painel no celular)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("cor");
    if (!id || !polishMap[id]) return;
    setSelectedId(id);
    const t = setTimeout(() => scrollTo(window.matchMedia("(min-width: 1024px)").matches ? resultsRef.current : panelRef.current), 900);
    return () => clearTimeout(t);
  }, []);

  // "Ver na cartela" no guia de acabamentos: filtra pelo acabamento e sobe até a cartela
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onFilter = (e: Event) => {
      const f = (e as CustomEvent<Finish>).detail;
      if (!finishOrder.includes(f)) return;
      setCollection("Todas");
      setFinish(f);
      setSelectedId((id) => (polishMap[id]?.finish === f ? id : (polishes.find((p) => p.finish === f)?.id ?? id)));
      t = setTimeout(() => scrollTo(filtersRef.current), 0);
    };
    window.addEventListener(FINISH_FILTER_EVENT, onFilter);
    return () => {
      window.removeEventListener(FINISH_FILTER_EVENT, onFilter);
      clearTimeout(t);
    };
  }, []);

  const resetFilters = () => {
    setCollection("Todas");
    setFinish("Todos");
  };

  const art = finishDesign(selected.finish);

  return (
    <section id="cartela" aria-labelledby="cartela-titulo" className="container-x scroll-mt-28 py-20 md:py-28">
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
          Passe o dedo (ou o mouse) sobre cada frasco e veja o esmalte subir. Filtre por coleção ou acabamento e toque na cor para ver os detalhes e reservá-la no seu horário.
        </p>
      </div>

      {/* Filtros: coleção e acabamento */}
      <div ref={filtersRef} className="mt-12 scroll-mt-28 space-y-3 border-y border-wine/10 py-5 md:py-6">
        <FilterRow label="Coleção" id="filtro-colecao">
          {collectionFilters.map((c) => (
            <FilterChip
              key={c}
              group="colecao"
              active={collection === c}
              count={polishes.filter((p) => matches(p, c, finish)).length}
              onClick={() => setCollection(c)}
            >
              {c}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Acabamento" id="filtro-acabamento">
          {finishFilters.map((f) => (
            <FilterChip
              key={f}
              group="acabamento"
              active={finish === f}
              count={polishes.filter((p) => matches(p, collection, f)).length}
              onClick={() => setFinish(f)}
              dot={f === "Todos" ? undefined : finishBackground(f, FINISH_DEMO_HEX)}
            >
              {f === "Todos" ? "Todos" : finishLabel[f]}
            </FilterChip>
          ))}
        </FilterRow>
      </div>

      <div className="mt-6 flex min-h-9 items-center justify-between gap-4 text-sm">
        <p className="text-muted" aria-live="polite">
          <span className="font-display text-xl tabular-nums text-ink">{visible.length}</span> {visible.length === 1 ? "cor" : "cores"}
          {filtered && <span className="hidden sm:inline"> de {polishes.length}</span>}
        </p>
        <AnimatePresence initial={false}>
          {filtered && (
            <motion.button
              type="button"
              onClick={resetFilters}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.35, ease }}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-ink-soft transition-colors duration-300 hover:bg-sand hover:text-wine"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              Limpar filtros
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div ref={resultsRef} className="mt-8 grid scroll-mt-32 gap-6 lg:grid-cols-12 lg:gap-12">
        {/* Grade de swatches */}
        <div className="lg:col-span-7 xl:col-span-8">
          <motion.ul layout className="relative grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6" aria-label="Cores da cartela">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((p) => {
                const active = p.id === selectedId;
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.55, ease }}
                    className="flex flex-col items-center gap-2"
                  >
                    <PaintSwatch polish={p} size={76} selected={active} onSelect={setSelectedId} showLabel={false} />
                    {/* Legenda com acento (o nome acessível já vem do botão do swatch) */}
                    <span aria-hidden onClick={() => setSelectedId(p.id)} className="cursor-pointer text-center text-[0.74rem] leading-tight">
                      <span className={cn("transition-colors duration-300", active ? "font-medium text-wine" : "text-ink")}>{p.name}</span>
                      <span className="block text-[0.6rem] uppercase tracking-[0.14em] text-muted">{finishLabel[p.finish]}</span>
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>

          {/* Filtro sem resultado */}
          <AnimatePresence initial={false}>
            {visible.length === 0 && finish !== "Todos" && collection !== "Todas" && (
              <EmptyState
                key={`${collection}-${finish}`}
                collection={collection}
                finish={finish}
                onShowFinish={() => setCollection("Todas")}
                onShowCollection={() => setFinish("Todos")}
              />
            )}
          </AnimatePresence>

          {/* Barra fixa no celular: a cor escolhida sempre à mão (o espaço fica reservado para a página não "pular") */}
          <div className="sticky bottom-5 z-20 mr-[72px] mt-8 h-14 lg:hidden">
            <AnimatePresence>
              {!panelInView && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.4, ease }}
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
        </div>

        {/* Painel de detalhes da cor escolhida */}
        <div ref={panelRef} className="scroll-mt-24 lg:col-span-5 xl:col-span-4">
          <div className="overflow-hidden rounded-[28px] bg-sand shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] lg:sticky lg:top-28">
            <div className="relative aspect-[4/3] lg:aspect-[16/10]">
              {/* Halo na cor escolhida (troca com fade) */}
              <AnimatePresence initial={false}>
                <motion.span
                  key={selected.id}
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(90% 70% at 50% 85%, ${selected.hex}40, transparent 70%), radial-gradient(60% 50% at 15% 10%, #ffffffaa, transparent 70%)` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                />
              </AnimatePresence>
              <div className="absolute inset-x-[8%] bottom-[6%] top-[12%]">
                <NailArt key={selected.id} design={art.design} shape="amendoada" colors={art.colors(selected.hex)} length="media" label={`Unhas pintadas na cor ${selected.name}, acabamento ${finishLabel[selected.finish].toLowerCase()}`} />
              </div>
              <span className="absolute left-5 top-5 rounded-full bg-cream/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-soft backdrop-blur">
                Nº {number}
                <span className="text-muted"> / {polishes.length}</span>
              </span>
            </div>

            <div className="p-6 md:p-8">
              <div aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease }}>
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

              {/* Atalho para as outras cores da mesma coleção */}
              <div className="mt-6 border-t border-wine/10 pt-5">
                <p className="eyebrow text-muted">Mais da coleção {selected.collection}</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {siblings.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-pressed={p.id === selected.id}
                      aria-label={`Ver a cor ${p.name}`}
                      title={p.name}
                      className={cn(
                        "h-9 w-9 rounded-full ring-1 ring-black/10 transition-[transform,box-shadow] duration-300 ease-out-expo hover:scale-110 lg:h-8 lg:w-8",
                        p.id === selected.id && "shadow-[0_0_0_2px_var(--color-sand),0_0_0_3.5px_var(--color-wine)]",
                      )}
                      style={{ background: finishBackground(p.finish, p.hex) }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button href={bookHref(selected)} variant="wine" className="w-full sm:w-auto lg:w-full" magnetic={false} aria-label={`Agendar com a cor ${selected.name}`}>
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

/** Linha de filtros: rótulo + chips (rolagem horizontal no celular) */
function FilterRow({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-6">
      <span id={id} className="eyebrow shrink-0 text-muted sm:w-28">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="no-scrollbar relative -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
        {children}
      </div>
    </div>
  );
}

/** Chip de filtro com "pílula" de fundo que desliza até o chip ativo */
function FilterChip({
  group,
  active,
  count,
  dot,
  onClick,
  children,
}: {
  group: string;
  active: boolean;
  count: number;
  dot?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // No celular a linha rola na horizontal: mantém o chip ativo à vista
  useEffect(() => {
    const el = ref.current;
    const row = el?.parentElement;
    if (!active || !el || !row || row.scrollWidth <= row.clientWidth) return;
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative isolate inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors duration-500",
        active ? "border-wine text-cream" : count === 0 ? "border-wine/10 bg-cream text-ink-soft/50 hover:border-wine/40" : "border-wine/15 bg-cream text-ink-soft hover:border-wine/50",
      )}
    >
      {active && <motion.span layoutId={`pilula-${group}`} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-wine" transition={{ type: "spring", bounce: 0.18, duration: 0.6 }} />}
      {dot && <span aria-hidden className={cn("h-3.5 w-3.5 rounded-full ring-1", active ? "ring-cream/40" : "ring-black/10")} style={{ background: dot }} />}
      {children}
      <span className={cn("text-[0.7rem] tabular-nums", active ? "text-blush" : "text-muted")}>
        <span className="sr-only">(</span>
        {count}
        <span className="sr-only"> {count === 1 ? "cor" : "cores"})</span>
      </span>
    </button>
  );
}

/** Combinação de filtros sem cor na cartela: caminhos de saída em vez de uma grade vazia */
function EmptyState({
  collection,
  finish,
  onShowFinish,
  onShowCollection,
}: {
  collection: Collection;
  finish: Finish;
  onShowFinish: () => void;
  onShowCollection: () => void;
}) {
  const nFinish = polishes.filter((p) => p.finish === finish).length;
  const tones = polishes.filter((p) => p.collection === collection).slice(0, 3);
  const [one, many] = finishAdj[finish];
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, delay: 0.15, ease }}
      className="relative overflow-hidden rounded-[28px] bg-sand/70 px-6 py-10 text-center sm:px-10 md:py-14"
    >
      {/* Frascos da coleção com o acabamento pedido, só como ilustração */}
      <div aria-hidden className="mx-auto flex w-fit items-end gap-2">
        {tones.map((p, i) => (
          <span
            key={p.id}
            className="block h-16 w-7 rounded-[999px_999px_10px_10px] opacity-90 shadow-[0_14px_24px_-14px_rgba(139,41,66,0.5)] ring-1 ring-black/5"
            style={{ background: finishBackground(finish, p.hex), transform: `rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -6 : 0}px)` }}
          />
        ))}
      </div>
      <p className="mt-7 font-display text-3xl leading-tight text-ink md:text-4xl">
        Nenhuma cor {one} <span className="serif-accent text-wine">em {collection}.</span>
      </p>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
        Essa combinação não está na cartela. Veja as opções mais próximas ou conte pelo WhatsApp o que você imaginou, que a gente te ajuda a chegar no tom.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onShowFinish} className="inline-flex h-11 items-center rounded-full bg-wine px-5 text-sm font-medium text-cream transition-colors duration-500 hover:bg-wine-deep">
          {nFinish === 1 ? `Ver a cor ${one}` : `Ver as ${nFinish} cores ${many}`}
        </button>
        <button type="button" onClick={onShowCollection} className="inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-medium text-ink transition-colors duration-500 hover:border-ink">
          Ver a coleção {collection}
        </button>
      </div>
      <a
        href={whatsappLink(`Olá, Lumi! Estou procurando uma cor ${one} na linha ${collection} da cartela. Pode me ajudar a escolher?`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 text-sm text-ink-soft underline decoration-wine/30 underline-offset-4 transition-colors duration-300 hover:text-wine hover:decoration-wine"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Pedir ajuda no WhatsApp
      </a>
    </motion.div>
  );
}
