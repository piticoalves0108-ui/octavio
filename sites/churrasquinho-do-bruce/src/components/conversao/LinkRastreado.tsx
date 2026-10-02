"use client";

import type { ComponentProps } from "react";
import { registrar, type EventoConversao } from "@/lib/analytics";

/** Link de conversão (WhatsApp, iFood, telefone, Maps, Instagram) que registra o clique. */
export function LinkRastreado({
  evento,
  origem,
  externo = true,
  onClick,
  ...props
}: ComponentProps<"a"> & { evento: EventoConversao; origem: string; externo?: boolean }) {
  return (
    <a
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
      onClick={(e) => {
        registrar(evento, origem);
        onClick?.(e);
      }}
    />
  );
}
