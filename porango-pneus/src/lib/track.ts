"use client";

export type Evento = "cotar_pneu" | "agendar_servico" | "ligar" | "como_chegar" | "instagram" | "whatsapp_flutuante";

type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Mede cliques de conversão. Vai para o Vercel Analytics (eventos personalizados) e,
 * se NEXT_PUBLIC_GA_ID estiver definido, também para o GA4.
 * O pacote do Vercel Analytics só é baixado no primeiro clique medido.
 */
export function medir(evento: Evento, props: Props = {}) {
  import("@vercel/analytics")
    .then(({ track }) => track(evento, props))
    .catch(() => {
      /* analytics nunca pode quebrar o clique */
    });
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", evento, props);
  }
}
