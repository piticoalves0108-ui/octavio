import { track } from "@vercel/analytics";

/**
 * Eventos de conversão medidos no site. Aparecem em Vercel → Analytics → Events
 * (eventos personalizados exigem o plano Pro) e, se NEXT_PUBLIC_GA_ID estiver
 * definido, também no GA4.
 */
export type EventoConversao =
  | "whatsapp_clique"
  | "telefone_clique"
  | "como_chegar_clique"
  | "instagram_clique"
  | "orcamento_configurador"
  | "orcamento_salao_completo"
  | "configuracao_copiada";

type Propriedades = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function medir(evento: EventoConversao, propriedades: Propriedades = {}) {
  try {
    track(evento, propriedades);
  } catch {
    // Sem Analytics (ex.: ambiente local): ignora.
  }
  try {
    window.gtag?.("event", evento, propriedades);
  } catch {
    // GA4 opcional.
  }
}
