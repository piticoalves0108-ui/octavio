"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { MessagesSquare, Box, Hammer, Truck } from "lucide-react";
import { creativeProcess } from "@/data/content";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

const icons = [MessagesSquare, Box, Hammer, Truck];

/** Processo criativo em 4 etapas, com a linha do tempo desenhada conforme o scroll. */
export function ProcessSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scale = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <section data-header="dark" data-cursor-theme="dark" className="bg-graphite py-24 text-linen md:py-36">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="06" light>
              Processo criativo
            </SectionLabel>
            <RevealText as="h2" className="display-lg mt-6" text="Quatro etapas, *nenhuma surpresa*." />
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="leading-relaxed text-concrete">Um cronograma claro desde o primeiro encontro. Você sabe o que acontece em cada etapa, quem é o responsável e quando o ambiente fica pronto.</p>
            <div className="mt-6">
              <Button href="/processo" variant="light">
                Ver o processo completo
              </Button>
            </div>
          </div>
        </div>

        <div ref={ref} className="relative mt-20">
          <div className="absolute left-[19px] top-0 h-full w-px bg-linen/15 lg:left-0 lg:top-[19px] lg:h-px lg:w-full" />
          <motion.div style={{ scaleY: scale }} className="absolute left-[19px] top-0 h-full w-px origin-top bg-wood-light lg:hidden" />
          <motion.div style={{ scaleX: scale }} className="absolute left-0 top-[19px] hidden h-px w-full origin-left bg-wood-light lg:block" />

          <ol className="grid gap-12 lg:grid-cols-4 lg:gap-10">
            {creativeProcess.map((step, i) => {
              const Icon = icons[i];
              return (
                <Reveal as="li" key={step.n} delay={i * 0.12} className="relative pl-16 lg:pl-0 lg:pt-16">
                  <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-linen/25 bg-graphite text-wood-light">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <p className="font-display text-sm italic text-concrete">{step.n}</p>
                  <h3 className="mt-2 font-display text-3xl font-light">{step.title}</h3>
                  <p className="eyebrow mt-3 text-wood-light">{step.duration}</p>
                  <p className="mt-4 leading-relaxed text-concrete">{step.text}</p>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
