"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
 * Agendamento em seis passos: serviço(s), profissional, data, horário, dados e resumo.
 * Nada é enviado a um servidor: o pedido vira uma mensagem pronta no WhatsApp, e o horário
 * só fica reservado depois da confirmação da Lumi. O rascunho fica salvo no navegador.
 */

const STORAGE_KEY = "lumi-agendamento-rascunho";
const STEPS = ["Serviço", "Profissional", "Data", "Horário", "Seus dados", "Resumo"] as const;
const DAYS_AHEAD = 14;
const SLOT_STEP = 30;
/** Antecedência mínima (min) para pedir um horário no mesmo dia */
const SAME_DAY_BUFFER = 30;

const icons: Record<ServiceIcon, LucideIcon> = { Hand, Sparkles, Palette, Gem, Footprints, Droplets, Crown };

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Observações rápidas (viram parte da mensagem) */
const CARE_FLAGS = ["Gestante", "Diabética", "Alergia a algum produto", "Unhas sensíveis", "Primeira visita"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
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
const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

/** Máscara (61) 99999-9999 */
const maskPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};

interface Day {
  iso: string;
  date: Date;
  offset: number;
  hours: [number, number] | null;
  slots: number[];
}

interface Draft {
  services: string[];
  professional: string;
  date: string | null;
  time: number | null;
  name: string;
  phone: string;
  polish: string | null;
  flags: string[];
  notes: string;
  step: number;
}

const EMPTY: Draft = { services: [], professional: "qualquer", date: null, time: null, name: "", phone: "", polish: null, flags: [], notes: "", step: 0 };

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

