"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Check, CookingPot, Flame, Mail, Monitor, Plus, Shirt, Sofa } from "lucide-react";
import { brand } from "@/data/brand";
import { categories, styles, type CategoryId, type StyleId } from "@/data/categories";
import { getProject } from "@/data/projects";
import { mailtoLink, whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

/**
 * Orçamento inteligente em etapas: ambiente → estilo → projeto → contato → revisão.
 * O pedido é enviado pelo WhatsApp (mensagem pronta) ou por e-mail, e também registrado em /api/orcamento.
 * O rascunho fica salvo no navegador para o visitante continuar depois.
 */

const ICONS: Record<CategoryId | "outro", typeof CookingPot> = {
  cozinha: CookingPot,
  closet: Shirt,
  "home-office": Monitor,
  sala: Sofa,
  quarto: BedDouble,
  banheiro: Bath,
  "area-gourmet": Flame,
  outro: Plus,
};

const budgets = ["Até R$ 30 mil", "R$ 30 a 60 mil", "R$ 60 a 120 mil", "R$ 120 a 250 mil", "Acima de R$ 250 mil", "Prefiro conversar"];
const deadlines = ["O quanto antes", "2 a 4 meses", "4 a 6 meses", "Sem pressa"];
const phases = ["Na planta", "Em obra", "Pronto / reforma"];
const contactPrefs = ["WhatsApp", "Ligação", "E-mail"];

type Data = {
  ambientes: (CategoryId | "outro")[];
  estilo: StyleId | "indefinido" | "";
  metragem: number;
  orcamento: string;
  prazo: string;
  fase: string;
  arquiteto: "sim" | "nao" | "";
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  preferencia: string;
  mensagem: string;
  consentimento: boolean;
  referencia: string;
};

const initial: Data = {
  ambientes: [],
  estilo: "",
  metragem: 20,
  orcamento: "",
  prazo: "",
  fase: "",
  arquiteto: "",
  nome: "",
  whatsapp: "",
  email: "",
  cidade: "",
  preferencia: "WhatsApp",
  mensagem: "",
  consentimento: false,
  referencia: "",
};

const STORAGE = "op-orcamento-rascunho";
const steps = ["Ambiente", "Estilo", "Projeto", "Contato", "Revisão"];

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const labelOf = (id: string) => (id === "outro" ? "Outro" : categories.find((c) => c.id === id)?.name ?? id);
const styleLabel = (id: string) => (id === "indefinido" ? "Ainda não sei" : styles.find((s) => s.id === id)?.name ?? id);

function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border text-left transition-all duration-300",
        selected ? "border-graphite bg-graphite text-linen shadow-[0_20px_40px_-24px_rgba(43,43,43,0.7)]" : "border-graphite/15 bg-paper/60 hover:border-graphite/40 hover:bg-paper",
        className,
      )}
    >
      {children}
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-wood text-paper">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function Field({ label, error, children, hint, id }: { label: string; error?: string; children: ReactNode; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block text-[0.62rem] text-stone">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-stone">{hint}</p>}
      {error && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-terracotta-deep" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = "h-12 w-full rounded-xl border border-graphite/15 bg-paper/70 px-4 text-[0.95rem] outline-none transition-colors placeholder:text-stone/60 focus:border-graphite/60 aria-[invalid=true]:border-terracotta";

export function QuoteWizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<Data>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<null | "whatsapp" | "email">(null);
  const [honeypot, setHoneypot] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  // Rascunho salvo + pré-preenchimento vindo da página de um projeto (?ambiente=&estilo=&projeto=)
  useEffect(() => {
    let draft: Partial<Data> = {};
    try {
      draft = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
    } catch {}
    const amb = params.get("ambiente") as CategoryId | null;
    const est = params.get("estilo") as StyleId | null;
    const ref = getProject(params.get("projeto") ?? "");
    setData((d) => ({
      ...d,
      ...draft,
      consentimento: false,
      ...(amb && categories.some((c) => c.id === amb) ? { ambientes: Array.from(new Set([...(draft.ambientes ?? []), amb])) } : {}),
      ...(est && styles.some((s) => s.id === est) ? { estilo: est } : {}),
      ...(ref ? { referencia: ref.name } : {}),
    }));
    hydrated.current = true;
  }, [params]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const { consentimento: _c, ...rest } = data;
      localStorage.setItem(STORAGE, JSON.stringify(rest));
    } catch {}
  }, [data]);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _, ...rest } = e;
      return rest;
    });
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0 && data.ambientes.length === 0) e.ambientes = "Escolha pelo menos um ambiente.";
    if (s === 1 && !data.estilo) e.estilo = "Escolha um estilo (ou “Ainda não sei”).";
    if (s === 2) {
      if (!data.metragem || data.metragem < 1) e.metragem = "Informe a metragem aproximada.";
      if (!data.orcamento) e.orcamento = "Escolha uma faixa de investimento.";
      if (!data.prazo) e.prazo = "Escolha um prazo.";
    }
    if (s === 3) {
      if (data.nome.trim().length < 2) e.nome = "Como podemos te chamar?";
      if (data.whatsapp.replace(/\D/g, "").length < 10) e.whatsapp = "Informe um WhatsApp com DDD.";
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) e.email = "E-mail inválido.";
      if (!data.consentimento) e.consentimento = "Precisamos da sua autorização para entrar em contato.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (to: number) => {
    if (to > step && !validate(step)) return;
    setDir(to > step ? 1 : -1);
    setStep(to);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const summary = useMemo(
    () => [
      ["Ambientes", data.ambientes.map(labelOf).join(", ")],
      ["Estilo", styleLabel(data.estilo)],
      ["Metragem aproximada", `${data.metragem} m²`],
      ["Investimento estimado", data.orcamento],
      ["Prazo desejado", data.prazo],
      ["Fase do imóvel", data.fase || "Não informado"],
      ["Tem arquiteto?", data.arquiteto === "sim" ? "Sim" : data.arquiteto === "nao" ? "Não" : "Não informado"],
      ...(data.referencia ? [["Projeto de referência", data.referencia]] : []),
    ],
    [data],
  );

  const message = useMemo(() => {
    const lines = [
      `Olá, ${brand.name}! Gostaria de solicitar um orçamento.`,
      "",
      ...summary.map(([k, v]) => `• ${k}: ${v}`),
      "",
      `Nome: ${data.nome}`,
      `WhatsApp: ${data.whatsapp}`,
      data.email && `E-mail: ${data.email}`,
      data.cidade && `Cidade/bairro: ${data.cidade}`,
      `Prefiro contato por: ${data.preferencia}`,
      data.mensagem && `\nSobre o projeto: ${data.mensagem}`,
    ].filter(Boolean);
    return lines.join("\n");
  }, [summary, data]);

  const register = (channel: "whatsapp" | "email") => {
    // Registra o lead no servidor sem bloquear a abertura do WhatsApp/e-mail
    fetch("/api/orcamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, canal: channel, empresa: honeypot }),
      keepalive: true,
    }).catch(() => {});
    try {
      localStorage.removeItem(STORAGE);
    } catch {}
    setSent(channel);
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-paper p-8 text-center shadow-[0_40px_80px_-50px_rgba(43,43,43,0.5)] md:p-14" role="status">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive text-paper">
          <Check className="h-7 w-7" />
        </span>
        <h3 className="display-md mt-8">Pedido enviado, {data.nome.split(" ")[0]}.</h3>
        <p className="mx-auto mt-4 max-w-md text-stone">
          {sent === "whatsapp" ? "Finalize o envio na conversa do WhatsApp que abrimos para você." : "Confira o e-mail que abrimos no seu aplicativo e clique em enviar."} Um arquiteto da {brand.name} responde em até 1 dia útil.
        </p>
        <ol className="mx-auto mt-10 grid max-w-xl gap-4 text-left text-sm sm:grid-cols-3">
          {["Retornamos para agendar o briefing", "Visita técnica e medição", "Projeto 3D para aprovação"].map((t, i) => (
            <li key={t} className="rounded-2xl border border-graphite/10 p-4">
              <span className="font-display italic text-wood-deep">0{i + 1}</span>
              <p className="mt-2">{t}</p>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setStep(0);
            setData(initial);
          }}
          className="mt-10 text-sm underline underline-offset-4 hover:text-wood-deep"
        >
          Fazer outro pedido
        </button>
      </motion.div>
    );
  }

  return (
    <div ref={top} className="scroll-mt-28 rounded-3xl bg-paper p-6 shadow-[0_40px_80px_-50px_rgba(43,43,43,0.5)] md:p-10">
      {/* Progresso */}
      <ol className="mb-10 grid grid-cols-5 gap-2" aria-label="Etapas do orçamento">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < step && go(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-graphite/10">
                <motion.span className="block h-full bg-wood" initial={false} animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              </span>
              <span className={cn("mt-2 hidden text-xs sm:block", i === step ? "text-graphite" : "text-stone")}>
                <span className="font-display italic">0{i + 1}</span> {s}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        Etapa {step + 1} de {steps.length}: {steps[step]}
      </p>

      <div className="relative min-h-[26rem]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <fieldset>
                <legend className="font-display text-3xl font-light md:text-4xl">Quais ambientes você quer planejar?</legend>
                <p className="mt-2 text-sm text-stone">Pode escolher mais de um.</p>
                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[...categories.map((c) => c.id), "outro" as const].map((id) => {
                    const Icon = ICONS[id];
                    const selected = data.ambientes.includes(id);
                    return (
                      <Choice key={id} selected={selected} onClick={() => set("ambientes", selected ? data.ambientes.filter((a) => a !== id) : [...data.ambientes, id])} className="flex flex-col gap-6 p-5">
                        <Icon className="h-6 w-6" strokeWidth={1.3} />
                        <span className="font-medium">{labelOf(id)}</span>
                      </Choice>
                    );
                  })}
                </div>
                {errors.ambientes && <p className="mt-4 text-sm text-terracotta-deep" role="alert">{errors.ambientes}</p>}
              </fieldset>
            )}

            {step === 1 && (
              <fieldset>
                <legend className="font-display text-3xl font-light md:text-4xl">Qual estilo combina com você?</legend>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[...styles, { id: "indefinido" as const, name: "Ainda não sei", description: "Vamos descobrir juntos no briefing." }].map((s, i) => (
                    <Choice key={s.id} selected={data.estilo === s.id} onClick={() => set("estilo", s.id)} className="flex gap-5 p-5">
                      <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10">
                        {[["#8B6F47", "#2B2B2B"], ["#E9E1D6", "#B89B72"], ["#F4EFE9", "#B8B0A5"], ["#2B2B2B", "#5E4130"], ["#5A6B4F", "#C96E4B"]][i].map((c) => (
                          <span key={c} className="h-full flex-1" style={{ background: c }} />
                        ))}
                      </span>
                      <span>
                        <span className="block font-medium">{s.name}</span>
                        <span className={cn("mt-1 block text-sm", data.estilo === s.id ? "text-linen/70" : "text-stone")}>{s.description}</span>
                      </span>
                    </Choice>
                  ))}
                </div>
                {errors.estilo && <p className="mt-4 text-sm text-terracotta-deep" role="alert">{errors.estilo}</p>}
              </fieldset>
            )}

            {step === 2 && (
              <div className="space-y-9">
                <h3 className="font-display text-3xl font-light md:text-4xl">Conte um pouco sobre o projeto.</h3>
                <div>
                  <label htmlFor="metragem" className="eyebrow mb-3 flex items-baseline justify-between text-[0.62rem] text-stone">
                    Metragem aproximada dos ambientes
                    <span className="font-display text-3xl normal-case tracking-normal text-graphite">{data.metragem} m²</span>
                  </label>
                  <input id="metragem" type="range" min={2} max={200} step={1} value={data.metragem} onChange={(e) => set("metragem", Number(e.target.value))} className="w-full" aria-valuetext={`${data.metragem} metros quadrados`} />
                  <div className="mt-1 flex justify-between text-xs text-stone">
                    <span>2 m²</span>
                    <span>200 m²</span>
                  </div>
                </div>
                {(
                  [
                    ["orcamento", "Investimento estimado", budgets],
                    ["prazo", "Prazo desejado", deadlines],
                    ["fase", "Fase do imóvel (opcional)", phases],
                  ] as const
                ).map(([key, label, opts]) => (
                  <fieldset key={key}>
                    <legend className="eyebrow mb-3 text-[0.62rem] text-stone">{label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {opts.map((o) => (
                        <button key={o} type="button" aria-pressed={data[key] === o} onClick={() => set(key, data[key] === o ? "" : o)} className={cn("rounded-full border px-4 py-2.5 text-sm transition-colors", data[key] === o ? "border-graphite bg-graphite text-linen" : "border-graphite/15 hover:border-graphite/50")}>
                          {o}
                        </button>
                      ))}
                    </div>
                    {errors[key] && <p className="mt-2 text-xs text-terracotta-deep" role="alert">{errors[key]}</p>}
                  </fieldset>
                ))}
                <fieldset>
                  <legend className="eyebrow mb-3 text-[0.62rem] text-stone">Já tem projeto de arquiteto? (opcional)</legend>
                  <div className="flex gap-2">
                    {(["sim", "nao"] as const).map((o) => (
                      <button key={o} type="button" aria-pressed={data.arquiteto === o} onClick={() => set("arquiteto", data.arquiteto === o ? "" : o)} className={cn("rounded-full border px-5 py-2.5 text-sm transition-colors", data.arquiteto === o ? "border-graphite bg-graphite text-linen" : "border-graphite/15 hover:border-graphite/50")}>
                        {o === "sim" ? "Sim" : "Não"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="font-display text-3xl font-light md:text-4xl">Como falamos com você?</h3>
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <Field id="nome" label="Nome *" error={errors.nome}>
                    <input id="nome" autoComplete="name" value={data.nome} onChange={(e) => set("nome", e.target.value)} aria-invalid={!!errors.nome} aria-describedby={errors.nome ? "nome-erro" : undefined} className={inputCls} placeholder="Seu nome" />
                  </Field>
                  <Field id="whatsapp" label="WhatsApp *" error={errors.whatsapp}>
                    <input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" value={data.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} aria-invalid={!!errors.whatsapp} aria-describedby={errors.whatsapp ? "whatsapp-erro" : undefined} className={inputCls} placeholder="(61) 90000-0000" />
                  </Field>
                  <Field id="email" label="E-mail" error={errors.email}>
                    <input id="email" type="email" autoComplete="email" value={data.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-erro" : undefined} className={inputCls} placeholder="voce@email.com" />
                  </Field>
                  <Field id="cidade" label="Cidade / bairro">
                    <input id="cidade" autoComplete="address-level2" value={data.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputCls} placeholder="Ex.: Lago Sul, Brasília" />
                  </Field>
                  <fieldset className="md:col-span-2">
                    <legend className="eyebrow mb-3 text-[0.62rem] text-stone">Prefiro contato por</legend>
                    <div className="flex flex-wrap gap-2">
                      {contactPrefs.map((o) => (
                        <button key={o} type="button" aria-pressed={data.preferencia === o} onClick={() => set("preferencia", o)} className={cn("rounded-full border px-4 py-2.5 text-sm transition-colors", data.preferencia === o ? "border-graphite bg-graphite text-linen" : "border-graphite/15 hover:border-graphite/50")}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="md:col-span-2">
                    <Field id="mensagem" label="Quer contar mais? (opcional)">
                      <textarea id="mensagem" rows={4} value={data.mensagem} onChange={(e) => set("mensagem", e.target.value)} className={cn(inputCls, "h-auto py-3")} placeholder="Ex.: queremos integrar cozinha e sala, temos dois filhos pequenos..." />
                    </Field>
                  </div>
                  {/* Campo armadilha contra robôs (fica invisível) */}
                  <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden name="empresa" />
                  <label className="flex items-start gap-3 text-sm md:col-span-2">
                    <input type="checkbox" checked={data.consentimento} onChange={(e) => set("consentimento", e.target.checked)} aria-invalid={!!errors.consentimento} className="mt-1 h-4 w-4 accent-[var(--color-wood)]" />
                    <span className="text-stone">
                      Autorizo a {brand.name} a entrar em contato e a usar estes dados apenas para responder ao meu pedido de orçamento, conforme a LGPD.
                    </span>
                  </label>
                  {errors.consentimento && <p className="-mt-3 text-xs text-terracotta-deep md:col-span-2" role="alert">{errors.consentimento}</p>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 className="font-display text-3xl font-light md:text-4xl">Tudo certo, {data.nome.split(" ")[0] || "vamos lá"}?</h3>
                <p className="mt-2 text-sm text-stone">{brand.contact.email ? "Revise o resumo e escolha por onde prefere enviar." : "Revise o resumo e envie pelo WhatsApp: a mensagem já vai pronta."}</p>
                <dl className="mt-8 divide-y divide-graphite/10 rounded-2xl border border-graphite/10 px-5 text-sm">
                  {[...summary, ["Contato", [data.nome, data.whatsapp, data.email].filter(Boolean).join(" · ")]].map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
                      <dt className="text-stone">{k}</dt>
                      <dd className="sm:text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className={cn("mt-8 grid gap-3", brand.contact.email && "sm:grid-cols-2")}>
                  <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" onClick={() => register("whatsapp")} className="flex h-14 items-center justify-center gap-3 rounded-full bg-[#1f7a4d] font-medium text-paper transition-colors hover:bg-[#186540]">
                    <WhatsAppIcon className="h-5 w-5" /> Enviar pelo WhatsApp
                  </a>
                  {brand.contact.email && (
                    <a href={mailtoLink(`Orçamento · ${data.ambientes.map(labelOf).join(", ")}`, message)} onClick={() => register("email")} className="flex h-14 items-center justify-center gap-3 rounded-full border border-graphite/20 font-medium transition-colors hover:border-graphite">
                      <Mail className="h-5 w-5" strokeWidth={1.5} /> Enviar por e-mail
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegação */}
      <div className="mt-10 flex items-center justify-between border-t border-graphite/10 pt-6">
        <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="flex items-center gap-2 text-sm text-stone transition-colors hover:text-graphite disabled:invisible">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {step < steps.length - 1 && (
          <button type="button" onClick={() => go(step + 1)} className="group flex h-12 items-center gap-3 rounded-full bg-graphite px-7 text-sm font-medium text-linen transition-colors hover:bg-ink">
            Continuar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </div>
  );
}
