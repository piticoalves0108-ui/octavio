"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Expand, Minimize2, Minus, Move3d, Pause, Play, Plus, X } from "lucide-react";
import type { TourPreset } from "@/data/categories";
import { getFinish } from "@/data/finishes";
import { tourPresets } from "@/components/three/scenes/presets";
import type { TourCommands } from "@/components/three/TourCanvas";
import type { SlotMap } from "@/components/three/materials";
import { FinishSwatch } from "@/components/ui/FinishSwatch";
import { useNearViewport } from "@/hooks/useInView";
import { useFinePointer, useReducedMotion } from "@/hooks/useMedia";
import { useWebGL } from "@/hooks/useWebGL";
import { cn } from "@/lib/utils";

const TourCanvas = dynamic(() => import("@/components/three/TourCanvas"), { ssr: false });

/**
 * Tour 3D interativo: o visitante "entra" no ambiente, troca de ponto de vista,
 * abre os detalhes de cada peça e troca os acabamentos em tempo real.
 */
export function Tour3D({ preset, className, height = "h-[78svh] min-h-[520px]" }: { preset: TourPreset; className?: string; height?: string }) {
  const config = tourPresets[preset];
  const wrapper = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrapper, "300px");
  const [mounted, setMounted] = useState(false);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const webgl = useWebGL();

  const [viewpointId, setViewpointId] = useState(config.viewpoints[0].id);
  const [slots, setSlots] = useState<Partial<SlotMap>>({});
  const [hotspot, setHotspot] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const commands = useRef<TourCommands | null>(null);
  const hotspotRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  // No desktop o tour já nasce interativo; no celular é preciso tocar em "Explorar" para não travar a rolagem
  const interactive = fine || engaged;

  useEffect(() => {
    setAuto(!reduced && fine);
  }, [reduced, fine]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapper.current?.requestFullscreen();
    } catch {
      setFullscreen((f) => !f);
    }
  }, []);

  const onKey = (e: KeyboardEvent) => {
    const step = 0.12;
    const map: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[e.key]) {
      e.preventDefault();
      setAuto(false);
      commands.current?.rotate(...map[e.key]);
    }
    if (e.key === "+" || e.key === "=") commands.current?.zoom(-6);
    if (e.key === "-") commands.current?.zoom(6);
  };

  const viewpoint = config.viewpoints.find((v) => v.id === viewpointId) ?? config.viewpoints[0];
  const active = config.hotspots.find((h) => h.id === hotspot);
  const currentSlots = { ...config.slots, ...slots };

  return (
    <div
      ref={wrapper}
      className={cn("relative overflow-hidden rounded-[2px] bg-sand", fullscreen ? "h-screen w-screen" : height, className)}
      data-cursor-label={interactive ? "Arraste" : undefined}
      data-lenis-prevent={engaged ? "" : undefined}
    >
      {/* Canvas */}
      <div
        className="absolute inset-0 outline-none"
        tabIndex={0}
        role="application"
        aria-roledescription="Tour 3D"
        aria-label={`Tour 3D: ${config.title}. Use as setas para olhar ao redor e + ou − para aproximar.`}
        onKeyDown={onKey}
        onPointerDown={() => setAuto(false)}
      >
        {webgl === false ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-stone">Seu navegador não suporta visualização 3D. Fale conosco para receber o tour em vídeo.</div>
        ) : (
          mounted && (
            <TourCanvas
              config={config}
              slots={slots}
              viewpoint={viewpoint}
              autoRotate={auto}
              interactive={interactive}
              visible={near || fullscreen}
              hotspotRefs={hotspotRefs}
              commands={commands}
            />
          )
        )}
        {/* Hotspots: botões DOM posicionados pela cena 3D */}
        {mounted && webgl !== false && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {config.hotspots.map((h, i) => (
              <button
                key={h.id}
                ref={(el) => void (hotspotRefs.current[i] = el)}
                type="button"
                onClick={() => setHotspot((cur) => (cur === h.id ? null : h.id))}
                aria-label={`Detalhe: ${h.title}`}
                aria-pressed={hotspot === h.id}
                style={{ visibility: "hidden" }}
                className="group absolute left-0 top-0 -ml-[18px] -mt-[18px] flex h-9 w-9 items-center justify-center"
              >
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-paper/60" />
                <span className={cn("relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper shadow-lg transition-colors", hotspot === h.id ? "bg-wood" : "bg-graphite/80 group-hover:bg-wood")}>
                  <span className="h-1.5 w-1.5 rounded-full bg-paper" />
                </span>
                <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-paper/95 px-3 py-1 text-[11px] font-medium text-graphite opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {h.title}
                </span>
              </button>
            ))}
          </div>
        )}
        {!mounted && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sand to-concrete/40" />}
      </div>

      {/* Ativação no celular */}
      <AnimatePresence>
        {!interactive && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEngaged(true)}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-graphite/25 text-paper backdrop-blur-[2px]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-graphite shadow-xl">
              <Move3d className="h-7 w-7" strokeWidth={1.4} />
            </span>
            <span className="eyebrow">Toque para explorar em 360°</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-32 bg-gradient-to-b from-linen/80 to-transparent" />
      {/* Título */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <p className="eyebrow text-graphite/60">Tour 3D</p>
        <p className="mt-1 font-display text-2xl font-light text-graphite sm:text-3xl">{config.title}</p>
        <p className="text-xs text-stone">{config.subtitle}</p>
      </div>

      {/* Controles */}
      <div className="absolute right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6">
        {engaged && !fine && (
          <button type="button" onClick={() => setEngaged(false)} className="flex h-10 items-center gap-2 rounded-full bg-paper/90 px-4 text-xs font-medium shadow backdrop-blur" aria-label="Sair do tour">
            <X className="h-4 w-4" /> Sair
          </button>
        )}
        <button type="button" onClick={() => setAuto((a) => !a)} aria-pressed={auto} aria-label={auto ? "Pausar giro automático" : "Girar automaticamente"} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 shadow backdrop-blur transition-colors hover:bg-paper">
          {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => commands.current?.zoom(-8)} aria-label="Aproximar" className="hidden h-10 w-10 items-center justify-center rounded-full bg-paper/90 shadow backdrop-blur hover:bg-paper sm:flex">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => commands.current?.zoom(8)} aria-label="Afastar" className="hidden h-10 w-10 items-center justify-center rounded-full bg-paper/90 shadow backdrop-blur hover:bg-paper sm:flex">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 shadow backdrop-blur hover:bg-paper">
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </button>
      </div>

      {/* Pontos de vista */}
      <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-3 sm:inset-x-6 sm:bottom-6 lg:flex-row lg:items-end lg:justify-between">
        <div role="group" aria-label="Pontos de vista" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-paper/90 p-1 shadow backdrop-blur">
          {config.viewpoints.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setViewpointId(v.id);
                setAuto(false);
              }}
              aria-pressed={v.id === viewpointId}
              className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors", v.id === viewpointId ? "bg-graphite text-linen" : "hover:bg-sand")}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Troca de acabamentos em tempo real */}
        <div className="no-scrollbar flex gap-4 overflow-x-auto rounded-2xl bg-paper/90 px-4 py-3 shadow backdrop-blur">
          {config.swappable.map((group) => (
            <div key={group.slot} role="radiogroup" aria-label={group.label} className="shrink-0">
              <p className="eyebrow mb-2 text-[0.58rem] text-stone">{group.label}</p>
              <div className="flex gap-1.5">
                {group.options.map((id) => {
                  const f = getFinish(id);
                  const selected = currentSlots[group.slot] === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={f.name}
                      title={f.name}
                      onClick={() => setSlots((s) => ({ ...s, [group.slot]: id }))}
                      className={cn("rounded-full p-0.5 ring-1 transition-all", selected ? "ring-graphite" : "ring-transparent hover:ring-graphite/30")}
                    >
                      <FinishSwatch finish={f} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ficha do hotspot */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 top-28 z-20 w-[min(20rem,calc(100%-2rem))] rounded-2xl bg-paper/95 p-5 shadow-xl backdrop-blur sm:left-6"
            role="dialog"
            aria-label={active.title}
          >
            <button type="button" onClick={() => setHotspot(null)} aria-label="Fechar detalhe" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-sand">
              <X className="h-4 w-4" />
            </button>
            <p className="eyebrow text-wood-deep">Detalhe</p>
            <p className="mt-2 font-display text-xl">{active.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone">{active.text}</p>
            {active.finish && (
              <div className="mt-4 flex items-center gap-3 border-t border-graphite/10 pt-4">
                <FinishSwatch finish={getFinish(active.finish)} />
                <div>
                  <p className="text-sm font-medium">{getFinish(active.finish).name}</p>
                  <p className="text-xs text-stone">{getFinish(active.finish).collection}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
