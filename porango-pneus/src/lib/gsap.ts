"use client";

/**
 * GSAP + ScrollTrigger + SplitText carregados sob demanda, depois da hidratação.
 * Assim o JS inicial fica leve e o motion chega logo em seguida.
 */
type Pacote = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
};

let promessa: Promise<Pacote> | null = null;

export function carregarGsap(): Promise<Pacote> {
  if (!promessa) {
    promessa = Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]).then(
      ([g, st, sp]) => {
        g.gsap.registerPlugin(st.ScrollTrigger, sp.SplitText);
        return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, SplitText: sp.SplitText };
      },
    );
  }
  return promessa;
}

/**
 * Chama `fn` na primeira interação real (rolar, tocar, mover o mouse, teclado).
 * Até lá nada abaixo da dobra precisa de motion, e o carregamento inicial fica livre.
 */
const EVENTOS_INTERACAO = ["pointerdown", "pointermove", "touchstart", "wheel", "keydown", "scroll"] as const;
let interagiu = false;
const fila: (() => void)[] = [];

export function aoInteragir(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (interagiu) {
    fn();
    return () => {};
  }
  fila.push(fn);
  if (fila.length === 1) {
    const disparar = () => {
      if (interagiu) return;
      interagiu = true;
      EVENTOS_INTERACAO.forEach((ev) => window.removeEventListener(ev, disparar));
      fila.splice(0).forEach((f) => f());
    };
    EVENTOS_INTERACAO.forEach((ev) => window.addEventListener(ev, disparar, { passive: true }));
  }
  return () => {
    const i = fila.indexOf(fn);
    if (i >= 0) fila.splice(i, 1);
  };
}

/** prefers-reduced-motion: desliga smooth scroll, parallax e animações longas. */
export function movimentoReduzido(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
