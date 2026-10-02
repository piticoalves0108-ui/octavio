import type { Metadata } from "next";
import { BotoesPedido } from "@/components/conversao/BotoesPedido";
import { StatusHorario } from "@/components/conversao/StatusHorario";
import { Revelar } from "@/components/motion/Revelar";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { AvisoPreco, CategoriaCartoes } from "@/components/secoes/CategoriaCartoes";
import { cardapio } from "@/content/cardapio";
import { negocio } from "@/content/negocio";

const TITULO = "Cardápio: espetinhos, hambúrgueres, almoço e bebidas";
const DESCRICAO = `Cardápio do ${negocio.nome}, na QI 23 de Taguatinga Norte: espetinho de carne, frango, linguiça e queijo coalho, hambúrguer, almoço e bebidas. Peça pelo WhatsApp ou pelo iFood.`;

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/cardapio" },
  openGraph: { title: `${TITULO} | ${negocio.nome}`, description: DESCRICAO, url: "/cardapio" },
  twitter: { title: `${TITULO} | ${negocio.nome}`, description: DESCRICAO },
};

export default function PaginaCardapio() {
  return (
    <div className="relative z-[1] pb-24 pt-[calc(var(--altura-header)+4rem)] md:pt-[calc(var(--altura-header)+7rem)]">
      <div className="moldura">
        <div className="grade items-end gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <p className="rotulo text-brasa">Cardápio completo</p>
            <TituloCalor como="h1" className="titulo-xl mt-4 text-osso">
              Cardápio
            </TituloCalor>
          </div>
          <div className="col-span-12 flex flex-col gap-5 lg:col-span-5">
            <StatusHorario />
            <p className="text-lg text-osso/85">
              {negocio.ramo}. {negocio.horario.resumo}. {negocio.delivery}.
            </p>
            <BotoesPedido origem="pagina-cardapio" />
          </div>
        </div>

        <nav aria-label="Categorias" className="mt-14">
          <ul className="flex flex-wrap gap-2">
            {cardapio.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="inline-flex min-h-11 items-center rounded-full border border-carvao-3 px-4 font-normal transition-colors hover:border-ambar hover:text-ambar">
                  {c.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-16 flex flex-col gap-24">
          {cardapio.map((cat, i) => (
            <section key={cat.id} id={cat.id} aria-labelledby={`cat-${cat.id}`} className="scroll-mt-28">
              <Revelar className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-carvao-3 pb-6">
                <div>
                  <p className="rotulo text-brasa">0{i + 1}</p>
                  <h2 id={`cat-${cat.id}`} className="titulo titulo-md mt-2 text-osso">
                    {cat.titulo}
                  </h2>
                  <p className="mt-2 text-osso/85">{cat.chamada}</p>
                </div>
                <AvisoPreco categoria={cat} />
              </Revelar>
              <CategoriaCartoes categoria={cat} origem={`pagina-cardapio-${cat.id}`} nivelItem="h3" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
