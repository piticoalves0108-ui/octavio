"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { loadGsap, prefersReducedMotion } from "@/lib/gsap";
import { observeEnter } from "@/lib/inview";
import { Fill, parseMarks } from "./Fill";

/** Sublinhado verde que se desenha embaixo de uma palavra. */
export function Underline({ children, delay, paused }: { children: React.ReactNode; delay?: number; paused?: boolean }) {
  const style = {
    ...(delay !== undefined ? { "--draw-delay": `${delay}ms` } : {}),
    ...(paused ? { "--draw-state": "paused" } : {}),
  } as CSSProperties;
  return (
    <span className="draw-underline" style={style}>
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 7 C 25 2, 60 2, 98 5" pathLength={1} />
      </svg>
    </span>
  );
}

/** Texto com *destaque* e _sublinhado_. */
export function Marked({ text, underlinePaused }: { text: string; underlinePaused?: boolean }) {
  return (
    <>
      {parseMarks(text).map((t, i) =>
        t.underline ? (
          <Underline key={i} paused={underlinePaused}>
            {t.text}
          </Underline>
        ) : t.strong ? (
          <span key={i} className="text-white">
            {t.text}
          </span>
        ) : (
          <Fill key={i} text={t.text} />
        ),
      )}
    </>
  );
}

/**
 * Título de seção: rótulo "01 · O problema" + título que entra palavra por
 * palavra (SplitText) quando aparece na tela.
 */
export function SectionTitle({
  index,
  label,
  title,
  className = "",
  align = "left",
}: {
  index: string;
  label: string;
  title: string;
  className?: string;
  align?: "left" | "center";
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  // Cada título só é dividido em palavras quando chega na tela (o trabalho
  // fica espalhado pela rolagem em vez de travar a página no carregamento).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const underline = el.querySelector<HTMLElement>(".draw-underline");
    const drawUnderline = () => underline?.style.setProperty("--draw-state", "running");
    if (prefersReducedMotion()) {
      drawUnderline();
      return;
    }
    let cancelled = false;
    let revert = () => {};
    const show = () => el.removeAttribute("data-title");
    const stop = observeEnter(
      el,
      (animate) => {
        if (!animate) return drawUnderline();
        const fallback = setTimeout(show, 2000);
        loadGsap().then(({ gsap, SplitText }) => {
          clearTimeout(fallback);
          if (cancelled) return;
          const split = SplitText.create(el, {
            type: "words",
            mask: "words",
            wordsClass: "sw",
            // O sublinhado fica inteiro (não quebra a palavra destacada).
            ignore: ".draw-underline svg",
          });
          const tween = gsap.from(split.words, {
            yPercent: 110,
            duration: 1,
            ease: "expo.out",
            stagger: 0.035,
            onStart: show,
          });
          drawUnderline();
          revert = () => {
            tween.kill();
            split.revert();
          };
        });
      },
      { rootMargin: "0px 0px -12% 0px", onBelowAtStart: () => el.setAttribute("data-title", "hidden") },
    );
    return () => {
      cancelled = true;
      stop();
      revert();
      show();
    };
  }, []);

  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      <p className={`mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-dim ${align === "center" ? "justify-center" : ""}`}>
        <span className="text-fg">{index}</span>
        <span className="h-px w-8 bg-line-strong" />
        {label}
      </p>
      <h2
        ref={ref}
        data-h="section-title"
        className="font-display text-[clamp(2.1rem,5.2vw,4.4rem)] font-bold leading-[0.98] tracking-[-0.035em] text-balance"
      >
        <Marked text={title} underlinePaused />
      </h2>
    </div>
  );
}
