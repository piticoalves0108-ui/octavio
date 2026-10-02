import { gerarOg, tamanhoOg } from "@/lib/og";

// gerado no build (também no export estático da edição HTML)
export const dynamic = "force-static";

export const alt = "Guia do pneu: como ler a medida, TWI, calibragem e rodízio";
export const size = tamanhoOg;
export const contentType = "image/png";

export default function Image() {
  return gerarOg("Guia do pneu", "Como ler 175/70 R14 84T, TWI, calibragem e rodízio.");
}
