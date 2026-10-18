"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { CalendarHeart } from "lucide-react";
import { brand } from "@/data/brand";
import { getPolish, polishes } from "@/data/colors";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/ui/RevealText";
import { PaintSwatch } from "@/components/features/PaintSwatch";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { useNearViewport } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useMedia";
import { useSiteLoaded } from "@/hooks/useSiteLoaded";
import { useWebGL } from "@/hooks/useWebGL";
import { whatsappLink } from "@/lib/whatsapp";

const HeroBottleCanvas = dynamic(() => import("@/components/three/HeroBottleCanvas"), { ssr: false });

const heroColors = ["vinho-noir", "coral-brisa", "nude-lumi", "rose-seda", "cromado-rose", "salvia", "glitter-rose"];

/**
 * Hero: frasco 3D com reflexos que seguem o mouse. Os swatches trocam a cor do esmalte
 * dentro do frasco (e o brilho do fundo acompanha a cor escolhida).
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const loaded = useSiteLoaded();
  const reduced = useReducedMotion();
  const near = useNearViewport(section, "0px");
  const webgl = useWebGL();
  const [polishId, setPolishId] = useState("vinho-noir");
  const polish = getPolish(polishId);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => (progress.current = v));
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={section} aria-label="Apresentação" className="relative min-h-[100svh] overflow-hidden bg-[linear-gradient(160deg,#faf7f2_0%,#f5ede6_45%,#e8d5ce_100%)]">
      {/* Brilho colorido que acompanha a cor escolhida */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[10%] h-[70vmin] w-[70vmin] rounded-full opacity-40 blur-[90px] transition-colors duration-1000 max-md:right-[-30%] max-md:top-[2%]"
        style={{ background: polish.hex }}
      />
      <p aria-hidden className="pointer-events-none absolute -bottom-[0.18em] left-[-0.04em] select-none font-display text-[34vw] italic leading-none text-wine/[0.05]">
        Lumi
      </p>

      {/* Frasco 3D */}
      <div className="absolute inset-0 max-md:top-[4%] max-md:h-[52%]">
        {webgl !== false && <HeroBottleCanvas color={polish.hex} finish={polish.finish} progress={progress} visible={near} reduced={reduced} />}
      </div>

      <motion.div style={{ y: textY, opacity: textOpacity }} className="container-x relative flex min-h-[100svh] flex-col justify-end pb-14 pt-32 md:justify-center md:pb-24">
        <div className="max-w-xl max-md:mt-[46svh]">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={loaded ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} className="eyebrow mb-6 flex items-center gap-3 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Esmalteria · {brand.location.city}
          </motion.p>
          <RevealText as="h1" text={"Seu momento\nde *brilho*."} trigger="loaded" delay={0.1} className="display-xl text-ink [&_.serif-accent]:text-wine" />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={loaded ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-muted md:text-lg">
              Nail design, esmaltação em gel, alongamento e spa dos pés num espaço leve, perfumado e sem pressa. O cuidado que suas mãos merecem.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={whatsappLink("Olá, Lumi! Gostaria de agendar um horário.")} external variant="wine" size="lg" arrow={false} icon={<WhatsAppIcon className="h-5 w-5" />}>
                Agendar pelo WhatsApp
              </Button>
              <Button href="/agendamento" variant="outline" size="lg" arrow={false} icon={<CalendarHeart className="h-5 w-5" strokeWidth={1.5} />}>
                Escolher horário
              </Button>
            </div>
            <div className="mt-10">
              <p className="eyebrow mb-3 text-muted">
                Pinte o frasco · <span className="normal-case tracking-normal text-ink">{polish.name}</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cor do esmalte no frasco">
                {heroColors.map((id) => (
                  <PaintSwatch key={id} polish={polishes.find((p) => p.id === id)!} size={34} showLabel={false} selected={polishId === id} onSelect={setPolishId} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div style={{ opacity: textOpacity }} className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-3 text-muted md:flex">
        <span className="eyebrow">Role para descobrir</span>
        <span className="relative block h-10 w-px overflow-hidden bg-ink/15">
          <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-wine" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        </span>
      </motion.div>
    </section>
  );
}
