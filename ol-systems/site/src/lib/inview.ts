"use client";

/**
 * Chama `onEnter` quando o elemento entra na tela, sem forçar recálculo de
 * layout (IntersectionObserver é assíncrono). `belowAtStart` avisa se o
 * elemento começou abaixo da tela: só esses ganham animação de entrada,
 * para nada que já está visível piscar.
 */
export function observeEnter(
  el: Element,
  onEnter: (animate: boolean) => void,
  { rootMargin = "0px 0px -10% 0px", onBelowAtStart }: { rootMargin?: string; onBelowAtStart?: () => void } = {},
) {
  let first = true;
  let below = false;
  const io = new IntersectionObserver(
    ([e]) => {
      if (first) {
        first = false;
        below = !e.isIntersecting && e.boundingClientRect.top > 0;
        if (below) onBelowAtStart?.();
      }
      if (e.isIntersecting) {
        io.disconnect();
        onEnter(below);
      }
    },
    { rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}
