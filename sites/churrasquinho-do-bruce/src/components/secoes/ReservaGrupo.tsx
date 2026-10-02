"use client";

import { useState, type FormEvent } from "react";
import { IconeWhatsApp } from "@/components/Icones";
import { Input, Label } from "@/components/ui/campo";
import { registrar } from "@/lib/analytics";
import { linkWhatsAppCom } from "@/lib/links";

/**
 * Reserva para grupos: monta a mensagem e abre o WhatsApp.
 * Só aparece se negocio.aceitaReservaGrupos for true (ainda a confirmar).
 */
export default function ReservaGrupo() {
  const [dados, setDados] = useState({ nome: "", pessoas: "", dia: "", hora: "" });
  const mudar = (campo: keyof typeof dados) => (e: React.ChangeEvent<HTMLInputElement>) => setDados({ ...dados, [campo]: e.target.value });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const [ano, mes, dia] = dados.dia.split("-");
    const mensagem = `Olá! Vim pelo site e quero reservar para um grupo.\nNome: ${dados.nome}\nPessoas: ${dados.pessoas}\nDia: ${dia}/${mes}/${ano}\nHorário: ${dados.hora}`;
    registrar("reserva_grupo", "como-chegar");
    window.open(linkWhatsAppCom(mensagem), "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={enviar} className="grid gap-4 rounded-3xl border border-carvao-3 bg-carvao-2 p-6 sm:grid-cols-2 md:p-8">
      <p className="titulo titulo-sm sm:col-span-2">Vem com a turma?</p>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="reserva-nome">Seu nome</Label>
        <Input id="reserva-nome" required autoComplete="name" value={dados.nome} onChange={mudar("nome")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reserva-pessoas">Quantas pessoas</Label>
        <Input id="reserva-pessoas" type="number" min={2} required inputMode="numeric" value={dados.pessoas} onChange={mudar("pessoas")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reserva-dia">Dia</Label>
        <Input id="reserva-dia" type="date" required value={dados.dia} onChange={mudar("dia")} />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="reserva-hora">Horário</Label>
        <Input id="reserva-hora" type="time" min="11:00" max="22:30" required value={dados.hora} onChange={mudar("hora")} />
      </div>
      <button type="submit" className="botao botao-brasa sm:col-span-2">
        <IconeWhatsApp className="size-5" /> Mandar pedido de reserva
      </button>
    </form>
  );
}
