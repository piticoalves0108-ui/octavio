"use client";

import { track } from "@vercel/analytics";

/**
 * Eventos de conversão. Vão para a Vercel Web Analytics (eventos
 * personalizados exigem plano Pro) e, se NEXT_PUBLIC_GA_ID existir, para o GA4.
 */
export type EventoConversao =
  | "pedir_whatsapp"
  | "pedir_ifood"
  | "ligar"
  | "como_chegar"
  | "instagram"
  | "abrir_pedir_agora"
  | "reserva_grupo";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function registrar(evento: EventoConversao, origem: string) {
  try {
    track(evento, { origem });
    window.gtag?.("event", evento, { origem });
  } catch {
    // Analytics nunca pode quebrar um clique de pedido.
  }
}
