"use client";

import { IconeSeta } from "@/components/ui/Icones";
import { linkWhatsApp } from "@/lib/contato";
import { medir } from "@/lib/track";

export function LinkServico({ mensagem, servico, children }: { mensagem: string; servico: string; children: React.ReactNode }) {
  const link = linkWhatsApp(mensagem);
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medir(servico === "venda" ? "cotar_pneu" : "agendar_servico", { origem: "card_servico", servico })}
      className="inline-flex items-center gap-2 font-display text-sm font-bold tracking-[0.12em] uppercase after:absolute after:inset-0 after:rounded-[24px] after:content-[''] hover:text-sinal"
    >
      {children}
      <IconeSeta className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}
