import { featuredProjects } from "@/data/projects";
import { ProjectCard } from "@/components/features/ProjectCard";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

/** Galeria editorial assimétrica com os projetos em destaque. */
export function ProjectsGallery() {
  const list = featuredProjects.slice(0, 6);
  const layout = [
    "lg:col-span-7",
    "lg:col-span-4 lg:col-start-9 lg:mt-40",
    "lg:col-span-4 lg:-mt-24",
    "lg:col-span-6 lg:col-start-6 lg:mt-16",
    "lg:col-span-5 lg:col-start-2",
    "lg:col-span-5 lg:col-start-8 lg:mt-24",
  ];
  const aspects = ["aspect-[4/3]", "aspect-[3/4]", "aspect-[3/4]", "aspect-[16/10]", "aspect-[4/5]", "aspect-[4/5]"];

  return (
    <section className="container-x py-24 md:py-36">
      <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <SectionLabel index="07">Portfólio</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6 max-w-3xl" text="Projetos que *já são casa*." />
        </div>
        <Button href="/portfolio" variant="outline">
          Ver portfólio completo
        </Button>
      </div>
      <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-12">
        {list.map((p, i) => (
          <Reveal key={p.slug} className={layout[i]} delay={(i % 2) * 0.1}>
            <ProjectCard project={p} aspect={aspects[i]} sizes={i === 0 || i === 3 ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 35vw, 100vw"} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
