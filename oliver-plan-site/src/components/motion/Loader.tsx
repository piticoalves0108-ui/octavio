"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "@/lib/gsap";
import { brand } from "@/data/brand";

const KEY = "op-loaded";

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

  const word = `${brand.wordmark[0]} ${brand.wordmark[1]}`;

  return (
    <div
      ref={root}
      role="status"
      aria-label={`Carregando ${brand.name}`}
      className="site-loader fixed inset-0 z-[99] flex flex-col justify-between bg-graphite p-6 text-linen sm:p-10"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div data-fade className="flex items-center justify-between text-concrete">
        <span className="eyebrow">{brand.descriptor}</span>
        <span className="eyebrow">Desde {brand.founded}</span>
      </div>

      <div className="flex flex-col items-center">
        <p aria-hidden className="flex overflow-hidden font-display text-[clamp(3.2rem,12vw,11rem)] font-light leading-[1.05] tracking-[-0.04em]">
          {word.split("").map((ch, i) => (
            <span key={i} data-letter className="inline-block will-change-transform">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
        <div data-fade className="mt-6 w-full max-w-md">
          <div data-rule className="dim-line origin-left text-wood-light" />
          <div className="mt-3 flex justify-between text-[0.7rem] tracking-[0.2em] text-concrete">
            <span>0 MM</span>
            <span>{brand.tagline.toUpperCase()}</span>
            <span>2.700 MM</span>
          </div>
        </div>
      </div>

      <div data-fade className="flex items-end justify-between">
        <span className="max-w-[16rem] text-xs leading-relaxed text-concrete">Preparando o seu ambiente sob medida.</span>
        <span ref={counter} className="font-display text-6xl font-light tabular-nums sm:text-8xl">
          000
        </span>
      </div>
    </div>
  );
}
