import { Coffee, Flower2, Music2, ShieldCheck, Sun, type LucideIcon } from "lucide-react";
import { NailArt } from "@/components/features/NailArt";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

interface Tile {
  title: string;
  text: string;
  icon: LucideIcon;
  className: string;
  dark?: boolean;
  visual: React.ReactNode;
}

/** Composições decorativas (sem fotos) para cada sensação do espaço */
const tiles: Tile[] = [
  {
    title: "Luz natural",
    text: "Um ambiente claro e sereno, com luz suave que valoriza a cor real do esmalte e acalma o olhar.",
    icon: Sun,
    className: "sm:col-span-2 lg:col-span-4 lg:row-span-2",
    visual: (
      <div aria-hidden className="absolute inset-0 overflow-hidden bg-[linear-gradient(170deg,#FAF7F2_0%,#F5EDE6_45%,#E8D5CE_100%)]">
        {/* Feixes de luz */}
        <div className="absolute -left-1/4 -top-1/3 h-[160%] w-1/3 rotate-[28deg] bg-gradient-to-b from-white/90 via-white/40 to-transparent blur-xl" />
        <div className="absolute left-[22%] -top-1/3 h-[160%] w-1/6 rotate-[28deg] bg-gradient-to-b from-white/70 via-white/25 to-transparent blur-lg" />
        <div className="absolute right-[6%] top-[8%] h-28 w-28 rounded-full bg-[radial-gradient(circle,#fff7ea_0%,rgba(200,162,122,0.25)_45%,transparent_70%)]" />
        <div className="absolute inset-x-[10%] bottom-[4%] top-[18%]">
          <NailArt design="micro-french" shape="amendoada" colors={["#F3E6E0", "#8B2942"]} length="media" label="Micro francesinha vinho sobre base leitosa" />
        </div>
      </div>
    ),
  },
  {
    title: "Aromas",
    text: "Notas florais e amadeiradas que recebem você na porta e ficam na lembrança.",
    icon: Flower2,
    className: "lg:col-span-2",
    visual: (
      <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,#F5EDE6,#EBDCD4)]">
        {[0, 1, 2, 3].map((k) => (
          <span
            key={k}
            className="absolute rounded-full border border-wine/15"
            style={{ width: `${30 + k * 22}%`, aspectRatio: "1", animation: `lumi-breathe 5s ${k * 0.6}s ease-in-out infinite` }}
          />
        ))}
        <span className="h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#E6A6AE_55%,#B9918A)] shadow-[0_10px_30px_-10px_rgba(139,41,66,0.5)]" />
      </div>
    ),
  },
  {
    title: "Café e chá",
    text: "Um cafezinho passado ou um chá quente enquanto o gel cura. Detalhe faz diferença.",
    icon: Coffee,
    className: "lg:col-span-2",
    visual: (
      <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(200deg,#EFE1D8,#E2CDBF)]">
        <span className="relative flex aspect-square w-[42%] max-w-36 items-center justify-center rounded-full bg-cream shadow-[0_25px_40px_-20px_rgba(90,50,30,0.5)]">
          <span className="flex aspect-square w-[74%] items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_45%,#E9D3BC_0%,#C79B73_40%,#7A4E33_100%)]">
            <span className="h-1/3 w-1/4 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[#F3E3D0]/80" />
          </span>
          <span className="absolute -right-[18%] top-1/2 h-[30%] w-[22%] -translate-y-1/2 rounded-r-full border-[6px] border-l-0 border-cream" />
        </span>
      </div>
    ),
  },
  {
    title: "Playlist pensada",
    text: "Som baixinho e escolhido a dedo: bossa, jazz e vozes suaves para desacelerar.",
    icon: Music2,
    className: "lg:col-span-3",
    visual: (
      <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-[3%] bg-[linear-gradient(170deg,#E8D5CE,#D9BDB3)] px-[12%] pb-[16%]">
        {[0.45, 0.8, 0.6, 1, 0.7, 0.9, 0.5, 0.75, 0.4].map((h, k) => (
          <span
            key={k}
            className="w-full origin-bottom rounded-full bg-gradient-to-t from-wine to-coral/80"
            style={{ height: `${h * 62}%`, animation: `lumi-eq 1.6s ${k * 0.14}s ease-in-out infinite alternate` }}
          />
        ))}
      </div>
    ),
  },
  {
    title: "Biossegurança",
    text: "Materiais esterilizados em autoclave, embalagens seladas, lixas de uso único e kits individuais em todo atendimento.",
    icon: ShieldCheck,
    className: "lg:col-span-3",
    dark: true,
    visual: (
      <div aria-hidden className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_80%_10%,rgba(255,107,122,0.35),transparent_55%),linear-gradient(160deg,#8B2942,#6C1F33)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full border border-cream/25 md:h-28 md:w-28">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream/10 backdrop-blur md:h-20 md:w-20">
              <ShieldCheck className="h-8 w-8 text-cream" strokeWidth={1.2} />
            </span>
          </span>
        </div>
        <span className="absolute left-[12%] top-[20%] h-2 w-2 rounded-full bg-cream/40" />
        <span className="absolute right-[18%] top-[30%] h-1.5 w-1.5 rounded-full bg-gold/70" />
        <span className="absolute bottom-[24%] left-[26%] h-1 w-1 rounded-full bg-cream/60" />
      </div>
    ),
  },
];

/** O espaço: a experiência sensorial da Lumi em um mosaico de composições. */
export function AboutSpace() {
  return (
    <section className="container-x py-20 md:py-28">
      <style>{`
        @keyframes lumi-eq { from { transform: scaleY(.45) } to { transform: scaleY(1) } }
        @keyframes lumi-breathe { 0%,100% { transform: scale(.92); opacity: .45 } 50% { transform: scale(1.06); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [style*="lumi-"] { animation: none !important } }
      `}</style>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="03">O espaço</SectionLabel>
          <RevealText as="h2" text={"Um refúgio para os *cinco sentidos*."} className="display-lg mt-8 text-ink" />
        </div>
        <Reveal delay={0.2} className="lg:col-span-5">
          <p className="text-lg leading-relaxed text-muted">
            Pensamos em cada detalhe para que a sua hora aqui seja leve: o que você vê, sente, ouve e saboreia. E, por trás de tudo, um cuidado rigoroso com a sua segurança.
          </p>
        </Reveal>
      </div>

      <ul className="mt-14 grid auto-rows-auto gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-6">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const big = i === 0;
          return (
            <Reveal as="li" key={t.title} delay={(i % 3) * 0.08} className={cn("h-full", t.className)}>
              <article
                className={cn(
                  "group flex h-full flex-col overflow-hidden rounded-[28px] shadow-[0_30px_60px_-40px_rgba(139,41,66,0.35)]",
                  t.dark ? "bg-wine-deep text-cream" : "bg-sand",
                )}
              >
                <div className={cn("relative w-full overflow-hidden", big ? "aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-[340px]" : "aspect-[16/10]")}>
                  <div className="absolute inset-0 transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.04]">{t.visual}</div>
                </div>
                <div className={cn("flex items-start gap-4 p-6 md:p-7", big && "lg:p-9")}>
                  <span className={cn("mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", t.dark ? "bg-cream/10 text-cream" : "bg-blush/70 text-wine")}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <h3 className={cn("font-display leading-tight", big ? "text-3xl md:text-4xl" : "text-2xl md:text-[1.75rem]", t.dark ? "text-cream" : "text-ink")}>{t.title}</h3>
                    <p className={cn("mt-2 leading-relaxed", t.dark ? "text-blush" : "text-muted", big && "md:text-lg")}>{t.text}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
