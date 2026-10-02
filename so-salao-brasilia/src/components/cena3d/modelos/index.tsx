"use client";

import { lazy, Suspense } from "react";
import type { ModeloId } from "@/content/catalogo";
import { linhaPorModelo } from "@/content/catalogo";
import { BancadaManicure } from "./BancadaManicure";
import { Cadeira } from "./Cadeira";
import { Espelho } from "./Espelho";
import { Lavatorio } from "./Lavatorio";
import { Recepcao } from "./Recepcao";
import type { Detalhe } from "./formas";

/**
 * Enquadramento de câmera de cada peça (alvo e distância), usado no configurador
 * e nas capturas dos renders. Ajustado à mão para cada silhueta.
 */
export const enquadramentos: Record<ModeloId, { alvo: [number, number, number]; distancia: number }> = {
  cadeira: { alvo: [0, 0.54, 0.02], distancia: 3.3 },
  lavatorio: { alvo: [0, 0.5, -0.2], distancia: 4.0 },
  manicure: { alvo: [0, 0.5, 0], distancia: 3.5 },
  recepcao: { alvo: [0, 0.52, -0.15], distancia: 4.3 },
  espelho: { alvo: [0, 0.9, 0], distancia: 5.0 },
};

// Só baixa o carregador de .glb (Meshopt + KTX2) se alguma linha tiver um arquivo .glb configurado.
const ModeloGlb = lazy(() => import("./ModeloGlb").then((m) => ({ default: m.ModeloGlb })));

const procedurais: Record<ModeloId, (p: { detalhe?: Detalhe }) => React.JSX.Element> = {
  cadeira: Cadeira,
  lavatorio: Lavatorio,
  manicure: BancadaManicure,
  recepcao: Recepcao,
  espelho: Espelho,
};

/** Peça do catálogo: usa o .glb real quando existir em catalogo.ts; senão, a geometria procedural. */
export function Modelo({ modelo, detalhe = "alto" }: { modelo: ModeloId; detalhe?: Detalhe }) {
  const Procedural = procedurais[modelo];
  const glb = linhaPorModelo(modelo).glb;
  if (glb) {
    return (
      <Suspense fallback={<Procedural detalhe="baixo" />}>
        <ModeloGlb src={glb} />
      </Suspense>
    );
  }
  return <Procedural detalhe={detalhe} />;
}
