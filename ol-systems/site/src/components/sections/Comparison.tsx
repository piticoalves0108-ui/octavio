"use client";

import { useEffect, useRef } from "react";
import { comparison } from "@/config/content";
import { loadGsap, prefersReducedMotion } from "@/lib/gsap";
import { observeEnter } from "@/lib/inview";
import { Fill } from "../Fill";
import { SectionTitle } from "../Title";

const Check = () => (
  <span data-mark role="img" className="grid h-6 w-6 flex-none place-items-center rounded-full bg-wa text-wa-ink" aria-label="sim">
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);
const Cross = () => (
  <span data-mark role="img" className="grid h-6 w-6 flex-none place-items-center rounded-full border border-line-strong text-dim" aria-label="não">
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  </span>
);

export function Comparison() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let cancelled = false;
    let kill = () => {};
    const rows = el.querySelectorAll<HTMLElement>("[data-row]");
    const stop = observeEnter(
      el,
      (animate) => {
        if (!animate) return;
        loadGsap().then(({ gsap }) => {
          if (cancelled) return;
          const tl = gsap
            .timeline()
            .fromTo(rows, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.09 })
            .from(el.querySelectorAll("[data-mark]"), { scale: 0, duration: 0.6, ease: "back.out(3)", stagger: 0.05 }, 0.25);
          kill = () => tl.revert();
        });
      },
      { rootMargin: "0px 0px -20% 0px", onBelowAtStart: () => rows.forEach((r) => (r.style.opacity = "0")) },
    );
    return () => {
      cancelled = true;
      stop();
      kill();
      rows.forEach((r) => (r.style.opacity = ""));
    };
  }, []);

  const [, them, us] = comparison.columns;

  return (
    <section className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <SectionTitle index="05" label={comparison.label} title={comparison.title} className="max-w-3xl" />
      <div ref={ref} className="mt-14 overflow-hidden rounded-3xl border border-line">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Comparativo entre um site do jeito tradicional e a assinatura da OL Systems</caption>
          <thead>
            <tr className="border-b border-line text-sm">
              <th scope="col" className="hidden w-[26%] p-5 font-medium text-dim md:table-cell lg:p-7">
                <span className="sr-only">Item</span>
              </th>
              <th scope="col" className="p-4 font-medium text-dim sm:p-5 lg:p-7">
                {them}
              </th>
              <th scope="col" className="bg-white/[0.04] p-4 sm:p-5 lg:p-7">
                <span className="font-display text-base font-bold text-fg">{us}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((r) => (
              <tr key={r.label} data-row className="border-b border-line last:border-0 align-top">
                <th scope="row" className="hidden p-5 font-display text-lg font-bold tracking-tight md:table-cell lg:p-7">
                  {r.label}
                </th>
                <td className="p-4 sm:p-5 lg:p-7">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-dim md:hidden">{r.label}</span>
                  <span className="flex items-start gap-3 text-muted">
                    <Cross />
                    <span className="pt-0.5">{r.them}</span>
                  </span>
                </td>
                <td className="bg-white/[0.04] p-4 sm:p-5 lg:p-7">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-transparent md:hidden" aria-hidden="true">
                    .
                  </span>
                  <span className="flex items-start gap-3 font-medium text-fg">
                    <Check />
                    <span className="pt-0.5">
                      <Fill text={r.us} />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
