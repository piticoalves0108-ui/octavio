"use client";

import type Lenis from "lenis";

/** Guarda a instância do Lenis para quem precisa rolar ou ler a velocidade. */
let lenis: Lenis | null = null;

export function definirLenis(l: Lenis | null) {
  lenis = l;
}

export function obterLenis() {
  return lenis;
}

/** Velocidade atual da rolagem em px/quadro (0 sem Lenis). */
export function velocidadeRolagem() {
  return lenis ? lenis.velocity : 0;
}

/**
 * Rola até um seletor/elemento. Sem Lenis (movimento reduzido), pula direto.
 *
 * Seções com `content-visibility: auto` só têm a altura real depois de renderizadas,
 * então o alvo pode "andar" durante a rolagem. Ao terminar, confere a posição e
 * corrige (até 3 vezes) até o elemento ficar logo abaixo do header.
 */
export function rolarPara(alvo: string | HTMLElement | number, imediato = false, tentativas = 3) {
  if (typeof alvo === "number") {
    if (lenis) lenis.scrollTo(alvo, { immediate: imediato, duration: 1.4 });
    else window.scrollTo({ top: alvo });
    return;
  }
  const el = typeof alvo === "string" ? document.querySelector<HTMLElement>(alvo) : alvo;
  if (!el) return;
  // o alvo certo fica logo abaixo do header fixo (scroll-padding-top do <html>)
  const recuo = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const conferir = () => {
    if (tentativas <= 0) return;
    requestAnimationFrame(() => {
      const desvio = el.getBoundingClientRect().top - recuo();
      if (Math.abs(desvio) > 4) {
        tentativas -= 1;
        rolarPara(window.scrollY + desvio, true);
        conferir();
      }
    });
  };
  if (lenis) {
    lenis.scrollTo(el, { offset: -recuo(), immediate: imediato, duration: 1.4, onComplete: conferir });
    if (imediato) conferir();
  } else {
    el.scrollIntoView({ block: "start" });
    window.setTimeout(conferir, 60);
  }
}
