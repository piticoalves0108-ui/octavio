import { imagemOg, tamanhoOg } from "@/lib/og";

export const alt = "Configurador 3D da Só Salão Brasília";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Imagem() {
  return imagemOg({ sobretitulo: "Configurador 3D", titulo: "Monte a sua peça e peça o orçamento pronto." });
}
