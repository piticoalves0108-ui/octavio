"use client";

import { create } from "zustand";

/**
 * Nível de qualidade do 3D, decidido no aparelho da pessoa:
 * - alto: desktop com GPU boa → pós-processamento (Bloom, DoF, Noise) e sombras acumuladas.
 * - medio: celulares e tablets → sem pós-processamento, menos partículas, dpr menor.
 * - video: aparelho muito fraco ou economia de dados → vídeo em loop gravado da própria cena.
 * - sem-webgl: navegador sem WebGL → pôster estático; todo o conteúdo continua em HTML.
 *
 * O <PerformanceMonitor> do drei pode rebaixar o nível durante o uso (alto → medio → video).
 * Para testar: adicione ?qualidade=alto|medio|video|sem-webgl na URL.
 */
export type Nivel = "alto" | "medio" | "video" | "sem-webgl";

type Estado = {
  nivel: Nivel | null;
  /** Fator de 0 a 1 vindo do PerformanceMonitor; multiplica o dpr. */
  fator: number;
  detectar: () => void;
  rebaixar: () => void;
  definirFator: (f: number) => void;
};

const ORDEM: Nivel[] = ["alto", "medio", "video", "sem-webgl"];

function temWebgl() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function detectarNivel(): Nivel {
  const forcado = new URLSearchParams(window.location.search).get("qualidade");
  if (forcado && (ORDEM as string[]).includes(forcado)) return forcado as Nivel;

  if (!temWebgl()) return "sem-webgl";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const economia = nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
  const nucleos = nav.hardwareConcurrency ?? 4;
  const memoria = nav.deviceMemory ?? 4;
  if (economia || nucleos <= 2 || memoria <= 2) return "video";

  const toque = window.matchMedia("(pointer: coarse)").matches;
  const telaPequena = window.innerWidth < 900;
  return toque || telaPequena ? "medio" : "alto";
}

export const useQualidade = create<Estado>((set, get) => ({
  nivel: null,
  fator: 1,
  detectar: () => {
    if (get().nivel === null) set({ nivel: detectarNivel() });
  },
  rebaixar: () => {
    const atual = get().nivel ?? "alto";
    const proximo = ORDEM[Math.min(ORDEM.indexOf(atual) + 1, ORDEM.indexOf("video"))];
    set({ nivel: proximo, fator: 1 });
  },
  definirFator: (fator) => set({ fator }),
}));

/** dpr limitado a [1, 1.75], reduzido pelo PerformanceMonitor em aparelhos fracos. */
export function dprPara(nivel: Nivel | null, fator: number): [number, number] {
  const teto = nivel === "alto" ? 1.75 : 1.5;
  return [1, Math.max(1, Math.round((1 + (teto - 1) * fator) * 100) / 100)];
}
