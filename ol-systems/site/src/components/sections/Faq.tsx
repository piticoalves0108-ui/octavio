import { faq } from "@/config/content";
import { Fill } from "../Fill";
import { SectionTitle } from "../Title";

/** Accordion nativo (details/summary): acessível e sem JavaScript. */
export function Faq() {
  return (
    <section id="duvidas" className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionTitle index="10" label={faq.label} title={faq.title} />
        </div>
        <div className="divide-y divide-line border-y border-line lg:col-span-7 lg:col-start-6">
          {faq.items.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-left font-display text-lg font-bold tracking-tight transition-colors hover:text-white sm:text-xl">
                {f.q}
                <span className="relative grid h-9 w-9 flex-none place-items-center rounded-full border border-line-strong transition-colors group-open:border-white group-open:bg-white group-open:text-ink" aria-hidden="true">
                  <span className="absolute h-px w-3.5 bg-current" />
                  <span className="absolute h-3.5 w-px bg-current transition-transform duration-300 group-open:rotate-90 group-open:scale-0" />
                </span>
              </summary>
              <p className="max-w-2xl pb-7 pr-12 text-lg leading-relaxed text-muted">
                <Fill text={f.a} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
