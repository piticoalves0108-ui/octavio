"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { brand } from "@/data/brand";
import { whyUs } from "@/data/content";
import { img } from "@/data/images";
import { SmartImage } from "@/components/ui/SmartImage";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section className="container-x py-24 md:py-36">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionLabel index="03">Diferenciais</SectionLabel>
            <RevealText as="h2" className="display-lg mt-6" text={`Por que *${brand.name}*?`} />
            <div ref={ref} className="relative mt-10 aspect-[4/5] overflow-hidden bg-sand">
              <motion.div style={{ y }} className="absolute inset-[-14%]">
                <SmartImage src={img.workshop[0]} alt="Marceneiro trabalhando na fábrica" sizes="(min-width: 1024px) 40vw, 100vw" fallbackLabel="Nossa fábrica" />
              </motion.div>
              <div className="absolute bottom-0 left-0 bg-linen px-5 py-4">
                <p className="eyebrow text-stone">Fábrica própria</p>
                <p className="font-display text-xl">Do corte à montagem</p>
              </div>
            </div>
          </div>
        </div>

        <ol className="lg:col-span-6 lg:col-start-7">
          {whyUs.map((item, i) => (
            <Reveal as="li" key={item.title} delay={0.05} className="group border-t border-graphite/15 py-10 last:border-b">
              <div className="flex items-start justify-between gap-6">
                <span className="font-display text-sm italic text-stone">0{i + 1}</span>
                <div className="flex-1">
                  <h3 className="font-display text-3xl font-light transition-transform duration-700 ease-out-expo group-hover:translate-x-2 md:text-4xl">{item.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-stone">{item.text}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-display text-4xl font-light text-wood-deep">{item.stat}</p>
                  <p className="mt-1 max-w-[9rem] text-xs text-stone">{item.statLabel}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
