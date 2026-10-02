import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { acabamentos, avisoCores, cores, linhaPorSlug, linhas, tecidos } from "@/content/catalogo";
import { negocio } from "@/content/negocio";
import { linkWhatsapp, mensagemDaLinha } from "@/lib/whatsapp";
import { schemaProduto, schemaTrilha } from "@/lib/schema";
import { semPendencias } from "@/lib/confirmar";
import { classesBotao } from "@/components/ui/botao";
import { IconeSeta, IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Magnetico } from "@/components/ui/Magnetico";
import { Texto } from "@/components/ui/Texto";
import { FotoReservada } from "@/components/ui/FotoReservada";
import { JsonLd } from "@/components/layout/JsonLd";
import { LinkTransicao } from "@/components/layout/Transicao";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return linhas.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const linha = linhaPorSlug(slug);
  if (!linha) return {};
  const descricao = `${semPendencias(linha.resumo)} Fábrica própria em Taguatinga Norte - DF, entrega em até 7 dias úteis e até 12x sem juros no cartão.`;
  return {
    title: linha.titulo,
    description: descricao,
    alternates: { canonical: `/linhas/${linha.slug}` },
    openGraph: {
      title: `${linha.titulo} | ${negocio.nome}`,
      description: descricao,
      url: `/linhas/${linha.slug}`,
    },
  };
}

export default async function PaginaLinha({ params }: Params) {
  const { slug } = await params;
  const linha = linhaPorSlug(slug);
  if (!linha) notFound();
  const outras = linhas.filter((l) => l.slug !== linha.slug);

  return (
    <>
      <section className="pt-28 pb-20 md:pt-36" aria-labelledby="titulo-linha">
        <div className="grade gap-y-12">
          <div className="col-span-12 lg:col-span-5 lg:pt-8">
            <nav aria-label="Trilha" className="text-sm text-tinta-suave">
              <ol className="flex flex-wrap gap-2">
                <li>
                  <LinkTransicao href="/" className="underline decoration-grafite/30 underline-offset-4">
                    Início
                  </LinkTransicao>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <LinkTransicao href="/#linhas" className="underline decoration-grafite/30 underline-offset-4">
                    Linhas
                  </LinkTransicao>
                </li>
                <li aria-hidden>/</li>
                <li aria-current="page">{linha.nome}</li>
              </ol>
            </nav>
            <h1 id="titulo-linha" className="mt-8 text-[clamp(2.7rem,5.4vw,5rem)] leading-[0.98]">
              {linha.titulo}
            </h1>
            {linha.descricao.map((p) => (
              <p key={p} className="mt-6 texto-grande text-tinta-suave">
                {p}
              </p>
            ))}
            <div className="mt-10 flex flex-wrap gap-3">
              <Magnetico>
                <LinkTransicao href={`/configurador?modelo=${linha.modelo}`} className={classesBotao("primario")}>
                  Configurar em 3D
                  <span className="grid size-7 place-items-center rounded-full bg-rose text-grafite">
                    <IconeSeta className="size-4" />
                  </span>
                </LinkTransicao>
              </Magnetico>
              <LinkRastreado
                href={linkWhatsapp(mensagemDaLinha(linha.modelo))}
                evento="whatsapp_clique"
                origem={`linha-${linha.slug}`}
                externo
                className={classesBotao("secundario")}
              >
                <IconeWhatsapp className="size-4" />
                Pedir orçamento
              </LinkRastreado>
            </div>
          </div>
          <div className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {(["frente", "perfil"] as const).map((lado, i) => (
              <figure key={lado} className={i === 1 ? "sm:mt-24" : ""}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-[#ece5df]">
                  <Image
                    src={linha.imagens[lado]}
                    alt={`${linha.nomeDoModelo} ${lado === "frente" ? "de frente" : "de perfil"} (imagem ilustrativa gerada da cena 3D).`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 46vw, 92vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-tinta-suave">
                  Render ilustrativo. {linha.fotoIdeal[lado]}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="secao bg-areia" aria-labelledby="titulo-escolhas">
        <div className="grade gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <h2 id="titulo-escolhas" className="titulo-secao">
              O que você escolhe
            </h2>
          </div>
          <dl className="col-span-12 grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            <div>
              <dt className="sobretitulo text-champanhe-texto">Estofado</dt>
              <dd className="mt-3">
                {tecidos.map((t) => t.nome).join(" ou ")}, em {linha.ondeVaiOEstofado}.
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Cores de referência">
                  {cores.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-full bg-gelo px-3 py-1.5 text-sm">
                      <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: c.hex }} />
                      {c.nome}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-tinta-suave">
                  <Texto>{avisoCores}</Texto>
                </p>
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Acabamento</dt>
              <dd className="mt-3">
                {acabamentos.map((a) => a.nome).join(", ")}, em {linha.ondeVaiOAcabamento}.
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Medidas</dt>
              <dd className="mt-3">
                <Texto>{linha.medidas}</Texto>
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Modelos</dt>
              <dd className="mt-3">
                <Texto>{linha.modelosDisponiveis}</Texto>
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Prazo e pagamento</dt>
              <dd className="mt-3">
                Produção sob encomenda, entrega em até 7 dias úteis. Até 12x sem juros no cartão.
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Onde ver</dt>
              <dd className="mt-3">
                No showroom da fábrica: {negocio.endereco.completo}.{" "}
                <LinkTransicao href="/showroom" className="underline decoration-grafite/30 underline-offset-4">
                  Como visitar
                </LinkTransicao>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="secao" aria-labelledby="titulo-foto-real">
        <div className="grade gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <h2 id="titulo-foto-real" className="titulo-secao">
              No salão de quem já comprou
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <FotoReservada
              proporcao="3/2"
              fotoIdeal={`Foto ideal: ${linha.nome.toLowerCase()} da Só Salão instalados no salão de uma cliente, com luz natural.`}
              marcador="{{CONFIRMAR: foto de cliente com esta linha e autorização de uso}}"
            />
          </div>
        </div>
      </section>

      <nav aria-labelledby="titulo-outras" className="secao border-t border-grafite/10">
        <div className="conteiner">
          <h2 id="titulo-outras" className="titulo-secao">
            Outras linhas
          </h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {outras.map((l) => (
              <li key={l.slug}>
                <LinkTransicao href={`/linhas/${l.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[#ece5df]">
                    <Image
                      src={l.imagens.frente}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-saida)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <span className="mt-4 flex items-center justify-between font-serif text-[1.7rem]">
                    {l.nome}
                    <IconeSeta className="size-5 transition-transform duration-500 group-hover:translate-x-1" />
                  </span>
                </LinkTransicao>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <JsonLd dados={schemaProduto(linha)} />
      <JsonLd
        dados={schemaTrilha([
          { nome: "Início", caminho: "/" },
          { nome: "Linhas", caminho: "/#linhas" },
          { nome: linha.nome, caminho: `/linhas/${linha.slug}` },
        ])}
      />
    </>
  );
}
