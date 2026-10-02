import { gerarOg, tamanhoOg } from "@/lib/og";

export const alt = "Serviços da Porango Pneus em Brasília - DF";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Image() {
  return gerarOg("Serviços", "Venda de pneus pela medida. Agende pelo WhatsApp.");
}
