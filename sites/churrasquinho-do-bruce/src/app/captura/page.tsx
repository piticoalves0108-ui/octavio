import { notFound } from "next/navigation";
import { Captura } from "./Captura";

/**
 * Página técnica usada por `npm run captura` (scripts/captura.mjs) para gerar,
 * a partir da própria cena 3D, o pôster AVIF do hero, as miniaturas sem WebGL,
 * o vídeo de fallback e as imagens de Open Graph. Não existe em produção.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function PaginaCaptura({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" && process.env.CAPTURA !== "1") notFound();
  const params = await searchParams;
  return <Captura modo={params.modo ?? "hero"} peca={params.peca} og={params.og} />;
}
