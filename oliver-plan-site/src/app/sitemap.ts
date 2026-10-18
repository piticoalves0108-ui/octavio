import type { MetadataRoute } from "next";
import { brand } from "@/data/brand";
import { projects } from "@/data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const pages = ["", "/ambientes", "/portfolio", "/processo", "/sobre", "/showroom", "/contato"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : p === "/contato" ? 0.9 : 0.8,
  }));
  const items = projects.map((p) => ({
    url: `${base}/projetos/${p.slug}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.6,
    images: [p.cover],
  }));
  return [...pages, ...items];
}
