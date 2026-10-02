"use client";

/**
 * Mapa com "fachada": mostra um mapa ilustrativo leve e só carrega o Google Maps
 * quando a pessoa pede. Assim a página não paga o peso nem os cookies do mapa.
 */
import { useState } from "react";
import { linkComoChegar, linkMapaIncorporado, negocio } from "@/content/negocio";
import { secaoShowroom } from "@/content/textos";
import { classesBotao } from "@/components/ui/botao";
import { IconeMapa } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";

export function Mapa() {
  const [carregado, setCarregado] = useState(false);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-areia">
      {carregado ? (
        <iframe
          src={linkMapaIncorporado}
          title={`Mapa: ${negocio.nome}, ${negocio.endereco.completo}`}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <>
          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 size-full"
            role="img"
            aria-label={`${secaoShowroom.mapaIlustrativo}: ${negocio.endereco.completo}`}
          >
            <rect width="400" height="300" fill="#ece5df" />
            <g transform="rotate(-18 200 150)" stroke="#f7f5f3" strokeLinecap="round">
              {[-40, 20, 80, 140, 200, 260, 320].map((y) => (
                <line key={`h${y}`} x1="-120" y1={y} x2="520" y2={y} strokeWidth={y === 140 ? 14 : 6} />
              ))}
              {[-60, 20, 100, 180, 260, 340, 420].map((x) => (
                <line key={`v${x}`} x1={x} y1="-120" x2={x} y2="420" strokeWidth={x === 180 ? 12 : 5} />
              ))}
              <rect x="190" y="90" width="68" height="44" rx="4" fill="#e3d2c3" stroke="none" />
            </g>
            <g transform="translate(222 112)">
              <circle r="24" fill="#e8c5bd" opacity="0.55" className="pulso-mapa" />
              <path
                d="M0 14s-14-12-14-24a14 14 0 0 1 28 0c0 12-14 24-14 24z"
                fill="#2a2a2e"
                transform="translate(0 -14)"
              />
              <circle cy="-24" r="5" fill="#e8c5bd" />
            </g>
            <g transform="translate(222 70)">
              <rect x="-64" y="-18" width="128" height="30" rx="15" fill="#2a2a2e" />
              <text textAnchor="middle" y="2" fill="#f7f5f3" fontSize="12" fontFamily="var(--font-outfit), sans-serif">
                Só Salão · QI 19
              </text>
            </g>
          </svg>
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCarregado(true)}
              className={classesBotao("primario", undefined, "compacto")}
            >
              {secaoShowroom.carregarMapa}
            </button>
            <LinkRastreado
              href={linkComoChegar}
              evento="como_chegar_clique"
              origem="mapa"
              externo
              className={classesBotao("secundario", "bg-gelo/85 backdrop-blur", "compacto")}
            >
              <IconeMapa className="size-4" />
              {secaoShowroom.comoChegar}
            </LinkRastreado>
          </div>
          <p className="absolute top-4 left-4 rounded-full bg-gelo/85 px-3 py-1.5 text-xs text-tinta backdrop-blur">
            {secaoShowroom.mapaIlustrativo}
          </p>
        </>
      )}
    </div>
  );
}
