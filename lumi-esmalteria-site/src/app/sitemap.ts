import type { MetadataRoute } from "next";
import { brand } from "@/data/brand";
import { posts } from "@/data/posts";
import { contentUpdatedAt } from "@/lib/seo";

/** Todas as rotas públicas do site (os artigos entram a partir de posts) */
const routes = ["", "/servicos", "/agendamento", "/galeria", "/cores", "/sobre", "/tendencias", "/clube", "/contato"];

export default function sitemap(): MetadataRoute.Sitemap {
  // Data fixa da última revisão de conteúdo, e não a hora de cada requisição
  const lastModified = contentUpdatedAt;
  const pages = routes.map((p) => ({
    url: `${brand.siteUrl}${p}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : p === "/agendamento" || p === "/servicos" ? 0.9 : 0.7,
  }));
  const articles = posts.map((p) => ({ url: `${brand.siteUrl}/tendencias/${p.slug}`, lastModified, changeFrequency: "yearly" as const, priority: 0.5 }));
  return [...pages, ...articles];
}
