"use client";

/**
 * Giro da peça (toca-discos de estúdio): arrastar com mouse ou dedo, setas do teclado
 * e, opcionalmente, o giroscópio do celular. O estado fica num ref compartilhado entre
 * o DOM (eventos) e a cena (useFrame), sem re-render do React.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ControleGiro = {
  alvo: number;
  atual: number;
  inclinacao: number;
  arrastando: boolean;
  ultimoToque: number;
  giroscopio: number;
  invalidar?: () => void;
};

export function useGiro(inicial = 0) {
  const controle = useRef<ControleGiro>({
    alvo: inicial,
    atual: inicial,
    inclinacao: 0,
    arrastando: false,
    ultimoToque: -1e9,
    giroscopio: 0,
  });
  const inicio = useRef<{ x: number; alvo: number; id: number } | null>(null);

  const tocar = () => {
    controle.current.ultimoToque = performance.now();
    controle.current.invalidar?.();
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    inicio.current = { x: e.clientX, alvo: controle.current.alvo, id: e.pointerId };
    controle.current.arrastando = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    tocar();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const i = inicio.current;
    if (!i || i.id !== e.pointerId) return;
    const largura = (e.currentTarget as HTMLElement).clientWidth || 600;
    controle.current.alvo = i.alvo + ((e.clientX - i.x) / largura) * Math.PI * 1.6;
    tocar();
  }, []);

  const soltar = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (inicio.current?.id !== e.pointerId) return;
    inicio.current = null;
    controle.current.arrastando = false;
    tocar();
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const passo = e.shiftKey ? Math.PI / 2 : Math.PI / 8;
    if (e.key === "ArrowLeft") controle.current.alvo -= passo;
    else if (e.key === "ArrowRight") controle.current.alvo += passo;
    else return;
    e.preventDefault();
    tocar();
  }, []);

  const handlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp: soltar, onPointerCancel: soltar, onKeyDown }),
    [onPointerDown, onPointerMove, soltar, onKeyDown],
  );

  return { controle, handlers };
}

type EventoOrientacao = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function giroscopioDisponivel() {
  return (
    typeof window !== "undefined" &&
    "DeviceOrientationEvent" in window &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Liga o giroscópio (pede permissão no iOS). Devolve uma função para desligar. */
export async function ligarGiroscopio(controle: React.RefObject<ControleGiro>): Promise<(() => void) | null> {
  const Evento = window.DeviceOrientationEvent as EventoOrientacao;
  if (typeof Evento?.requestPermission === "function") {
    try {
      if ((await Evento.requestPermission()) !== "granted") return null;
    } catch {
      return null;
    }
  }
  let base: number | null = null;
  const aoMover = (e: DeviceOrientationEvent) => {
    if (e.gamma == null) return;
    if (base === null) base = e.gamma;
    controle.current.giroscopio = Math.max(-1, Math.min(1, (e.gamma - base) / 35)) * 0.9;
    controle.current.ultimoToque = performance.now();
    controle.current.invalidar?.();
  };
  window.addEventListener("deviceorientation", aoMover);
  return () => {
    window.removeEventListener("deviceorientation", aoMover);
    controle.current.giroscopio = 0;
    controle.current.invalidar?.();
  };
}

/** Observa se o elemento está na tela (com folga), para carregar o 3D e pausar o render fora dela. */
export function useNaTela<T extends HTMLElement>(margem = "200px") {
  const ref = useRef<T>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entrada]) => setVisivel(entrada.isIntersecting), { rootMargin: margem });
    io.observe(el);
    return () => io.disconnect();
  }, [margem]);
  return { ref, visivel };
}
