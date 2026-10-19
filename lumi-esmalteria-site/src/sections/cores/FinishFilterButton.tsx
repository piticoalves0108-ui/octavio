"use client";

import { ArrowUp } from "lucide-react";
import type { Finish } from "@/data/colors";

/** Evento que liga o guia de acabamentos à cartela (os dois vivem na mesma página). */
export const FINISH_FILTER_EVENT = "lumi:cores-acabamento";

/** Botão "Ver na cartela": filtra a cartela pelo acabamento e rola até ela. */
export function FinishFilterButton({ finish, children }: { finish: Finish; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent<Finish>(FINISH_FILTER_EVENT, { detail: finish }))}
      className="group/ff inline-flex items-center gap-1.5 text-xs font-medium text-wine transition-colors duration-300 hover:text-wine-deep"
    >
      <span className="underline decoration-wine/30 underline-offset-4 transition-[text-decoration-color] duration-300 group-hover/ff:decoration-wine">{children}</span>
      <ArrowUp className="h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover/ff:-translate-y-0.5" strokeWidth={1.6} aria-hidden />
    </button>
  );
}
