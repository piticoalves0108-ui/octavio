import type { MetadataRoute } from "next";
import { negocio } from "@/content/negocio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: negocio.nome,
    short_name: "Bruce",
    description: `${negocio.ramo} em Taguatinga Norte - DF`,
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#121212",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icone-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icone-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
