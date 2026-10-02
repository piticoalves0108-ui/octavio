"use client";

import { useEffect, useState } from "react";
import { hero } from "@/config/content";
import { parseMarks } from "./Fill";
import { Underline } from "./Title";

/**
 * Título do hero. O texto é estático (pinta junto com o HTML, bom para o LCP)
 * e a entrada é uma varredura em CSS por cima dele (.hero-wipe).
 * Teste A/B: ?titulo=2 ou ?titulo=3 troca o título.
 */
export function HeroTitle() {
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("titulo"));
    if (n >= 1 && n <= hero.titles.length) setVariant(n - 1);
  }, []);

  return (
    <h1
      key={variant}
      className="hero-wipe font-display text-[clamp(2.4rem,4.9vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.045em] text-balance text-[#c7c7cd]"
    >
      {parseMarks(hero.titles[variant]).map((t, k) =>
        t.underline ? (
          <Underline key={k} delay={1100}>
            <span className="text-white">{t.text}</span>
          </Underline>
        ) : t.strong ? (
          // Trecho destacado não quebra no meio (ex.: "R$ 250/mês").
          <span key={k} className="whitespace-nowrap text-white">
            {t.text}
          </span>
        ) : (
          <span key={k}>{t.text}</span>
        ),
      )}
    </h1>
  );
}
