import { hero } from "@/content/textos";
import { negocio } from "@/content/site";
import { BotaoCotar } from "@/components/motion/BotaoCotar";
import { LinkTransicao } from "@/components/motion/Transicao";
import { TituloEntrada } from "@/components/motion/TituloEntrada";
import { Texto } from "@/components/ui/Pendente";
import { IconeInstagram, IconeSeta } from "@/components/ui/Icones";
import { InteracaoHero } from "./InteracaoHero";

/** 1. HERO: o pneu 3D é o protagonista; o texto fica à esquerda (embaixo/em cima no celular). */
export function Hero() {
  return (
    <section data-ato="hero" id="inicio" aria-labelledby="titulo-hero" className="relative z-10 h-[100svh] min-h-[600px]">
      <InteracaoHero />
      {/* celular: véu atrás do texto de baixo, para ler mesmo com o pneu atrás */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-asfalto/90 via-asfalto/55 to-transparent md:hidden"
      />
      <div className="grade pointer-events-none relative h-full grid-rows-[1fr_auto] pt-24 pb-8 md:grid-rows-[auto_auto] md:content-center md:pt-20 md:pb-24">
        <div className="pointer-events-auto col-span-4 self-start md:col-span-7 md:self-center">
          <p className="rotulo mb-5 md:mb-7">
            <b aria-hidden="true">●</b> {hero.eyebrow}
          </p>
          <TituloEntrada
            id="titulo-hero"
            className="text-[clamp(3rem,7.4vw,8.4rem)] leading-[0.88]"
            linhas={[{ texto: hero.titulo[0] }, { texto: hero.titulo[1], className: "text-sinal" }]}
          />
          <div className="mt-6 hidden md:block">
            <p className="max-w-md text-lg text-faixa/85">{hero.apoio}</p>
            <p className="mt-3 max-w-md text-sm text-cinza">
              <Texto>{hero.complemento}</Texto>
            </p>
          </div>
        </div>

        <div className="pointer-events-auto col-span-4 self-end md:col-span-7 md:mt-10 md:self-auto">
          <p className="mb-5 max-w-sm text-base text-faixa/85 md:hidden">{hero.apoio}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <BotaoCotar origem="hero" />
            <LinkTransicao href="/#servicos" className="botao botao-fantasma">
              Ver serviços
              <IconeSeta className="h-4 w-4" />
            </LinkTransicao>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden md:block">
        <div className="grade items-end">
          <a
            href={negocio.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto col-span-3 inline-flex items-center gap-2 text-sm text-faixa/75 hover:text-sinal"
          >
            <IconeInstagram className="h-4 w-4" />@{negocio.instagram.usuario}
          </a>
          <p className="col-span-4 col-start-9 flex items-center justify-end gap-3 text-right font-display text-xs font-semibold tracking-[0.2em] text-cinza uppercase">
            Role para ler a medida
            <span className="relative block h-10 w-px overflow-hidden bg-faixa/15" aria-hidden="true">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[descer_1.8s_var(--ease-pneu)_infinite] bg-sinal" />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
