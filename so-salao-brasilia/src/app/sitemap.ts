import type { MetadataRoute } from "next";
import { linhas } from "@/content/catalogo";
import { urlAbsoluta } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: urlAbsoluta("/"), lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: urlAbsoluta("/configurador"), lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
    { url: urlAbsoluta("/showroom"), lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    ...linhas.map((l) => ({
      url: urlAbsoluta(`/linhas/${l.slug}`),
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
