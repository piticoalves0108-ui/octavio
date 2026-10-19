"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useLenis } from "lenis/react";
import {
  ArrowLeft,
  CalendarHeart,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Droplets,
  Footprints,
  Gem,
  Hand,
  Info,
  Palette,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { brand } from "@/data/brand";
import { services, type ServiceIcon } from "@/data/services";
import { finishLabel, polishes, polishMap } from "@/data/colors";
import { professionals, team } from "@/data/content";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { PaintSwatch } from "@/components/features/PaintSwatch";

/**
 * Agendamento em seis passos: serviço(s), data, horário, profissional, dados e resumo.
 * Nada é enviado a um servidor: o pedido vira uma mensagem pronta no WhatsApp, e o horário
 * só fica reservado depois da confirmação da Lumi. O rascunho fica salvo no navegador.
 */

const STORAGE_KEY = "lumi-agendamento-v2";
const STEPS = ["Serviço", "Data", "Horário", "Profissional", "Seus dados", "Resumo"] as const;
const S = { service: 0, date: 1, time: 2, pro: 3, details: 4, summary: 5 } as const;
const DAYS_AHEAD = 14;
const SLOT_STEP = 30;
/** Antecedência mínima (min) para pedir um horário no mesmo dia */
const SAME_DAY_BUFFER = 30;

const icons: Record<ServiceIcon, LucideIcon> = { Hand, Sparkles, Palette, Gem, Footprints, Droplets, Crown };

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "Fechamos aos domingos. " a partir dos dias sem expediente em brand.schedule */
const CLOSED_ON = ["aos domingos", "às segundas", "às terças", "às quartas", "às quintas", "às sextas", "aos sábados"];
const CLOSED_NOTE = (() => {
  const days = CLOSED_ON.filter((_, d) => !brand.schedule[d]);
  if (!days.length) return "";
  const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} e ${days[days.length - 1]}` : days[0];
  return `Fechamos ${list}. `;
})();

/** Observações rápidas (viram parte da mensagem) */
const CARE_FLAGS = ["Primeira visita", "Gestante", "Diabética", "Alergia a algum produto", "Unhas sensíveis"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 600 → "10h00" */
const fmtTime = (min: number) => `${Math.floor(min / 60)}h${pad(min % 60)}`;
/** 135 → "2h15", 120 → "2h", 45 → "45 min" */
const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
};
/** Primeira letra maiúscula */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "sábado, 24 de outubro" */
const longDay = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

/** "Agora" no relógio de Brasília (a agenda segue o horário do espaço, não o do aparelho) */
function brasiliaNow() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const d = new Date(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
    if (!Number.isNaN(d.getTime())) return d;
  } catch {
    /* Intl sem fuso: usa o relógio local */
  }
  return new Date();
}

interface Day {
  iso: string;
  date: Date;
  offset: number;
  hours: [number, number] | null;
  slots: number[];
}

interface Draft {
  services: string[];
  date: string | null;
  time: number | null;
  professional: string;
  name: string;
  polish: string | null;
  flags: string[];
  notes: string;
  step: number;
}

const EMPTY: Draft = { services: [], date: null, time: null, professional: "qualquer", name: "", polish: null, flags: [], notes: "", step: 0 };

/** Horários (em minutos) em que a duração total cabe no expediente do dia */
function slotsFor(date: Date, duration: number, now: Date) {
  const hours = brand.schedule[date.getDay()];
  if (!hours) return [];
  const [open, close] = hours;
  const isToday = toISO(date) === toISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes() + SAME_DAY_BUFFER;
  const out: number[] = [];
  for (let t = open * 60; t + Math.max(duration, SLOT_STEP) <= close * 60; t += SLOT_STEP) {
    if (isToday && t < nowMin) continue;
    out.push(t);
  }
  return out;
}

function buildDays(now: Date, duration: number): Day[] {
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { iso: toISO(date), date, offset: i, hours: brand.schedule[date.getDay()], slots: slotsFor(date, duration, now) };
  });
}

/** Primeiro passo ainda incompleto de um rascunho */
function firstOpenStep(d: Draft, days: Day[]) {
  if (!d.services.length) return S.service;
  const day = days.find((x) => x.iso === d.date);
  if (!day?.slots.length) return S.date;
  if (d.time === null || !day.slots.includes(d.time)) return S.time;
  if (d.name.trim().length < 2) return S.details;
  return S.summary;
}

const durationOf = (ids: string[]) => services.reduce((sum, s) => sum + (ids.includes(s.id) ? s.duration : 0), 0);

const slide: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit: (d: number) => ({ opacity: 0, x: d * -20, transition: { duration: 0.22, ease: [0.76, 0, 0.24, 1] } }),
};

export function BookingWizard() {
  const params = useSearchParams();
  const lenis = useLenis();
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  /** Só move o foco quando a própria pessoa troca de passo (nunca no carregamento) */
  const pendingFocus = useRef(false);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [reached, setReached] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [restored, setRestored] = useState(false);
  /** Datas e "agora" só existem no cliente (evita divergência de hidratação) */
  const [now, setNow] = useState<Date | null>(null);
  const hydrated = now !== null;

  /** Atualiza o rascunho e limpa o aviso de validação (a pessoa já está corrigindo) */
  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }, []);

  /* ——— Seleções derivadas ——— */
  const chosen = useMemo(() => services.filter((s) => draft.services.includes(s.id)), [draft.services]);
  const duration = chosen.reduce((sum, s) => sum + s.duration, 0);
  const days = useMemo(() => (now ? buildDays(now, duration) : []), [now, duration]);

  const day = days.find((d) => d.iso === draft.date) ?? null;
  const slots = day?.slots ?? [];
  const noDayFits = days.length > 0 && duration > 0 && days.every((d) => !d.slots.length);
  const polish = draft.polish ? polishMap[draft.polish] : null;
  const pro = professionals.find((p) => p.id === draft.professional) ?? professionals[0];

  /* ——— Carrega rascunho + parâmetros da URL (?servico, ?cor, ?profissional) ——— */
  useEffect(() => {
    let saved: Draft | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Draft>;
        saved = {
          ...EMPTY,
          ...s,
          services: Array.isArray(s.services) ? s.services.filter((id) => services.some((x) => x.id === id)) : [],
          polish: s.polish && polishMap[s.polish] ? s.polish : null,
          professional: professionals.some((p) => p.id === s.professional) ? (s.professional as string) : "qualquer",
          flags: Array.isArray(s.flags) ? s.flags.filter((f) => CARE_FLAGS.includes(f)) : [],
          time: typeof s.time === "number" ? s.time : null,
          name: typeof s.name === "string" ? s.name : "",
          notes: typeof s.notes === "string" ? s.notes : "",
        };
      }
    } catch {
      /* armazenamento indisponível: segue sem rascunho */
    }

    const servico = params.get("servico");
    const cor = params.get("cor");
    const prof = params.get("profissional");
    const validService = servico && services.some((s) => s.id === servico) ? servico : null;

    let base: Draft = saved ?? EMPTY;
    let fromUrl = false;
    // Veio de um serviço: começa um pedido novo com ele, a menos que o rascunho já o inclua (ex.: recarregou a página)
    if (validService && !base.services.includes(validService)) {
      base = { ...EMPTY, name: base.name, services: [validService] };
      fromUrl = true;
    }
    if (cor && polishMap[cor]) base = { ...base, polish: cor };
    if (prof && professionals.some((p) => p.id === prof)) base = { ...base, professional: prof };

    const today = brasiliaNow();
    const list = buildDays(today, durationOf(base.services));
    const savedDay = list.find((d) => d.iso === base.date);
    if (base.date && !savedDay?.slots.length) base = { ...base, date: null, time: null };
    else if (base.time !== null && !savedDay?.slots.includes(base.time)) base = { ...base, time: null };

    const open = firstOpenStep(base, list);
    const savedStep = Number.isInteger(base.step) ? base.step : 0;
    const start = fromUrl ? S.date : Math.max(0, Math.min(savedStep, open, S.details));

    /* eslint-disable react-hooks/set-state-in-effect -- inicialização única no cliente */
    setDraft(base);
    setNow(today);
    setRestored(!fromUrl && Boolean(saved && (saved.services.length || saved.date)));
    setStep(start);
    setReached(Math.max(start, open));
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ——— Salva o rascunho a cada mudança ——— */
  useEffect(() => {
    if (!hydrated || sent) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, step }));
    } catch {
      /* sem armazenamento: tudo bem */
    }
  }, [draft, step, hydrated, sent]);

  /* ——— Se a duração mudou, invalida data/horário que não cabem mais ——— */
  useEffect(() => {
    if (!hydrated) return;
    if (draft.date && !day?.slots.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      update({ date: null, time: null });
    } else if (day && draft.time !== null && !day.slots.includes(draft.time)) {
      update({ time: null });
    }
  }, [day, draft.date, draft.time, hydrated, update]);

  /** Ref do título de cada passo: recebe o foco assim que o novo passo entra na tela */
  const headingRef = useCallback(
    (el: HTMLHeadingElement | null) => {
      if (!el || !pendingFocus.current) return;
      pendingFocus.current = false;
      el.focus({ preventScroll: true });
      const root = rootRef.current;
      if (root && root.getBoundingClientRect().top < 0) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (lenis) lenis.scrollTo(root, { offset: -110, duration: 0.9, immediate: reduce });
        else root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    },
    [lenis],
  );

  /* ——— Validação por passo ——— */
  const validate = (s: number): string | null => {
    if (s === S.service && !draft.services.length) return "Escolha pelo menos um serviço para continuar.";
    if (s === S.date && !draft.date) return noDayFits ? "A duração somada passa do nosso expediente. Tire um serviço ou fale com a gente pelo WhatsApp." : "Escolha um dia para o seu atendimento.";
    if (s === S.time && draft.time === null) return "Escolha um horário que fique bom para você.";
    if (s === S.details && draft.name.trim().length < 2) {
      setNameError("Conte para a gente como podemos te chamar.");
      return "Falta só o seu nome para continuar.";
    }
    return null;
  };

  const goTo = (target: number) => {
    if (target === step) return;
    if (target > step) {
      for (let s = step; s < target; s++) {
        const msg = validate(s);
        if (msg) {
          setError(msg);
          if (s !== step) {
            pendingFocus.current = true;
            setDir(1);
            setStep(s);
          } else if (s === S.details) {
            document.getElementById("bk-nome")?.focus();
          }
          return;
        }
      }
    }
    pendingFocus.current = true;
    setError(null);
    setDir(target > step ? 1 : -1);
    setStep(target);
    setReached((r) => Math.max(r, target));
  };

  const next = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const back = () => goTo(Math.max(step - 1, 0));

  const toggleService = (id: string) => {
    update({ services: draft.services.includes(id) ? draft.services.filter((x) => x !== id) : [...draft.services, id] });
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    pendingFocus.current = true;
    setDraft(EMPTY);
    setNameError(null);
    setError(null);
    setSent(false);
    setRestored(false);
    setDir(-1);
    setStep(0);
    setReached(0);
  };

  /** Depois do envio, o rascunho é descartado (guardamos só o nome para a próxima vez) */
  const markSent = () => {
    pendingFocus.current = true;
    setSent(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...EMPTY, name: draft.name.trim() }));
    } catch {
      /* ignore */
    }
  };

  /* ——— Mensagem do WhatsApp ——— */
  const endTime = draft.time !== null && duration ? fmtTime(draft.time + duration) : null;
  const notesText = [...draft.flags, draft.notes.trim()].filter(Boolean).join("; ");

  const message = useMemo(() => {
    const lines = [
      "Olá, Lumi! Gostaria de agendar um horário:",
      "",
      `• ${chosen.length > 1 ? "Serviços" : "Serviço"}: ${chosen.map((s) => s.name).join(" + ") || "a definir"}`,
      `• Data: ${day ? longDay(day.date) : "a definir"}`,
      `• Horário: ${draft.time !== null ? `${fmtTime(draft.time)}${endTime ? ` (término previsto às ${endTime})` : ""}` : "a definir"}`,
      `• Duração estimada: ${duration ? fmtDuration(duration) : "a definir"}`,
      `• Profissional: ${pro.name}`,
      `• Cor: ${polish ? `${polish.name} (${finishLabel[polish.finish].toLowerCase()})` : "decido no dia"}`,
      `• Nome: ${draft.name.trim()}`,
    ];
    if (notesText) lines.push(`• Observações: ${notesText}`);
    lines.push("", "Fico no aguardo da confirmação. Até breve!");
    return lines.join("\n");
  }, [chosen, day, draft.time, endTime, duration, pro.name, polish, draft.name, notesText]);

  const waHref = whatsappLink(message);

  /* ——— Rótulos ——— */
  const dayLabel = (d: Day) => (d.offset === 0 ? "Hoje" : d.offset === 1 ? "Amanhã" : WEEKDAYS_SHORT[d.date.getDay()]);
  const longDate = day ? cap(longDay(day.date)) : null;
  const durationHint = chosen.length ? `${chosen.length} ${chosen.length > 1 ? "serviços" : "serviço"} · ${fmtDuration(duration)}` : "Nenhum serviço ainda";

  const scrollStrip = (dirX: 1 | -1) => stripRef.current?.scrollBy({ left: dirX * stripRef.current.clientWidth * 0.8, behavior: "smooth" });

  /* ——————————————————— Passos ——————————————————— */

  const stepServices = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha um ou mais serviços</legend>
      {polish && (
        <p className="mb-5 flex items-center gap-3 rounded-[20px] bg-cream/70 py-2.5 pl-3 pr-5 text-sm text-ink-soft ring-1 ring-ink/[0.05] sm:rounded-full sm:py-2 sm:pl-2.5">
          <span className="gloss h-7 w-7 shrink-0 rounded-full ring-2 ring-cream sm:h-6 sm:w-6" style={{ background: polish.hex }} aria-hidden />
          <span className="min-w-0 leading-snug">
            <span className="block sm:inline">
              Cor escolhida: <span className="font-display text-lg italic text-wine">{polish.name}</span>
            </span>
            <span className="block text-xs text-muted sm:inline sm:pl-2 sm:text-sm">dá para trocar em “Seus dados”</span>
          </span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        {services.map((s) => {
          const Icon = icons[s.icon] ?? Sparkles;
          const on = draft.services.includes(s.id);
          const color = polishMap[s.polish]?.hex ?? "#E3BFAF";
          return (
            <label
              key={s.id}
              className={cn(
                "group relative flex cursor-pointer gap-4 rounded-[24px] p-4 transition-all duration-500 ease-out-expo sm:p-5",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
                on ? "bg-cream shadow-[0_24px_50px_-30px_rgba(139,41,66,0.45)] ring-[1.5px] ring-wine" : "bg-cream/55 ring-1 ring-ink/[0.06] hover:bg-cream hover:ring-wine/25",
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleService(s.id)} aria-describedby={`${s.id}-desc`} />
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sand text-wine transition-colors duration-500 group-hover:bg-blush/70">
                <Icon className="h-5 w-5" strokeWidth={1.4} aria-hidden />
                <span className="gloss absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-cream" style={{ background: color }} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 pr-7">
                <span className="block font-display text-[1.45rem] leading-tight text-ink">{s.name}</span>
                <span id={`${s.id}-desc`} className="mt-1 block text-sm leading-snug text-muted">
                  {s.short}
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-xs text-ink-soft">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  {s.durationLabel}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-500 ease-out-expo sm:right-5 sm:top-5",
                  on ? "scale-100 bg-wine text-cream" : "scale-90 ring-1 ring-ink/15",
                )}
              >
                <Check className={cn("h-3.5 w-3.5 transition-opacity", on ? "opacity-100" : "opacity-0")} strokeWidth={2.4} />
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted" aria-live="polite">
        <Clock className="h-4 w-4 text-wine" strokeWidth={1.6} aria-hidden />
        {chosen.length ? (
          <>
            <span>
              {chosen.length} {chosen.length > 1 ? "serviços selecionados" : "serviço selecionado"}
            </span>
            <span aria-hidden>·</span>
            <span className="text-ink">tempo estimado de {fmtDuration(duration)}</span>
          </>
        ) : (
          <span>Pode escolher mais de um: somamos o tempo de cada cuidado.</span>
        )}
      </p>
    </fieldset>
  );

  const stepDate = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha o dia nos próximos {DAYS_AHEAD} dias</legend>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Próximos {DAYS_AHEAD} dias</p>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scrollStrip(-1)} aria-label="Ver dias anteriores" className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15 transition-colors hover:bg-ink hover:text-cream">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => scrollStrip(1)} aria-label="Ver próximos dias" className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15 transition-colors hover:bg-ink hover:text-cream">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div ref={stripRef} className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-4 pt-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:-mx-12 md:scroll-px-12 md:px-12" data-lenis-prevent>
        {days.map((d) => {
          const closed = !d.hours;
          const full = !closed && !d.slots.length;
          const disabled = closed || full;
          const on = draft.date === d.iso;
          const status = closed ? "Fechado" : full ? (d.offset === 0 ? "Encerrado" : "Sem horário") : `${d.hours![0]}h–${d.hours![1]}h`;
          return (
            <label
              key={d.iso}
              className={cn(
                "relative flex w-[78px] shrink-0 snap-start flex-col items-center rounded-[22px] px-2 pb-3 pt-3 text-center transition-all duration-500 ease-out-expo",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
                disabled && "cursor-not-allowed border border-dashed border-ink/15 bg-transparent text-muted/60",
                !disabled && !on && "cursor-pointer bg-cream/70 ring-1 ring-ink/[0.06] hover:-translate-y-0.5 hover:bg-cream hover:ring-wine/30",
                on && "cursor-pointer bg-wine text-cream shadow-[0_20px_40px_-20px_rgba(139,41,66,0.7)]",
              )}
            >
              <input
                type="radio"
                name="bk-data"
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={() => update({ date: d.iso, time: draft.date === d.iso ? draft.time : null })}
                aria-label={`${d.offset === 0 ? "Hoje, " : d.offset === 1 ? "Amanhã, " : ""}${longDay(d.date)}${closed ? ", fechado" : full ? ", sem horários para a duração escolhida" : ""}`}
              />
              <span className={cn("text-[0.68rem] font-semibold uppercase tracking-[0.16em]", on ? "text-blush" : "text-muted", disabled && "text-muted/60")} aria-hidden>
                {dayLabel(d)}
              </span>
              <span className={cn("mt-1 font-display text-[2.1rem] leading-none", disabled && "line-through decoration-1")} aria-hidden>
                {d.date.getDate()}
              </span>
              <span className={cn("mt-1 text-xs", on ? "text-blush" : "text-muted", disabled && "text-muted/60")} aria-hidden>
                {MONTHS[d.date.getMonth()].slice(0, 3)}
              </span>
              <span className={cn("mt-2 whitespace-nowrap text-[0.6rem] uppercase tracking-[0.06em]", on ? "text-cream/80" : disabled ? "text-muted/70" : "text-wine/85")} aria-hidden>
                {status}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 min-h-[3.5rem] rounded-[20px] bg-cream/60 px-5 py-4 text-sm text-muted ring-1 ring-ink/[0.05]" aria-live="polite">
        {day ? (
          <p>
            <span className="font-display text-xl text-ink">{longDate}</span>
            <span className="block sm:inline sm:pl-2">
              atendimento das {day.hours![0]}h às {day.hours![1]}h · {day.slots.length} {day.slots.length === 1 ? "horário possível" : "horários possíveis"}
            </span>
          </p>
        ) : noDayFits ? (
          <p>
            A duração somada ({fmtDuration(duration)}) passa do nosso expediente.{" "}
            <a href={whatsappLink(`Olá, Lumi! Quero agendar ${chosen.map((s) => s.name).join(" + ")}. Podemos dividir em mais de um horário?`)} target="_blank" rel="noopener noreferrer" className="text-wine underline underline-offset-4">
              Fale com a gente pelo WhatsApp
            </a>{" "}
            para dividir em mais de um horário.
          </p>
        ) : (
          <p>
            {CLOSED_NOTE}Os dias riscados não têm horário para a duração dos seus serviços.
          </p>
        )}
      </div>
    </fieldset>
  );

  const groups = [
    { label: "Manhã", items: slots.filter((t) => t < 12 * 60) },
    { label: "Tarde", items: slots.filter((t) => t >= 12 * 60 && t < 18 * 60) },
    { label: "Noite", items: slots.filter((t) => t >= 18 * 60) },
  ].filter((g) => g.items.length);

  const stepTime = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha o horário de início</legend>
      {!day ? (
        <div className="rounded-[24px] bg-cream/60 p-6 text-muted ring-1 ring-ink/[0.05]">
          <p>Escolha primeiro o dia do atendimento.</p>
          <button type="button" onClick={() => goTo(S.date)} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-wine underline-offset-4 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para a data
          </button>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">
            <span className="text-ink">{longDate}</span> · mostramos só os horários em que {chosen.length > 1 ? "seus serviços cabem" : "seu serviço cabe"} no expediente ({fmtDuration(duration || SLOT_STEP)}).
          </p>
          <div className="space-y-7">
            {groups.map((g) => (
              <div key={g.label} role="group" aria-labelledby={`bk-turno-${g.label}`}>
                <p id={`bk-turno-${g.label}`} className="eyebrow mb-3 text-muted">
                  {g.label}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {g.items.map((t) => {
                    const on = draft.time === t;
                    return (
                      <label
                        key={t}
                        className={cn(
                          "flex h-12 cursor-pointer items-center justify-center rounded-full text-[0.95rem] tabular-nums transition-all duration-500 ease-out-expo",
                          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
                          on ? "bg-wine text-cream shadow-[0_16px_30px_-16px_rgba(139,41,66,0.8)]" : "bg-cream/70 text-ink ring-1 ring-ink/[0.07] hover:bg-cream hover:ring-wine/30",
                        )}
                      >
                        <input type="radio" name="bk-horario" className="sr-only" checked={on} onChange={() => update({ time: t })} />
                        {fmtTime(t)}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 flex items-start gap-3 rounded-[20px] bg-blush/35 px-5 py-4 text-sm leading-relaxed text-ink-soft" aria-live="polite">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.6} aria-hidden />
            {draft.time !== null ? (
              <span>
                Previsão: das <strong className="font-medium text-ink">{fmtTime(draft.time)}</strong> às <strong className="font-medium text-ink">{endTime}</strong>. O horário é um pedido, sujeito à confirmação pelo WhatsApp.
              </span>
            ) : (
              <span>O horário escolhido é um pedido, sujeito à confirmação pelo WhatsApp de acordo com a agenda do dia.</span>
            )}
          </p>
        </>
      )}
    </fieldset>
  );

  const stepProfessional = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha a profissional</legend>
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        {professionals.map((p) => {
          const on = draft.professional === p.id;
          const member = team.find((t) => t.name.toLowerCase() === p.id);
          const any = p.id === "qualquer";
          return (
            <label
              key={p.id}
              className={cn(
                "group relative flex cursor-pointer items-center gap-4 rounded-[24px] p-4 transition-all duration-500 ease-out-expo sm:p-5",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
                any && "sm:col-span-2",
                on ? "bg-cream shadow-[0_24px_50px_-30px_rgba(139,41,66,0.45)] ring-[1.5px] ring-wine" : "bg-cream/55 ring-1 ring-ink/[0.06] hover:bg-cream hover:ring-wine/25",
              )}
            >
              <input type="radio" name="bk-profissional" className="sr-only" checked={on} onChange={() => update({ professional: p.id })} />
              <span
                aria-hidden
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-2xl italic transition-colors duration-500",
                  any ? "bg-wine text-cream" : "bg-[radial-gradient(circle_at_30%_25%,#fff_0%,#F5EDE6_35%,#E8D5CE_100%)] text-wine",
                )}
              >
                {any ? <Sparkles className="h-5 w-5" strokeWidth={1.4} /> : p.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[1.45rem] leading-tight text-ink">{p.name}</span>
                <span className="mt-0.5 block text-sm text-muted">{any ? "Encaixamos você com quem tiver o melhor horário no dia." : member?.role}</span>
              </span>
              <span aria-hidden className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500", on ? "bg-wine text-cream" : "ring-1 ring-ink/15")}>
                <span className={cn("h-2 w-2 rounded-full bg-cream transition-transform duration-500", on ? "scale-100" : "scale-0")} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  const inputBase =
    "mt-2 block w-full rounded-2xl bg-cream px-5 py-4 text-base text-ink ring-1 ring-ink/10 transition-shadow duration-300 placeholder:text-muted/60 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-wine";

  const stepDetails = (
    <div className="space-y-8">
      <div className="max-w-md">
        <label htmlFor="bk-nome" className="text-sm font-medium text-ink">
          Seu nome <span className="text-wine" aria-hidden>*</span>
        </label>
        <input
          id="bk-nome"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          value={draft.name}
          onChange={(e) => {
            update({ name: e.target.value });
            if (nameError) setNameError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              next();
            }
          }}
          placeholder="Como podemos te chamar?"
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "bk-nome-erro" : undefined}
          className={cn(inputBase, nameError && "ring-2 ring-coral-deep")}
        />
        {nameError && (
          <p id="bk-nome-erro" className="mt-2 text-sm text-wine">
            {nameError}
          </p>
        )}
      </div>

      <fieldset className="min-w-0">
        <legend className="flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-ink">
          <span>
            Já tem uma cor em mente? <span className="font-normal text-muted">(opcional)</span>
          </span>
          <span className="font-normal text-muted" aria-live="polite">
            {polish ? (
              <>
                <span className="font-display text-lg italic text-wine">{polish.name}</span> · {finishLabel[polish.finish].toLowerCase()}
              </>
            ) : (
              "Decido no dia"
            )}
          </span>
        </legend>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2 pt-2 sm:-mx-8 sm:px-8 md:-mx-12 md:px-12" data-lenis-prevent>
          <button type="button" onClick={() => update({ polish: null })} aria-pressed={!draft.polish} className="group flex shrink-0 flex-col items-center gap-2 text-center">
            <span className={cn("flex h-[52px] w-[52px] items-center justify-center rounded-full border border-dashed transition-colors", !draft.polish ? "border-wine text-wine" : "border-ink/25 text-muted group-hover:border-wine/50")}>
              <Sparkles className="h-4 w-4" strokeWidth={1.4} aria-hidden />
            </span>
            <span className="w-14 text-[0.72rem] leading-tight">Decido no dia</span>
          </button>
          {polishes.map((p) => (
            <PaintSwatch key={p.id} polish={p} size={44} selected={draft.polish === p.id} onSelect={(id) => update({ polish: draft.polish === id ? null : id })} className="w-[72px] shrink-0" />
          ))}
        </div>
      </fieldset>

      <div>
        <p id="bk-cuidados" className="text-sm font-medium text-ink">
          Algo que devemos saber? <span className="font-normal text-muted">(opcional)</span>
        </p>
        <div role="group" aria-labelledby="bk-cuidados" className="mt-3 flex flex-wrap gap-2">
          {CARE_FLAGS.map((f) => {
            const on = draft.flags.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => update({ flags: on ? draft.flags.filter((x) => x !== f) : [...draft.flags, f] })}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors duration-300", on ? "bg-ink text-cream" : "bg-cream text-ink-soft ring-1 ring-ink/10 hover:ring-wine/40")}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />}
                {f}
              </button>
            );
          })}
        </div>
        <label htmlFor="bk-obs" className="sr-only">
          Observações (opcional)
        </label>
        <textarea
          id="bk-obs"
          rows={3}
          maxLength={500}
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Referência de nail art, comprimento desejado, se é manutenção…"
          className={cn(inputBase, "mt-4 resize-none leading-relaxed")}
        />
      </div>

      <p className="flex items-start gap-3 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.5} aria-hidden />
        Nada é enviado pelo site: o pedido só sai quando você enviar a mensagem no WhatsApp, e o rascunho fica salvo apenas neste aparelho.
      </p>
    </div>
  );

  const summaryRows: { label: string; value: ReactNode; step: number }[] = [
    { label: chosen.length > 1 ? "Serviços" : "Serviço", value: chosen.map((s) => s.name).join(" + "), step: S.service },
    { label: "Data", value: longDate, step: S.date },
    { label: "Horário", value: draft.time !== null ? `${fmtTime(draft.time)}${endTime ? ` às ${endTime}` : ""}` : null, step: S.time },
    { label: "Duração estimada", value: duration ? fmtDuration(duration) : null, step: S.service },
    { label: "Profissional", value: pro.name, step: S.pro },
    {
      label: "Cor",
      value: polish ? (
        <span className="inline-flex items-center gap-2">
          <span className="gloss h-4 w-4 rounded-full ring-1 ring-ink/10" style={{ background: polish.hex }} aria-hidden />
          {polish.name} <span className="text-muted">· {finishLabel[polish.finish].toLowerCase()}</span>
        </span>
      ) : (
        "Decido no dia"
      ),
      step: S.details,
    },
    { label: "Nome", value: draft.name.trim(), step: S.details },
    { label: "Observações", value: notesText || "Nenhuma", step: S.details },
  ];

  const stepSummary = (
    <div>
      <dl className="divide-y divide-wine/10 overflow-hidden rounded-[24px] bg-cream ring-1 ring-ink/[0.06]">
        {summaryRows.map((r) => (
          <div key={r.label} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[10rem_1fr_auto] sm:px-6">
            <dt className="eyebrow col-start-1 row-start-1 pt-1 text-muted">{r.label}</dt>
            <dd className="col-span-2 col-start-1 row-start-2 min-w-0 break-words text-[0.97rem] text-ink sm:col-span-1 sm:col-start-2 sm:row-start-1">{r.value || <span className="text-muted">—</span>}</dd>
            <dd className="col-start-2 row-start-1 sm:col-start-3">
              <button type="button" onClick={() => goTo(r.step)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-wine transition-colors hover:bg-blush/40" aria-label={`Alterar ${r.label.toLowerCase()}`}>
                <PencilLine className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden /> Alterar
              </button>
            </dd>
          </div>
        ))}
      </dl>

      <details className="group mt-5 rounded-[20px] bg-cream/50 px-5 py-4 text-sm ring-1 ring-ink/[0.05]">
        <summary className="cursor-pointer list-none font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-wine transition-transform group-open:rotate-90" aria-hidden /> Ver a mensagem que vai para o WhatsApp
          </span>
        </summary>
        <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-[0.9rem] leading-relaxed text-ink-soft">{message}</pre>
      </details>

      <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        {/* O link abre o WhatsApp numa nova aba; logo depois mostramos o estado de sucesso */}
        <div onClickCapture={() => window.setTimeout(markSent, 350)} className="sm:shrink-0">
          <Button href={waHref} external variant="wine" size="lg" magnetic={false} icon={<WhatsAppIcon className="h-[18px] w-[18px]" />} className="w-full sm:w-auto" aria-label="Enviar pedido pelo WhatsApp (abre em nova aba)">
            Enviar pelo WhatsApp
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted sm:max-w-[16rem]">A conversa abre com a mensagem pronta. É só enviar: o horário fica reservado depois da nossa confirmação.</p>
      </div>
    </div>
  );

  const content = [stepServices, stepDate, stepTime, stepProfessional, stepDetails, stepSummary][step];
  const titles = [
    { t: "Quais cuidados", a: "você quer hoje?", d: "Escolha um ou mais serviços. Os valores são combinados com carinho pelo WhatsApp." },
    { t: "Escolha", a: "o dia.", d: "Mostramos as próximas duas semanas, já considerando o nosso horário de atendimento." },
    { t: "Que horas", a: "fica bom?", d: "Os horários levam em conta a duração somada dos serviços escolhidos." },
    { t: "Com quem você", a: "prefere?", d: "Se não tiver preferência, encaixamos você com a profissional disponível no horário." },
    { t: "Agora,", a: "sobre você.", d: "Só o essencial para a gente te receber do jeito certo." },
    { t: "Tudo pronto para", a: "a sua pausa.", d: "Confira os detalhes. O pedido segue pelo WhatsApp e confirmamos a disponibilidade por lá." },
  ][step];

  /* ——————————————————— Render ——————————————————— */

  return (
    <section aria-label="Agendamento online" className="container-x pb-24 md:pb-32">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14">
        <div ref={rootRef} className="min-w-0 scroll-mt-28 lg:col-span-8">
          <div className="relative rounded-[32px] bg-sand px-5 pb-5 pt-6 shadow-[0_40px_80px_-60px_rgba(139,41,66,0.45)] ring-1 ring-wine/[0.06] sm:px-8 sm:pb-8 sm:pt-8 md:rounded-[40px] md:px-12 md:pb-12 md:pt-10">
            {sent ? (
              <SuccessState waHref={waHref} name={draft.name.trim().split(" ")[0]} headingRef={headingRef} onReset={reset} />
            ) : (
              <>
                {/* Progresso */}
                <nav aria-label="Etapas do agendamento">
                  <div className="flex items-center justify-between gap-4 md:hidden">
                    <p className="text-sm text-muted">
                      Passo <span className="font-medium text-ink">{step + 1}</span> de {STEPS.length}
                    </p>
                    <p className="eyebrow text-wine">{STEPS[step]}</p>
                  </div>
                  <ol className="mt-3 grid grid-cols-6 gap-1.5 md:mt-0 md:gap-3">
                    {STEPS.map((label, i) => {
                      const done = i < step;
                      const current = i === step;
                      const canJump = hydrated && i <= reached && !current;
                      return (
                        <li key={label} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => canJump && goTo(i)}
                            disabled={!canJump && !current}
                            aria-current={current ? "step" : undefined}
                            aria-label={`Passo ${i + 1}: ${label}${done ? " (concluído)" : ""}`}
                            className={cn("group block w-full py-2 text-left md:py-0", canJump ? "cursor-pointer" : "cursor-default")}
                          >
                            <span className="relative block h-1 overflow-hidden rounded-full bg-ink/[0.08]">
                              <motion.span className="absolute inset-y-0 left-0 rounded-full bg-wine" initial={false} animate={{ width: done ? "100%" : current ? "50%" : "0%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                            </span>
                            <span className="mt-3 hidden items-center gap-2 md:flex">
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] transition-colors duration-500",
                                  done ? "bg-wine text-cream" : current ? "bg-ink text-cream" : "text-muted ring-1 ring-ink/15",
                                )}
                              >
                                {done ? <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden /> : i + 1}
                              </span>
                              <span className={cn("truncate text-xs transition-colors", current ? "font-medium text-ink" : done ? "text-ink-soft group-hover:text-wine" : "text-muted")}>{label}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </nav>

                {restored && step < S.summary && (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-full bg-cream/70 py-2 pl-5 pr-2 text-sm text-muted ring-1 ring-ink/[0.05]">
                    <span>Recuperamos o seu rascunho.</span>
                    <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-wine transition-colors hover:bg-blush/40">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Começar de novo
                    </button>
                  </div>
                )}

                {hydrated ? (
                  <AnimatePresence mode="wait" initial={false} custom={dir}>
                    <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="mt-8 md:mt-12">
                      <header className="mb-7 md:mb-9">
                        <p className="eyebrow text-wine">
                          {pad(step + 1)} · {STEPS[step]}
                        </p>
                        <h2 ref={headingRef} tabIndex={-1} className="display-md mt-3 text-balance text-ink focus:outline-none">
                          {titles.t} <span className="serif-accent text-wine">{titles.a}</span>
                        </h2>
                        <p className="mt-3 max-w-xl leading-relaxed text-muted">{titles.d}</p>
                      </header>
                      {content}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="mt-8 space-y-4 md:mt-12" aria-hidden>
                    <span className="block h-4 w-32 animate-pulse rounded-full bg-cream/80" />
                    <span className="block h-12 w-3/4 animate-pulse rounded-2xl bg-cream/80" />
                    <span className="block h-[360px] animate-pulse rounded-[24px] bg-cream/60" />
                  </div>
                )}

                {/* Mensagens de validação */}
                <div aria-live="assertive" role="alert" className="min-h-0">
                  {error && (
                    <p className="mt-6 flex items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-wine ring-1 ring-coral-deep/30">
                      <Info className="h-4 w-4 shrink-0 text-coral-deep" aria-hidden /> {error}
                    </p>
                  )}
                </div>

                {/* Navegação: barra fixa no celular enquanto o assistente está na tela */}
                {step < S.summary ? (
                  <div className="sticky bottom-3 z-20 -mx-2 mt-8 flex items-center justify-between gap-3 rounded-full bg-cream/90 p-2 shadow-[0_20px_40px_-20px_rgba(26,26,26,0.35)] ring-1 ring-wine/10 backdrop-blur-md sm:mx-0 md:static md:mt-12 md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:backdrop-blur-none">
                    {step > 0 ? (
                      <Button onClick={back} variant="outline" arrow={false} magnetic={false} icon={<ArrowLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden />} className="px-4 sm:px-6" aria-label="Voltar ao passo anterior">
                        <span className="hidden sm:inline">Voltar</span>
                      </Button>
                    ) : (
                      <span className="min-w-0 truncate pl-3 text-xs text-muted md:pl-0 md:text-sm">{durationHint}</span>
                    )}
                    {step > 0 && <span className="hidden min-w-0 truncate text-xs text-muted min-[400px]:block md:hidden">{chosen.length ? fmtDuration(duration) : ""}</span>}
                    <Button onClick={next} variant="wine" disabled={!hydrated}>
                      {step === S.details ? "Revisar pedido" : "Continuar"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-10 flex justify-start">
                    <Button onClick={back} variant="ghost" arrow={false} icon={<ArrowLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden />}>
                      Voltar e ajustar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resumo ao vivo */}
        <aside aria-label="Resumo do pedido" className="lg:col-span-4">
          <div className="space-y-5 lg:sticky lg:top-28">
            <div className="hidden overflow-hidden rounded-[28px] bg-cream shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] ring-1 ring-ink/[0.05] lg:block">
              <div className="relative overflow-hidden bg-wine px-7 py-6 text-cream">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-coral/30 blur-2xl" />
                <p className="eyebrow relative text-blush/80">Seu pedido</p>
                <p className="relative mt-2 font-display text-3xl leading-tight">
                  {chosen.length ? (
                    <>
                      {chosen.length > 1 ? `${chosen.length} cuidados` : chosen[0].name}
                      <span className="serif-accent text-blush"> · {fmtDuration(duration)}</span>
                    </>
                  ) : (
                    <span className="serif-accent text-blush">em construção</span>
                  )}
                </p>
              </div>
              <ul className="divide-y divide-wine/10 px-7 py-2 text-sm">
                {chosen.length > 1 && (
                  <li className="py-3.5">
                    <span className="eyebrow block text-muted">Serviços</span>
                    <span className="mt-1 block text-ink">{chosen.map((s) => s.name).join(", ")}</span>
                  </li>
                )}
                <SideRow label="Data" value={day ? cap(`${WEEKDAYS_SHORT[day.date.getDay()]}, ${day.date.getDate()} de ${MONTHS[day.date.getMonth()]}`) : null} />
                <SideRow label="Horário" value={draft.time !== null ? `${fmtTime(draft.time)}${endTime ? ` – ${endTime}` : ""}` : null} />
                <SideRow label="Profissional" value={pro.name} />
                <SideRow
                  label="Cor"
                  value={
                    polish ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="gloss h-3.5 w-3.5 rounded-full ring-1 ring-ink/10" style={{ background: polish.hex }} aria-hidden />
                        {polish.name}
                      </span>
                    ) : null
                  }
                />
              </ul>
              <p className="flex items-start gap-2.5 border-t border-wine/10 bg-sand/60 px-7 py-4 text-xs leading-relaxed text-muted">
                <CalendarHeart className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.5} aria-hidden />
                Horário sujeito à confirmação pelo WhatsApp. Valores combinados na conversa.
              </p>
            </div>

            <div className="rounded-[28px] bg-blush/40 p-6 sm:p-7">
              <p className="eyebrow text-wine">Bom saber</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />O horário só fica reservado depois da nossa confirmação no WhatsApp.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />
                  Imprevisto? Para remarcar ou cancelar, avise pelo WhatsApp com a maior antecedência possível.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />
                  Gestantes, diabéticas e pessoas com alergias recebem cuidados específicos: é só contar no pedido.
                </li>
              </ul>
              <div className="mt-6 border-t border-wine/15 pt-5">
                <p className="text-sm text-muted">Prefere conversar direto?</p>
                <a
                  href={whatsappLink("Olá, Lumi! Vim pelo site e queria ajuda para agendar.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-2 font-display text-2xl text-ink transition-colors hover:text-wine"
                  aria-label={`Conversar no WhatsApp ${brand.contact.whatsappDisplay} (abre em nova aba)`}
                >
                  <WhatsAppIcon className="h-5 w-5 text-wine" />
                  {brand.contact.whatsappDisplay}
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/** Linha do resumo lateral */
function SideRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3.5">
      <span className="eyebrow text-muted">{label}</span>
      <span className="text-right text-ink">{value || <span className="text-muted/70">—</span>}</span>
    </li>
  );
}

/** Estado final depois de abrir o WhatsApp */
function SuccessState({ waHref, name, headingRef, onReset }: { waHref: string; name: string; headingRef: Ref<HTMLHeadingElement>; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="py-6 text-center md:py-12">
      <svg viewBox="0 0 96 96" className="mx-auto h-24 w-24" aria-hidden>
        <motion.circle cx="48" cy="48" r="44" fill="none" stroke="var(--color-wine)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }} />
        <motion.path d="M30 49 L43 61 L66 36" fill="none" stroke="var(--color-wine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <p className="eyebrow mt-8 text-wine">Pedido pronto</p>
      <h2 ref={headingRef} tabIndex={-1} className="display-md mx-auto mt-3 max-w-xl text-balance text-ink focus:outline-none">
        {name ? `${name}, agora` : "Agora"} é só <span className="serif-accent text-wine">enviar a mensagem.</span>
      </h2>
      <p className="mx-auto mt-5 max-w-md leading-relaxed text-muted">
        Abrimos o WhatsApp com o seu pedido pronto. Assim que você enviar, conferimos a agenda e confirmamos o horário por lá. Seu momento está quase reservado.
      </p>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href={waHref} external variant="wine" icon={<WhatsAppIcon className="h-[18px] w-[18px]" />} aria-label="Abrir o WhatsApp de novo (abre em nova aba)">
          Abrir o WhatsApp de novo
        </Button>
        <Button onClick={onReset} variant="outline" arrow={false} icon={<RotateCcw className="h-4 w-4" strokeWidth={1.6} aria-hidden />}>
          Fazer outro pedido
        </Button>
      </div>
      <TransitionLink href="/" className="mt-8 inline-block text-sm text-muted underline-offset-4 transition-colors hover:text-wine hover:underline">
        Voltar para o início
      </TransitionLink>
    </motion.div>
  );
}
