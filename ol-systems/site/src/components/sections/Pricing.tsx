"use client";

import { useEffect, useRef } from "react";
import { pricing } from "@/config/content";
import { site } from "@/config/site";
import { loadGsap, prefersReducedMotion } from "@/lib/gsap";
import { observeEnter } from "@/lib/inview";
import { ContactButton } from "../ContactButton";
import { Fill } from "../Fill";
import { SvgGlobe } from "../SvgGlobe";
import { SectionTitle } from "../Title";

export function Pricing() {
  const num = useRef<HTMLSpanElement>(null);
  const per = useRef<HTMLSpanElement>(null);

  // Contador: R$ 0 → R$ 250, depois o "/mês" entra.
  useEffect(() => {
    const el = num.current;
    if (!el || prefersReducedMotion()) return;
    let cancelled = false;
    let kill = () => {};
    const stop = observeEnter(
      el,
      (animate) => {
        if (!animate) return;
        loadGsap().then(({ gsap }) => {
          if (cancelled) return;
          const o = { v: 0 };
          el.textContent = "0";
          const tl = gsap.timeline();
          tl.to(o, {
        v: site.price,
        duration: 1.6,
        ease: "expo.out",
        onUpdate: () => {
          el.textContent = String(Math.round(o.v));
        },
          }).from(per.current, { x: -12, autoAlpha: 0, duration: 0.6, ease: "expo.out" }, "-=0.7");
          kill = () => tl.kill();
        });
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    return () => {
      cancelled = true;
      stop();
      kill();
      el.textContent = String(site.price);
    };
  }, []);

  return (
    <section id="preco" className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <SectionTitle index="08" label={pricing.label} title={pricing.title} align="center" className="max-w-3xl" />

      <div className="relative mx-auto mt-14 max-w-3xl">
        <div className="pointer-events-none absolute -inset-px rounded-[2.2rem] bg-[conic-gradient(from_180deg,rgb(255_255_255/0.5),rgb(255_255_255/0.04),rgb(37_211_102/0.6),rgb(255_255_255/0.04),rgb(255_255_255/0.5))] opacity-60" />
        <div className="relative overflow-hidden rounded-[2.2rem] bg-panel p-7 sm:p-12">
          <SvgGlobe className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 text-white/[0.07]" />
          <div className="relative grid gap-10 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-dim">Plano</p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{pricing.planName}</h3>
              <p className="mt-8 flex items-end gap-1 font-display font-bold tracking-[-0.05em]">
                <span className="mb-3 text-2xl text-muted">R$</span>
                <span ref={num} data-h="price-num" className="text-[5.5rem] leading-none tabular-nums sm:text-[7rem]" aria-label={`${site.price} reais`}>
                  {site.price}
                </span>
                <span ref={per} data-h="price-per" className="mb-3 text-2xl text-muted">
                  /mês
                </span>
              </p>
              <p className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-sm text-fg">{site.pricePerDayLabel}</p>
              <div className="mt-9">
                <ContactButton source="preco" pulse className="w-full sm:w-auto">
                  Quero meu site
                </ContactButton>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">Tudo isto incluso:</p>
              <ul className="mt-4 space-y-3.5">
                {pricing.features.map((f) => (
                  <li key={f} className="flex gap-3 leading-snug text-muted">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-5 w-5 flex-none text-wa" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>
                      <Fill text={f} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="relative mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm text-dim">
            {pricing.conditions.map((c) => (
              <li key={c}>
                <Fill text={c} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
