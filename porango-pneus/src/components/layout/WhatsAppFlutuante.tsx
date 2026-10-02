"use client";

import { useEffect, useState } from "react";
import { IconeWhatsApp } from "@/components/ui/Icones";
import { linkWhatsApp } from "@/lib/contato";
import { MODO_PREVIA } from "@/lib/pendente";
import { medir } from "@/lib/track";
import { cn } from "@/lib/cn";

/** Botão flutuante de WhatsApp com mensagem pronta. Aparece depois do hero. */
export function WhatsAppFlutuante() {
  const [visivel, setVisivel] = useState(false);
  const link = linkWhatsApp();

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.6);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medir("whatsapp_flutuante", { canal: link.pendente ? "instagram" : "whatsapp" })}
      aria-label="Cotar meu pneu pelo WhatsApp"
      title={MODO_PREVIA && link.pendente ? "WhatsApp a confirmar: por enquanto abre o Direct do Instagram" : undefined}
      className={cn(
        "group fixed right-4 bottom-4 z-40 flex h-14 items-center gap-0 overflow-hidden rounded-full bg-sinal pr-0 pl-4 text-asfalto shadow-[0_10px_40px_-10px_rgba(255,196,0,0.55)] transition-[translate,opacity,gap,padding] duration-500 ease-[var(--ease-pneu)] hover:gap-2 hover:pr-5 md:right-6 md:bottom-6",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      <IconeWhatsApp className="h-6 w-6 shrink-0" />
      <span className="max-w-0 overflow-hidden font-display text-sm font-bold tracking-[0.1em] whitespace-nowrap uppercase transition-[max-width] duration-500 group-hover:max-w-40 group-focus-visible:max-w-40">
        Cotar meu pneu
      </span>
      <span className="w-4 shrink-0 group-hover:w-0" aria-hidden="true" />
    </a>
  );
}
