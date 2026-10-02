"use client";

import { useEffect, type DependencyList } from "react";
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";
import type { SplitText as Split } from "gsap/SplitText";

/**
 * O GSAP (≈56 kB) não entra no JavaScript inicial: ele carrega logo depois
 * que a página abre. O topo da página anima só com CSS, e tudo que usa GSAP
 * fica abaixo da primeira tela, então ninguém percebe a espera.
 */
export type GsapBundle = { gsap: typeof Gsap; ScrollTrigger: typeof ST; SplitText: typeof Split };

let bundle: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!bundle) {
    bundle = Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]).then(
      ([g, st, sp]) => {
        g.gsap.registerPlugin(st.ScrollTrigger, sp.SplitText);
        return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, SplitText: sp.SplitText };
      },
    );
  }
  return bundle;
}

/** Roda animações GSAP dentro de um context que é desfeito ao desmontar. */
export function useGsap(fn: (b: GsapBundle) => void | (() => void), deps: DependencyList = []) {
  useEffect(() => {
    let cancelled = false;
    let ctx: ReturnType<typeof Gsap.context> | undefined;
    let cleanup: void | (() => void);
    loadGsap().then((b) => {
      if (cancelled) return;
      ctx = b.gsap.context(() => {
        cleanup = fn(b);
      });
    });
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
