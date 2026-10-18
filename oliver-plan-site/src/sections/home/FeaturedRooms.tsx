"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/data/categories";
import { projects } from "@/data/projects";
import { renderFallback } from "@/data/images";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { TiltCard } from "@/components/ui/TiltCard";
import { SmartImage } from "@/components/ui/SmartImage";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealText } from "@/components/ui/RevealText";

const featured = ["cozinha", "closet", "home-office", "sala", "quarto"] as const;

/**
 * Ambientes em destaque: no desktop a seção "trava" e os cards correm na horizontal
 * conforme o scroll (GSAP ScrollTrigger com pin). No celular vira um carrossel com snap.
 */
export function FeaturedRooms() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth + 64;
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        // Leve parallax nas imagens dentro de cada card
        el.querySelectorAll<HTMLElement>("[data-parallax]").forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -8 },
            { xPercent: 8, ease: "none", scrollTrigger: { trigger: img, containerAnimation: tween, start: "left right", end: "right left", scrub: true } },
          );
        });
        return () => ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section ref={section} className="relative overflow-hidden bg-linen py-20 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:py-0">
      <div className="container-x mb-10 flex flex-col justify-between gap-6 lg:mb-12 lg:flex-row lg:items-end">
        <div>
          <SectionLabel index="02">Ambientes</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6 max-w-3xl" text="Cada cômodo, *um projeto* inteiro." />
        </div>
        <p className="max-w-sm text-stone">Do café da manhã ao último livro antes de dormir: desenhamos a marcenaria de todos os ambientes da casa, com a mesma precisão.</p>
      </div>

      <div className="no-scrollbar overflow-x-auto max-lg:snap-x max-lg:snap-mandatory lg:overflow-visible">
        <div ref={track} className="flex w-max gap-5 px-[clamp(1.25rem,4vw,3.5rem)] lg:gap-8">
          {featured.map((id, i) => {
            const c = categories.find((x) => x.id === id)!;
            const count = projects.filter((p) => p.category === id).length;
            return (
              <TransitionLink key={id} href={`/ambientes?categoria=${id}`} className="block snap-start" data-cursor-label="Ver">
                <TiltCard className="w-[78vw] sm:w-[48vw] lg:w-[30vw] xl:w-[27vw]">
                  <article className="relative">
                    <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                      <div data-parallax className="absolute inset-[-10%] transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.06]">
                        <SmartImage src={c.image} alt={`${c.name} planejada`} sizes="(min-width: 1024px) 30vw, 78vw" fallbackLabel={c.name} fallbackSrc={renderFallback[c.id]} />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-graphite/70 via-transparent to-transparent" />
                      <span className="absolute left-5 top-5 font-display text-sm italic text-paper/90">0{i + 1}</span>
                      <span className="absolute right-5 top-5 rounded-full bg-paper/90 px-3 py-1 text-[0.65rem] font-semibold tracking-wider text-graphite">{count} projetos</span>
                      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-paper">
                        <h3 className="font-display text-4xl font-light">{c.plural}</h3>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/40 transition-colors group-hover:bg-paper group-hover:text-graphite">
                          <ArrowUpRight className="h-5 w-5" strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-stone">{c.short}</p>
                  </article>
                </TiltCard>
              </TransitionLink>
            );
          })}
          <TransitionLink href="/ambientes" className="flex w-[60vw] shrink-0 snap-start items-center justify-center border border-graphite/15 sm:w-[30vw] lg:w-[20vw]" data-cursor-label="Todos">
            <span className="text-center">
              <span className="block font-display text-3xl font-light">Todos os ambientes</span>
              <span className="eyebrow mt-3 block text-stone">Banheiros · Áreas gourmet</span>
            </span>
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
