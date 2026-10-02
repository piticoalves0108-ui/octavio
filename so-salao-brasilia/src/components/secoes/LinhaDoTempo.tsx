"use client";

/**
 * Linha do tempo horizontal do processo (escolha, produção, entrega, montagem).
 * Com JS, a seção fica presa (pin do ScrollTrigger) e a rolagem vertical move a trilha
 * na horizontal; uma barra mostra o avanço. Sem JS ou com movimento reduzido, as
 * etapas aparecem empilhadas.
 */
import { useEffect, useRef, useState } from "react";
import { secaoComoFunciona } from "@/content/textos";
import { carregarGsap } from "@/lib/gsap";
import { useMovimentoReduzido } from "@/lib/movimento";
import { cn } from "@/lib/cn";
import { Texto } from "@/components/ui/Texto";
import { IlustracaoEntrega, IlustracaoEscolha, IlustracaoMontagem, IlustracaoProducao } from "./ilustracoes";

const ilustracoes = [IlustracaoEscolha, IlustracaoProducao, IlustracaoEntrega, IlustracaoMontagem];

export function LinhaDoTempo() {
  const reduzido = useMovimentoReduzido();
  const [horizontal, setHorizontal] = useState(false);
  const secao = useRef<HTMLDivElement>(null);
  const trilha = useRef<HTMLOListElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHorizontal(!reduzido);
  }, [reduzido]);

  useEffect(() => {
    if (!horizontal) return;
    let cancelado = false;
    let desfazer = () => {};
    carregarGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelado || !secao.current || !trilha.current) return;
      const ctx = gsap.context(() => {
        const distancia = () => Math.max(0, trilha.current!.scrollWidth - window.innerWidth);
        gsap.to(trilha.current, {
          x: () => -distancia(),
          ease: "none",
          scrollTrigger: {
            trigger: secao.current,
            start: "top top",
            end: () => `+=${distancia()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (barra.current) barra.current.style.transform = `scaleX(${self.progress})`;
            },
          },
        });
      }, secao);
      ScrollTrigger.refresh();
      desfazer = () => ctx.revert();
    });
    return () => {
      cancelado = true;
      desfazer();
    };
  }, [horizontal]);

  return (
    <div
      ref={secao}
      className={cn("tema-escuro relative overflow-hidden bg-grafite text-gelo", horizontal ? "h-[100svh]" : "secao")}
    >
      <ol
        ref={trilha}
        className={cn(
          horizontal
            ? "flex h-full w-max items-center gap-[clamp(2rem,6vw,6rem)] pr-[12vw] pl-[max(1rem,calc((100vw-90rem)/2+4rem))]"
            : "conteiner grid gap-12 md:grid-cols-2",
        )}
      >
        <li className={cn("flex-none", horizontal ? "w-[min(30rem,82vw)]" : "md:col-span-2")}>
          <p className="sobretitulo text-champanhe">{secaoComoFunciona.sobretitulo}</p>
          <h3 className="mt-5 text-[clamp(2.4rem,5vw,4.6rem)] leading-none">{secaoComoFunciona.etapasTitulo}</h3>
          {horizontal && <p className="mt-6 text-nevoa">Role para acompanhar →</p>}
        </li>
        {secaoComoFunciona.etapas.map((etapa, i) => {
          const Ilustracao = ilustracoes[i];
          return (
            <li key={etapa.numero} className={cn("flex-none", horizontal && "w-[min(26rem,78vw)]")}>
              <div className="flex items-end justify-between border-b border-gelo/20 pb-6">
                <span className="font-serif text-[clamp(4.5rem,9vw,8rem)] leading-[0.8] text-rose">{etapa.numero}</span>
                <Ilustracao className="size-24 text-champanhe md:size-28" />
              </div>
              <h4 className="mt-6 font-serif text-[2.2rem] leading-none">{etapa.titulo}</h4>
              <p className="mt-4 texto-grande text-nevoa">
                <Texto>{etapa.texto}</Texto>
              </p>
            </li>
          );
        })}
      </ol>
      {horizontal && (
        <div className="conteiner absolute inset-x-0 bottom-10" aria-hidden>
          <div className="h-px w-full bg-gelo/15">
            <div ref={barra} className="h-px origin-left scale-x-0 bg-rose" />
          </div>
        </div>
      )}
    </div>
  );
}
