"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { Project } from "@/data/projects";
import { getCategory, getStyle } from "@/data/categories";
import { renderFallback } from "@/data/images";
import { SmartImage } from "@/components/ui/SmartImage";
import { RevealText } from "@/components/ui/RevealText";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** Abertura do projeto: foto em tela cheia com parallax e ficha técnica resumida. */
export function ProjectHero({ project }: { project: Project }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const cat = getCategory(project.category);

  return (
    <section ref={ref} data-header="dark" data-cursor-theme="dark" className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink text-linen">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <SmartImage src={project.cover} alt={`${project.name}: ${cat.name.toLowerCase()} planejada`} sizes="100vw" preload fallbackLabel={project.name} fallbackSrc={renderFallback[project.category]} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/40" />
      <div className="container-x relative flex h-full flex-col justify-end pb-14 md:pb-20">
        <nav aria-label="Trilha de navegação" className="mb-8 text-xs text-linen/70">
          <TransitionLink href="/" className="hover:text-linen">
            Início
          </TransitionLink>{" "}
          /{" "}
          <TransitionLink href="/portfolio" className="hover:text-linen">
            Portfólio
          </TransitionLink>{" "}
          /{" "}
          <TransitionLink href={`/ambientes?categoria=${cat.id}`} className="hover:text-linen">
            {cat.plural}
          </TransitionLink>
        </nav>
        <p className="eyebrow text-wood-light">
          {cat.name} · {getStyle(project.style).name}
        </p>
        <RevealText as="h1" text={project.name} mode="chars" className="display-xl mt-4" />
        <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-6 border-t border-linen/20 pt-6 text-sm md:grid-cols-4">
          {[
            ["Local", project.location],
            ["Ano", String(project.year)],
            ["Área", `${project.area} m²`],
            ["Produção", `${project.productionDays} dias`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="eyebrow text-[0.6rem] text-linen/60">{k}</dt>
              <dd className="mt-1.5">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
