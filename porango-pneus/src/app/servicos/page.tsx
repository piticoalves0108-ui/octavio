import type { Metadata } from "next";
import { mensagens, negocio, servicos } from "@/content/site";
import { BotaoCotar } from "@/components/motion/BotaoCotar";
import { Revelar } from "@/components/motion/Revelar";
import { CabecalhoPagina } from "@/components/sections/CabecalhoPagina";
import { LinkServico } from "@/components/sections/LinkServico";
import { SeloPendente, Texto } from "@/components/ui/Pendente";
import { IconeServico } from "@/components/ui/Icones";
import { jsonLdBreadcrumb } from "@/lib/jsonld";
import { semMarcador, visiveis } from "@/lib/pendente";

const descricao = `Serviços da ${negocio.nome} em ${negocio.cidade} - ${negocio.uf}: venda de pneus pela medida e agendamento pelo WhatsApp.`;

export const metadata: Metadata = {
  title: "Serviços",
  description: descricao,
  alternates: { canonical: "/servicos" },
  openGraph: { title: `Serviços | ${negocio.nome}`, description: descricao, url: "/servicos" },
};

export default function PaginaServicos() {
  const lista = visiveis(servicos);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: lista.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Service", name: s.nome, description: semMarcador(s.resumo), provider: { "@type": "TireShop", name: negocio.nome } },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLdBreadcrumb([{ nome: "Início", caminho: "/" }, { nome: "Serviços", caminho: "/servicos" }]), itemList]),
        }}
      />
      <CabecalhoPagina
        rotulo="Serviços"
        titulo="O que a gente faz"
        apoio="Escolha o serviço e chame no WhatsApp. A mensagem já vai pronta com o que você precisa."
      />

      <section aria-label="Lista de serviços" className="relative z-10 pb-28 md:pb-40">
        <ol className="grade">
          {lista.map((s, i) => (
            <Revelar as="li" key={s.id} className="group col-span-4 border-b border-linha md:col-span-12">
              <article className="grid grid-cols-4 gap-x-4 gap-y-5 py-10 md:grid-cols-12 md:gap-x-6 md:py-14">
                <span className="col-span-1 font-display text-sm font-semibold text-sinal tabular-nums md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-3 md:col-span-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <IconeServico tipo={s.icone} className="icone-gira h-10 w-10 text-sinal" />
                    <SeloPendente confirmado={s.confirmado} />
                  </div>
                  <h2 className="mt-5 text-[clamp(2rem,4vw,3.4rem)]">{s.nome}</h2>
                </div>
                <div className="col-span-4 md:col-span-5">
                  <p className="text-lg text-faixa/90">
                    <Texto>{s.resumo}</Texto>
                  </p>
                  <p className="mt-4 text-cinza">
                    <span className="font-semibold text-faixa/75">Quando procurar: </span>
                    {s.quando}
                  </p>
                </div>
                <div className="relative col-span-4 self-end md:col-span-2 md:justify-self-end">
                  <LinkServico mensagem={s.id === "venda" ? mensagens.padrao : mensagens.servico(s.nome)} servico={s.id}>
                    {s.id === "venda" ? "Cotar" : "Agendar"}
                  </LinkServico>
                </div>
              </article>
            </Revelar>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titulo-cta" className="secao-solida relative z-10 border-t border-linha py-24 md:py-36">
        <div className="grade gap-y-10">
          <h2 id="titulo-cta" className="col-span-4 text-[clamp(2.4rem,6vw,5.6rem)] md:col-span-8">
            Não achou o que precisa?
          </h2>
          <div className="col-span-4 flex flex-col gap-6 md:col-span-4 md:items-end md:self-end">
            <p className="text-lg text-cinza md:text-right">Mande a medida do seu pneu ou uma foto pelo WhatsApp.</p>
            <BotaoCotar origem="pagina_servicos" />
          </div>
        </div>
      </section>
    </>
  );
}
