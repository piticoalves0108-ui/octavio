import type { ReactNode } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** Abertura editorial das páginas internas, com trilha de navegação. Use *asteriscos* para o itálico. */
export function PageHeader({ eyebrow, title, intro, aside }: { eyebrow: string; title: string; intro?: string; aside?: ReactNode }) {
  return (
    <header className="container-x pb-12 pt-36 md:pb-16 md:pt-44">
      <nav aria-label="Trilha de navegação" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <li>
            <TransitionLink href="/" className="hover:text-wine">
              Início
            </TransitionLink>
          </li>
          <li className="flex items-center gap-2" aria-current="page">
            <span aria-hidden>/</span>
            <span className="text-ink">{eyebrow}</span>
          </li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <SectionLabel>{eyebrow}</SectionLabel>
          <RevealText as="h1" text={title} className="display-xl mt-6 text-ink" />
        </div>
        {(intro || aside) && (
          <Reveal delay={0.3} className="lg:col-span-4">
            {intro && <p className="text-lg leading-relaxed text-muted">{intro}</p>}
            {aside}
          </Reveal>
        )}
      </div>
    </header>
  );
}
