"use client";

import { useRef } from "react";
import { useMotor } from "@/hooks/useMotor";

/**
 * Mapa ilustrativo (fora de escala): QI 23 de um lado da rua, o Top Life
 * Miami Beach do outro. Sem tiles nem iframe (zero custo de performance);
 * o botão "Como chegar" abre o Google Maps de verdade.
 */
export function MapaEstilizado() {
  const ref = useRef<SVGSVGElement>(null);

  useMotor(({ gsap, reduzido }) => {
    const svg = ref.current;
    if (!svg || reduzido) return;
    const rota = svg.querySelector<SVGPathElement>(".rota");
    if (!rota) return;
    const comprimento = rota.getTotalLength();
    gsap.fromTo(
      rota,
      { strokeDasharray: comprimento, strokeDashoffset: comprimento },
      { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: svg, start: "top 80%", end: "center 45%", scrub: true } },
    );
    gsap.from(svg.querySelectorAll(".rotulo-mapa"), { opacity: 0, y: 12, stagger: 0.12, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: svg, start: "top 70%", once: true } });
  }, ref);

  return (
    <figure className="relative">
      <svg
        ref={ref}
        viewBox="0 0 800 640"
        role="img"
        aria-label="Mapa ilustrativo: o Churrasquinho do Bruce fica na QI 23, Setor Industrial, do outro lado da rua do Top Life Miami Beach."
        className="h-auto w-full rounded-3xl border border-carvao-3 bg-carvao-2"
      >
        <defs>
          <pattern id="mapa-pontos" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#8A8580" opacity="0.25" />
          </pattern>
          <radialGradient id="mapa-brilho" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FF5A1F" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FF5A1F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="640" fill="url(#mapa-pontos)" />

        {/* Quadras genéricas ao redor */}
        <g fill="#24211f" opacity="0.7">
          <rect x="40" y="40" width="200" height="180" rx="10" />
          <rect x="560" y="40" width="200" height="180" rx="10" />
          <rect x="40" y="420" width="160" height="180" rx="10" />
          <rect x="600" y="420" width="160" height="180" rx="10" />
        </g>

        {/* A rua entre os dois */}
        <rect x="0" y="292" width="800" height="72" fill="#0d0d0d" />
        <line x1="0" y1="328" x2="800" y2="328" stroke="#8A8580" strokeWidth="2" strokeDasharray="18 16" opacity="0.5" />

        {/* QI 23: Churrasquinho do Bruce */}
        <rect x="270" y="80" width="260" height="190" rx="14" fill="#191817" stroke="#FF5A1F" strokeWidth="2" />
        <circle cx="400" cy="185" r="90" fill="url(#mapa-brilho)" />
        <g className="rotulo-mapa">
          <text x="400" y="122" textAnchor="middle" fill="#F2EDE4" fontFamily="var(--font-big-shoulders)" fontWeight="800" fontSize="30">
            CHURRASQUINHO DO BRUCE
          </text>
          <text x="400" y="148" textAnchor="middle" fill="#FFB347" fontFamily="var(--font-barlow)" fontWeight="600" fontSize="15" letterSpacing="2">
            QI 23 · SETOR INDUSTRIAL
          </text>
        </g>
        {/* Pino de brasa pulsando */}
        <g transform="translate(400 210)">
          <circle r="22" fill="#FF5A1F" opacity="0.35" style={{ transformOrigin: "center", animation: "brilho-pino 2.4s ease-in-out infinite" }} />
          <circle r="11" fill="#FF5A1F" />
          <circle r="4" fill="#F2EDE4" />
        </g>

        {/* Top Life Miami Beach */}
        <rect x="250" y="390" width="300" height="200" rx="14" fill="#191817" stroke="#8A8580" strokeWidth="1.5" />
        <g fill="#24211f" stroke="#8A8580" strokeOpacity="0.4">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={282 + i * 62} y={490} width="44" height="72" rx="4" />
          ))}
        </g>
        <g className="rotulo-mapa">
          <text x="400" y="436" textAnchor="middle" fill="#F2EDE4" fontFamily="var(--font-big-shoulders)" fontWeight="800" fontSize="28">
            TOP LIFE MIAMI BEACH
          </text>
          <text x="400" y="462" textAnchor="middle" fill="#8A8580" fontFamily="var(--font-barlow)" fontWeight="600" fontSize="14" letterSpacing="2">
            REFERÊNCIA
          </text>
        </g>

        {/* "Em frente": atravessou a rua, chegou */}
        <path className="rota" d="M400 390 C 400 360, 420 345, 420 328 S 400 290, 400 240" fill="none" stroke="#FFB347" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 0" />
        <g className="rotulo-mapa">
          <rect x="452" y="312" width="132" height="32" rx="16" fill="#FFB347" />
          <text x="518" y="333" textAnchor="middle" fill="#121212" fontFamily="var(--font-barlow)" fontWeight="700" fontSize="15">
            Em frente
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-sm text-fumaca">Mapa ilustrativo, fora de escala. Para a rota exata, use o botão Como chegar.</figcaption>
    </figure>
  );
}
