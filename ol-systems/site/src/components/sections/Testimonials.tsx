import { testimonials } from "@/config/content";
import { Reveal } from "../Reveal";
import { SectionTitle } from "../Title";

/** Só aparece quando houver depoimentos reais em content.ts. */
export function Testimonials() {
  if (testimonials.length === 0) return null;
  return (
    <section className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <SectionTitle index="09" label="Depoimentos" title="Quem já tem site com a gente." className="max-w-3xl" />
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <figure className="h-full rounded-3xl border border-line bg-panel/80 p-8">
              <blockquote className="text-lg leading-relaxed">“{t.text}”</blockquote>
              <figcaption className="mt-6 text-sm text-muted">
                <strong className="text-fg">{t.name}</strong> · {t.business}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
