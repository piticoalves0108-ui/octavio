"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Droplets, Footprints, Gem, Hand, MapPin, Palette, Pause, Play, Sparkles, Crown, CalendarHeart } from "lucide-react";
import { useReducedMotion } from "@/hooks/useMedia";
import { brand, fullAddress } from "@/data/brand";
import { featuredServices, type ServiceIcon } from "@/data/services";
import { getPolish } from "@/data/colors";
import { gallery } from "@/data/gallery";
import { marqueeItems, testimonials, whyLumi } from "@/data/content";
import { Marquee } from "@/components/ui/Marquee";
import { RevealText } from "@/components/ui/RevealText";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TiltCard } from "@/components/ui/TiltCard";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { NailArt } from "@/components/features/NailArt";
import { NailTryOn } from "@/components/features/NailTryOn";
import { bookServiceMessage, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const serviceIcons: Record<ServiceIcon, typeof Hand> = { Hand, Sparkles, Palette, Gem, Footprints, Droplets, Crown };

/** Faixa infinita de tendências */
export function MarqueeBand() {
  return (
    <section aria-label="Tendências" className="border-y border-wine/10 bg-blush py-6 md:py-8">
      <Marquee items={marqueeItems} separator="✦" speed={40} className="font-display text-[clamp(2.4rem,6vw,5rem)] italic leading-none text-wine" />
    </section>
  );
}

/** Serviços em destaque: cards com inclinação 3D e a nail art de cada serviço */
export function FeaturedServices() {
  const designs = ["solid", "solid", "chrome", "ombre", "solid"] as const;
  return (
    <section className="container-x py-24 md:py-32">
      <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <SectionLabel index="01">Serviços</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6 max-w-3xl" text="Cuidado do *jeito* que você merece." />
        </div>
        <Button href="/servicos" variant="outline">
          Todos os serviços
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {featuredServices.map((s, i) => {
          const Icon = serviceIcons[s.icon];
          const p = getPolish(s.polish);
          const span = i < 2 ? "lg:col-span-3" : "lg:col-span-2";
          return (
            <Reveal key={s.id} className={span} delay={(i % 3) * 0.08}>
              <TiltCard intensity={5} className="h-full">
                <article className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-sand p-6 transition-shadow duration-500 hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.45)]">
                  <div className={cn("relative -mx-2 mb-4 overflow-hidden rounded-[22px] bg-[linear-gradient(160deg,#faf7f2,#efdcd4)]", i < 2 ? "aspect-[16/9]" : "aspect-[4/3]")}>
                    <div className="absolute inset-0 transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.06]">
                      <NailArt design={designs[i]} shape={i === 3 ? "stiletto" : i === 1 ? "quadrada" : "amendoada"} colors={i === 3 ? ["#F6D7CB", p.hex] : [p.hex, "#ffffff"]} length={i === 3 ? "longa" : "media"} label={`${s.name}: exemplo em ${p.name}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-wine">
                      <Icon className="h-5 w-5" strokeWidth={1.4} />
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" /> {s.durationLabel}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-3xl">{s.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.short}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a href={whatsappLink(bookServiceMessage(s.name))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-wine px-4 py-2 text-xs font-medium text-cream transition-colors hover:bg-wine-deep">
                      <WhatsAppIcon className="h-3.5 w-3.5" /> Agendar
                    </a>
                    <TransitionLink href={`/servicos#${s.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-wine">
                      Detalhes <ArrowUpRight className="h-3.5 w-3.5" />
                    </TransitionLink>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/** Por que Lumi? */
export function WhyLumi() {
  return (
    <section className="relative overflow-hidden bg-wine py-24 text-cream md:py-32" data-cursor-theme="dark">
      <div aria-hidden className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-coral/25 blur-[100px]" />
      <div className="container-x relative">
        <SectionLabel index="02" light>
          Por que a Lumi
        </SectionLabel>
        <RevealText as="h2" className="display-lg mt-6 max-w-4xl" text="Brilho que *dura*, cuidado que *se sente*." />
        <div className="mt-16 grid gap-px overflow-hidden rounded-[32px] bg-cream/10 sm:grid-cols-2 lg:grid-cols-4">
          {whyLumi.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.08} className="bg-wine p-8">
              <p className="font-display text-6xl italic text-coral">{w.stat}</p>
              <p className="eyebrow mt-2 text-blush/85">{w.statLabel}</p>
              <h3 className="mt-8 font-display text-3xl">{w.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-blush/90">{w.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Provador de cores na home */
export function TryOnSection() {
  return (
    <section className="container-x py-24 md:py-32">
      <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="03">Provador de cores</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6" text="Experimente *antes* de agendar." />
        </div>
        <p className="leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
          Toque nas cores e veja o esmalte escorrer pelas unhas. Troque o formato, escolha o seu favorito e mande direto para a nossa agenda.
        </p>
      </div>
      <NailTryOn initialPolish="cereja" compact />
      <div className="mt-6 text-center">
        <TransitionLink href="/cores" className="inline-flex items-center gap-2 text-sm font-medium text-wine hover:underline">
          Ver a cartela completa e mais opções <ArrowUpRight className="h-4 w-4" />
        </TransitionLink>
      </div>
    </section>
  );
}

/** Galeria de nail art (prévia) */
export function GalleryTeaser() {
  const items = gallery.filter((g) => g.art).slice(0, 6);
  const aspects = ["aspect-[4/5]", "aspect-square", "aspect-[4/5]", "aspect-square", "aspect-[4/5]", "aspect-square"];
  const bgs = ["bg-[linear-gradient(160deg,#faf7f2,#efdcd4)]", "bg-[linear-gradient(160deg,#f5ede6,#e8d5ce)]", "bg-[linear-gradient(200deg,#faf7f2,#f3e3dc)]"];
  return (
    <section className="bg-sand py-24 md:py-32">
      <div className="container-x">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel index="04">Galeria</SectionLabel>
            <RevealText as="h2" className="display-lg mt-6 max-w-3xl" text="Pequenas obras, *grandes* gestos." />
          </div>
          <Button href="/galeria" variant="outline">
            Ver a galeria
          </Button>
        </div>
        <div className="gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
          {items.map((g, i) => (
            <Reveal key={g.id} delay={(i % 3) * 0.08} className="break-inside-avoid">
              <TransitionLink href="/galeria" data-cursor-label="Ver" className="group block">
                <div className={cn("relative overflow-hidden rounded-[28px]", aspects[i], bgs[i % 3])}>
                  <div className="absolute inset-0 p-4 transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.05]">
                    <NailArt {...g.art!} label={g.title} />
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-cream/85 px-4 py-2 text-sm opacity-0 backdrop-blur transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="font-display text-lg italic">{g.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-wine" />
                  </div>
                </div>
              </TransitionLink>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Depoimentos com troca automática. Pausa no hover, no foco e pelo botão; com movimento
 * reduzido não troca sozinho. Leitores de tela só anunciam a troca feita pela pessoa.
 */
export function Testimonials() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  /** O foco no botão de pausa não conta: senão "Retomar" só valeria ao sair dele */
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rotating = playing && !reduced && !hovered && !focused;
  const go = (d: number) => setI((v) => (v + d + testimonials.length) % testimonials.length);
  useEffect(() => {
    if (!rotating) return;
    const t = setTimeout(() => go(1), 6500);
    return () => clearTimeout(t);
  }, [i, rotating]);
  const t = testimonials[i];
  const ctrl = "flex h-11 w-11 items-center justify-center rounded-full border border-wine/20 transition-colors hover:bg-wine hover:text-cream";

  return (
    <section
      className="container-x py-24 text-center md:py-32"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => setFocused(e.target !== toggleRef.current)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      aria-roledescription="carrossel"
      aria-label="Depoimentos"
    >
      <SectionLabel index="05" className="justify-center">
        Quem já viveu a Lumi
      </SectionLabel>
      <div className="mx-auto mt-10 min-h-[15rem] max-w-4xl" aria-live={rotating ? "off" : "polite"}>
        <AnimatePresence mode="wait">
          <motion.figure
            key={i}
            role="group"
            aria-roledescription="depoimento"
            aria-label={`${i + 1} de ${testimonials.length}`}
            initial={{ opacity: 0, y: 20, filter: reduced ? "none" : "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: reduced ? "none" : "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: reduced ? "none" : "blur(6px)" }}
            transition={{ duration: reduced ? 0.3 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <blockquote className="font-display text-[clamp(1.8rem,3.6vw,3rem)] italic leading-[1.15] text-balance">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="mt-8 text-sm">
              <span className="font-medium">{t.name}</span> <span className="text-muted">· {t.service}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="mt-8 flex items-center justify-center gap-5">
        <button type="button" onClick={() => go(-1)} aria-label="Depoimento anterior" className={ctrl}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="flex gap-2">
          {testimonials.map((_, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Depoimento ${k + 1}`} aria-current={k === i} className={cn("h-2 rounded-full transition-all duration-500", k === i ? "w-8 bg-wine" : "w-2 bg-wine/20")} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Próximo depoimento" className={ctrl}>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {!reduced && (
          <button ref={toggleRef} type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pausar depoimentos" : "Retomar depoimentos"} className={ctrl}>
            {/* Ícones sem eventos de ponteiro: trocar o nó sob o mouse impediria o mouseleave de retomar */}
            {playing ? <Pause className="pointer-events-none h-4 w-4" aria-hidden /> : <Play className="pointer-events-none h-4 w-4 translate-x-px" aria-hidden />}
          </button>
        )}
      </div>
    </section>
  );
}

/** Chamada para agendamento + horário de funcionamento */
export function BookingCTA() {
  return (
    <section className="container-x pb-24 md:pb-32">
      <div className="relative grid gap-10 overflow-hidden rounded-[40px] bg-blush p-8 md:p-14 lg:grid-cols-12">
        <div aria-hidden className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-coral/30 blur-[80px]" />
        <div className="relative lg:col-span-7">
          <p className="eyebrow text-wine">Agendamento em 1 minuto</p>
          <RevealText as="h2" className="display-lg mt-5" text="Reserve o *seu* momento." />
          <p className="mt-6 max-w-md leading-relaxed text-muted">Escolha o serviço, o dia e o horário. A confirmação chega pelo WhatsApp, com carinho e sem complicação.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={whatsappLink("Olá, Lumi! Gostaria de agendar um horário.")} external variant="wine" size="lg" arrow={false} icon={<WhatsAppIcon className="h-5 w-5" />}>
              Agendar pelo WhatsApp
            </Button>
            <Button href="/agendamento" variant="light" size="lg" arrow={false} icon={<CalendarHeart className="h-5 w-5" strokeWidth={1.5} />}>
              Escolher dia e horário
            </Button>
          </div>
        </div>
        <div className="relative rounded-[28px] bg-cream/85 p-7 backdrop-blur lg:col-span-5">
          <p className="eyebrow flex items-center gap-2 text-muted">
            <Clock className="h-4 w-4" /> Horário de funcionamento
          </p>
          <ul className="mt-5 divide-y divide-wine/10">
            {brand.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-muted">{h.days}</span>
                <span className="font-medium">{h.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <MapPin className="h-4 w-4 text-wine" /> {fullAddress}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <WhatsAppIcon className="h-4 w-4 text-wine" /> {brand.contact.whatsappDisplay}
          </p>
        </div>
      </div>
    </section>
  );
}
