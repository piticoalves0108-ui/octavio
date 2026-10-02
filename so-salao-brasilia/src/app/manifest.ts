import type { MetadataRoute } from "next";
import { negocio } from "@/content/negocio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: negocio.nome,
    short_name: "Só Salão",
    description: negocio.descricaoCurta,
    start_url: "/",
    display: "browser",
    background_color: "#f7f5f3",
    theme_color: "#f7f5f3",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
