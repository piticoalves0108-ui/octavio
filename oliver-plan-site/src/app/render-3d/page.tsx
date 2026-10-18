import { notFound } from "next/navigation";
import { RenderStillLoader } from "./RenderStillLoader";

export const metadata = { robots: { index: false, follow: false } };

/** Rota de desenvolvimento para gerar os renders estáticos (desativada em produção). */
export default async function RenderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id = "cozinha-jacaranda" } = await searchParams;
  return <RenderStillLoader id={id} />;
}
