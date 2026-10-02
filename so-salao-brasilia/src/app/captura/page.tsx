import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Captura } from "./Captura";

/**
 * Rota interna usada por `npm run capture` para gravar pôsteres, renders e o vídeo
 * da própria cena 3D. Desligada em produção, a não ser com ENABLE_CAPTURE=1.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PaginaCaptura() {
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_CAPTURE) notFound();
  return <Captura />;
}
