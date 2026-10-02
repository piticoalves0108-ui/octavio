"use client";

import { useEffect, useState } from "react";
import { IconeWhatsApp } from "@/components/Icones";
import { linkWhatsApp } from "@/lib/links";
import { cn } from "@/lib/utils";
import { LinkRastreado } from "./LinkRastreado";

/** Botão flutuante de WhatsApp com a mensagem pronta. Aparece depois do hero. */
export function WhatsAppFlutuante() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let quadro = 0;
    const checar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setVisivel(window.scrollY > window.innerHeight * 0.7));
    };
    checar();
    window.addEventListener("scroll", checar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", checar);
    };
  }, []);

  return (
    <LinkRastreado
      href={linkWhatsApp}
      evento="pedir_whatsapp"
      origem="flutuante"
      aria-label="Pedir no WhatsApp"
      tabIndex={visivel ? 0 : -1}
      aria-hidden={!visivel}
      className={cn(
        "group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-0 overflow-hidden rounded-full bg-brasa pl-4 pr-4 text-carvao shadow-[0_12px_40px_-8px_rgba(255,90,31,0.7)] transition-all duration-500 ease-[var(--ease-brasa)] md:right-6",
        "hover:gap-2.5 hover:bg-ambar focus-visible:gap-2.5",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <IconeWhatsApp className="size-6 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap font-semibold transition-[max-width] duration-500 group-hover:max-w-40 group-focus-visible:max-w-40">
        Pedir no WhatsApp
      </span>
    </LinkRastreado>
  );
}
