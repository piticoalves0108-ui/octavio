import { problem } from "@/config/content";
import { SectionTitle } from "../Title";
import { Reveal } from "../Reveal";

const ICONS = [
  // Lupa sem resultado
  <svg key="a" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-10 w-10" aria-hidden="true">
    <circle cx="21" cy="21" r="12" />
    <path d="m30 30 10 10M16 21h10" strokeLinecap="round" />
  </svg>,
  // Link improvisado
  <svg key="b" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-10 w-10" aria-hidden="true">
    <path d="M20 28l8-8M17 23l-4 4a6 6 0 0 0 8.5 8.5l4-4M31 25l4-4A6 6 0 0 0 26.5 12.5l-4 4" strokeLinecap="round" strokeDasharray="3 3" />
  </svg>,
  // Relógio errado
  <svg key="c" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-10 w-10" aria-hidden="true">
    <circle cx="24" cy="24" r="15" />
    <path d="M24 15v9l6 4" strokeLinecap="round" />
    <path d="m35 9 6 6m0-6-6 6" strokeLinecap="round" />
  </svg>,
];

export function Problem() {
  return (
    <section id="conteudo" className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <SectionTitle index="01" label={problem.label} title={problem.title} className="max-w-3xl" />
      <div className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
        {problem.cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <article className="group h-full rounded-3xl border border-line bg-panel/80 p-7 transition-colors duration-500 hover:border-line-strong lg:p-9">
              <div className="mb-10 flex items-start justify-between text-dim transition-colors group-hover:text-fg">
                {ICONS[i]}
                <span className="font-mono text-xs text-dim">0{i + 1}</span>
              </div>
              <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">{c.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{c.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
