import { gerarOg, tamanhoOg } from "@/lib/og";

// gerado no build (também no export estático da edição HTML)
export const dynamic = "force-static";

export const alt = "Serviços da Porango Pneus em Brasília - DF";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Image() {
  return gerarOg("Serviços", "Venda de pneus pela medida. Agende pelo WhatsApp.");
}
