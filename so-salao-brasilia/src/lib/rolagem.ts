"use client";

import type Lenis from "lenis";

/** Instância do Lenis (rolagem suave). Fica nula com movimento reduzido. */
let lenis: Lenis | null = null;

export function definirLenis(instancia: Lenis | null) {
  lenis = instancia;
}

export function obterLenis() {
  return lenis;
}

/** Rola até um seletor (#id), elemento ou posição, com Lenis quando disponível. */
export function rolarPara(alvo: string | number | HTMLElement, imediato = false) {
  if (lenis) {
    lenis.scrollTo(alvo, { immediate: imediato, duration: 1.15 });
    return;
  }
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const comportamento: ScrollBehavior = imediato || reduzido ? "auto" : "smooth";
  if (typeof alvo === "number") window.scrollTo({ top: alvo, behavior: comportamento });
  else {
    const el = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
    el?.scrollIntoView({ behavior: comportamento, block: "start" });
  }
}

/** Leva o foco do teclado para a seção de destino (sem rolar de novo). */
export function focarSecao(seletor: string) {
  const el = document.querySelector<HTMLElement>(seletor);
  if (!el) return;
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
