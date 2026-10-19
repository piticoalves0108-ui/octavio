import type { Metadata, ResolvingMetadata } from "next";
import { brand } from "@/data/brand";

/** Título da home (e de compartilhamento das páginas que não definem o próprio) */
export const siteTitle = `${brand.name} · Nail design, spa dos pés e esmaltação em gel em Brasília`;

/** Última revisão do conteúdo, usada como lastModified no sitemap: atualize ao publicar mudanças de texto */
export const contentUpdatedAt = "2026-10-19";

/** Há um endereço público (domínio próprio ou da Vercel), e não só o localhost de desenvolvimento */
export const hasPublicUrl = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(brand.siteUrl);

type PageSeo = {
  /** Título curto; o template do layout completa com "· Lumi Esmalteria". Sem ele, vale o título da home. */
  title?: string;
  description?: string;
  /** Caminho da rota: vira o canonical e o og:url */
  path: string;
  /** Artigos saem com og:type "article" e a editoria */
  article?: { section?: string };
};

/**
 * Metadados de uma página: título, descrição, canonical, Open Graph e Twitter.
 * openGraph/twitter da página substituem os do layout por inteiro, e a imagem do opengraph-image
 * só entra no segmento onde o arquivo está, então a imagem de compartilhamento vem do pai.
 */
export async function pageMetadata(parent: ResolvingMetadata, { title, description = brand.description, path, article }: PageSeo): Promise<Metadata> {
  const { openGraph, twitter } = await parent;
  const shareTitle = title ? `${title} · ${brand.name}` : siteTitle;
  const og = { locale: "pt_BR", siteName: brand.name, title: shareTitle, description, url: path, images: openGraph?.images };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: article ? { ...og, type: "article", section: article.section } : { ...og, type: "website" },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: twitter?.images },
  };
}
