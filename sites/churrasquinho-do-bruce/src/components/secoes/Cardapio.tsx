import { IconeSeta } from "@/components/Icones";
import { LinkTransicao } from "@/components/motion/Transicao";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { cardapio } from "@/content/cardapio";
import { AlmocoBebidas } from "./AlmocoBebidas";
import { CardapioIntro } from "./CardapioIntro";
import { Espetinhos } from "./Espetinhos";
import { Hamburguer } from "./Hamburguer";

/** Seção 2: cardápio por categoria (espetinhos, hambúrgueres, almoço, bebidas). */
export function Cardapio() {
  return (
    <section id="cardapio" aria-labelledby="titulo-cardapio" className="relative z-[1]">
      <CardapioIntro>
        <div className="moldura grade gap-y-8 pb-10 pt-32 md:pt-44">
          <p className="rotulo col-span-12 text-brasa">Cardápio</p>
          <TituloCalor id="titulo-cardapio" className="titulo-lg col-span-12 text-osso md:col-span-7">
            O que sai
            <span className="block text-ambar">da brasa</span>
          </TituloCalor>
          <div className="col-span-12 flex flex-col gap-6 md:col-span-5 md:self-end lg:col-span-4 lg:col-start-9">
            <p className="text-lg text-osso/85">Espetinho, hambúrguer, almoço e bebida. Pede pelo WhatsApp, pelo iFood ou vem comer aqui.</p>
            <nav aria-label="Categorias do cardápio">
              <ul className="flex flex-wrap gap-2">
                {cardapio.map((c) => (
                  <li key={c.id}>
                    <LinkTransicao
                      href={`/#${c.id}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-carvao-3 bg-carvao/60 px-4 text-[0.9375rem] font-medium backdrop-blur transition-colors hover:border-ambar hover:text-ambar"
                    >
                      {c.titulo}
                    </LinkTransicao>
                  </li>
                ))}
              </ul>
            </nav>
            <LinkTransicao href="/cardapio" className="group inline-flex min-h-11 items-center gap-2 font-semibold text-ambar">
              Ver o cardápio completo
              <IconeSeta className="size-5 transition-transform group-hover:translate-x-1" />
            </LinkTransicao>
          </div>
        </div>
      </CardapioIntro>
      <Espetinhos />
      <Hamburguer />
      <AlmocoBebidas />
    </section>
  );
}
