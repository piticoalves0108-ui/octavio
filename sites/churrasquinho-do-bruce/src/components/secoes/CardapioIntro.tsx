"use client";

import { useRef, type ReactNode } from "react";
import { useSecaoCena } from "@/hooks/useSecaoCena";

/** Abertura do cardápio: transparente, o espeto flutua por trás do título. */
export function CardapioIntro({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSecaoCena(ref, "cardapio");
  return <div ref={ref}>{children}</div>;
}
