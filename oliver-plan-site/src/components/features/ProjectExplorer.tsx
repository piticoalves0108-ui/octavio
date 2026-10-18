"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { projects, type Project } from "@/data/projects";
import { categories, materialTypes, styles, tones, getCategory, getStyle, type CategoryId, type MaterialId, type StyleId, type ToneId } from "@/data/categories";
import { getFinish } from "@/data/finishes";
import { ProjectCard } from "./ProjectCard";
import { cn, normalize } from "@/lib/utils";

type FilterKey = "categoria" | "estilo" | "material" | "cor";

interface Props {
  filters?: FilterKey[];
  layout?: "grid" | "masonry";
}

/** Texto pesquisável de um projeto (nome, local, ambiente, estilo e acabamentos) */
const haystack = (p: Project) =>
  normalize([p.name, p.summary, p.location, getCategory(p.category).name, getStyle(p.style).name, ...p.finishes.map((f) => getFinish(f.id).name), ...p.highlights].join(" "));

const index = projects.map((p) => ({ p, text: haystack(p) }));

/**
 * Catálogo filtrável: ambiente, estilo, material, cor e busca livre.
 * Os filtros ficam na URL (?categoria=cozinha&estilo=moderno&q=ripado) para poder compartilhar.
 */
export function ProjectExplorer({ filters = ["categoria", "estilo", "material", "cor"], layout = "grid" }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const state = {
    categoria: (params.get("categoria") as CategoryId | null) ?? null,
    estilo: (params.get("estilo") as StyleId | null) ?? null,
    material: (params.get("material") as MaterialId | null) ?? null,
    cor: (params.get("cor") as ToneId | null) ?? null,
  };
  const [showMore, setShowMore] = useState(!!(state.estilo || state.material || state.cor));
  const [query, setQuery] = useState(params.get("q") ?? "");

  const update = (patch: Partial<Record<FilterKey | "q", string | null>>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    startTransition(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  };

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return index
      .filter(({ p, text }) => {
        if (state.categoria && p.category !== state.categoria) return false;
        if (state.estilo && p.style !== state.estilo) return false;
        if (state.material && p.material !== state.material) return false;
        if (state.cor && p.tone !== state.cor) return false;
        if (q && !q.split(/\s+/).every((t) => text.includes(t))) return false;
        return true;
      })
      .map(({ p }) => p);
  }, [state.categoria, state.estilo, state.material, state.cor, query]);

  const active = Object.values(state).filter(Boolean).length + (query ? 1 : 0);

  const chip = (selected: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors duration-300",
      selected ? "border-graphite bg-graphite text-linen" : "border-graphite/15 bg-paper/50 hover:border-graphite/50",
    );

  return (
    <div>
      {/* ——— Filtros ——— */}
      <div className="space-y-5 border-y border-graphite/10 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {filters.includes("categoria") && (
            <div role="group" aria-label="Filtrar por ambiente" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              <button type="button" aria-pressed={!state.categoria} onClick={() => update({ categoria: null })} className={chip(!state.categoria)}>
                Todos
              </button>
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={state.categoria === c.id} onClick={() => update({ categoria: state.categoria === c.id ? null : c.id })} className={chip(state.categoria === c.id)}>
                  {c.plural}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="relative flex flex-1 items-center lg:w-72 lg:flex-none">
              <span className="sr-only">Buscar projetos</span>
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-stone" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  update({ q: e.target.value || null });
                }}
                placeholder="Buscar: ripado, nogueira, ilha..."
                className="h-11 w-full rounded-full border border-graphite/15 bg-paper/60 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-stone/70 focus:border-graphite/50"
              />
            </label>
            {filters.length > 1 && (
              <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} aria-controls="filtros-avancados" className={cn("flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors", showMore ? "border-graphite bg-graphite text-linen" : "border-graphite/15 hover:border-graphite/50")}>
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div id="filtros-avancados" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="grid gap-6 pt-2 md:grid-cols-3">
                {filters.includes("estilo") && (
                  <fieldset>
                    <legend className="eyebrow mb-3 text-stone">Estilo</legend>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((s) => (
                        <button key={s.id} type="button" aria-pressed={state.estilo === s.id} onClick={() => update({ estilo: state.estilo === s.id ? null : s.id })} className={chip(state.estilo === s.id)} title={s.description}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {filters.includes("material") && (
                  <fieldset>
                    <legend className="eyebrow mb-3 text-stone">Material</legend>
                    <div className="flex flex-wrap gap-2">
                      {materialTypes.map((m) => (
                        <button key={m.id} type="button" aria-pressed={state.material === m.id} onClick={() => update({ material: state.material === m.id ? null : m.id })} className={chip(state.material === m.id)}>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {filters.includes("cor") && (
                  <fieldset>
                    <legend className="eyebrow mb-3 text-stone">Cor</legend>
                    <div className="flex flex-wrap gap-2">
                      {tones.map((t) => (
                        <button key={t.id} type="button" aria-pressed={state.cor === t.id} onClick={() => update({ cor: state.cor === t.id ? null : t.id })} className={cn(chip(state.cor === t.id), "flex items-center gap-2")}>
                          <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: t.swatch }} />
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-sm text-stone">
          <p aria-live="polite">
            <span className="font-medium text-graphite">{results.length}</span> {results.length === 1 ? "projeto encontrado" : "projetos encontrados"}
          </p>
          {active > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                update({ categoria: null, estilo: null, material: null, cor: null, q: null });
              }}
              className="flex items-center gap-1.5 underline-offset-4 hover:text-graphite hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ——— Resultados ——— */}
      {results.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-3xl font-light">Nenhum projeto com essa combinação.</p>
          <p className="mt-3 text-stone">Experimente outro filtro ou fale com a gente: desenhamos do zero.</p>
        </div>
      ) : layout === "masonry" ? (
        <motion.div layout className="mt-12 gap-8 sm:columns-2 lg:columns-3 [&>*]:mb-14">
          <AnimatePresence mode="popLayout">
            {results.map((p, i) => (
              <motion.div key={p.slug} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="break-inside-avoid">
                <ProjectCard project={p} aspect={["aspect-[4/5]", "aspect-[4/3]", "aspect-[3/4]", "aspect-square"][i % 4]} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div layout className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((p) => (
              <motion.div key={p.slug} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <ProjectCard project={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
