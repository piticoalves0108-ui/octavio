/**
 * URL pública do site. Ordem: NEXT_PUBLIC_SITE_URL > domínio de produção da
 * Vercel > localhost.
 * {{CONFIRMAR: domínio próprio do site (ex.: o que o Bruce registrar no Registro.br)}}
 */
function resolverUrl() {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicita) return explicita.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolverUrl();
