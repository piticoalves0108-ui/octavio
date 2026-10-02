"use client";

/**
 * Efeito magnético nos botões principais (Motion): o botão segue levemente o cursor.
 * Só com mouse e sem "reduzir movimento". O Motion é baixado no primeiro hover.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Magnetico({
  children,
  forca = 0.28,
  className,
  bloco = false,
}: {
  children: ReactNode;
  forca?: number;
  className?: string;
  /** Ocupa a largura toda (botões de largura total). */
  bloco?: boolean;
}) {
  const area = useRef<HTMLSpanElement>(null);
  const alvo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const a = area.current;
    const b = alvo.current;
    if (!a || !b) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let desligar: (() => void) | undefined;
    let cancelado = false;
    const iniciar = () =>
      import("./magnetismo").then((m) => {
        if (!cancelado) desligar = m.ligarMagnetismo(a, b, forca);
      });
    a.addEventListener("pointerenter", iniciar, { once: true });
    return () => {
      cancelado = true;
      a.removeEventListener("pointerenter", iniciar);
      desligar?.();
    };
  }, [forca]);

  return (
    <span ref={area} className={cn(bloco ? "flex w-full" : "inline-flex", className)}>
      <span ref={alvo} className={bloco ? "flex w-full" : "inline-flex"}>
        {children}
      </span>
    </span>
  );
}
