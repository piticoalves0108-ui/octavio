"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fabrication } from "@/data/content";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";

/** Processo de fabricação: a imagem fixa à esquerda troca conforme cada etapa entra na tela. */
export function Fabrication() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.index))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="hidden lg:col-span-6 lg:block">
        <div className="sticky top-24 aspect-[4/5] overflow-hidden bg-sand">
          <AnimatePresence initial={false}>
            <motion.div key={active} className="absolute inset-0" initial={{ clipPath: "inset(100% 0 0 0)" }} animate={{ clipPath: "inset(0% 0 0 0)" }} exit={{ opacity: 0, transition: { delay: 0.5 } }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}>
              <SmartImage src={fabrication[active].image} alt={fabrication[active].title} sizes="45vw" fallbackLabel={fabrication[active].title} />
            </motion.div>
          </AnimatePresence>
          <span className="absolute bottom-5 left-5 rounded-full bg-paper/90 px-4 py-2 font-display text-sm italic">
            0{active + 1} / 0{fabrication.length}
          </span>
        </div>
      </div>
      <ol className="lg:col-span-5 lg:col-start-8">
        {fabrication.map((f, i) => (
          <li key={f.title} ref={(el) => void (items.current[i] = el)} data-index={i} className={cn("flex min-h-[38vh] flex-col justify-center border-t border-graphite/10 py-10 transition-opacity duration-500 lg:min-h-[60vh]", active === i ? "opacity-100" : "lg:opacity-35")}>
            <div className="relative mb-6 aspect-[16/10] overflow-hidden bg-sand lg:hidden">
              <SmartImage src={f.image} alt={f.title} sizes="100vw" fallbackLabel={f.title} />
            </div>
            <span className="font-display text-sm italic text-stone">0{i + 1}</span>
            <h3 className="mt-2 font-display text-4xl font-light">{f.title}</h3>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-stone">{f.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
