import { imagemOg, tamanhoOg } from "@/lib/og";

export const alt = "Showroom da Só Salão Brasília na QI 19, Taguatinga Norte";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Imagem() {
  return imagemOg({
    sobretitulo: "Showroom na QI 19",
    titulo: "Veja, toque e sente antes de decidir.",
    imagem: "src/assets/og/salao.png",
  });
}
