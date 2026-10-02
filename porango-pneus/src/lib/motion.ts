"use client";

/**
 * Motion (Framer Motion) sob demanda: o `animate` com mola chega no primeiro hover
 * ou na primeira troca de página, e não pesa no carregamento inicial.
 */
type PacoteMotion = typeof import("motion");

let promessa: Promise<PacoteMotion> | null = null;

export function carregarMotion(): Promise<PacoteMotion> {
  if (!promessa) promessa = import("motion");
  return promessa;
}

/** Mola usada nas microinterações (ímã do botão, tilt dos cards). */
export const MOLA = { type: "spring", stiffness: 260, damping: 18, mass: 0.5 } as const;
