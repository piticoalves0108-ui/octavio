"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { brand } from "@/data/brand";
import { img } from "@/data/images";
import { whatsappLink } from "@/lib/whatsapp";
import { SmartImage } from "@/components/ui/SmartImage";
import { RevealText } from "@/components/ui/RevealText";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";

/** Chamada final para orçamento sobre uma foto em parallax. */
export function CTASection({ image = img.kitchen[1], title = "Vamos desenhar o *seu* ambiente?" }: { image?: string; title?: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.15, 1]);

  return (
    <section ref={ref} data-header="dark" data-cursor-theme="dark" className="relative overflow-hidden bg-ink py-32 text-linen md:py-48">
      <motion.div style={{ y, scale }} className="absolute inset-[-15%] opacity-60">
        <SmartImage src={image} alt="" sizes="100vw" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/30" />
      <div className="container-x relative">
        <p className="eyebrow text-wood-light">Orçamento sem compromisso</p>
        <RevealText as="h2" className="display-xl mt-6 max-w-[14ch]" text={title} />
        <p className="mt-8 max-w-lg text-lg leading-relaxed text-concrete">
          Conte sobre o seu espaço em 2 minutos. Um arquiteto da {brand.name} retorna com os próximos passos e uma estimativa inicial.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/contato" variant="wood" size="lg">
            Solicitar orçamento
          </Button>
          <Button href={whatsappLink(`Olá! Gostaria de conversar sobre um projeto com a ${brand.name}.`)} external variant="light" size="lg" arrow={false} icon={<WhatsAppIcon className="h-5 w-5" />}>
            Conversar no WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}
