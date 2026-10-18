import type { MetadataRoute } from "next";
import { brand, isLiveSite } from "@/data/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    // Enquanto o domínio real não estiver configurado, a prévia fica fora dos buscadores
    rules: isLiveSite ? [{ userAgent: "*", allow: "/" }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${brand.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
