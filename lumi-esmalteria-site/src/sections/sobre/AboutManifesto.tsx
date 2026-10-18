import { NailArt } from "@/components/features/NailArt";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";

/** Manifesto: a história da Lumi contada pelo autocuidado, com uma composição de nail art. */
export function AboutManifesto() {
  return (
    <section className="container-x py-20 md:py-28">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_25%_10%,rgba(255,255,255,0.9),transparent_55%),linear-gradient(165deg,#F5EDE6_0%,#E8D5CE_60%,#D9BDB3_100%)] shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]">
              <div className="absolute inset-x-[6%] top-[14%] h-[52%]">
                <NailArt design="solid" shape="amendoada" colors={["#E3BFAF"]} length="media" label="Unhas amendoadas em nude rosé, a cor da casa" />
              </div>
              <div className="absolute inset-x-8 bottom-8">
                <p className="font-display text-3xl italic leading-tight text-wine md:text-4xl">“Uma pausa que cabe na sua semana.”</p>
                <p className="eyebrow mt-4 text-muted">Lumi · Brasília</p>
              </div>
            </div>
            {/* Amostra flutuante */}
            <div aria-hidden className="absolute -bottom-6 -right-3 hidden h-28 w-28 animate-float rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff_0%,#FF6B7A_35%,#8B2942_100%)] shadow-[0_20px_40px_-15px_rgba(139,41,66,0.6)] sm:block lg:-right-8" />
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:pt-6">
          <SectionLabel index="01">Manifesto</SectionLabel>
          <RevealText
            as="h2"
            text={"Acreditamos que cuidar das mãos é um jeito *delicado* de cuidar de si."}
            className="display-md mt-8 text-balance text-ink"
          />
          <div className="mt-10 grid gap-8 text-[1.05rem] leading-relaxed text-muted sm:grid-cols-2">
            <Reveal delay={0.1}>
              <p>
                A Lumi nasceu de um desejo simples: transformar a ida à manicure em um momento seu. Um intervalo na rotina, sem pressa, em que alguém cuida de você com atenção
                a cada detalhe, da cutícula ao brilho final.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p>
                Aqui, técnica e acolhimento andam juntos. Cuidamos da saúde da unha natural antes da estética, escutamos o que você quer e criamos com você. O resultado é
                bonito porque foi feito com calma.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.3}>
            <blockquote className="mt-12 border-l border-wine/30 pl-6">
              <p className="font-display text-2xl italic leading-snug text-ink-soft md:text-3xl">
                Autocuidado não é luxo. É o tempo que você reserva para lembrar que também merece atenção.
              </p>
            </blockquote>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
