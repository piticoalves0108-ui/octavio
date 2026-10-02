"use client";

import { useEffect, useRef } from "react";

/**
 * Preloader "acendendo a brasa": contador de 0 a 100% e uma chama SVG que cresce.
 *
 * - O progresso é real: fontes prontas, página carregada e um tempo mínimo
 *   para a animação respirar. Nunca passa de ~2,5 s.
 * - Só na primeira visita da sessão; um script no <head> esconde antes do
 *   primeiro paint nas visitas seguintes, com movimento reduzido ou sem JS.
 * - O conteúdo do hero é renderizado por baixo desde o início (o LCP não espera).
 * Ao terminar, dispara o evento "brasa:acesa" (entrada do título do hero).
 */
export function Preloader() {
  const raiz = useRef<HTMLDivElement>(null);
  const numero = useRef<HTMLSpanElement>(null);
  const chama = useRef<SVGGElement>(null);
  const barra = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = raiz.current;
    if (!el || html.dataset.preloader === "off") {
      (window as { __brasaAcesa?: boolean }).__brasaAcesa = true;
      return;
    }

    let alvo = 6;
    let atual = 0;
    let quadro = 0;
    let terminou = false;
    const marcos = { fontes: false, carregou: false, tempo: false };

    const recalcular = () => {
      alvo = 6 + (marcos.fontes ? 34 : 0) + (marcos.carregou ? 40 : 0) + (marcos.tempo ? 20 : 0);
    };

    document.fonts?.ready.then(() => {
      marcos.fontes = true;
      recalcular();
    });
    const aoCarregar = () => {
      marcos.carregou = true;
      recalcular();
    };
    if (document.readyState === "complete") aoCarregar();
    else window.addEventListener("load", aoCarregar, { once: true });
    const tempoMinimo = window.setTimeout(() => {
      marcos.tempo = true;
      recalcular();
    }, 900);
    // Rede ruim não segura o site: em 2,4 s a brasa acende de qualquer jeito.
    const limite = window.setTimeout(() => {
      marcos.fontes = marcos.carregou = marcos.tempo = true;
      recalcular();
    }, 2400);

    const finalizar = () => {
      terminou = true;
      try {
        sessionStorage.setItem("brasa-acesa", "1");
      } catch {}
      el.dataset.saindo = "true";
      window.setTimeout(() => {
        html.dataset.preloader = "off";
        (window as { __brasaAcesa?: boolean }).__brasaAcesa = true;
      }, 900);
      window.setTimeout(() => window.dispatchEvent(new Event("brasa:acesa")), 260);
    };

    const tique = () => {
      // Aproxima do alvo com um passo mínimo, para o número nunca travar.
      atual = Math.min(alvo, atual + Math.max((alvo - atual) * 0.07, 0.35));
      const valor = Math.round(atual);
      if (numero.current) numero.current.textContent = String(valor);
      const t = atual / 100;
      chama.current?.setAttribute("transform", `translate(40 92) scale(${0.18 + 0.82 * t}) translate(-40 -92)`);
      if (barra.current) barra.current.style.transform = `scaleX(${t})`;
      if (valor >= 100 && !terminou) {
        finalizar();
        return;
      }
      quadro = requestAnimationFrame(tique);
    };
    quadro = requestAnimationFrame(tique);

    return () => {
      cancelAnimationFrame(quadro);
      window.clearTimeout(tempoMinimo);
      window.clearTimeout(limite);
      window.removeEventListener("load", aoCarregar);
    };
  }, []);

  return (
    <div
      id="preloader"
      ref={raiz}
      aria-hidden
      className="group fixed inset-0 z-[90] flex flex-col items-center justify-center pb-[18vh] bg-carvao transition-[clip-path] duration-[850ms] ease-[var(--ease-cortina)] [clip-path:inset(0_0_0_0)] data-[saindo=true]:[clip-path:inset(0_0_100%_0)]"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] bg-[radial-gradient(60%_80%_at_50%_100%,rgba(255,90,31,0.28),transparent_70%)]" />
      <svg viewBox="0 0 80 100" className="relative h-32 w-auto md:h-40" role="presentation">
        <defs>
          <linearGradient id="grad-chama" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FF5A1F" />
            <stop offset="0.6" stopColor="#FFB347" />
            <stop offset="1" stopColor="#F2EDE4" />
          </linearGradient>
        </defs>
        <g ref={chama} transform="translate(40 92) scale(0.18) translate(-40 -92)">
          <g style={{ transformOrigin: "40px 92px", animation: "chama 1.4s ease-in-out infinite" }}>
            <path
              d="M40 6c3.4 13.6 21 22.8 21 46.4A21 21 0 0 1 40 74a21 21 0 0 1-21-20.8c0-10.1 5.7-16.2 10.1-21 .4 6.6 3 11 7 12.7C33.4 29.4 37 9.2 40 6Z"
              fill="url(#grad-chama)"
              transform="translate(0 18)"
            />
            <path d="M40 52c1.5 5.5 8.6 9 8.6 18.2A8.6 8.6 0 0 1 40 79a8.6 8.6 0 0 1-8.6-8.6c0-4 2.4-6.5 4.2-8.4.2 2.6 1.2 4.4 2.9 5.1C38 59.5 39.4 53.6 40 52Z" fill="#F2EDE4" opacity="0.9" transform="translate(0 6)" />
          </g>
        </g>
      </svg>
      <p className="rotulo relative mt-6 text-fumaca">Acendendo a brasa</p>
      <p className="titulo relative mt-1 text-6xl text-osso tabular-nums md:text-7xl">
        <span ref={numero}>0</span>
        <span className="text-brasa">%</span>
      </p>
      <span className="relative mt-6 block h-px w-40 overflow-hidden bg-carvao-3">
        <span ref={barra} className="absolute inset-0 origin-left scale-x-0 bg-brasa" />
      </span>
    </div>
  );
}
