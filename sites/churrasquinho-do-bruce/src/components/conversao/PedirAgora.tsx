"use client";

import { useState } from "react";
import { IconeSacola, IconeSeta, IconeTelefone, IconeWhatsApp } from "@/components/Icones";
import { Magnetico } from "@/components/motion/Magnetico";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { negocio } from "@/content/negocio";
import { registrar } from "@/lib/analytics";
import { linkComoChegar, linkIfood, linkTelefone, linkWhatsApp } from "@/lib/links";
import { cn } from "@/lib/utils";
import { LinkRastreado } from "./LinkRastreado";
import { StatusHorario } from "./StatusHorario";

/**
 * Conversão principal: botão "Pedir agora" magnético, com pulso de brasa a
 * cada 6 s, que abre um dialog com os três jeitos de pedir.
 */
export function PedirAgora({ origem, className, compacto = false }: { origem: string; className?: string; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);

  const opcoes = [
    { href: linkWhatsApp, evento: "pedir_whatsapp" as const, icone: IconeWhatsApp, titulo: "WhatsApp", texto: "Mensagem pronta, é só mandar.", destaque: true },
    { href: linkIfood, evento: "pedir_ifood" as const, icone: IconeSacola, titulo: "iFood", texto: "Delivery pelo iFood.", destaque: false },
    { href: linkTelefone, evento: "ligar" as const, icone: IconeTelefone, titulo: "Ligar", texto: negocio.whatsapp.exibicao, destaque: false, externo: false },
  ];

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) registrar("abrir_pedir_agora", origem);
      }}
    >
      <Magnetico className={className}>
        <DialogTrigger className={cn("botao botao-brasa pulso-brasa", compacto && "min-h-11 px-4 text-[0.9375rem]")}>
          Pedir agora
        </DialogTrigger>
      </Magnetico>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="titulo-md">Como você quer pedir?</DialogTitle>
          <DialogDescription>Escolhe o jeito mais fácil. A brasa já tá acesa.</DialogDescription>
        </DialogHeader>
        <ul className="mt-6 flex flex-col gap-3">
          {opcoes.map(({ href, evento, icone: Icone, titulo, texto, destaque, externo }) => (
            <li key={titulo}>
              <LinkRastreado
                href={href}
                evento={evento}
                origem={`dialog-${origem}`}
                externo={externo ?? true}
                className={cn(
                  "group flex min-h-16 items-center gap-4 rounded-2xl border px-4 py-3 transition-colors",
                  destaque ? "border-brasa bg-brasa text-carvao hover:bg-ambar hover:border-ambar" : "border-carvao-3 hover:border-ambar",
                )}
              >
                <Icone className="size-6 shrink-0" />
                <span className="flex flex-col">
                  <span className="text-lg font-semibold leading-tight">{titulo}</span>
                  <span className={cn("text-sm", destaque ? "text-carvao/80" : "text-fumaca")}>{texto}</span>
                </span>
                <IconeSeta className="ml-auto size-5 transition-transform group-hover:translate-x-1" />
              </LinkRastreado>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 border-t border-carvao-3 pt-5 text-sm text-fumaca">
          <StatusHorario className="text-osso" />
          <p>
            Ou vem comer aqui: {negocio.endereco.linha}, {negocio.endereco.referencia.replace(/^E/, "e")}.{" "}
            <LinkRastreado href={linkComoChegar} evento="como_chegar" origem={`dialog-${origem}`} className="font-semibold text-ambar underline underline-offset-4">
              Como chegar
            </LinkRastreado>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
