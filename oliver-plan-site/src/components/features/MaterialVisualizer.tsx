"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { catalogFinishes, getFinish, type Finish, type FinishKind } from "@/data/finishes";
import { cssFallback, getTextureDataURL, textureWorldSize } from "@/lib/textures";
import { FinishSwatch } from "@/components/ui/FinishSwatch";
import { cn } from "@/lib/utils";

/**
 * Visualizador de materiais: uma elevação técnica de cozinha (4.200 × 2.700 mm) cujas superfícies
 * recebem a textura do acabamento em tempo real ao passar o mouse (ou focar) em cada amostra.
 * A textura respeita a escala real: 1 repetição de madeira = 750 × 2.000 mm.
 */

type Zone = "front" | "base" | "stone" | "glass" | "metal";

const zones: { id: Zone; label: string; kinds: FinishKind[]; hint: string }[] = [
  { id: "front", label: "Torres", kinds: ["madeira", "laca"], hint: "Torres quentes e geladeira" },
  { id: "base", label: "Bases", kinds: ["laca", "madeira"], hint: "Gavetões e portas inferiores" },
  { id: "stone", label: "Bancada", kinds: ["pedra"], hint: "Tampo e backsplash" },
  { id: "glass", label: "Vidros", kinds: ["vidro"], hint: "Portas dos aéreos" },
  { id: "metal", label: "Metais", kinds: ["metal"], hint: "Puxadores e perfis" },
];

const W = 4200;
const H = 2700;

type Rect = { x: number; y: number; w: number; h: number };

/** Converte mm (origem no piso, canto esquerdo) para posição percentual */
const pos = (r: Rect): CSSProperties => ({
  left: `${(r.x / W) * 100}%`,
  top: `${((H - r.y - r.h) / H) * 100}%`,
  width: `${(r.w / W) * 100}%`,
  height: `${(r.h / H) * 100}%`,
});

function useTexture(finish: Finish) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => alive && setUrl(getTextureDataURL(finish.texture)), 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [finish]);
  return url;
}

function Surface({ rect, finish, className, children }: { rect: Rect; finish: Finish; className?: string; children?: React.ReactNode }) {
  const url = useTexture(finish);
  const [tw, th] = textureWorldSize(finish.texture);
  const style: CSSProperties = url
    ? {
        backgroundImage: `url(${url})`,
        backgroundSize: `calc(${tw * 1000} * 100cqw / ${W}) calc(${th * 1000} * 100cqw / ${W})`,
        backgroundPosition: `calc(${-rect.x} * 100cqw / ${W}) 0`,
      }
    : { background: cssFallback(finish.texture) };
  return (
    <div className={cn("absolute overflow-hidden", className)} style={pos(rect)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={finish.id}
          className="absolute inset-0"
          style={style}
          initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.25 } }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        />
      </AnimatePresence>
      {finish.kind === "vidro" && <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.35)_0%,transparent_35%,transparent_65%,rgba(255,255,255,0.18)_100%)]" />}
      {children}
    </div>
  );
}

/** Divisões de portas/gavetas: linhas de folga de 3 mm */
const Joint = ({ rect, vertical }: { rect: Rect; vertical?: boolean }) => (
  <div className="absolute bg-black/35" style={{ ...pos(rect), [vertical ? "width" : "height"]: "1px" }} />
);

