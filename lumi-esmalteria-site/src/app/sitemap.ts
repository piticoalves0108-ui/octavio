import type { MetadataRoute } from "next";
import { brand } from "@/data/brand";
import { posts } from "@/data/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const pages = ["", "/servicos", "/agendamento", "/galeria", "/cores", "/sobre", "/tendencias", "/clube", "/contato"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : p === "/agendamento" || p === "/servicos" ? 0.9 : 0.7,
  }));
  const articles = posts.map((p) => ({ url: `${base}/tendencias/${p.slug}`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.5 }));
  return [...pages, ...articles];
}
