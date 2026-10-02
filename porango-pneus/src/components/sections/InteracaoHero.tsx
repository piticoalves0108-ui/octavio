"use client";

import { useEffect, useRef, useState } from "react";
import { avisar, palco } from "@/lib/palco";

type EventoOrientacao = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Toque e giroscópio no hero (celular):
 * - arrastar na horizontal gira o pneu (a rolagem vertical continua livre: touch-action pan-y);
 * - botão opcional liga o giroscópio: inclinar o celular inclina o pneu.
 */
export function InteracaoHero() {
  const area = useRef<HTMLDivElement>(null);
  const [temGiro, setTemGiro] = useState(false);
  const [giroLigado, setGiroLigado] = useState(false);

  useEffect(() => {
    const toque = window.matchMedia("(pointer: coarse)").matches;
    setTemGiro(toque && "DeviceOrientationEvent" in window);
  }, []);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    let x0 = 0;
    let ativo = false;
    const inicio = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      ativo = true;
      x0 = e.clientX;
    };
    const mover = (e: PointerEvent) => {
      if (!ativo) return;
      palco.arrasto = ((e.clientX - x0) / window.innerWidth) * 2.4;
      avisar();
    };
    const fim = () => {
      if (!ativo) return;
      ativo = false;
      palco.arrasto = 0;
      avisar();
    };
    el.addEventListener("pointerdown", inicio);
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerup", fim);
    el.addEventListener("pointercancel", fim);
    el.addEventListener("pointerleave", fim);
    return () => {
      el.removeEventListener("pointerdown", inicio);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerup", fim);
      el.removeEventListener("pointercancel", fim);
      el.removeEventListener("pointerleave", fim);
    };
  }, []);

  useEffect(() => {
    if (!giroLigado) return;
    const aoMover = (e: DeviceOrientationEvent) => {
      const g = e.gamma ?? 0; // -90..90 (esquerda/direita)
      const b = e.beta ?? 45; // inclinação frente/trás
      palco.ponteiro.x = Math.max(-1, Math.min(1, g / 35));
      palco.ponteiro.y = Math.max(-1, Math.min(1, (45 - b) / 35));
      avisar();
    };
    window.addEventListener("deviceorientation", aoMover);
    return () => {
      window.removeEventListener("deviceorientation", aoMover);
      palco.ponteiro.x = 0;
      palco.ponteiro.y = 0;
    };
  }, [giroLigado]);

  const alternarGiro = async () => {
    if (giroLigado) return setGiroLigado(false);
    const DOE = window.DeviceOrientationEvent as EventoOrientacao;
    try {
      if (typeof DOE.requestPermission === "function") {
        const r = await DOE.requestPermission();
        if (r !== "granted") return;
      }
      setGiroLigado(true);
    } catch {
      /* sem permissão: segue sem giroscópio */
    }
  };

  return (
    <>
      <div ref={area} className="absolute inset-x-0 top-[28%] bottom-[30%] touch-pan-y md:hidden" aria-hidden="true" />
      {temGiro && (
        <button
          type="button"
          onClick={alternarGiro}
          aria-pressed={giroLigado}
          className="absolute top-[30%] right-4 z-10 rounded-full border border-faixa/25 bg-asfalto/60 px-3 py-1.5 font-display text-[0.7rem] font-semibold tracking-[0.14em] uppercase backdrop-blur md:hidden"
        >
          {giroLigado ? "Giroscópio ligado" : "Mover com o celular"}
        </button>
      )}
    </>
  );
}
