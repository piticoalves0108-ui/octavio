import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// gerado no build (também no export estático da edição HTML)
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/servicos`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/guia-do-pneu`, lastModified: agora, changeFrequency: "yearly", priority: 0.6 },
  ];
}
