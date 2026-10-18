import type { Metadata } from "next";
import { HeartHandshake, Leaf, PenTool, ShieldCheck } from "lucide-react";
import { brand } from "@/data/brand";
import { team, timeline, values } from "@/data/content";
import { img } from "@/data/images";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealText } from "@/components/ui/RevealText";
import { MaskReveal, Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import { TiltCard } from "@/components/ui/TiltCard";
import { Counter } from "@/components/ui/Counter";
import { Fabrication } from "@/sections/about/Fabrication";
import { CTASection } from "@/sections/home/CTASection";

export const metadata: Metadata = {
  title: "Sobre",
  description: `Conheça a ${brand.name}: design autoral, fábrica própria, sustentabilidade e um time de arquitetos e marceneiros dedicados a móveis planejados de alto padrão.`,
  alternates: { canonical: "/sobre" },
};

const icons = { PenTool, Leaf, ShieldCheck, HeartHandshake };

export default function SobrePage() {
  return (
    <>
      <PageHeader eyebrow="Sobre" title="Uma marcenaria que *pensa como arquiteto*." intro={`${brand.founded ? `Desde ${brand.founded}, unimos` : "Unimos"} projeto autoral, fábrica própria e montagem impecável para criar ambientes que duram gerações.`} />

      {/* História */}
      <section className="container-x grid gap-14 pb-24 md:pb-36 lg:grid-cols-12">
        <MaskReveal className="relative aspect-[4/5] bg-sand lg:col-span-6">
          <SmartImage src={img.workshop[1]} alt="Projeto de arquitetura sobre a mesa do ateliê" sizes="(min-width: 1024px) 50vw, 100vw" fallbackLabel="Ateliê" />
        </MaskReveal>
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-20">
          <SectionLabel index="01">Nossa história</SectionLabel>
          <RevealText as="h2" className="display-md mt-6" text="Começamos pelo *encaixe perfeito*." />
          <Reveal delay={0.15} className="mt-8 space-y-5 leading-relaxed text-stone">
            <p>
              A {brand.name} nasceu de uma obsessão simples: móveis planejados que parecem ter nascido com a casa. Sem frestas, sem improvisos, sem aquele armário que nunca fechou direito.
            </p>
            <p>
              Para isso, trouxemos o projeto para dentro da marcenaria. Cada ambiente é desenhado por arquitetos, aprovado em 3D e produzido na nossa fábrica, onde corte, fitamento e acabamento seguem padrões de mobiliário europeu.
            </p>
          </Reveal>
          <ol className="mt-12 space-y-6 border-l border-graphite/15 pl-6">
            {timeline.map((t, i) => (
              <Reveal as="li" key={t.year} delay={0.1 + i * 0.08} className="relative">
                <span className="absolute -left-[29px] top-2 h-2 w-2 rounded-full bg-wood" />
                <p className="eyebrow text-wood-deep">{t.year}</p>
                <p className="mt-1">{t.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Valores */}
      <section data-header="dark" data-cursor-theme="dark" className="bg-graphite py-24 text-linen md:py-36">
        <div className="container-x">
          <SectionLabel index="02" light>
            Valores
          </SectionLabel>
          <RevealText as="h2" className="display-lg mt-6 max-w-3xl" text="O que *não negociamos*." />
          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-linen/10 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => {
              const Icon = icons[v.icon];
              return (
                <Reveal key={v.title} delay={i * 0.08} className="bg-graphite p-8 md:p-10">
                  <Icon className="h-7 w-7 text-wood-light" strokeWidth={1.3} />
                  <h3 className="mt-10 font-display text-3xl font-light">{v.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-concrete">{v.text}</p>
                </Reveal>
              );
            })}
          </div>
          <dl className="mt-20 grid grid-cols-2 gap-8 lg:grid-cols-4">
            {brand.stats.map((s) => (
              <div key={s.label} className="flex flex-col border-t border-linen/15 pt-6">
                <dt className="order-2 mt-2 text-sm text-concrete">{s.label}</dt>
                <dd className="font-display text-5xl font-light">
                  <Counter value={s.value} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Fabricação */}
      <section className="container-x py-24 md:py-36">
        <SectionLabel index="03">Processo de fabricação</SectionLabel>
        <RevealText as="h2" className="display-lg mb-16 mt-6 max-w-3xl" text="Da chapa *à peça* acabada." />
        <Fabrication />
      </section>

      {/* Time */}
      <section className="bg-paper py-24 md:py-36">
        <div className="container-x">
          <div className="mb-16 grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel index="04">Time</SectionLabel>
              <RevealText as="h2" className="display-lg mt-6" text="Arquitetos, designers e *mestres marceneiros*." />
            </div>
            <p className="text-stone lg:col-span-4 lg:col-start-9">Um time multidisciplinar que acompanha o seu projeto do primeiro croqui à última regulagem.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.06}>
                <TiltCard intensity={5}>
                  <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                    <div className="absolute inset-0 grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0">
                      <SmartImage src={m.image} alt={`${m.name}, ${m.role}`} sizes="(min-width: 1024px) 20vw, 50vw" fallbackLabel={m.name} />
                    </div>
                  </div>
                  <p className="mt-4 font-display text-xl">{m.name}</p>
                  <p className="text-sm text-stone">{m.role}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTASection image={img.living[2]} title="Vamos conversar *sobre a sua casa*?" />
    </>
  );
}
