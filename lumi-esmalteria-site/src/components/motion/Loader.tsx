"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "@/lib/gsap";
import { brand } from "@/data/brand";

const KEY = "lumi-loaded";

/** Sinaliza para o resto do site (ex.: a cena 3D do hero) que a abertura terminou. */
export function markSiteLoaded() {
  document.documentElement.classList.add("is-loaded");
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
  window.dispatchEvent(new Event("site:loaded"));
}

/**
 * Tela de abertura: o logotipo se forma letra a letra enquanto um contador vai de 0 a 100,
 * e a tela sobe como uma cortina. Aparece só na primeira visita de cada sessão.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const el = root.current;
    if (!el || document.documentElement.classList.contains("is-loaded")) {
      setGone(true);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Com movimento reduzido, a abertura é pulada
    if (reduced) {
      markSiteLoaded();
      setGone(true);
      return;
    }
    lenis?.stop();
    document.body.style.overflow = "hidden";

    const progress = { v: 0 };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      el.querySelectorAll("[data-letter]"),
      { yPercent: 110, rotate: 4 },
      { yPercent: 0, rotate: 0, duration: 1, ease: "expo.out", stagger: 0.045 },
    )
      .fromTo(el.querySelector("[data-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: "power3.inOut" }, 0.1)
      .to(
        progress,
        {
          v: 100,
          duration: 1.8,
          ease: "power3.inOut",
          onUpdate: () => {
            if (counter.current) counter.current.textContent = String(Math.round(progress.v)).padStart(3, "0");
          },
        },
        0.1,
      )
      .to(el.querySelectorAll("[data-fade]"), { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, "+=0.15")
      .to(el.querySelectorAll("[data-letter]"), { yPercent: -110, duration: 0.6, ease: "expo.in", stagger: 0.025 }, "<")
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, "-=0.2")
      .call(() => {
        document.body.style.overflow = "";
        lenis?.start();
        markSiteLoaded();
        setGone(true);
      });

    fontsReady.then(() => tl.play());
    return () => {
      tl.kill();
      document.body.style.overflow = "";
    };
  }, [lenis]);

  if (gone) return null;

  const word = brand.short;

  return (
    <div
      ref={root}
      role="status"
      aria-label={`Carregando ${brand.name}`}
      className="site-loader fixed inset-0 z-[99] flex flex-col justify-between bg-blush p-6 text-ink sm:p-10"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div data-fade className="flex items-center justify-between text-muted">
        <span className="eyebrow">Esmalteria</span>
        <span className="eyebrow">
          {brand.location.city} · {brand.location.state}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <p aria-hidden className="flex overflow-hidden font-display text-[clamp(4rem,15vw,13rem)] italic leading-[1.05] tracking-[-0.03em] text-wine">
          {word.split("").map((ch, i) => (
            <span key={i} data-letter className="inline-block will-change-transform">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
        <div data-fade className="mt-6 w-full max-w-xs">
          <div className="h-px w-full bg-ink/10">
            <div data-rule className="h-px origin-left bg-wine" />
          </div>
          <p className="mt-3 text-center text-[0.7rem] tracking-[0.3em] text-muted">{brand.tagline.toUpperCase()}</p>
        </div>
      </div>

      <div data-fade className="flex items-end justify-between">
        <span className="max-w-[16rem] text-xs leading-relaxed text-muted">Preparando um momento só seu.</span>
        <span ref={counter} className="font-display text-6xl tabular-nums text-wine sm:text-8xl">
          000
        </span>
      </div>
    </div>
  );
}
