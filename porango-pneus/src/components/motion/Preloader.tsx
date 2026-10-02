"use client";

import { useEffect, useRef, useState } from "react";
import { avisar, palco } from "@/lib/palco";

/**
 * Preloader: velocímetro que sobe de 0 a 100 e o ponteiro estala no batente.
 *
 * - Vem no HTML do servidor, então cobre a tela desde o primeiro paint.
 * - Espera as fontes e, no desktop, a cena 3D (no máximo ~3 s).
 * - Só aparece na primeira visita da sessão e nunca com movimento reduzido
 *   (o script inline do layout põe a classe `sem-preloader` antes do paint).
 * - Leve: o ponteiro é um elemento HTML girado por Web Animations (roda no
 *   compositor); o JS só atualiza o número algumas vezes por segundo.
 */
const CX = 150;
const CY = 150;
const R = 118;
const GRAUS = (v: number) => -120 + 2.4 * v;

function ponto(valor: number, raio: number) {
  const a = (GRAUS(valor) * Math.PI) / 180;
  return [CX + raio * Math.sin(a), CY - raio * Math.cos(a)] as const;
}

function arco(de: number, ate: number, raio: number) {
  const [x0, y0] = ponto(de, raio);
  const [x1, y1] = ponto(ate, raio);
  const grande = (ate - de) * 2.4 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${raio} ${raio} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export const EVENTO_FIM_PRELOADER = "porango:preloader-fim";

function liberarIntro() {
  if (palco.introLiberada) return;
  palco.introLiberada = true;
  avisar();
  window.dispatchEvent(new Event(EVENTO_FIM_PRELOADER));
}

const SEGURA = 86; // até onde sobe enquanto espera
const MINIMO = 950; // ms mínimos de preloader
const LIMITE = 3200; // ms máximos esperando a cena

export function Preloader() {
  const [ativo, setAtivo] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const ponteiro = useRef<HTMLDivElement>(null);
  const progresso = useRef<SVGPathElement>(null);
  const numero = useRef<HTMLSpanElement>(null);
  const zonaVermelha = useRef<SVGPathElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("sem-preloader")) {
      setAtivo(false);
      liberarIntro();
      return;
    }
    const agulha = ponteiro.current;
    const arcoEl = progresso.current;
    if (!agulha || !arcoEl) return;

    let fontesProntas = false;
    let cenaPronta = false;
    let cancelado = false;
    const inicio = performance.now();
    const timers: number[] = [];
    const aoCena = () => {
      cenaPronta = true;
    };
    window.addEventListener("porango:cena-pronta", aoCena, { once: true });
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      fontesProntas = true;
    });
    // Só espera a cena se o Palco avisou que ela vem (desktop); no celular, não.
    const pronto = () => fontesProntas && (cenaPronta || html.dataset.cena !== "carregando");

    // Número: lê o ângulo real do ponteiro poucas vezes por segundo.
    const valorAtual = () => {
      const m = new DOMMatrixReadOnly(getComputedStyle(agulha).transform);
      const graus = (Math.atan2(m.b, m.a) * 180) / Math.PI;
      return Math.max(0, Math.min(100, (graus + 120) / 2.4));
    };
    const relogio = window.setInterval(() => {
      if (numero.current) numero.current.textContent = String(Math.round(valorAtual())).padStart(3, "0");
    }, 70);

    const opcoes = (duration: number, easing: string): KeyframeAnimationOptions => ({ duration, easing, fill: "forwards" });

    // 1) sobe até 86 e segura
    agulha.animate([{ transform: `rotate(${GRAUS(0)}deg)` }, { transform: `rotate(${GRAUS(SEGURA)}deg)` }], opcoes(900, "cubic-bezier(0.2, 0.8, 0.2, 1)"));
    arcoEl.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 100 - SEGURA }], opcoes(900, "cubic-bezier(0.2, 0.8, 0.2, 1)"));

    const acelerar = () => {
      if (cancelado) return;
      // 2) pé no fundo até o batente
      const subida = agulha.animate([{ transform: `rotate(${GRAUS(SEGURA)}deg)` }, { transform: `rotate(${GRAUS(100)}deg)` }], opcoes(220, "cubic-bezier(0.55, 0, 1, 0.45)"));
      arcoEl.animate([{ strokeDashoffset: 100 - SEGURA }, { strokeDashoffset: 0 }], opcoes(220, "cubic-bezier(0.55, 0, 1, 0.45)"));
      subida.finished.then(() => {
        if (cancelado) return;
        // 3) estalo: bate no batente e treme
        zonaVermelha.current?.setAttribute("opacity", "1");
        if (numero.current) numero.current.textContent = "100";
        window.clearInterval(relogio);
        const g = GRAUS(100);
        agulha
          .animate(
            [
              { transform: `rotate(${g}deg)` },
              { transform: `rotate(${g + 4.5}deg)` },
              { transform: `rotate(${g - 2.4}deg)` },
              { transform: `rotate(${g + 1.4}deg)` },
              { transform: `rotate(${g - 0.6}deg)` },
              { transform: `rotate(${g}deg)` },
            ],
            opcoes(420, "linear"),
          )
          .finished.then(() => {
            if (cancelado) return;
            raiz.current?.setAttribute("data-saindo", "");
            liberarIntro();
            try {
              sessionStorage.setItem("porango-visto", "1");
            } catch {}
            timers.push(window.setTimeout(() => !cancelado && setAtivo(false), 900));
          });
      });
    };

    const checar = () => {
      if (cancelado) return;
      const decorrido = performance.now() - inicio;
      if (decorrido >= MINIMO && (pronto() || decorrido > LIMITE)) acelerar();
      else timers.push(window.setTimeout(checar, 100));
    };
    timers.push(window.setTimeout(checar, MINIMO));

    return () => {
      cancelado = true;
      window.clearInterval(relogio);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("porango:cena-pronta", aoCena);
      agulha.getAnimations().forEach((a) => a.cancel());
    };
  }, []);

  if (!ativo) return null;

  const marcas = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div
      ref={raiz}
      className="preloader fixed inset-0 z-[100] flex flex-col items-center justify-center bg-asfalto transition-transform duration-[850ms] ease-[cubic-bezier(0.7,0,0.2,1)] data-[saindo]:-translate-y-full"
      role="status"
      aria-label="Carregando o site da Porango Pneus"
    >
      <div className="relative w-[min(78vw,360px)] [container-type:inline-size]">
        <svg viewBox="0 0 300 230" className="w-full" aria-hidden="true">
          <path d={arco(0, 100, R)} stroke="#25262a" strokeWidth="10" fill="none" />
          <path ref={zonaVermelha} d={arco(88, 100, R + 9)} stroke="#e10600" strokeWidth="3" fill="none" opacity="0.45" />
          <path
            ref={progresso}
            d={arco(0, 100, R)}
            pathLength={100}
            stroke="#ffc400"
            strokeWidth="10"
            fill="none"
            strokeDasharray="100 100"
            strokeDashoffset="100"
          />
          {/* marcas: maiores a cada 20, menores a cada 10 */}
          <path d={arco(0, 100, R - 20)} stroke="#6b6c70" strokeWidth="9" fill="none" pathLength={100} strokeDasharray="0.6 9.4" strokeDashoffset="0.3" />
          {marcas
            .filter((v) => v % 20 === 0)
            .map((v) => {
              const [x, y] = ponto(v, R - 44);
              const [x0, y0] = ponto(v, R - 12);
              const [x1, y1] = ponto(v, R - 28);
              return (
                <g key={v}>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#f4f4f2" strokeWidth="2.5" />
                  <text x={x} y={y + 4} textAnchor="middle" fill="#a2a29d" style={{ font: "600 12px var(--font-chakra), sans-serif", letterSpacing: "0.08em" }}>
                    {v}
                  </text>
                </g>
              );
            })}
          <circle cx={CX} cy={CY} r="9" fill="#1c1d20" stroke="#f4f4f2" strokeWidth="2" />
        </svg>
        {/* ponteiro em HTML: gira no compositor */}
        <div
          ref={ponteiro}
          aria-hidden="true"
          className="absolute"
          style={{
            left: `${(CX / 300) * 100}%`,
            top: `${(CY / 230) * 100}%`,
            width: 0,
            height: 0,
            transform: `rotate(${GRAUS(0)}deg)`,
            willChange: "transform",
          }}
        >
          <span
            className="absolute block bg-freio"
            style={{
              left: -2.5,
              // medidas em cqw (1% da largura do mostrador) para acompanhar o SVG
              bottom: `${(-14 / 300) * 100}cqw`,
              width: 5,
              height: `${((R - 6 + 14) / 300) * 100}cqw`,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span ref={numero} className="font-display text-5xl leading-none font-bold tabular-nums">
            000
          </span>
          <span className="rotulo mt-1 !text-[0.7rem]">km/h</span>
        </div>
      </div>
      <p className="rotulo mt-10">
        <b>Porango</b> Pneus
      </p>
    </div>
  );
}
