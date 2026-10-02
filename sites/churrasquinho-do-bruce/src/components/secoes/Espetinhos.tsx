"use client";

import { useRef } from "react";
import { Texto } from "@/components/Pendente";
import { CardTilt } from "@/components/motion/CardTilt";
import { ContadorPreco } from "@/components/motion/ContadorPreco";
import { Marcador } from "@/components/Pendente";
import { useMotor } from "@/hooks/useMotor";
import { useSecaoCena } from "@/hooks/useSecaoCena";
import { categoria } from "@/content/cardapio";
import { cena, PECAS, registrarAncora } from "@/lib/cena";
import { mostrarPendencias } from "@/lib/pendente";
import { AvisoPreco } from "./CategoriaCartoes";

const espetinhos = categoria("espetinhos");

/**
 * Espetinhos: o espeto sai da grelha, fica em pé e explode. Cada pedaço viaja
 * até o item do cardápio dele (as âncoras ao lado de cada card).
 *
 * Sem 3D (movimento reduzido, sem WebGL, aparelho fraco) as âncoras mostram
 * miniaturas renderizadas da própria cena, e os cards entram em 2D.
 */
export function Espetinhos() {
  const trilho = useRef<HTMLDivElement>(null);
  useSecaoCena(trilho, "espetinhos");

  useMotor(({ gsap, reduzido }) => {
    const el = trilho.current;
    if (!el || reduzido) return;
    const linhas = gsap.utils.toArray<HTMLElement>(".linha-espetinho", el);

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true },
    });
    // 0 → 0.3: o espeto fica em pé enquanto a seção sobe.
    tl.fromTo(cena, { vertical: 0 }, { vertical: 1, duration: 0.26, ease: "power2.inOut" }, 0.06);
    // 0.3 → 0.6: vista explodida, um pedaço por vez; a vareta sai de cena.
    tl.fromTo(cena, { vareta: 0 }, { vareta: 1, duration: 0.18, ease: "power2.in" }, 0.32);
    PECAS.forEach((peca, i) => {
      tl.fromTo(cena.pecas, { [peca]: 0 }, { [peca]: 1, duration: 0.2, ease: "power3.inOut" }, 0.34 + i * 0.05);
    });
    // Cards entram quando o pedaço chega; no modo 2D, a miniatura também.
    linhas.forEach((linha, i) => {
      const inicio = 0.42 + i * 0.05;
      tl.from(linha.querySelector(".cartao-item"), { opacity: 0, x: 48, duration: 0.14, ease: "power2.out" }, inicio);
      tl.from(linha.querySelector(".miniatura"), { opacity: 0, scale: 0.4, rotate: -40, duration: 0.14, ease: "back.out(1.6)" }, inicio - 0.04);
    });
    tl.to({}, { duration: 0.001 }, 1);
  }, trilho);

  return (
    <div id="espetinhos" ref={trilho} className="trilho trilho-espetinhos" aria-labelledby="titulo-espetinhos">
      <div className="trilho-palco">
        <div className="moldura grade h-full content-center gap-y-6 pb-6 pt-[calc(var(--altura-header)+0.5rem)] lg:gap-y-0">
          <div className="col-span-12 lg:col-span-5 lg:self-center">
            <p className="rotulo text-brasa">01 · Cardápio</p>
            <h3 id="titulo-espetinhos" className="titulo titulo-lg mt-3 text-osso">
              {espetinhos.titulo}
            </h3>
            <p className="mt-3 max-w-[34ch] text-lg text-osso/85 lg:mt-5">{espetinhos.chamada}</p>
            <AvisoPreco categoria={espetinhos} className="mt-3 max-w-[40ch]" />
          </div>

          <ol className="col-span-12 flex flex-col gap-2.5 md:gap-3 lg:col-span-6 lg:col-start-7 lg:self-center">
            {espetinhos.itens.map((item) => (
              <li key={item.id} className="linha-espetinho grid grid-cols-[clamp(4.25rem,8.5vw,8rem)_1fr] items-center gap-3 md:gap-6">
                <div ref={(el) => registrarAncora(`peca-${item.peca}`, el)} className="relative aspect-square">
                  {/* Miniatura renderizada da cena 3D: aparece quando não há WebGL. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/renders/peca-${item.peca}.webp`}
                    alt=""
                    width={320}
                    height={320}
                    loading="lazy"
                    decoding="async"
                    className="miniatura so-sem-3d absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(255,90,31,0.25)]"
                  />
                </div>
                <CardTilt className="cartao-item rounded-2xl border border-carvao-3 bg-carvao-2/75 px-4 py-3 backdrop-blur-sm md:px-6 md:py-5">
                  <div className="flex items-baseline justify-between gap-4 [transform:translateZ(20px)]">
                    <h4 className="titulo text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none text-osso">{item.nome}</h4>
                    <span className="shrink-0 text-lg font-semibold text-ambar">
                      {item.preco !== null ? <ContadorPreco valor={item.preco} /> : mostrarPendencias ? <Marcador texto="{{CONFIRMAR: preço}}" /> : null}
                    </span>
                  </div>
                  <Texto valor={item.descricao} como="p" className="mt-1 text-sm leading-snug text-fumaca" />
                </CardTilt>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
