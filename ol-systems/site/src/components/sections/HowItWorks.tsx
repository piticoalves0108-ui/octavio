"use client";

import { useEffect, useRef } from "react";
import { steps } from "@/config/content";
import { prefersReducedMotion, useGsap } from "@/lib/gsap";
import { ContactButton } from "../ContactButton";
import { Fill } from "../Fill";
import { SectionTitle } from "../Title";

/** Linha do tempo que se desenha com o scroll e acende cada etapa. */
export function HowItWorks() {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) list.current?.querySelectorAll("[data-step]").forEach((s) => s.classList.add("is-on"));
  }, []);

  useGsap(({ gsap, ScrollTrigger }) => {
    const el = list.current;
    if (!el || prefersReducedMotion()) return;
    {
      gsap.fromTo(
        el.querySelector("[data-line]"),
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        },
      );
      el.querySelectorAll<HTMLElement>("[data-step]").forEach((step) => {
        ScrollTrigger.create({ trigger: step, start: "top 68%", toggleClass: { targets: step, className: "is-on" } });
      });
    }
  });

  return (
    <section id="como-funciona" className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionTitle index="04" label={steps.label} title={steps.title} />
            <div className="mt-10 hidden lg:block">
              <ContactButton source="como-funciona">Começar agora</ContactButton>
            </div>
          </div>
        </div>
        <ol ref={list} className="relative lg:col-span-6 lg:col-start-7">
          <span className="absolute bottom-6 left-[23px] top-6 w-px bg-line-strong" aria-hidden="true" />
          <span data-line className="absolute bottom-6 left-[23px] top-6 w-px origin-top bg-wa" aria-hidden="true" />
          {steps.items.map((s, i) => (
            <li key={s.title} data-step className="group relative flex gap-7 pb-14 last:pb-0">
              <span className="relative z-10 grid h-12 w-12 flex-none place-items-center rounded-full border border-line-strong bg-ink font-mono text-sm text-dim transition-all duration-500 group-[.is-on]:border-wa group-[.is-on]:bg-wa group-[.is-on]:text-wa-ink group-[.is-on]:shadow-[0_0_30px_rgb(37_211_102/0.45)]">
                0{i + 1}
              </span>
              <div className="translate-x-3 pt-2 transition-transform duration-700 ease-out group-[.is-on]:translate-x-0">
                <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-lg leading-relaxed text-muted">
                  <Fill text={s.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
