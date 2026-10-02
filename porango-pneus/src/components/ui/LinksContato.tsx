"use client";

import { negocio } from "@/content/site";
import { linkMapa, linkTelefone, linkWhatsApp, telefoneFormatado } from "@/lib/contato";
import { medir } from "@/lib/track";
import { cn } from "@/lib/cn";
import { Texto } from "./Pendente";
import { IconeInstagram, IconePino, IconeTelefone, IconeWhatsApp } from "./Icones";

type P = { className?: string; origem: string };

export function LinkInstagram({ className, origem, children }: P & { children?: React.ReactNode }) {
  return (
    <a
      href={negocio.instagram.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medir("instagram", { origem })}
      className={className}
    >
      <IconeInstagram className="h-5 w-5" />
      {children ?? `@${negocio.instagram.usuario}`}
    </a>
  );
}

export function BotaoComoChegar({ className, origem }: P) {
  return (
    <a
      href={linkMapa()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medir("como_chegar", { origem })}
      className={cn("botao botao-sinal", className)}
    >
      <IconePino className="h-5 w-5" />
      Como chegar
    </a>
  );
}

/** Telefone: com número confirmado vira link tel:; sem número, mostra o marcador. */
export function LinkLigar({ className, origem }: P) {
  const tel = linkTelefone();
  if (!tel) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-faixa/80", className)}>
        <IconeTelefone className="h-5 w-5" />
        <Texto>{negocio.contato.telefone}</Texto>
      </span>
    );
  }
  return (
    <a href={tel.href} onClick={() => medir("ligar", { origem })} className={cn("botao botao-fantasma", className)}>
      <IconeTelefone className="h-5 w-5" />
      {telefoneFormatado(negocio.contato.telefone)}
    </a>
  );
}

export function LinkWhatsTexto({ className, origem }: P) {
  const w = linkWhatsApp();
  return (
    <a
      href={w.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medir("cotar_pneu", { origem })}
      className={cn("botao botao-fantasma", className)}
    >
      {w.pendente ? <IconeInstagram className="h-5 w-5" /> : <IconeWhatsApp className="h-5 w-5" />}
      {w.pendente ? "Direct do Instagram" : "WhatsApp"}
    </a>
  );
}
