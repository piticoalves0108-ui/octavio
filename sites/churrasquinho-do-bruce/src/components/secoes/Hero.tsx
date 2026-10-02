import { BotoesPedido } from "@/components/conversao/BotoesPedido";
import { StatusHorario } from "@/components/conversao/StatusHorario";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { negocio } from "@/content/negocio";
import { DicaInteracao, HeroFundo } from "./HeroFundo";

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="titulo-hero" className="relative z-[1] h-[100svh] min-h-[600px] overflow-hidden">
      <HeroFundo />

      <div className="moldura relative flex h-full flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(var(--altura-header)+1rem)] md:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="rotulo text-osso/85">
            QI 23 · Setor Industrial · {negocio.endereco.bairro}
          </p>
          <StatusHorario />
        </div>

        <div className="mt-auto">
          <div className="grade items-end gap-y-5">
            <div className="col-span-12 md:col-span-7 lg:col-span-6">
              <p className="titulo titulo-md text-ambar">{negocio.slogan}</p>
              <p className="mt-3 max-w-[42ch] text-osso/85">
                {negocio.ramo}. {negocio.horario.resumo}. {negocio.endereco.referencia}.
              </p>
            </div>
            <div className="col-span-12 flex flex-col gap-4 md:col-span-5 md:items-end lg:col-span-6">
              <BotoesPedido origem="hero" className="md:justify-end" />
              <DicaInteracao />
            </div>
          </div>

          <TituloCalor
            como="h1"
            id="titulo-hero"
            gatilho="preloader"
            className="mt-6 text-[15.4vw] text-osso md:mt-8 md:whitespace-nowrap md:text-[8.9vw] min-[1800px]:text-[10.25rem]"
          >
            <span className="block md:inline">Churrasquinho </span>
            <span className="block text-brasa md:inline">do Bruce</span>
          </TituloCalor>
        </div>
      </div>
    </section>
  );
}
