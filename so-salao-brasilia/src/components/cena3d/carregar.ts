"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQualidade } from "@/lib/qualidade";

/*
 * O 3D só começa depois do primeiro sinal de interesse (mexer o mouse, tocar, rolar
 * ou teclar). Até lá, o pôster (idêntico ao primeiro quadro da cena) segura o visual:
 * quem sai antes não paga o custo do WebGL em bateria, dados e processador.
 */
let interagiu = false;
const ouvintes = new Set<() => void>();
const EVENTOS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;

function marcarInteracao() {
  if (interagiu) return;
  interagiu = true;
  EVENTOS.forEach((ev) => window.removeEventListener(ev, marcarInteracao));
  ouvintes.forEach((f) => f());
}

if (typeof window !== "undefined") {
  EVENTOS.forEach((ev) => window.addEventListener(ev, marcarInteracao, { passive: true }));
}

export function useInteragiu() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => interagiu,
    () => false,
  );
}

/**
 * Decide quando montar um <Canvas>: só com WebGL e qualidade suficiente, só quando a
 * seção está visível, depois da intro e com o navegador ocioso (não disputa com o LCP).
 * Também espera a primeira interação (ver acima).
 * Depois de montado, fica montado (a pausa fora da tela é feita pelo frameloop).
 */
export function useCarregar3D(visivel: boolean) {
  const nivel = useQualidade((s) => s.nivel);
  const detectar = useQualidade((s) => s.detectar);
  const [carregar, setCarregar] = useState(false);
  const houveInteracao = useInteragiu();

  useEffect(() => {
    detectar();
  }, [detectar]);

  useEffect(() => {
    if (carregar || !visivel) return;
    if (nivel !== "alto" && nivel !== "medio") return;
    if (!houveInteracao) return;
    let cancelado = false;
    let idIdle: number | undefined;
    const introAtiva = document.documentElement.classList.contains("intro-ativa");
    const espera = window.setTimeout(
      () => {
        const iniciar = () => !cancelado && setCarregar(true);
        if ("requestIdleCallback" in window) idIdle = window.requestIdleCallback(iniciar, { timeout: 1500 });
        else iniciar();
      },
      introAtiva ? 1700 : 0,
    );
    return () => {
      cancelado = true;
      window.clearTimeout(espera);
      if (idIdle !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idIdle);
    };
  }, [visivel, nivel, carregar, houveInteracao]);

  return { carregar, nivel };
}
