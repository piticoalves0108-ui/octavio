"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "onLoad" | "onError"> & { fallbackLabel?: string; fallbackSrc?: string };

/**
 * next/image com fade-in ao carregar e, se a foto falhar, uma prancha de material
 * (madeira + cota técnica) no lugar de um ícone de imagem quebrada.
 */
export function SmartImage({ className, fallbackLabel, fallbackSrc, alt, fill = true, sizes = "100vw", src, ...props }: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  // Primeiro tenta a foto; se falhar, tenta o render local (fallbackSrc); por fim, a prancha de material
  const [current, setCurrent] = useState(src);
  useEffect(() => {
    setCurrent(src);
    setStatus("loading");
  }, [src]);

  if (status === "error") {
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex items-end overflow-hidden p-5"
        style={{
          background:
            "radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,.65), transparent 55%), radial-gradient(90% 70% at 85% 90%, rgba(139,41,66,.28), transparent 60%), linear-gradient(135deg, #f5ede6 0%, #e8d5ce 50%, #d9a3a0 100%)",
        }}
      >
        <span className="absolute right-5 top-5 font-display text-2xl italic text-wine/60">Lumi</span>
        {fallbackLabel && <span className="eyebrow relative text-wine/80">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <Image
      key={String(current)}
      alt={alt}
      fill={fill}
      sizes={sizes}
      src={current}
      {...props}
      onLoad={() => setStatus("loaded")}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
        else setStatus("error");
      }}
      className={cn("object-cover transition-opacity duration-1000 ease-out-expo", status === "loaded" ? "opacity-100" : "opacity-0", className)}
    />
  );
}