export function BookingWizard() {
  const params = useSearchParams();
  const lenis = useLenis();
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [reached, setReached] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "phone" | "consent", string>>>({});
  const [sent, setSent] = useState(false);
  const [restored, setRestored] = useState(false);
  /** Datas e "agora" só existem no cliente (evita divergência de hidratação) */
  const [now, setNow] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Atualiza o rascunho e limpa o aviso de validação (a pessoa já está corrigindo) */
  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }, []);

  /* ——— Seleções derivadas ——— */
  const chosen = useMemo(() => services.filter((s) => draft.services.includes(s.id)), [draft.services]);
  const duration = chosen.reduce((sum, s) => sum + s.duration, 0);

  const days: Day[] = useMemo(() => {
    if (!now) return [];
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      return { iso: toISO(date), date, offset: i, hours: brand.schedule[date.getDay()], slots: slotsFor(date, duration, now) };
    });
  }, [now, duration]);

  const day = days.find((d) => d.iso === draft.date) ?? null;
  const slots = day?.slots ?? [];
  const polish = draft.polish ? polishMap[draft.polish] : null;
  const pro = professionals.find((p) => p.id === draft.professional) ?? professionals[0];
  const digits = draft.phone.replace(/\D/g, "");

  /* ——— Carrega rascunho + parâmetros da URL (?servico, ?cor, ?profissional) ——— */
  useEffect(() => {
    let base: Draft = EMPTY;
    let hadDraft = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>;
        base = {
          ...EMPTY,
          ...saved,
          services: (saved.services ?? []).filter((id) => services.some((s) => s.id === id)),
          polish: saved.polish && polishMap[saved.polish] ? saved.polish : null,
          professional: professionals.some((p) => p.id === saved.professional) ? (saved.professional as string) : "qualquer",
        };
        hadDraft = base.services.length > 0 || Boolean(base.name);
      }
    } catch {
      /* armazenamento indisponível: segue sem rascunho */
    }

    const servico = params.get("servico");
    const cor = params.get("cor");
    const prof = params.get("profissional");
    let fromUrl = false;
    if (servico && services.some((s) => s.id === servico) && !base.services.includes(servico)) {
      base = { ...base, services: [...base.services, servico] };
      fromUrl = true;
    }
    if (cor && polishMap[cor]) base = { ...base, polish: cor };
    if (prof && professionals.some((p) => p.id === prof)) base = { ...base, professional: prof };

    const today = new Date();
    if (base.date && base.date < toISO(today)) base = { ...base, date: null, time: null };

    /* eslint-disable react-hooks/set-state-in-effect -- inicialização única no cliente */
    setDraft(base);
    setNow(today);
    setRestored(hadDraft && !fromUrl);
    const start = fromUrl ? 0 : Math.min(base.step ?? 0, 4);
    setStep(start);
    setReached(start);
    setHydrated(true);
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
    if (!hydrated || !now) return;
    if (draft.date && !day) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      update({ date: null, time: null });
      return;
    }
    if (day && (!day.slots.length || (draft.time !== null && !day.slots.includes(draft.time)))) {
      update({ time: null, ...(day.slots.length ? {} : { date: null }) });
    }
  }, [day, draft.date, draft.time, hydrated, now, update]);

  /* ——— Foco e rolagem a cada passo ——— */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const el = rootRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < 0) {
      if (lenis) lenis.scrollTo(el, { offset: -110, duration: 0.9 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sent]);

  /* ——— Validação por passo ——— */
  const validate = (s: number): string | null => {
    if (s === 0 && !draft.services.length) return "Escolha pelo menos um serviço para continuar.";
    if (s === 2 && !draft.date) return "Escolha um dia para o seu atendimento.";
    if (s === 3 && draft.time === null) return "Escolha um horário que fique bom para você.";
    if (s === 4) {
      const errs: typeof fieldErrors = {};
      if (draft.name.trim().length < 2) errs.name = "Conte para a gente como podemos te chamar.";
      if (digits.length !== 11) errs.phone = "Informe um WhatsApp com DDD, no formato (61) 99999-9999.";
      if (!consent) errs.consent = "Para enviar o pedido, precisamos do seu consentimento.";
      setFieldErrors(errs);
      const first = Object.values(errs)[0];
      if (first) {
        const id = errs.name ? "bk-nome" : errs.phone ? "bk-whats" : "bk-lgpd";
        requestAnimationFrame(() => document.getElementById(id)?.focus());
        return "Revise os campos destacados para continuar.";
      }
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
            setDir(1);
            setStep(s);
          }
          return;
        }
      }
    }
    setError(null);
    setDir(target > step ? 1 : -1);
    setStep(target);
    setReached((r) => Math.max(r, target));
  };

  const next = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const back = () => goTo(Math.max(step - 1, 0));

  const toggleService = (id: string) => {
    setError(null);
    update({ services: draft.services.includes(id) ? draft.services.filter((x) => x !== id) : [...draft.services, id] });
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setDraft(EMPTY);
    setConsent(false);
    setFieldErrors({});
    setError(null);
    setSent(false);
    setRestored(false);
    setDir(-1);
    setStep(0);
    setReached(0);
  };

  /* ——— Mensagem do WhatsApp ——— */
  const message = useMemo(() => {
    const d = day?.date;
    const lines = [
      "Olá, Lumi! Gostaria de agendar:",
      `• ${chosen.length > 1 ? "Serviços" : "Serviço"}: ${chosen.map((s) => s.name).join(" + ") || "a definir"}`,
      `• Profissional: ${pro.name}`,
      `• Data: ${d ? `${WEEKDAYS[d.getDay()]}, ${ddmm(d)}` : "a definir"}`,
      `• Horário: ${draft.time !== null ? `${fmtTime(draft.time)} (sujeito à confirmação)` : "a definir"}`,
      `• Duração estimada: ${duration ? fmtDuration(duration) : "a definir"}`,
      `• Cor: ${polish ? `${polish.name} (${finishLabel[polish.finish].toLowerCase()})` : "decido no dia"}`,
      `• Nome: ${draft.name.trim()}`,
      `• WhatsApp: ${draft.phone}`,
    ];
    const obs = [...draft.flags, draft.notes.trim()].filter(Boolean).join("; ");
    if (obs) lines.push(`• Observações: ${obs}`);
    lines.push("", "Fico no aguardo da confirmação. Obrigada!");
    return lines.join("\n");
  }, [chosen, pro.name, day, draft.time, duration, polish, draft.name, draft.phone, draft.flags, draft.notes]);

  const waHref = whatsappLink(message);

  /* ——— Rótulos ——— */
  const dayLabel = (d: Day) => (d.offset === 0 ? "Hoje" : d.offset === 1 ? "Amanhã" : WEEKDAYS_SHORT[d.date.getDay()]);
  const longDate = day ? cap(`${WEEKDAYS[day.date.getDay()]}, ${day.date.getDate()} de ${MONTHS[day.date.getMonth()]}`) : null;
  const endTime = draft.time !== null && duration ? fmtTime(draft.time + duration) : null;

  const scrollStrip = (dirX: 1 | -1) => stripRef.current?.scrollBy({ left: dirX * stripRef.current.clientWidth * 0.8, behavior: "smooth" });

  /* ——————————————————— Passos ——————————————————— */

  const stepServices = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha um ou mais serviços</legend>
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
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
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

  const stepDate = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Escolha o dia nos próximos 14 dias</legend>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Próximos 14 dias</p>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scrollStrip(-1)} aria-label="Ver dias anteriores" className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15 transition-colors hover:bg-ink hover:text-cream">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => scrollStrip(1)} aria-label="Ver próximos dias" className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15 transition-colors hover:bg-ink hover:text-cream">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={stripRef} className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-4 pt-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:-mx-12 md:scroll-px-12 md:px-12" data-lenis-prevent>
        {days.length === 0
          ? Array.from({ length: 7 }, (_, i) => <span key={i} className="h-[118px] w-[78px] shrink-0 animate-pulse rounded-[22px] bg-cream/70" />)
          : days.map((d) => {
              const closed = !d.hours;
              const full = !closed && !d.slots.length;
              const disabled = closed || full;
              const on = draft.date === d.iso;
              return (
                <label
                  key={d.iso}
                  className={cn(
                    "relative flex w-[78px] shrink-0 snap-start flex-col items-center rounded-[22px] px-2 pb-3 pt-3 text-center transition-all duration-500 ease-out-expo",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wine",
                    disabled && "cursor-not-allowed bg-transparent text-muted/60 ring-1 ring-dashed ring-ink/10",
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
                    onChange={() => {
                      setError(null);
                      update({ date: d.iso, time: draft.date === d.iso ? draft.time : null });
                    }}
                    aria-label={`${WEEKDAYS[d.date.getDay()]}, ${d.date.getDate()} de ${MONTHS[d.date.getMonth()]}${closed ? ", fechado" : full ? ", sem horários disponíveis" : ""}`}
                  />
                  <span className={cn("text-[0.68rem] font-semibold uppercase tracking-[0.16em]", on ? "text-blush" : "text-muted", disabled && "text-muted/60")}>{dayLabel(d)}</span>
                  <span className={cn("mt-1 font-display text-[2.1rem] leading-none", disabled && "line-through decoration-1")}>{d.date.getDate()}</span>
                  <span className={cn("mt-1 text-xs", on ? "text-blush" : "text-muted", disabled && "text-muted/60")}>{MONTHS[d.date.getMonth()].slice(0, 3)}</span>
                  <span className={cn("mt-2 text-[0.62rem] uppercase tracking-[0.12em]", on ? "text-cream/80" : disabled ? "text-muted/70" : "text-wine/70")}>{closed ? "Fechado" : full ? "Lotado" : `${d.hours![0]}h–${d.hours![1]}h`}</span>
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
        ) : (
          <p>Os dias riscados estão fechados ou já sem horários para a duração dos seus serviços.</p>
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
          <button type="button" onClick={() => goTo(2)} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-wine underline-offset-4 hover:underline">
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
              <div key={g.label}>
                <p className="eyebrow mb-3 text-muted">{g.label}</p>
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
                        <input
                          type="radio"
                          name="bk-horario"
                          className="sr-only"
                          checked={on}
                          onChange={() => {
                            setError(null);
                            update({ time: t });
                          }}
                        />
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

  const inputBase =
    "mt-2 block w-full rounded-2xl bg-cream px-5 py-4 text-base text-ink ring-1 ring-ink/10 transition-shadow duration-300 placeholder:text-muted/60 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-wine";

  const stepDetails = (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bk-nome" className="text-sm font-medium text-ink">
            Seu nome <span className="text-wine">*</span>
          </label>
          <input
            id="bk-nome"
            type="text"
            autoComplete="name"
            required
            value={draft.name}
            onChange={(e) => {
              update({ name: e.target.value });
              if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            placeholder="Como podemos te chamar?"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "bk-nome-erro" : undefined}
            className={cn(inputBase, fieldErrors.name && "ring-2 ring-coral-deep")}
          />
          {fieldErrors.name && (
            <p id="bk-nome-erro" className="mt-2 text-sm text-coral-deep">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="bk-whats" className="text-sm font-medium text-ink">
            WhatsApp com DDD <span className="text-wine">*</span>
          </label>
          <input
            id="bk-whats"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            value={draft.phone}
            onChange={(e) => {
              update({ phone: maskPhone(e.target.value) });
              if (fieldErrors.phone) setFieldErrors((f) => ({ ...f, phone: undefined }));
            }}
            placeholder="(61) 99999-9999"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "bk-whats-erro" : undefined}
            className={cn(inputBase, "tabular-nums", fieldErrors.phone && "ring-2 ring-coral-deep")}
          />
          {fieldErrors.phone && (
            <p id="bk-whats-erro" className="mt-2 text-sm text-coral-deep">
              {fieldErrors.phone}
            </p>
          )}
        </div>
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
          <button
            type="button"
            onClick={() => update({ polish: null })}
            aria-pressed={!draft.polish}
            className="group flex shrink-0 flex-col items-center gap-2 text-center"
          >
            <span className={cn("flex h-[52px] w-[52px] items-center justify-center rounded-full border border-dashed transition-colors", !draft.polish ? "border-wine text-wine" : "border-ink/25 text-muted group-hover:border-wine/50")}>
              <Sparkles className="h-4 w-4" strokeWidth={1.4} aria-hidden />
            </span>
            <span className="w-14 text-[0.72rem] leading-tight">No dia</span>
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
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors duration-300",
                  on ? "bg-ink text-cream" : "bg-cream text-ink-soft ring-1 ring-ink/10 hover:ring-wine/40",
                )}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />}
                {f}
              </button>
            );
          })}
        </div>
        <label htmlFor="bk-obs" className="sr-only">
          Observações
        </label>
        <textarea
          id="bk-obs"
          rows={3}
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Referência de nail art, alergias, comprimento desejado, se é manutenção…"
          className={cn(inputBase, "mt-4 resize-none leading-relaxed")}
        />
      </div>

      <div>
        <label
          htmlFor="bk-lgpd"
          className={cn(
            "flex cursor-pointer items-start gap-4 rounded-[20px] p-4 transition-colors sm:p-5",
            fieldErrors.consent ? "bg-coral/10 ring-1 ring-coral-deep/50" : "bg-cream/60 ring-1 ring-ink/[0.06] hover:bg-cream",
          )}
        >
          <input
            id="bk-lgpd"
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setFieldErrors((f) => ({ ...f, consent: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.consent)}
            aria-describedby={fieldErrors.consent ? "bk-lgpd-erro" : undefined}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine",
              consent ? "bg-wine text-cream" : "bg-cream ring-1 ring-ink/25",
            )}
          >
            {consent && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
          </span>
          <span className="text-sm leading-relaxed text-ink-soft">
            Autorizo a {brand.name} a usar estes dados apenas para responder e organizar o meu atendimento pelo WhatsApp, conforme a LGPD. Nada fica guardado em servidor: o rascunho fica só neste aparelho.
          </span>
        </label>
        {fieldErrors.consent && (
          <p id="bk-lgpd-erro" className="mt-2 text-sm text-coral-deep">
            {fieldErrors.consent}
          </p>
        )}
      </div>
    </div>
  );

  const summaryRows: { label: string; value: ReactNode; step: number }[] = [
    { label: chosen.length > 1 ? "Serviços" : "Serviço", value: chosen.map((s) => s.name).join(" + "), step: 0 },
    { label: "Profissional", value: pro.name, step: 1 },
    { label: "Data", value: day ? cap(`${WEEKDAYS[day.date.getDay()]}, ${ddmm(day.date)}`) : null, step: 2 },
    { label: "Horário", value: draft.time !== null ? `${fmtTime(draft.time)}${endTime ? ` às ${endTime}` : ""}` : null, step: 3 },
    { label: "Duração estimada", value: duration ? fmtDuration(duration) : null, step: 0 },
    {
      label: "Cor",
      value: polish ? (
        <span className="inline-flex items-center gap-2">
          <span className="gloss h-4 w-4 rounded-full ring-1 ring-ink/10" style={{ background: polish.hex }} aria-hidden />
          {polish.name}
        </span>
      ) : (
        "Decido no dia"
      ),
      step: 4,
    },
    { label: "Nome", value: draft.name.trim(), step: 4 },
    { label: "WhatsApp", value: draft.phone, step: 4 },
    { label: "Observações", value: [...draft.flags, draft.notes.trim()].filter(Boolean).join("; ") || "Nenhuma", step: 4 },
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
        <div onClickCapture={() => window.setTimeout(() => setSent(true), 350)} className="sm:shrink-0">
          <Button href={waHref} external variant="wine" size="lg" magnetic={false} icon={<WhatsAppIcon className="h-[18px] w-[18px]" />} className="w-full sm:w-auto" aria-label="Confirmar pelo WhatsApp (abre em nova aba)">
            Confirmar pelo WhatsApp
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted sm:max-w-[16rem]">A conversa abre com a mensagem pronta. É só enviar: o horário fica reservado depois da nossa confirmação.</p>
      </div>
    </div>
  );

  const content = [stepServices, stepProfessional, stepDate, stepTime, stepDetails, stepSummary][step];
  const titles = [
    { t: "Quais cuidados", a: "você quer hoje?", d: "Escolha um ou mais serviços. Os valores são combinados com carinho pelo WhatsApp." },
    { t: "Com quem você", a: "prefere?", d: "Todas as profissionais seguem o mesmo protocolo de cuidado e biossegurança." },
    { t: "Escolha", a: "o dia.", d: "Mostramos as próximas duas semanas, já considerando o nosso horário de atendimento." },
    { t: "Que horas", a: "fica bom?", d: "Os horários levam em conta a duração somada dos serviços escolhidos." },
    { t: "Agora,", a: "sobre você.", d: "Só o essencial para a gente te responder e preparar o atendimento." },
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
                      const canJump = i <= reached && !current;
                      return (
                        <li key={label} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => canJump && goTo(i)}
                            disabled={!canJump && !current}
                            aria-current={current ? "step" : undefined}
                            aria-label={`Passo ${i + 1}: ${label}${done ? " (concluído)" : ""}`}
                            className={cn("group block w-full text-left", canJump ? "cursor-pointer" : "cursor-default")}
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

                {restored && step < 5 && (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-full bg-cream/70 py-2 pl-5 pr-2 text-sm text-muted ring-1 ring-ink/[0.05]">
                    <span>Recuperamos o seu rascunho.</span>
                    <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-wine transition-colors hover:bg-blush/40">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Começar de novo
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.div
                    key={step}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -20, transition: { duration: 0.22, ease: [0.76, 0, 0.24, 1] } }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-8 md:mt-12"
                  >
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

                {/* Mensagens de validação */}
                <div aria-live="polite" role="status" className="min-h-0">
                  {error && (
                    <p className="mt-6 flex items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral-deep ring-1 ring-coral-deep/30">
                      <Info className="h-4 w-4 shrink-0" aria-hidden /> {error}
                    </p>
                  )}
                </div>

                {/* Navegação: barra fixa no celular enquanto o assistente está na tela */}
                {step < 5 ? (
                  <div className="sticky bottom-3 z-20 -mx-2 mt-8 flex items-center justify-between gap-3 rounded-full bg-cream/90 p-2 shadow-[0_20px_40px_-20px_rgba(26,26,26,0.35)] ring-1 ring-wine/10 backdrop-blur-md sm:mx-0 md:static md:mt-12 md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:backdrop-blur-none">
                    {step > 0 ? (
                      <Button onClick={back} variant="outline" arrow={false} magnetic={false} icon={<ArrowLeft className="h-4 w-4" strokeWidth={1.6} />} className="px-4 sm:px-6">
                        <span className="sr-only sm:not-sr-only">Voltar</span>
                      </Button>
                    ) : (
                      <span className="pl-3 text-xs text-muted md:pl-0 md:text-sm">{chosen.length ? `${chosen.length} · ${fmtDuration(duration)}` : "Nenhum serviço ainda"}</span>
                    )}
                    {step > 0 && <span className="hidden text-xs text-muted min-[400px]:block md:hidden">{chosen.length ? fmtDuration(duration) : ""}</span>}
                    <Button onClick={next} variant="wine">
                      {step === 4 ? "Revisar pedido" : "Continuar"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-10 flex justify-start">
                    <Button onClick={back} variant="ghost" arrow={false} icon={<ArrowLeft className="h-4 w-4" strokeWidth={1.6} />}>
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
                <SideRow label="Profissional" value={pro.name} />
                <SideRow label="Data" value={day ? cap(`${WEEKDAYS_SHORT[day.date.getDay()]}, ${day.date.getDate()} de ${MONTHS[day.date.getMonth()]}`) : null} />
                <SideRow label="Horário" value={draft.time !== null ? `${fmtTime(draft.time)}${endTime ? ` – ${endTime}` : ""}` : null} />
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
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />
                  Tolerância de 15 minutos de atraso.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />
                  Para remarcar ou cancelar, avise com 24h de antecedência.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine" />
                  Gestantes, diabéticas e pessoas com alergias são atendidas com cuidados específicos: é só contar no pedido.
                </li>
              </ul>
              <div className="mt-6 border-t border-wine/15 pt-5">
                <p className="text-sm text-muted">Prefere conversar direto?</p>
                <a
                  href={whatsappLink("Olá, Lumi! Vim pelo site e queria ajuda para agendar.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-2 font-display text-2xl text-ink transition-colors hover:text-wine"
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
function SuccessState({ waHref, name, headingRef, onReset }: { waHref: string; name: string; headingRef: React.RefObject<HTMLHeadingElement | null>; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="py-6 text-center md:py-12" role="status">
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
        <Button href={waHref} external variant="wine" icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}>
          Abrir o WhatsApp de novo
        </Button>
        <Button onClick={onReset} variant="outline" arrow={false} icon={<RotateCcw className="h-4 w-4" strokeWidth={1.6} />}>
          Fazer outro pedido
        </Button>
      </div>
      <TransitionLink href="/" className="mt-8 inline-block text-sm text-muted underline-offset-4 transition-colors hover:text-wine hover:underline">
        Voltar para o início
      </TransitionLink>
    </motion.div>
  );
}
