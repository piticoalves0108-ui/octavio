import { imagemOg, tamanhoOg } from "@/lib/og";

export const alt = "Só Salão Brasília: fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Imagem() {
  return imagemOg({
    sobretitulo: "Fábrica própria · Taguatinga Norte, DF",
    titulo: "Móveis para salão e esmalteria, direto da fábrica.",
  });
}
