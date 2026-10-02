import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { linhaPorSlug, linhas } from "@/content/catalogo";
import { negocio } from "@/content/negocio";
import { semPendencias } from "@/lib/confirmar";
import { ConteudoLinha } from "@/components/secoes/ConteudoLinha";

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
  return <ConteudoLinha linha={linha} />;
}
