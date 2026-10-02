import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/captura"] }],
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
