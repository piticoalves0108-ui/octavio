"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { fullProcess } from "@/data/content";
import { Reveal } from "@/components/ui/Reveal";

/** Linha do tempo completa do atendimento, com o traço avançando conforme o scroll. */
export function Timeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 60%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });

  return (
    <ol ref={ref} className="relative">
      <div className="absolute bottom-0 left-[23px] top-0 w-px bg-graphite/15 md:left-1/2" />
      <motion.div style={{ scaleY }} className="absolute bottom-0 left-[23px] top-0 w-px origin-top bg-wood md:left-1/2" />
      {fullProcess.map((s, i) => (
        <li key={s.n} className="relative grid gap-6 pb-20 pl-16 md:grid-cols-2 md:gap-20 md:pl-0">
          <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-graphite/15 bg-linen font-display italic md:left-1/2 md:-translate-x-1/2">{s.n}</span>
          <Reveal className={i % 2 ? "md:order-2 md:pl-10" : "md:pr-10 md:text-right"}>
            <p className="eyebrow text-wood-deep">{s.duration}</p>
            <h3 className="mt-3 font-display text-4xl font-light md:text-5xl">{s.title}</h3>
            <p className="mt-4 text-lg leading-relaxed text-stone">{s.text}</p>
          </Reveal>
          <Reveal delay={0.1} className={i % 2 ? "md:order-1 md:pr-10" : "md:pl-10"}>
            <div className="rounded-3xl bg-paper p-6 md:p-8">
              <p className="eyebrow text-stone">Você recebe</p>
              <ul className="mt-4 space-y-2">
                {s.deliverables.map((d) => (
                  <li key={d} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-olive" strokeWidth={1.5} />
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-graphite/10 pt-4 text-sm text-stone">
                <span className="font-semibold text-graphite">Sua parte: </span>
                {s.you}
              </p>
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
