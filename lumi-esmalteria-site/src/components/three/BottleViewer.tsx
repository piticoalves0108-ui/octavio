"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Move3d } from "lucide-react";
import { finishLabel, getPolish, polishes, type Finish } from "@/data/colors";
import { PaintSwatch } from "@/components/features/PaintSwatch";
import { Button } from "@/components/ui/Button";
import { useNearViewport } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useMedia";
import { useWebGL } from "@/hooks/useWebGL";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const ViewerCanvas = dynamic(() => import("./ViewerCanvas"), { ssr: false });

/**
 * Visualizador 360° do frasco: arraste para girar, escolha a cor, o acabamento e a tampa.
 * <BottleViewer initialPolish="vinho-noir" className="h-[70svh]" />
 */
export function BottleViewer({ initialPolish = "nude-lumi", className }: { initialPolish?: string; className?: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrapper, "300px");
  const webgl = useWebGL();
  const [mounted, setMounted] = useState(false);
  const [polishId, setPolishId] = useState(initialPolish);
  const polish = getPolish(polishId);
  const [finish, setFinish] = useState<Finish>(polish.finish);
  const [goldCap, setGoldCap] = useState(false);
  const [auto, setAuto] = useState(true);
  // Movimento reduzido: o frasco só gira quando a pessoa arrasta
  const reduced = useReducedMotion();

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  const pick = (id: string) => {
    setPolishId(id);
    setFinish(getPolish(id).finish);
  };

  return (
    <div ref={wrapper} className={cn("relative grid gap-6 lg:grid-cols-[1fr_340px]", className)}>
      <div className="relative min-h-[420px] overflow-hidden rounded-[32px] bg-[radial-gradient(70%_60%_at_50%_45%,#fff_0%,#f5ede6_55%,#e8d5ce_100%)]" data-cursor-label="Girar">
        {webgl !== false && mounted && <ViewerCanvas color={polish.hex} finish={finish} goldCap={goldCap} visible={near} autoRotate={auto && !reduced} onInteract={() => setAuto(false)} />}
        <p className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cream/85 px-4 py-2 text-xs text-muted backdrop-blur">
          <Move3d className="h-4 w-4" strokeWidth={1.5} /> Arraste para girar o frasco
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-[32px] bg-cream p-6">
        <div>
          <p className="eyebrow text-muted">Cor</p>
          <p className="mt-2 font-display text-3xl">{polish.name}</p>
          <p className="mt-1 text-sm text-muted">{polish.mood}</p>
        </div>
        <div className="no-scrollbar -mx-1 grid grid-cols-5 gap-2 px-1">
          {polishes.map((p) => (
            <PaintSwatch key={p.id} polish={p} size={40} showLabel={false} selected={p.id === polishId} onSelect={pick} />
          ))}
        </div>
        <fieldset>
          <legend className="eyebrow mb-2 text-muted">Acabamento</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(finishLabel) as Finish[]).map((f) => (
              <button key={f} type="button" aria-pressed={finish === f} onClick={() => setFinish(f)} className={cn("rounded-full border px-3.5 py-1.5 text-xs transition-colors", finish === f ? "border-wine bg-wine text-cream" : "border-ink/15 hover:border-wine/50")}>
                {finishLabel[f]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="eyebrow mb-2 text-muted">Tampa</legend>
          <div className="flex gap-2">
            {[
              [false, "Laca preta"],
              [true, "Dourada"],
            ].map(([v, l]) => (
              <button key={String(v)} type="button" aria-pressed={goldCap === v} onClick={() => setGoldCap(v as boolean)} className={cn("rounded-full border px-3.5 py-1.5 text-xs transition-colors", goldCap === v ? "border-wine bg-wine text-cream" : "border-ink/15 hover:border-wine/50")}>
                {l as string}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-auto flex flex-col gap-2">
          <Button href={`/agendamento?cor=${polish.id}`} variant="wine" magnetic={false} className="w-full">
            Agendar com esta cor
          </Button>
          <Button href={whatsappLink(`Olá, Lumi! Quero fazer as unhas na cor ${polish.name} (${finishLabel[finish]}). Tem horário?`)} external variant="outline" arrow={false} magnetic={false} className="w-full">
            Perguntar pelo WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
