import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { getCategory, getStyle } from "@/data/categories";
import { renderFallback } from "@/data/images";
import { TiltCard } from "@/components/ui/TiltCard";
import { SmartImage } from "@/components/ui/SmartImage";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { cn } from "@/lib/utils";

/** Card editorial de projeto: inclinação 3D, zoom na foto e rótulo "Ver projeto" no cursor. */
export function ProjectCard({ project, aspect = "aspect-[4/5]", className, sizes = "(min-width: 1024px) 33vw, 100vw", preload }: { project: Project; aspect?: string; className?: string; sizes?: string; preload?: boolean }) {
  const cat = getCategory(project.category);
  return (
    <TransitionLink href={`/projetos/${project.slug}`} className={cn("block", className)} data-cursor-label="Ver projeto" aria-label={`${project.name}: ${cat.name}, ${getStyle(project.style).name}`}>
      <TiltCard intensity={5}>
        <article>
          <div className={cn("relative overflow-hidden bg-sand", aspect)}>
            <div className="absolute inset-0 transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.06]">
              <SmartImage src={project.cover} alt={`${project.name}, ${cat.name.toLowerCase()} ${getStyle(project.style).name.toLowerCase()}`} sizes={sizes} fallbackLabel={project.name} fallbackSrc={renderFallback[project.category]} preload={preload} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-graphite/45 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
            <span className="absolute left-4 top-4 rounded-full bg-paper/90 px-3 py-1 text-[0.65rem] font-semibold tracking-wider text-graphite backdrop-blur">{cat.name}</span>
            <span className="absolute bottom-4 right-4 flex h-11 w-11 translate-y-3 items-center justify-center rounded-full bg-paper text-graphite opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowUpRight className="h-5 w-5" strokeWidth={1.5} />
            </span>
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-light leading-tight">{project.name}</h3>
              <p className="mt-1 text-sm text-stone">{project.location}</p>
            </div>
            <p className="shrink-0 text-right text-xs leading-relaxed text-stone">
              {getStyle(project.style).name}
              <br />
              {project.area} m² · {project.year}
            </p>
          </div>
        </article>
      </TiltCard>
    </TransitionLink>
  );
}
