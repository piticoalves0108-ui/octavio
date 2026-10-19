import { Heart, Hourglass, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { values } from "@/data/content";

const icons: Record<string, LucideIcon> = { Hourglass, ShieldCheck, Sparkles, Heart };

/** Nossos valores: quatro cartões com ícone, título e texto. */
export function AboutValues() {
  return (
    <section className="bg-sand py-20 md:py-28">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="02">Nossos valores</SectionLabel>
            <RevealText as="h2" text={"O que guia *cada* atendimento."} className="display-lg mt-8 text-ink" />
          </div>
          <Reveal delay={0.2} className="lg:col-span-5">
            <p className="text-lg leading-relaxed text-muted">Quatro compromissos que você sente do primeiro olá ao último brilho do top coat.</p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {values.map((v, i) => {
            const Icon = icons[v.icon] ?? Sparkles;
            return (
              <Reveal as="li" key={v.title} delay={i * 0.08} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-cream p-7 shadow-[0_30px_60px_-40px_rgba(139,41,66,0.35)] transition-transform duration-700 ease-out-expo hover:-translate-y-1.5 md:p-8">
                  <span aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blush/50 blur-2xl transition-opacity duration-700 group-hover:opacity-100 md:opacity-60" />
                  <div className="relative flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush/70 text-wine transition-colors duration-500 group-hover:bg-wine group-hover:text-cream">
                      <Icon className="h-6 w-6" strokeWidth={1.4} aria-hidden />
                    </span>
                    <span className="font-display text-xl italic text-wine/80">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="relative mt-10 font-display text-[1.9rem] leading-tight text-ink">{v.title}</h3>
                  <p className="relative mt-4 leading-relaxed text-muted">{v.text}</p>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
