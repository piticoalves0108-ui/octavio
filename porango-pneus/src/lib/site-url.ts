/**
 * URL pública do site. Defina NEXT_PUBLIC_SITE_URL com o domínio próprio.
 * {{CONFIRMAR: domínio próprio do site}}
 * Na Vercel, sem a variável, usa o domínio de produção do projeto.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
