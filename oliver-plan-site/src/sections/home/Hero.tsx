"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { brand } from "@/data/brand";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/ui/RevealText";
import { useNearViewport } from "@/hooks/useInView";
import { useMediaQuery, useReducedMotion } from "@/hooks/useMedia";
import { useSiteLoaded } from "@/hooks/useSiteLoaded";
import { useWebGL } from "@/hooks/useWebGL";
import { heroLabels } from "@/components/three/heroLabels";

const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

/**
 * Hero cinematográfico: a cozinha em maquete se monta peça por peça depois da abertura.
 * Ao rolar, a câmera "entra" no ambiente e as cotas técnicas aparecem.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const loaded = useSiteLoaded();
  const reduced = useReducedMotion();
  const mobile = useMediaQuery("(max-width: 767px)");
  const near = useNearViewport(section, "0px");
  const webgl = useWebGL();
  const mmLabel = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progress.current = v;
    // Atualiza a régua sem re-renderizar a seção a cada quadro
    if (mmLabel.current) mmLabel.current.textContent = `${(Math.round((v * 2800) / 10) * 10).toLocaleString("pt-BR")} mm`;
  });

  useEffect(() => {
    progress.current = scrollYProgress.get();
  }, [scrollYProgress]);

  const introOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.35], [0, -80]);
  const detailOpacity = useTransform(scrollYProgress, [0.5, 0.68, 0.95, 1], [0, 1, 1, 0.9]);
  const detailY = useTransform(scrollYProgress, [0.5, 0.68], [60, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const rulerTop = useTransform(scrollYProgress, (v) => `${v * 100}%`);
  const veilOpacity = useTransform(scrollYProgress, [0.25, 0.55], [1, 0.25]);

  return (
    <section ref={section} aria-label="Apresentação" className="relative h-[240svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Cena 3D */}
        <div className="blueprint absolute inset-0 bg-linen">
          {webgl !== false && <HeroCanvas progress={progress} active={loaded} visible={near} reduced={reduced} lowPower={mobile} labelRefs={labelRefs} />}
          {/* Rótulos das cotas, posicionados pela cena 3D */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {heroLabels.map((l, i) => (
              <div key={l.title} ref={(el) => void (labelRefs.current[i] = el)} className="absolute left-0 top-0 opacity-0 will-change-transform">
                <div className="flex -translate-y-1/2 items-center gap-2 whitespace-nowrap">
                  <span className="h-2 w-2 -translate-x-1 rounded-full bg-wood ring-4 ring-wood/20" />
                  <span className="h-px w-8 bg-graphite/40" />
                  <span className="rounded-full bg-paper/90 px-3 py-1.5 text-[11px] font-medium text-graphite shadow-sm backdrop-blur">
                    {l.title} <span className="ml-1 text-wood-deep">{l.value}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Véu para legibilidade do texto */}
        <motion.div style={{ opacity: veilOpacity }} aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(244,239,233,0.92)_0%,rgba(244,239,233,0.55)_38%,transparent_62%)] max-md:bg-[linear-gradient(0deg,rgba(244,239,233,1)_0%,rgba(244,239,233,0.97)_50%,rgba(244,239,233,0.55)_62%,transparent_74%)]" />

        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-linen/90 to-transparent md:hidden" />

        {/* Texto de abertura */}
        <motion.div style={{ opacity: introOpacity, y: introY }} className="container-x relative flex h-full flex-col justify-end pb-[12svh] md:justify-center md:pb-0">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="eyebrow mb-6 flex items-center gap-3 text-stone"
          >
            <span className="h-px w-8 bg-wood" />
            {brand.descriptor} · {brand.founded ? `desde ${brand.founded}` : brand.showroom.city}
          </motion.p>
          <RevealText as="h1" text={"Arquitetura\n*sob medida*\npara viver."} trigger="loaded" delay={0.15} className="display-xl max-w-[11ch] text-graphite" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-md"
          >
            <p className="text-[0.95rem] leading-relaxed text-stone md:text-lg">
              Cozinhas, closets e salas desenhados ao milímetro, aprovados em 3D e produzidos na nossa própria marcenaria.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/contato" size={mobile ? "md" : "lg"}>
                Solicitar orçamento
              </Button>
              <Button href="/ambientes" variant="outline" size={mobile ? "md" : "lg"} arrow={false}>
                Explorar ambientes
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Texto de detalhe (segunda metade do scroll) */}
        <motion.div style={{ opacity: detailOpacity, y: detailY }} className="pointer-events-none absolute inset-x-0 bottom-[10svh] md:bottom-auto md:top-1/2 md:-translate-y-1/2">
          <div className="container-x">
            <div className="max-w-sm rounded-[2px] bg-paper/85 p-6 shadow-[0_30px_60px_-30px_rgba(43,43,43,0.35)] backdrop-blur-md md:p-8">
              <p className="eyebrow text-wood-deep">Projeto Cozinha Jacarandá</p>
              <p className="mt-4 font-display text-3xl font-light leading-tight md:text-4xl">
                Cada milímetro desenhado para a <span className="serif-accent">sua rotina</span>.
              </p>
              <ul className="mt-6 space-y-2 border-t border-graphite/10 pt-5 text-sm text-stone">
                <li className="flex justify-between gap-6">
                  <span>Ilha em Calacatta</span>
                  <span className="tabular-nums text-graphite">3.200 × 1.100 mm</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Torres em nogueira</span>
                  <span className="tabular-nums text-graphite">2.620 mm</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Produção</span>
                  <span className="tabular-nums text-graphite">42 dias</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Régua técnica lateral */}
        <div aria-hidden className="pointer-events-none absolute right-5 top-1/2 hidden h-[46svh] -translate-y-1/2 flex-col items-end md:flex lg:right-10">
          <div className="relative h-full w-8">
            {Array.from({ length: 29 }, (_, i) => (
              <span key={i} className="absolute right-0 h-px bg-graphite/35" style={{ top: `${(i / 28) * 100}%`, width: i % 7 === 0 ? 22 : 10 }} />
            ))}
            <motion.span className="absolute right-0 h-px w-8 bg-wood" style={{ top: rulerTop }} />
          </div>
          <span ref={mmLabel} className="eyebrow mt-4 tabular-nums text-stone">
            0 mm
          </span>
        </div>

        {/* Indicação de scroll */}
        <motion.div style={{ opacity: cueOpacity }} className="pointer-events-none absolute bottom-6 right-5 hidden items-center gap-3 text-stone md:flex lg:right-10">
          <span className="eyebrow">Role para entrar no ambiente</span>
          <span className="relative block h-10 w-px overflow-hidden bg-graphite/15">
            <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-graphite" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
          </span>
        </motion.div>
      </div>
    </section>
  );
}
