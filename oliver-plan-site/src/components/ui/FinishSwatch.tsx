"use client";

import { useEffect, useState } from "react";
import type { Finish } from "@/data/finishes";
import { cssFallback, getTextureDataURL } from "@/lib/textures";
import { cn } from "@/lib/utils";

/** Hook: textura procedural do acabamento como data URL (CSS puro até o canvas ficar pronto). */
export function useFinishBackground(finish: Finish) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Gera fora do caminho crítico de renderização
    const id = requestIdleCallbackSafe(() => {
      if (!cancelled) setUrl(getTextureDataURL(finish.texture));
    });
    return () => {
      cancelled = true;
      cancelIdleCallbackSafe(id);
    };
  }, [finish]);
  return url ? `url(${url}) center / cover` : cssFallback(finish.texture);
}

const requestIdleCallbackSafe = (cb: () => void) =>
  typeof window !== "undefined" && "requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 600 }) : (setTimeout(cb, 1) as unknown as number);
const cancelIdleCallbackSafe = (id: number) =>
  typeof window !== "undefined" && "cancelIdleCallback" in window ? window.cancelIdleCallback(id) : clearTimeout(id);

/** Amostra de material arredondada, como as plaquinhas de acabamento do showroom. */
export function FinishSwatch({ finish, className, size = "md" }: { finish: Finish; className?: string; size?: "sm" | "md" | "lg" }) {
  const bg = useFinishBackground(finish);
  const glass = finish.kind === "vidro";
  const metal = finish.kind === "metal";
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_6px_16px_-8px_rgba(43,43,43,0.45)]",
        size === "sm" && "h-6 w-6",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-16 w-16",
        className,
      )}
      style={{ background: bg }}
    >
      {(glass || metal) && (
        <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55)_0%,transparent_40%,transparent_60%,rgba(255,255,255,0.25)_100%)]" />
      )}
    </span>
  );
}
