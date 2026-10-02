import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cardapio`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
  ];
}
