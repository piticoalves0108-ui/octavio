"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useMotor } from "@/hooks/useMotor";
import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "p";

/**
 * Título que entra caractere a caractere (GSAP SplitText) com um tremor de
 * calor: um filtro SVG feTurbulence + feDisplacementMap só durante a entrada.
 *
 * - gatilho "scroll": entra quando aparece na tela.
 * - gatilho "preloader": entra quando o preloader termina (título do hero).
 *   Em visitas repetidas (sem preloader) o título já está no lugar.
 * O texto é SSR e legível sem JS; o SplitText usa aria "auto" (aria-label no
 * título, letras escondidas do leitor de tela).
 */
export function TituloCalor({
  como: Elemento = "h2",
  children,
  className,
  id,
  gatilho = "scroll",
}: {
  como?: Tag;
  children: ReactNode;
  className?: string;
  id?: string;
  gatilho?: "scroll" | "preloader";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const idFiltro = `calor-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const liberado = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (gatilho !== "preloader") return;
    const aoAcender = () => liberado.current?.();
    window.addEventListener("brasa:acesa", aoAcender);
    return () => window.removeEventListener("brasa:acesa", aoAcender);
  }, [gatilho]);

  useMotor(
    ({ gsap, SplitText, reduzido }) => {
      const el = ref.current;
      if (!el) return;
      const deslocamento = document.getElementById(`${idFiltro}-d`);
      const turbulencia = document.getElementById(`${idFiltro}-t`);
      const calor = (tl: GSAPTimeline) =>
        tl
          .fromTo(deslocamento, { attr: { scale: 26 } }, { attr: { scale: 0 }, duration: 1.5, ease: "power2.out" }, 0)
          .fromTo(turbulencia, { attr: { baseFrequency: "0.004 0.11" } }, { attr: { baseFrequency: "0.012 0.05" }, duration: 1.5, ease: "none" }, 0);
      const comFiltro = { onStart: () => void (el.style.filter = `url(#${idFiltro})`), onComplete: () => void (el.style.filter = "") };

      if (gatilho === "preloader") {
        // Título do hero: fica visível por cima do preloader (é o LCP) e,
        // quando a brasa acende, passa uma onda de calor pelas letras.
        const preloaderAtivo = document.documentElement.dataset.preloader !== "off" && !(window as { __brasaAcesa?: boolean }).__brasaAcesa;
        if (!preloaderAtivo || reduzido) return;
        const tl = gsap.timeline({ paused: true, ...comFiltro });
        calor(tl);
        liberado.current = () => tl.play();
        return () => {
          liberado.current = null;
        };
      }

      if (reduzido) {
        gsap.from(el, { opacity: 0, duration: 0.35, scrollTrigger: { trigger: el, start: "top 92%", once: true } });
        return;
      }

      // Divide em letras só quando o título se aproxima da tela (menos trabalho no load).
      let split: SplitText | null = null;
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting || split) return;
          observador.disconnect();
          split = SplitText.create(el, {
            type: "words,chars",
            mask: "chars",
            charsClass: "letra",
            aria: "auto",
            autoSplit: true,
            onSplit(self) {
              const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 86%", once: true }, ...comFiltro });
              tl.from(self.chars, { yPercent: 108, duration: 1, ease: "expo.out", stagger: { each: 0.022, from: "start" } }, 0);
              calor(tl);
              return tl;
            },
          });
        },
        { rootMargin: "60% 0px 60% 0px" },
      );
      observador.observe(el);

      return () => {
        observador.disconnect();
        split?.revert();
      };
    },
    ref,
  );

  return (
    <>
      <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
        <filter id={idFiltro} x="-5%" y="-20%" width="110%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence id={`${idFiltro}-t`} type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="ruido" />
          <feDisplacementMap id={`${idFiltro}-d`} in="SourceGraphic" in2="ruido" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <Elemento ref={ref} id={id} className={cn("titulo", className)}>
        {children}
      </Elemento>
    </>
  );
}
