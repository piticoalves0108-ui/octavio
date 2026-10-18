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
            "repeating-linear-gradient(92deg, rgba(74,47,28,.22) 0 1px, transparent 1px 7px, rgba(255,240,220,.12) 7px 9px, transparent 9px 15px), linear-gradient(135deg, #b89a72 0%, #8b6f47 55%, #6b5434 100%)",
        }}
      >
        <div className="absolute inset-x-5 top-5 flex items-center gap-3 text-paper/70">
          <div className="dim-line flex-1" />
          <span className="eyebrow text-[0.6rem]">sob medida</span>
          <div className="dim-line flex-1" />
        </div>
        {fallbackLabel && <span className="eyebrow relative text-paper/90">{fallbackLabel}</span>}
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
