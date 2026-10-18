import type { ReactNode } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** Abertura editorial das páginas internas, com trilha de navegação. */
export function PageHeader({ eyebrow, title, intro, crumbs = [], aside }: { eyebrow: string; title: string; intro?: string; crumbs?: { href: string; label: string }[]; aside?: ReactNode }) {
  return (
    <header className="container-x pb-14 pt-36 md:pb-20 md:pt-48">
      <nav aria-label="Trilha de navegação" className="mb-10">
        <ol className="flex flex-wrap items-center gap-2 text-xs text-stone">
          <li>
            <TransitionLink href="/" className="hover:text-graphite">
              Início
            </TransitionLink>
          </li>
          {crumbs.map((c) => (
            <li key={c.href} className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <TransitionLink href={c.href} className="hover:text-graphite">
                {c.label}
              </TransitionLink>
            </li>
          ))}
          <li className="flex items-center gap-2" aria-current="page">
            <span aria-hidden>/</span>
            <span className="text-graphite">{eyebrow}</span>
          </li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <SectionLabel>{eyebrow}</SectionLabel>
          <RevealText as="h1" text={title} className="display-xl mt-6" />
        </div>
        {(intro || aside) && (
          <Reveal delay={0.3} className="lg:col-span-4">
            {intro && <p className="text-lg leading-relaxed text-stone">{intro}</p>}
            {aside}
          </Reveal>
        )}
      </div>
    </header>
  );
}
