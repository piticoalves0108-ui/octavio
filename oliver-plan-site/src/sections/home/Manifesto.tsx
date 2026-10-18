import { brand } from "@/data/brand";
import { Counter } from "@/components/ui/Counter";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function Manifesto() {
  return (
    <section className="container-x py-24 md:py-36">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <SectionLabel index="01">Manifesto</SectionLabel>
        </div>
        <div className="lg:col-span-9">
          <RevealText
            as="h2"
            className="display-md text-balance"
            text="Não vendemos móveis de catálogo. Desenhamos *marcenaria* que se encaixa na arquitetura, na rotina e na história de cada casa."
          />
          <Reveal delay={0.2} className="mt-10 grid max-w-3xl gap-6 text-stone md:grid-cols-2">
            <p className="leading-relaxed">
              Da primeira conversa à última regulagem de dobradiça, um único time cuida do seu projeto: arquitetos, projetistas, marceneiros e montadores da {brand.name}.
            </p>
            <p className="leading-relaxed">
              O resultado é um ambiente que parece ter nascido com a casa, com materiais nobres, ferragens europeias e acabamento de ateliê.
            </p>
          </Reveal>
        </div>
      </div>

      <dl className="mt-20 grid grid-cols-2 border-t border-graphite/15 lg:grid-cols-4">
        {brand.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="flex flex-col border-b border-graphite/15 py-8 pr-6 lg:border-b-0 lg:border-r lg:last:border-r-0 lg:[&:not(:first-child)]:pl-8">
            <dt className="order-2 mt-3 text-sm text-stone">{s.label}</dt>
            <dd className="font-display text-5xl font-light tracking-tight md:text-6xl">
              <Counter value={s.value} suffix={s.suffix} prefix={s.prefix} />
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
