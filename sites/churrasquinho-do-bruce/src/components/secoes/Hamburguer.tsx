"use client";

import { useRef } from "react";
import { useMotor } from "@/hooks/useMotor";
import { useSecaoCena } from "@/hooks/useSecaoCena";
import { categoria } from "@/content/cardapio";
import { CAMADAS, cena, registrarAncora, type Camada } from "@/lib/cena";
import { AvisoPreco, CategoriaCartoes } from "./CategoriaCartoes";

const hamburgueres = categoria("hamburgueres");

/** De onde cada camada vem (unidades locais do hambúrguer) e quando pousa na timeline. */
const ENTRADAS: Record<Camada, { de: number; giro: number; em: number }> = {
  carne: { de: 0, giro: -1.4, em: 0.15 }, // nasce da fusão dos pedaços do espeto
  paoBase: { de: -2.6, giro: 0.9, em: 0.3 },
  queijo: { de: 2.8, giro: 1.6, em: 0.41 },
  tomate: { de: 3.0, giro: -1.2, em: 0.51 },
  alface: { de: 3.2, giro: 1.1, em: 0.6 },
  paoTopo: { de: 3.6, giro: -0.8, em: 0.69 },
};

/**
 * Hambúrguer: o espeto vira hambúrguer. Uma timeline do GSAP (scrub no scroll)
 * controla posição, giro e escala de cada camada; a cena 3D só lê os valores.
 */
export function Hamburguer() {
  const trilho = useRef<HTMLDivElement>(null);
  const marcadores = useRef<HTMLOListElement>(null);
  useSecaoCena(trilho, "hamburguer");

  useMotor(({ gsap, reduzido }) => {
    const el = trilho.current;
    if (!el || reduzido) return;

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true },
    });

    // Os pedaços saem dos itens dos espetinhos e se fundem no meio.
    tl.fromTo(cena, { fusao: 0 }, { fusao: 1, duration: 0.22, ease: "power2.inOut" }, 0.02);

    CAMADAS.forEach((camada) => {
      const { de, giro, em } = ENTRADAS[camada];
      const estado = cena.camadas[camada];
      tl.fromTo(estado, { escala: 0 }, { escala: 1, duration: 0.03, ease: "power1.out" }, em);
      tl.fromTo(
        estado,
        { y: de, giro },
        { y: 0, giro: 0, duration: camada === "paoTopo" ? 0.13 : 0.1, ease: camada === "carne" ? "back.out(1.4)" : "power3.out" },
        em,
      );
    });

    // Amassadinha quando o pão de cima pousa.
    tl.fromTo(cena, { amassar: 0 }, { amassar: 1, duration: 0.04, ease: "power2.out" }, 0.8);
    tl.to(cena, { amassar: 0, duration: 0.1, ease: "elastic.out(1, 0.35)" }, 0.84);

    // Marcadores de camada acendem junto.
    const pontos = gsap.utils.toArray<HTMLElement>("li", marcadores.current);
    const tempos = CAMADAS.map((c) => ENTRADAS[c].em).sort((a, b) => a - b);
    pontos.forEach((ponto, i) => {
      tl.fromTo(ponto, { opacity: 0.25, scaleX: 0.5 }, { opacity: 1, scaleX: 1, duration: 0.04 }, tempos[i] + 0.06);
    });
    tl.to({}, { duration: 0.001 }, 1);
  }, trilho);

  return (
    <div id="hamburgueres" aria-labelledby="titulo-hamburgueres">
      <div ref={trilho} className="trilho trilho-hamburguer">
        <div className="trilho-palco">
          <div className="moldura grade h-full content-center gap-y-4 pb-8 pt-[calc(var(--altura-header)+0.5rem)]">
            <div className="col-span-12 lg:col-span-5 lg:self-center">
              <p className="rotulo text-brasa">02 · Cardápio</p>
              <h3 id="titulo-hamburgueres" className="titulo titulo-lg mt-3 text-osso">
                {hamburgueres.titulo}
              </h3>
              <p className="mt-3 max-w-[34ch] text-lg text-osso/85 lg:mt-5">{hamburgueres.chamada}</p>
              <ol ref={marcadores} aria-hidden className="mt-6 hidden gap-1.5 lg:flex">
                {CAMADAS.map((c) => (
                  <li key={c} className="h-1.5 w-10 origin-left rounded-full bg-brasa" />
                ))}
              </ol>
            </div>
            <div className="relative col-span-12 h-[46svh] lg:col-span-7 lg:h-[78svh]">
              <div ref={(el) => registrarAncora("hamburguer", el)} className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/renders/hamburguer.webp"
                  alt=""
                  width={900}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="so-sem-3d absolute inset-0 m-auto h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="moldura relative pb-28 pt-6 md:pb-40">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <p className="titulo titulo-sm text-osso">Os hambúrgueres do Bruce</p>
          <AvisoPreco categoria={hamburgueres} />
        </div>
        <CategoriaCartoes categoria={hamburgueres} origem="cardapio-hamburgueres" />
      </div>
    </div>
  );
}
