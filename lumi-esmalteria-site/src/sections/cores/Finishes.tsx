import { finishLabel, polishes, type Finish } from "@/data/colors";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { finishBackground } from "./finishStyles";
import { FinishFilterButton } from "./FinishFilterButton";

/** Bolinhas de cor por cartão (o resto vira "+N") */
const MAX_DOTS = 5;

const finishes: { id: Finish; text: string; ideal: string }[] = [
  { id: "cremoso", text: "Cor plena e uniforme, sem partículas. O clássico que vai do escritório ao jantar sem pedir licença.", ideal: "Dia a dia, nudes e vermelhos" },
  { id: "perolado", text: "Um véu de seda sobre a cor: reflexos suaves que mudam com a luz e deixam as mãos mais luminosas.", ideal: "Rosés, lilases e tons delicados" },
  { id: "metalico", text: "Efeito espelho, intenso e moderno. A luz desliza pela unha como num frasco de perfume.", ideal: "Festas, noivas e ocasiões especiais" },
  { id: "glitter", text: "Partículas finas que pegam a luz em cada gesto. Brilho de festa, sem exagero.", ideal: "Pontas, detalhes e datas comemorativas" },
];

/** Três unhas em leque com o acabamento aplicado (CSS puro, sem imagem). */
function FinishSample({ finish }: { finish: Finish }) {
  const tones = polishes.filter((p) => p.finish === finish);
  const picks = [0, 1, 2].map((i) => tones[i % tones.length]);
  const rot = [-11, 0, 11];
  return (
    <div aria-hidden className="relative flex h-52 items-end justify-center overflow-hidden rounded-[22px] bg-sand pb-0 md:h-56">
      <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.8),transparent_70%)]" />
      <div className="relative flex translate-y-6 items-end gap-2.5 transition-transform duration-700 ease-out-expo group-hover:translate-y-2">
        {picks.map((p, i) => (
          <span
            key={i}
            className="relative block h-36 w-[4.1rem] overflow-hidden rounded-[999px_999px_20px_20px] shadow-[0_18px_30px_-16px_rgba(139,41,66,0.45)] ring-1 ring-black/5"
            style={{ background: finishBackground(finish, p.hex), transform: `rotate(${rot[i]}deg) translateY(${i === 1 ? -10 : 0}px)` }}
          >
            {/* reflexo de gel */}
            <span className="absolute left-[22%] top-[12%] h-[55%] w-[16%] rounded-full bg-gradient-to-b from-white/70 to-white/0" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Explicação dos quatro acabamentos, com amostras desenhadas e as cores de cada um. */
export function Finishes() {
  return (
    <section aria-label="Acabamentos" className="bg-sand/60 py-20 md:py-28">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="03">Acabamentos</SectionLabel>
            <RevealText as="h2" text={"Quatro jeitos\nde *brilhar*"} className="display-lg mt-6 text-ink" />
          </div>
          <Reveal delay={0.15} className="lg:col-span-4 lg:col-start-9">
            <p className="leading-relaxed text-muted">A mesma cor muda de personalidade com o acabamento. Na dúvida, a gente mostra as amostras na hora, com a luz do espaço.</p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-5">
          {finishes.map((f, i) => {
            const tones = polishes.filter((p) => p.finish === f.id);
            return (
              <Reveal
                as="li"
                key={f.id}
                delay={i * 0.08}
                className="group flex flex-col rounded-[28px] bg-cream p-3 transition-shadow duration-700 hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]"
              >
                <FinishSample finish={f.id} />
                <div className="flex flex-1 flex-col px-4 pb-5 pt-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-3xl leading-none text-ink">{finishLabel[f.id]}</h3>
                    <span className="font-display text-lg italic text-blush-deep" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">{f.text}</p>
                  <p className="mt-4 text-sm text-ink-soft">
                    <span className="eyebrow mr-2 text-wine">Ideal para</span>
                    {f.ideal}
                  </p>
                  <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between gap-3 border-t border-wine/10 pt-5">
                      <FinishFilterButton finish={f.id}>
                        {tones.length === 1 ? "Ver a cor" : `Ver as ${tones.length} cores`}
                      </FinishFilterButton>
                      <span className="flex shrink-0 items-center -space-x-1.5" title={tones.map((t) => t.name).join(", ")}>
                        {tones.slice(0, MAX_DOTS).map((t) => (
                          <span key={t.id} aria-hidden className="h-5 w-5 rounded-full ring-2 ring-cream" style={{ background: finishBackground(t.finish, t.hex) }} />
                        ))}
                        {tones.length > MAX_DOTS && (
                          <span aria-hidden className="relative grid h-5 min-w-5 place-items-center rounded-full bg-sand px-1 text-[0.6rem] tabular-nums text-muted ring-2 ring-cream">
                            +{tones.length - MAX_DOTS}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
