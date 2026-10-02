"use client";

/**
 * Vitrine do hero: pôster estático (AVIF, mesmo enquadramento da cena) que vira a
 * cadeira em 3D quando o WebGL está pronto. Amostras ao lado trocam o estofado e a base.
 * Aparelhos muito fracos recebem um vídeo em loop gravado da própria cena.
 */
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { useConfiguracao } from "@/lib/configuracao";
import { useMovimentoReduzido } from "@/lib/movimento";
import { cn } from "@/lib/cn";
import { hero } from "@/content/textos";
import { corPorId, tecidoPorId, acabamentoPorId } from "@/content/catalogo";
import { useGiro, useNaTela } from "@/components/cena3d/giro";
import { useCarregar3D } from "@/components/cena3d/carregar";
import { IconeGiro } from "@/components/ui/icones";
import { SeletorAcabamento, SeletorCor, SeletorTecido } from "@/components/configurador/Seletores";

const CenaHero = dynamic(() => import("@/components/cena3d/CenaHero"), { ssr: false });

/** Ângulo inicial da cadeira (o pôster foi gravado neste ângulo). */
export const ANGULO_HERO = -0.5;

export function VitrineHero() {
  const { ref, visivel } = useNaTela<HTMLDivElement>("0px");
  const { carregar, nivel } = useCarregar3D(visivel);
  const reduzido = useMovimentoReduzido();
  const [pronto, setPronto] = useState(false);
  const { controle, handlers } = useGiro(ANGULO_HERO);
  const tecido = useConfiguracao((s) => s.tecido);
  const cor = useConfiguracao((s) => s.cor);
  const acabamento = useConfiguracao((s) => s.acabamento);
  const definir = useConfiguracao((s) => s.definir);

  const tem3D = carregar && pronto;
  const resumo = `${tecidoPorId(tecido).nome} ${corPorId(cor).nome.toLowerCase()} · base ${acabamentoPorId(acabamento).nome.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-end lg:gap-8">
      <div
        ref={ref}
        className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] flex-none overflow-hidden rounded-[2rem] bg-[#ece5df] lg:mx-0 lg:w-[min(38rem,calc((100svh-9rem)*0.8),calc(100%-11.5rem))] lg:max-w-none"
      >
        <Image
          src="/images/hero/cadeira-poster.avif"
          alt="Cadeira de cabeleireiro com estofado de veludo rosé e base dourada, sobre um pedestal em luz de estúdio."
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1024px) 40vw, 92vw"
          className="object-cover"
        />

        {nivel === "video" && !reduzido && (
          <video
            className="absolute inset-0 size-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="/images/hero/cadeira-poster.avif"
            aria-hidden
          >
            <source src="/video/cadeira-giro.webm" type="video/webm" />
            <source src="/video/cadeira-giro.mp4" type="video/mp4" />
          </video>
        )}

        {carregar && (
          <div
            {...handlers}
            tabIndex={pronto ? 0 : -1}
            role="group"
            aria-roledescription="visualizador 3D"
            aria-label={`Cadeira de cabeleireiro em 3D, ${resumo}. Use as setas esquerda e direita para girar.`}
            className={cn(
              "absolute inset-0 cursor-grab transition-opacity duration-700 active:cursor-grabbing",
              tem3D ? "opacity-100" : "opacity-0",
            )}
          >
            <CenaHero
              visivel={visivel}
              controle={controle}
              autoGiro={!reduzido}
              aoPrimeiroQuadro={() => setPronto(true)}
            />
          </div>
        )}

        {/* Vinheta e luz de estúdio por cima (iguais no pôster e no 3D) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%), radial-gradient(140% 100% at 50% 50%, rgba(0,0,0,0) 60%, rgba(60,44,38,0.12) 100%)",
          }}
        />

        <p
          className={cn(
            "pointer-events-none absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-gelo/80 px-3.5 py-2 text-xs font-medium text-tinta backdrop-blur transition-opacity duration-700",
            tem3D ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!tem3D}
        >
          <IconeGiro className="size-4" />
          {hero.legendaCena}
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-[1.5rem] bg-areia/60 p-5 sm:flex-row sm:flex-wrap sm:gap-8 lg:w-[9.5rem] lg:flex-col lg:gap-7 lg:bg-transparent lg:p-0">
        <SeletorTecido nome="hero-tecido" valor={tecido} aoMudar={(v) => definir({ tecido: v })} />
        <SeletorCor
          nome="hero-cor"
          valor={cor}
          aoMudar={(v) => definir({ cor: v })}
          legenda="Cor"
          grade="grid grid-cols-8 gap-2 sm:flex sm:flex-wrap lg:grid lg:grid-cols-3"
        />
        <SeletorAcabamento
          nome="hero-acabamento"
          valor={acabamento}
          aoMudar={(v) => definir({ acabamento: v })}
          legenda="Base"
          grade="flex gap-2.5 lg:grid lg:grid-cols-3"
        />
      </div>
    </div>
  );
}
