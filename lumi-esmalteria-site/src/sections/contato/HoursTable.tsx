"use client";

import { useEffect, useState } from "react";
import { brand } from "@/data/brand";
import { cn, normalize } from "@/lib/utils";

/**
 * Tabela de horários com o dia de hoje em destaque e o status "aberto agora",
 * calculado no horário de Brasília (só no cliente, para não divergir na hidratação).
 */

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Linha de brand.hours que cobre o dia da semana (0 = domingo) */
const rowFor = (wd: number) => {
  const target = wd === 0 ? "domingo" : wd === 6 ? "sabado" : "segunda";
  return brand.hours.findIndex((h) => normalize(h.days).includes(target));
};

/** Dia da semana e minutos do dia no fuso de Brasília */
function brasiliaNow() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { wd: wd < 0 ? new Date().getDay() : wd, min: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

function statusFor(wd: number, min: number) {
  const today = brand.schedule[wd];
  if (today && min >= today[0] * 60 && min < today[1] * 60) return { open: true, text: `Aberto agora · até ${today[1]}h` };
  if (today && min < today[0] * 60) return { open: false, text: `Fechado agora · abrimos hoje às ${today[0]}h` };
  for (let i = 1; i <= 7; i++) {
    const d = (wd + i) % 7;
    const h = brand.schedule[d];
    if (h) return { open: false, text: `Fechado agora · abrimos ${i === 1 ? "amanhã" : DAY_NAMES[d]} às ${h[0]}h` };
  }
  return { open: false, text: "Fechado agora" };
}

export function HoursTable() {
  const [now, setNow] = useState<{ wd: number; min: number } | null>(null);

  useEffect(() => {
    const tick = () => setNow(brasiliaNow());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const current = now ? rowFor(now.wd) : -1;
  const status = now ? statusFor(now.wd, now.min) : null;

  return (
    <div>
      <p className={cn("inline-flex min-h-8 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-opacity duration-500", status ? "opacity-100" : "opacity-0", status?.open ? "bg-wine text-cream" : "bg-sand text-ink-soft")} aria-live="polite">
        <span className="relative flex h-2 w-2" aria-hidden>
          {status?.open && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-coral" />}
          <span className={cn("relative h-2 w-2 rounded-full", status?.open ? "bg-coral" : "bg-mauve")} />
        </span>
        {status?.text ?? "Consultando horário"}
      </p>
      <table className="mt-6 w-full text-left">
        <caption className="sr-only">Horários de atendimento</caption>
        <tbody>
          {brand.hours.map((h, i) => {
            const isToday = i === current;
            const closed = /fechado/i.test(h.time);
            return (
              <tr key={h.days} className={cn("border-b border-wine/10 transition-colors last:border-b-0", isToday && "bg-blush/30")} aria-current={isToday ? "date" : undefined}>
                <th scope="row" className={cn("py-4 pl-0 pr-4 font-normal", isToday && "pl-4")}>
                  <span className="font-display text-xl text-ink md:text-2xl">{h.days}</span>
                  {isToday && <span className="eyebrow ml-3 align-middle text-wine">Hoje</span>}
                </th>
                <td className={cn("py-4 pr-0 text-right tabular-nums", closed ? "text-muted" : "text-ink", isToday && "pr-4")}>{h.time}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