export function MaterialVisualizer() {
  const [selected, setSelected] = useState<Record<Zone, string>>({
    front: "nogueira",
    base: "grafite",
    stone: "calacatta",
    glass: "canelado",
    metal: "champagne",
  });
  const [zone, setZone] = useState<Zone>("front");
  const [preview, setPreview] = useState<string | null>(null);

  const effective = (z: Zone) => getFinish(z === zone && preview ? preview : selected[z]);
  const front = effective("front");
  const base = effective("base");
  const stone = effective("stone");
  const glass = effective("glass");
  const metal = effective("metal");
  const wood = getFinish("freijo");

  const zoneInfo = zones.find((z) => z.id === zone)!;
  const options = useMemo(() => catalogFinishes.filter((f) => zoneInfo.kinds.includes(f.kind)), [zoneInfo]);
  const shown = getFinish(preview ?? selected[zone]);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      {/* Elevação */}
      <div className="lg:col-span-7">
        <div className="relative bg-paper p-5 shadow-[0_40px_80px_-50px_rgba(43,43,43,0.45)] sm:p-8">
          <div className="mb-4 flex items-center justify-between text-[0.65rem] tracking-[0.18em] text-stone">
            <span>ELEVAÇÃO A · COZINHA</span>
            <span>ESC. 1:25</span>
          </div>
          <div className="dim-line mb-2 text-graphite/50" />
          <p className="mb-3 text-center text-[0.65rem] tracking-[0.2em] text-stone">4.200 MM</p>

          <div className="relative flex gap-3">
            <div className="relative aspect-[42/27] flex-1 [container-type:inline-size]" style={{ background: "linear-gradient(#ece5da, #e3dacd)" }} role="img" aria-label={`Elevação da cozinha com torres em ${front.name}, bases em ${base.name}, bancada em ${stone.name}, aéreos em ${glass.name} e metais ${metal.name}`}>
              {/* Torres (esquerda) */}
              <Surface rect={{ x: 0, y: 80, w: 700, h: 2540 }} finish={front} />
              <Surface rect={{ x: 700, y: 80, w: 700, h: 2540 }} finish={front}>
                <div className="absolute inset-x-[8%] bg-[#141414]" style={{ top: "24%", height: "15%" }} />
                <div className="absolute inset-x-[8%] bg-[#141414]" style={{ top: "42%", height: "11%" }} />
              </Surface>
              <Joint rect={{ x: 700, y: 80, w: 1, h: 2540 }} vertical />
              <Joint rect={{ x: 700, y: 1000, w: 700, h: 1 }} />
              <Joint rect={{ x: 700, y: 520, w: 700, h: 1 }} />
              <Surface rect={{ x: 640, y: 1300, w: 22, h: 360 }} finish={metal} className="rounded-full" />
              <Surface rect={{ x: 1300, y: 1300, w: 22, h: 360 }} finish={metal} className="rounded-full" />

              {/* Bases */}
              <Surface rect={{ x: 1400, y: 100, w: 2100, h: 750 }} finish={base} />
              {[2000, 2900].map((x) => (
                <Joint key={x} rect={{ x, y: 100, w: 1, h: 750 }} vertical />
              ))}
              <Joint rect={{ x: 2450, y: 100, w: 1, h: 750 }} vertical />
              {[350, 600].map((y) => (
                <Joint key={y} rect={{ x: 1400, y, w: 600, h: 1 }} />
              ))}
              <Joint rect={{ x: 2900, y: 470, w: 600, h: 1 }} />
              <div className="absolute bg-[#111]" style={pos({ x: 1400, y: 850, w: 2100, h: 30 })} />
              <div className="absolute bg-[#151515]" style={pos({ x: 1400, y: 0, w: 2100, h: 100 })} />

              {/* Bancada e backsplash */}
              <Surface rect={{ x: 1400, y: 880, w: 2100, h: 40 }} finish={stone} className="shadow-[0_2px_3px_rgba(0,0,0,0.25)]" />
              <Surface rect={{ x: 1400, y: 920, w: 2100, h: 580 }} finish={stone} />

              {/* Prateleira flutuante com LED */}
              <div className="absolute bg-[radial-gradient(ellipse_at_top,rgba(255,214,160,0.75),transparent_70%)]" style={pos({ x: 1450, y: 1280, w: 950, h: 320 })} />
              <Surface rect={{ x: 1450, y: 1600, w: 950, h: 45 }} finish={wood} className="shadow-[0_6px_8px_-4px_rgba(0,0,0,0.35)]" />
              <div className="absolute rounded-t-full bg-[#cfc6b8]" style={pos({ x: 1560, y: 1645, w: 120, h: 260 })} />
              <div className="absolute rounded-t-[40%] bg-[#b8694a]" style={pos({ x: 1720, y: 1645, w: 110, h: 170 })} />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="absolute" style={{ ...pos({ x: 2000 + i * 45, y: 1645, w: 38, h: 200 + (i % 3) * 30 }), background: ["#2b2b2b", "#8b6f47", "#c96e4b", "#e8e0d5", "#5a6b4f", "#b8b0a5"][i] }} />
              ))}

              {/* Aéreos com vidro */}
              <Surface rect={{ x: 2450, y: 1600, w: 1050, h: 750 }} finish={front} />
              <div className="absolute bg-[#d9cfc0]" style={pos({ x: 2480, y: 1630, w: 990, h: 690 })}>
                <div className="absolute inset-x-0 top-1/2 h-[3%] bg-black/15" />
                <div className="absolute bottom-[6%] left-[10%] h-[30%] w-[7%] rounded-t-full bg-[#5a6b4f]/70" />
                <div className="absolute bottom-[6%] left-[22%] h-[22%] w-[9%] rounded-t-lg bg-[#2b2b2b]/60" />
                <div className="absolute bottom-[56%] right-[20%] h-[26%] w-[12%] rounded-t-full bg-[#c96e4b]/60" />
                <div className="absolute inset-x-0 top-0 h-[2%] bg-[#ffe1b4]" />
              </div>
              <Surface rect={{ x: 2480, y: 1630, w: 990, h: 690 }} finish={glass} className="opacity-80" />
              {[2810, 3140].map((x) => (
                <Joint key={x} rect={{ x, y: 1630, w: 1, h: 690 }} vertical />
              ))}

              {/* Torre direita */}
              <Surface rect={{ x: 3500, y: 80, w: 700, h: 2540 }} finish={front} />
              <Joint rect={{ x: 3500, y: 1500, w: 700, h: 1 }} />
              <Surface rect={{ x: 3560, y: 1100, w: 22, h: 620 }} finish={metal} className="rounded-full" />
              <div className="absolute bg-[#151515]" style={pos({ x: 0, y: 0, w: 1400, h: 80 })} />
              <div className="absolute bg-[#151515]" style={pos({ x: 3500, y: 0, w: 700, h: 80 })} />
              <div className="absolute inset-x-0 bottom-0 h-px bg-graphite/60" />
            </div>
            {/* Cota vertical */}
            <div className="flex w-6 flex-col items-center">
              <div className="relative w-px flex-1 bg-graphite/50">
                <span className="absolute -left-1.5 top-0 h-px w-3 bg-graphite/50" />
                <span className="absolute -left-1.5 bottom-0 h-px w-3 bg-graphite/50" />
              </div>
              <span className="mt-2 text-[0.6rem] tracking-[0.1em] text-stone [writing-mode:vertical-rl]">2.700 MM</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-graphite/10 pt-4 text-[0.72rem] text-stone sm:grid-cols-5">
            {zones.map((z) => (
              <span key={z.id} className={cn("flex items-center gap-2", z.id === zone && "text-graphite")}>
                <FinishSwatch finish={effective(z.id)} size="sm" />
                <span className="truncate">{effective(z.id).name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Seletor */}
      <div className="lg:col-span-5">
        <div role="tablist" aria-label="Superfície" className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <button
              key={z.id}
              role="tab"
              type="button"
              aria-selected={z.id === zone}
              onClick={() => {
                setZone(z.id);
                setPreview(null);
              }}
              className={cn("rounded-full border px-4 py-2 text-sm transition-colors", z.id === zone ? "border-graphite bg-graphite text-linen" : "border-graphite/15 hover:border-graphite/50")}
            >
              {z.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone">{zoneInfo.hint}. Passe o mouse para pré-visualizar, clique para aplicar.</p>

        <div role="radiogroup" aria-label={`Acabamentos para ${zoneInfo.label}`} className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4" onMouseLeave={() => setPreview(null)}>
          {options.map((f) => {
            const isSel = selected[zone] === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                onMouseEnter={() => setPreview(f.id)}
                onFocus={() => setPreview(f.id)}
                onBlur={() => setPreview(null)}
                onClick={() => {
                  setSelected((s) => ({ ...s, [zone]: f.id }));
                  setPreview(null);
                }}
                className={cn("group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all duration-300", isSel ? "border-graphite bg-paper" : "border-transparent hover:border-graphite/20 hover:bg-paper/60")}
              >
                <FinishSwatch finish={f} size="lg" className="transition-transform duration-500 ease-out-expo group-hover:scale-110" />
                <span className="text-[0.72rem] leading-tight">{f.name}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={shown.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="mt-8 border-t border-graphite/10 pt-6" aria-live="polite">
            <p className="eyebrow text-wood-deep">{shown.collection}</p>
            <p className="mt-2 font-display text-3xl font-light">{shown.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-stone">{shown.description}</p>
            <p className="mt-3 text-xs text-stone">
              <span className="font-semibold text-graphite">Indicado para:</span> {shown.usage}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
