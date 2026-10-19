import { Clock, Crown, Droplets, Footprints, Gem, Hand, Palette, Sparkles, type LucideIcon } from "lucide-react";
import type { NailShape } from "@/data/colors";
import { finishLabel, getPolish } from "@/data/colors";
import type { NailDesign } from "@/data/gallery";
import type { Service, ServiceIcon } from "@/data/services";
import { bookServiceMessage, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { NailArt } from "@/components/features/NailArt";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** Ícone lucide de cada serviço (o nome vem dos dados) */
export const serviceIcons: Record<ServiceIcon, LucideIcon> = { Hand, Sparkles, Palette, Gem, Footprints, Droplets, Crown };

/** Nail art que ilustra cada serviço: desenho, formato e cores complementares à cor da casa. */
const artFor: Record<string, { design: NailDesign; shape: NailShape; length?: "curta" | "media" | "longa"; extra?: string[] }> = {
  "unhas-tradicionais": { design: "solid", shape: "amendoada", length: "media" },
  "esmaltacao-gel": { design: "solid", shape: "quadrada", length: "media" },
  "nail-design": { design: "abstract", shape: "amendoada", length: "longa", extra: ["#8B2942", "#C8A27A"] },
  alongamento: { design: "ombre", shape: "stiletto", length: "longa", extra: ["#F3EEE8"] },
  "spa-dos-pes": { design: "solid", shape: "redonda", length: "curta" },
  blindagem: { design: "micro-french", shape: "quadrada", length: "curta", extra: ["#FFFFFF"] },
  "dia-de-noiva": { design: "glitter-tip", shape: "amendoada", length: "longa", extra: ["#C8A27A"] },
};

/** Serviço em formato editorial: visual da cor, detalhes e chamadas para agendar. */
export function ServiceCard({ service, index, total }: { service: Service; index: number; total: number }) {
  const Icon = serviceIcons[service.icon] ?? Sparkles;
  const polish = getPolish(service.polish);
  const art = artFor[service.id] ?? { design: "solid" as NailDesign, shape: "amendoada" as NailShape };
  const colors = [polish.hex, ...(art.extra ?? [])];
  const flip = index % 2 === 1;
  const num = String(index + 1).padStart(2, "0");

  return (
    <article id={service.id} aria-labelledby={`${service.id}-titulo`} className="scroll-mt-28 border-t border-wine/10 py-16 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Visual: a cor do serviço em nail art */}
        <Reveal className={cn("lg:col-span-5", flip && "lg:order-2 lg:col-start-8")}>
          <TiltCard intensity={4} className="rounded-[28px]">
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] sm:aspect-[5/5] lg:aspect-[4/5]"
              style={{ background: `radial-gradient(110% 80% at 50% 105%, ${polish.hex}55, transparent 62%), linear-gradient(165deg, #F5EDE6 0%, #FAF7F2 70%)` }}
            >
              <div className="absolute inset-x-6 top-6 flex items-start justify-between md:inset-x-8 md:top-8">
                <span className="eyebrow text-muted">Cor sugerida</span>
                <span className="font-display text-4xl font-light italic leading-none text-wine/70" aria-hidden>
                  {num}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center px-6 pb-20 pt-16 transition-transform duration-700 ease-out group-hover:scale-[1.05]">
                <NailArt design={art.design} shape={art.shape} length={art.length} colors={colors} label={`Ilustração de unhas na cor ${polish.name} para ${service.name}`} />
              </div>
              <div className="absolute inset-x-6 bottom-6 flex items-center gap-3 rounded-full bg-cream/85 py-2 pl-2 pr-5 backdrop-blur md:inset-x-8 md:bottom-8">
                <span className="gloss h-9 w-9 shrink-0 rounded-full ring-1 ring-ink/10" style={{ background: polish.hex }} aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-display text-lg text-ink">{polish.name}</span>
                  <span className="block text-xs text-muted">Acabamento {finishLabel[polish.finish].toLowerCase()}</span>
                </span>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Conteúdo */}
        <div className={cn("lg:col-span-7", flip && "lg:order-1 lg:col-start-1")}>
          <Reveal>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/60 text-wine">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="eyebrow text-muted">
                Serviço {num} <span className="text-wine/80">/ {String(total).padStart(2, "0")}</span>
              </span>
            </div>
            <h2 id={`${service.id}-titulo`} className="display-md mt-6 text-balance text-ink">
              {service.name}
            </h2>
            <p className="serif-accent mt-4 max-w-xl text-xl leading-snug text-wine md:text-2xl">{service.short}</p>
            <p className="mt-5 max-w-xl leading-relaxed text-muted">{service.description}</p>

            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-wine/15 bg-cream px-4 py-2 text-sm text-ink">
              <Clock className="h-4 w-4 text-wine" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">Duração: </span>
              {service.durationLabel}
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10">
            <div>
              <h3 className="eyebrow text-muted">O que inclui</h3>
              <ul className="mt-4 space-y-3">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-[0.95rem] leading-snug text-ink-soft">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow text-muted">Indicado para</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {service.idealFor.map((tag) => (
                  <li key={tag} className="rounded-full bg-sand px-3.5 py-1.5 text-sm text-ink-soft ring-1 ring-inset ring-blush-deep/60">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Button href={whatsappLink(bookServiceMessage(service.name))} external variant="wine" size="lg" icon={<WhatsAppIcon className="h-[18px] w-[18px]" />} aria-label={`Agendar ${service.name} pelo WhatsApp`}>
              Agendar pelo WhatsApp
            </Button>
            <TransitionLink
              href={`/agendamento?servico=${service.id}`}
              className="group/link inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-wine/30 underline-offset-[6px] transition-colors hover:text-wine hover:decoration-wine"
            >
              Escolher dia e horário
              <span className="sr-only"> para {service.name}</span>
              <span aria-hidden className="transition-transform duration-500 group-hover/link:translate-x-1">
                →
              </span>
            </TransitionLink>
          </Reveal>
        </div>
      </div>
    </article>
  );
}
