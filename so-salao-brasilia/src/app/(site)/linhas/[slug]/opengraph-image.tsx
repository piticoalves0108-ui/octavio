import { linhaPorSlug, linhas } from "@/content/catalogo";
import { imagemOg, tamanhoOg } from "@/lib/og";

export const alt = "Linha de móveis da Só Salão Brasília";
export const size = tamanhoOg;
export const contentType = "image/png";

export function generateStaticParams() {
  return linhas.map((l) => ({ slug: l.slug }));
}

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const linha = linhaPorSlug(slug) ?? linhas[0];
  return imagemOg({
    sobretitulo: "Linhas de produto",
    titulo: linha.titulo,
    imagem: `src/assets/og/${linha.modelo}.png`,
  });
}
