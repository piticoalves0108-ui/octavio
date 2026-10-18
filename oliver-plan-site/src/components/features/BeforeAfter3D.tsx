"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { useNearViewport } from "@/hooks/useInView";
import { useWebGL } from "@/hooks/useWebGL";
import { SmartImage } from "@/components/ui/SmartImage";
import { img } from "@/data/images";
import { useSlider } from "./useSlider";

const BeforeAfterCanvas = dynamic(() => import("@/components/three/BeforeAfterCanvas"), { ssr: false });

/** Comparador arrastável em 3D: cômodo vazio → cozinha planejada. */
export function BeforeAfter3D() {
  const wrapper = useRef<HTMLDivElement>(null);
  const near = useNearViewport(wrapper, "400px");
  const [mounted, setMounted] = useState(false);
  const webgl = useWebGL();
  const { value, ref: splitRef, bind, handleProps } = useSlider(0.5);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  return (
    <div ref={wrapper} className="relative h-[62svh] min-h-[420px] select-none overflow-hidden bg-sand" {...bind} data-cursor-label="Arraste">
      {webgl === false ? (
        <div className="absolute inset-0">
          <SmartImage src={img.kitchen[0]} alt="Cozinha planejada" sizes="100vw" />
        </div>
      ) : (
        mounted && <BeforeAfterCanvas split={splitRef} visible={near} />
      )}

      <span className="eyebrow pointer-events-none absolute left-4 top-4 rounded-full bg-paper/90 px-3 py-2 text-graphite shadow sm:left-6 sm:top-6">Antes · obra</span>
      <span className="eyebrow pointer-events-none absolute right-4 top-4 rounded-full bg-graphite px-3 py-2 text-linen shadow sm:right-6 sm:top-6">Depois · planejado</span>

      {/* Divisor */}
      <div className="pointer-events-none absolute inset-y-0 w-px bg-paper shadow-[0_0_0_1px_rgba(43,43,43,0.08)]" style={{ left: `${value * 100}%` }} />
      <button
        type="button"
        {...handleProps}
        aria-label="Comparar antes e depois"
        className="absolute top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-graphite shadow-xl ring-1 ring-graphite/10 transition-transform active:scale-95"
        style={{ left: `${value * 100}%` }}
      >
        <MoveHorizontal className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
