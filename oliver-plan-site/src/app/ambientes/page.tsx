import type { Metadata } from "next";
import { Suspense } from "react";
import { categories } from "@/data/categories";
import { projects } from "@/data/projects";
import { renderFallback } from "@/data/images";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectExplorer } from "@/components/features/ProjectExplorer";
import { TiltCard } from "@/components/ui/TiltCard";
import { SmartImage } from "@/components/ui/SmartImage";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTASection } from "@/sections/home/CTASection";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ambientes planejados",
  description: "Cozinhas, closets, home offices, salas, quartos, banheiros e áreas gourmet planejados sob medida. Filtre por estilo, material e cor.",
  alternates: { canonical: "/ambientes" },
};

export default function AmbientesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ambientes"
        title="Marcenaria para *cada canto* da casa."
        intro="Sete tipologias, quatro estilos e uma única régua de qualidade. Explore os ambientes e filtre por estilo, material e cor."
      />

      {/* Grade de categorias */}
      <section aria-label="Categorias" className="container-x">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {categories.map((c, i) => {
            const count = projects.filter((p) => p.category === c.id).length;
            const span = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4", "lg:col-span-5", "lg:col-span-7"][i];
            return (
              <Reveal key={c.id} className={span} delay={(i % 3) * 0.08}>
                <TransitionLink href={`/ambientes?categoria=${c.id}#catalogo`} data-cursor-label="Filtrar" className="block">
                  <TiltCard intensity={4}>
                    <article className={cn("relative overflow-hidden bg-sand", i === 0 || i === 6 ? "aspect-[16/10]" : "aspect-[4/3]")}>
                      <div className="absolute inset-0 transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.06]">
                        <SmartImage src={c.image} alt={`${c.name} planejada`} sizes="(min-width: 1024px) 50vw, 100vw" fallbackLabel={c.name} fallbackSrc={renderFallback[c.id]} />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-graphite/75 via-graphite/10 to-transparent" />
                      <div className="absolute inset-x-6 bottom-6 text-paper">
                        <p className="eyebrow text-paper/70">
                          0{i + 1} · {count} {count === 1 ? "projeto" : "projetos"}
                        </p>
                        <h2 className="mt-2 font-display text-4xl font-light md:text-5xl">{c.plural}</h2>
                        <p className="mt-2 max-w-md text-sm text-paper/80">{c.description}</p>
                      </div>
                    </article>
                  </TiltCard>
                </TransitionLink>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Catálogo filtrável */}
      <section id="catalogo" className="container-x scroll-mt-24 py-24 md:py-32">
        <SectionLabel index="02">Catálogo de projetos</SectionLabel>
        <h2 className="display-md mb-10 mt-6 max-w-2xl">Filtre por estilo, material e cor.</h2>
        <Suspense fallback={<div className="h-96" />}>
          <ProjectExplorer />
        </Suspense>
      </section>

      <CTASection title="Não encontrou o *seu* ambiente?" />
    </>
  );
}
