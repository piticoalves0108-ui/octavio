/**
 * URL pública do site. Defina NEXT_PUBLIC_SITE_URL na Vercel com o domínio próprio.
 * Sem ela, usa o domínio de produção da Vercel e, em último caso, o localhost.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export function urlAbsoluta(caminho = "/") {
  return `${siteUrl}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}
