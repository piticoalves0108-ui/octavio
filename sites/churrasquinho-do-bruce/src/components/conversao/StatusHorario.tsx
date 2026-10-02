"use client";

import { useEffect, useState } from "react";
import { negocio } from "@/content/negocio";
import { statusHorario, type StatusHorario as Status } from "@/lib/horario";
import { cn } from "@/lib/utils";

/**
 * "Aberto agora · até 23h" / "Fechado agora · abre amanhã às 11h", no fuso de Brasília.
 * O servidor manda o horário fixo; o status entra depois da hidratação.
 */
export function StatusHorario({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const atualizar = () => setStatus(statusHorario());
    atualizar();
    const intervalo = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <p className={cn("inline-flex items-center gap-2.5 text-sm font-normal", className)} aria-live="polite">
      <span
        aria-hidden
        className={cn(
          "relative inline-block size-2.5 shrink-0 rounded-full",
          status?.aberto ? "bg-ambar shadow-[0_0_12px_2px_rgba(255,179,71,0.7)]" : "bg-fumaca",
        )}
      >
        {status?.aberto && <span className="absolute inset-0 rounded-full bg-ambar [animation:brilho-pino_2.4s_ease-in-out_infinite]" />}
      </span>
      <span>{status ? status.texto : negocio.horario.curto}</span>
    </p>
  );
}
