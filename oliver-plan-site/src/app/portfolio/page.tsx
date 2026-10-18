import type { Metadata } from "next";
import { Suspense } from "react";
import { projects } from "@/data/projects";
import { categories } from "@/data/categories";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectExplorer } from "@/components/features/ProjectExplorer";
import { BeforeAfterSlider } from "@/components/features/BeforeAfterSlider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealText } from "@/components/ui/RevealText";
import { Reveal } from "@/components/ui/Reveal";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { CTASection } from "@/sections/home/CTASection";

export const metadata: Metadata = {
  title: "Portfólio de projetos",
  description: "Projetos de móveis planejados entregues: cozinhas, closets, salas, home offices, quartos, banheiros e áreas gourmet. Filtre por ambiente e estilo e veja o antes e depois.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  const withBefore = projects.filter((p) => p.before);
  const totalArea = projects.reduce((s, p) => s + p.area, 0);

  return (
    <>
      <PageHeader
        eyebrow="Portfólio"
        title="Casas reais, *marcenaria* sob medida."
        intro="Uma seleção de projetos entregues. Filtre por ambiente e estilo ou busque por material, como ripado, nogueira ou travertino."
        aside={
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-graphite/10 pt-6">
            {[
              [String(projects.length), "projetos"],
              [String(categories.length), "tipologias"],
              [`${totalArea}`, "m² nesta seleção"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-4xl font-light">{v}</dd>
                <p className="text-xs text-stone">{l}</p>
              </div>
            ))}
          </dl>
        }
      />

      <section className="container-x pb-24 md:pb-32">
        <Suspense fallback={<div className="h-96" />}>
          <ProjectExplorer filters={["categoria", "estilo"]} layout="masonry" />
        </Suspense>
      </section>

      <section className="bg-sand/60 py-24 md:py-32">
        <div className="container-x">
          <SectionLabel index="02">Antes e depois</SectionLabel>
          <RevealText as="h2" className="display-lg mb-14 mt-6" text="Da obra *à entrega*." />
          <div className="grid gap-12 lg:grid-cols-2">
            {withBefore.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 2) * 0.1}>
                <BeforeAfterSlider before={p.before!} after={p.after ?? p.cover} alt={p.name} />
                <div className="mt-4 flex items-baseline justify-between">
                  <TransitionLink href={`/projetos/${p.slug}`} className="font-display text-2xl hover:text-wood-deep">
                    {p.name}
                  </TransitionLink>
                  <span className="text-sm text-stone">{p.location}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
