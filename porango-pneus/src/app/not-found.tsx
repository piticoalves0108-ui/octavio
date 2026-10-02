import type { Metadata } from "next";
import { BotaoCotar } from "@/components/motion/BotaoCotar";
import { LinkTransicao } from "@/components/motion/Transicao";
import { IconeSeta } from "@/components/ui/Icones";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false },
};

export default function NaoEncontrada() {
  return (
    <section className="relative z-10 flex min-h-[100svh] items-center pt-24">
      <div className="grade gap-y-10">
        <div className="col-span-4 md:col-span-9">
          <p className="rotulo mb-5">
            <b>404</b> Página não encontrada
          </p>
          <h1 className="text-[clamp(3.4rem,11vw,10rem)] leading-[0.86]">
            Pneu furado<span className="text-sinal">.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-faixa/85">Essa página não existe ou mudou de lugar. Volte para o início ou cote seu pneu direto.</p>
        </div>
        <div className="col-span-4 flex flex-wrap gap-4 md:col-span-12">
          <BotaoCotar origem="404" />
          <LinkTransicao href="/" rotulo="Início" className="botao botao-fantasma">
            Voltar ao início
            <IconeSeta className="h-4 w-4" />
          </LinkTransicao>
        </div>
      </div>
    </section>
  );
}
