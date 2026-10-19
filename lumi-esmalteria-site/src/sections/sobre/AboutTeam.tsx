import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartImage } from "@/components/ui/SmartImage";
import { TiltCard } from "@/components/ui/TiltCard";
import { team } from "@/data/content";

/**
 * Equipe de nail designers. Atenção: nomes, funções e retratos em `team` são ilustrativos
 * (fotos de banco de imagens); troque pelas profissionais reais da Lumi antes de publicar.
 */
export function AboutTeam() {
  return (
    <section className="bg-sand py-20 md:py-28">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="04">Equipe</SectionLabel>
            <RevealText as="h2" text={"Mãos que *cuidam* das suas."} className="display-lg mt-8 text-ink" />
          </div>
          <Reveal delay={0.2} className="lg:col-span-5">
            <p className="text-lg leading-relaxed text-muted">
              Nail designers, cada uma com a sua especialidade, todas com o mesmo cuidado: escutar você antes de pegar no pincel.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 lg:mt-20 lg:grid-cols-4 lg:gap-x-7">
          {team.map((m, i) => (
            <Reveal as="li" key={m.name} delay={i * 0.08} className={i % 2 === 1 ? "lg:mt-16" : undefined}>
              <TiltCard intensity={6} className="overflow-hidden rounded-[28px] shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-blush">
                  <SmartImage
                    src={m.image}
                    alt={`Retrato de ${m.name}, ${m.role}`}
                    fallbackLabel={m.name}
                    sizes="(min-width: 1024px) 24vw, 48vw"
                    className="transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.05]"
                  />
                </div>
              </TiltCard>
              <div className="mt-5 px-1">
                <h3 className="font-display text-2xl leading-tight text-ink md:text-3xl">{m.name}</h3>
                <p className="mt-1.5 text-sm leading-snug text-muted">{m.role}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
