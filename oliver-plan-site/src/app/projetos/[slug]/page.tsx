import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { projects, getProject, relatedProjects } from "@/data/projects";
import { getCategory, getStyle, getMaterialType } from "@/data/categories";
import { brand } from "@/data/brand";
import { ProjectHero } from "@/components/features/ProjectHero";
import { Gallery } from "@/components/features/Gallery";
import { Elevation } from "@/components/features/Elevation";
import { FinishList } from "@/components/features/FinishList";
import { Tour3D } from "@/components/features/Tour3D";
import { BeforeAfterSlider } from "@/components/features/BeforeAfterSlider";
import { ProjectCard } from "@/components/features/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/whatsapp";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  const title = `${p.name} · ${getCategory(p.category).name} ${getStyle(p.style).name.toLowerCase()}`;
  return {
    title,
    description: p.summary,
    alternates: { canonical: `/projetos/${p.slug}` },
    openGraph: { title, description: p.summary, images: [{ url: `${p.cover}?w=1200&h=630&fit=crop&auto=format`, width: 1200, height: 630, alt: p.name }] },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const cat = getCategory(project.category);
  const related = relatedProjects(project);
  const quoteHref = `/contato?ambiente=${project.category}&estilo=${project.style}&projeto=${project.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: project.summary,
    image: project.gallery,
    dateCreated: String(project.year),
    creator: { "@type": "Organization", name: brand.name },
    locationCreated: project.location,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProjectHero project={project} />

      {/* Conceito + ficha */}
      <section className="container-x grid gap-14 py-24 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionLabel index="01">O projeto</SectionLabel>
          <RevealText as="h2" className="display-md mt-6 text-balance" text={project.summary} />
          <Reveal delay={0.15} className="mt-10 space-y-5 text-lg leading-relaxed text-stone">
            {project.description.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </Reveal>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {project.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-wood" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-28">
            <dl className="divide-y divide-graphite/10 border-y border-graphite/10 text-sm">
              {[
                ["Ambiente", cat.name],
                ["Estilo", getStyle(project.style).name],
                ["Material", getMaterialType(project.material).name],
                ["Área", `${project.area} m²`],
                ["Prazo de produção", `${project.productionDays} dias`],
                ["Arquitetura", project.architect ?? `Equipe ${brand.name}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-4">
                  <dt className="text-stone">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-col gap-3">
              <Button href={quoteHref} size="lg" className="w-full">
                Solicitar orçamento
              </Button>
              <Button
                href={whatsappLink(`Olá! Vi o projeto "${project.name}" no site e gostaria de algo parecido.`)}
                external
                variant="outline"
                size="lg"
                arrow={false}
                magnetic={false}
                className="w-full"
                icon={<WhatsAppIcon className="h-5 w-5" />}
              >
                Falar sobre este projeto
              </Button>
            </div>
          </div>
        </aside>
      </section>

      {/* Galeria editorial */}
      <section aria-label="Galeria" className="container-x pb-24 md:pb-32">
        <Gallery images={project.gallery} title={project.name} />
      </section>

      {/* Tour 3D */}
      <section className="bg-sand/60 py-24 md:py-32">
        <div className="container-x mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel index="02">Tour 3D</SectionLabel>
            <h2 className="display-md mt-6 max-w-xl">Entre no ambiente e troque os acabamentos.</h2>
          </div>
          <p className="max-w-sm text-stone">Arraste para olhar ao redor, use os pontos de vista e toque nos marcadores para ver os detalhes de marcenaria.</p>
        </div>
        <div className="container-x">
          <Tour3D preset={cat.tour} />
        </div>
      </section>

      {/* Materiais, acabamentos e ferragens */}
      <section className="container-x grid gap-16 py-24 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionLabel index="03">Materiais utilizados</SectionLabel>
          <div className="mt-8">
            <FinishList items={project.finishes} />
          </div>
        </div>
        <div className="space-y-12 lg:col-span-5 lg:col-start-8">
          <div>
            <SectionLabel index="04">Ferragens</SectionLabel>
            <ul className="mt-8 space-y-3">
              {project.hardware.map((h) => (
                <li key={h} className="flex gap-3 border-b border-graphite/10 pb-3 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-wood" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel index="05">Acabamentos</SectionLabel>
            <ul className="mt-8 space-y-3">
              {project.details.map((h) => (
                <li key={h} className="flex gap-3 border-b border-graphite/10 pb-3 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-wood" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Medidas */}
      <section className="container-x pb-24 md:pb-32">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionLabel index="06">Medidas</SectionLabel>
            <h2 className="display-md mt-6">Desenhado ao milímetro.</h2>
            <dl className="mt-8 divide-y divide-graphite/10 border-y border-graphite/10 text-sm">
              {project.dimensions.map((d) => (
                <div key={d.label} className="flex justify-between gap-6 py-4">
                  <dt className="text-stone">{d.label}</dt>
                  <dd className="tabular-nums">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Reveal className="lg:col-span-8">
            <Elevation project={project} />
          </Reveal>
        </div>
      </section>

      {/* Antes e depois */}
      {project.before && (
        <section className="container-x pb-24 md:pb-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-4">
              <SectionLabel index="07">Antes e depois</SectionLabel>
              <h2 className="display-md mt-6">Da obra à entrega.</h2>
              <p className="mt-4 text-stone">Arraste o divisor para comparar o espaço na visita técnica com o ambiente entregue.</p>
            </div>
            <div className="lg:col-span-8">
              <BeforeAfterSlider before={project.before} after={project.after ?? project.cover} alt={project.name} />
            </div>
          </div>
        </section>
      )}

      {/* Relacionados */}
      <section className="border-t border-graphite/10 bg-paper py-24 md:py-32">
        <div className="container-x">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="display-md">Projetos relacionados</h2>
            <Button href="/portfolio" variant="outline">
              Ver portfólio
            </Button>
          </div>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Barra fixa de orçamento no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-graphite/10 bg-linen/90 p-3 backdrop-blur-lg md:hidden">
        <a href={quoteHref} className="flex h-12 flex-1 items-center justify-center rounded-full bg-graphite text-sm font-medium text-linen">
          Solicitar orçamento
        </a>
        <a href={whatsappLink(`Olá! Vi o projeto "${project.name}" no site.`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full bg-wood text-paper">
          <WhatsAppIcon className="h-5 w-5" />
        </a>
      </div>
    </>
  );
}
