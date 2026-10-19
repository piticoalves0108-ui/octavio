import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/data/brand";
import { hasPublicUrl, pageMetadata } from "@/lib/seo";
import { getPost, posts } from "@/data/posts";
import { ArticleBody, ArticleHeader, PaletteStrip, RelatedPosts } from "@/sections/tendencias/ArticleSections";
import { TrendsCTA } from "@/sections/tendencias/TrendsCTA";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artigo não encontrado" };
  return pageMetadata(parent, { title: post.title, description: post.excerpt, path: `/tendencias/${post.slug}`, article: { section: post.category } });
}

/** Artigo de tendências: capa da paleta, texto em medida de leitura, paleta, relacionados e CTA. */
export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${brand.siteUrl}/tendencias/${post.slug}`;
  const minutes = parseInt(post.readingTime, 10);
  // Como no layout: urls só com domínio público, nunca o localhost da prévia
  const org = { "@type": "Organization", name: brand.name, ...(hasPublicUrl ? { url: brand.siteUrl } : {}) };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    inLanguage: "pt-BR",
    ...(Number.isFinite(minutes) ? { timeRequired: `PT${minutes}M` } : {}),
    ...(hasPublicUrl ? { url, mainEntityOfPage: { "@type": "WebPage", "@id": url } } : {}),
    author: org,
    publisher: org,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ArticleHeader post={post} />
      <ArticleBody post={post} />
      <PaletteStrip post={post} />
      <RelatedPosts post={post} />
      <TrendsCTA
        id="cta-artigo"
        title="Leve a tendência"
        accent="para as suas mãos."
        text="Escolha o dia e o horário que combinam com você. Os detalhes do desenho e os valores a gente acerta com carinho pelo WhatsApp."
        message={`Olá, Lumi! Li o post "${post.title}" e quero agendar. Tem horário?`}
      />
    </>
  );
}
