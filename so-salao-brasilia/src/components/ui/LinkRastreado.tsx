"use client";

import type { AnchorHTMLAttributes } from "react";
import { medir, type EventoConversao } from "@/lib/analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  evento: EventoConversao;
  origem: string;
  /** Abre em nova aba (WhatsApp, Instagram, Maps). */
  externo?: boolean;
};

/** Link de conversão (WhatsApp, telefone, Maps, Instagram) que mede o clique. */
export function LinkRastreado({ evento, origem, externo = false, onClick, children, ...props }: Props) {
  return (
    <a
      {...props}
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={(e) => {
        medir(evento, { origem });
        onClick?.(e);
      }}
    >
      {children}
      {externo && <span className="sr-only"> (abre em nova aba)</span>}
    </a>
  );
}
