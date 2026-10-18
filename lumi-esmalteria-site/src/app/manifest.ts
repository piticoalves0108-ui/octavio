import type { MetadataRoute } from "next";
import { brand } from "@/data/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} · ${brand.tagline}`,
    short_name: brand.short,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#8B2942",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
