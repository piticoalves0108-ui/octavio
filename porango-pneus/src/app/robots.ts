import type { MetadataRoute } from "next";
import { MODO_PREVIA } from "@/lib/pendente";
import { SITE_URL } from "@/lib/site-url";

// gerado no build (também no export estático da edição HTML)
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: MODO_PREVIA ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
