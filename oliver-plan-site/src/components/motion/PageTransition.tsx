"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { brand } from "@/data/brand";

type Ctx = { navigate: (href: string) => void };

const TransitionContext = createContext<Ctx>({ navigate: () => {} });

export const usePageTransition = () => useContext(TransitionContext);

/**
 * Transição entre páginas: duas cortinas (madeira e grafite) sobem, a rota troca por baixo
 * e as cortinas saem pelo topo. Navegação pelo botão voltar do navegador não usa cortina.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    const el = root.current;
    if (!el) return;
    if (safety.current) clearTimeout(safety.current);
    const panels = el.querySelectorAll("[data-panel]");
    const mark = el.querySelector("[data-mark]");
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(el, { autoAlpha: 0 });
          gsap.set(panels, { yPercent: 100 });
          pending.current = null;
        },
      })
      .to(mark, { autoAlpha: 0, y: -20, duration: 0.3, ease: "power2.in" })
      .to(panels, { yPercent: -100, duration: 0.85, ease: "expo.inOut", stagger: { each: 0.08, from: "end" } }, "<0.05");
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.href = href;
        return;
      }
      const samePath = url.pathname === window.location.pathname;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (samePath || reduced || pending.current) {
        router.push(href, { scroll: !url.hash && !samePath });
        // Âncora na mesma página: rolagem suave até a seção
        if (url.hash) {
          setTimeout(() => {
            const target = document.querySelector(url.hash);
            if (target && lenis) lenis.scrollTo(target as HTMLElement, { offset: -90 });
            else target?.scrollIntoView({ behavior: "smooth" });
          }, 80);
        }
        return;
      }
      pending.current = url.pathname;
      const el = root.current!;
      const panels = el.querySelectorAll("[data-panel]");
      const mark = el.querySelector("[data-mark]");
      router.prefetch(href);
      gsap
        .timeline()
        .set(el, { autoAlpha: 1 })
        .fromTo(panels, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: "expo.inOut", stagger: 0.08 })
        .fromTo(mark, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, "-=0.25")
        .call(() => {
          router.push(href, { scroll: false });
          // Se a rota demorar demais, libera a tela mesmo assim
          safety.current = setTimeout(reveal, 4000);
        });
    },
    [router, reveal, lenis],
  );

  useEffect(() => {
    if (!pending.current) return;
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    const t = setTimeout(reveal, 120);
    return () => clearTimeout(t);
  }, [pathname, lenis, reveal]);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div ref={root} aria-hidden className="pointer-events-none invisible fixed inset-0 z-[95] opacity-0">
        <div data-panel className="absolute inset-0 translate-y-full bg-wood" />
        <div data-panel className="absolute inset-0 flex translate-y-full items-center justify-center bg-graphite">
          <div data-mark className="flex flex-col items-center gap-3 text-linen opacity-0">
            <span className="font-display text-5xl font-light tracking-tight">{brand.monogram}</span>
            <span className="eyebrow text-concrete">{brand.tagline}</span>
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
