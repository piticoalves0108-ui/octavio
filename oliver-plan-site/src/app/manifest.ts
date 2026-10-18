import type { MetadataRoute } from "next";
import { brand } from "@/data/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} · ${brand.descriptor}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F4EFE9",
    theme_color: "#2B2B2B",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
