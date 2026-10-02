import { gerarOg, tamanhoOg } from "@/lib/og";

// gerado no build (também no export estático da edição HTML)
export const dynamic = "force-static";

export const alt = "Porango Pneus: pneu certo, preço justo. Loja de pneus em Brasília - DF.";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Image() {
  return gerarOg("Pneu certo, preço justo.", "Mande a medida pelo WhatsApp e receba a cotação. Brasília - DF.");
}
