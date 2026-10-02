"use client";

import { useEffect, useId, useRef } from "react";
import { aoInteragir, carregarGsap, movimentoReduzido } from "@/lib/gsap";

type Props = {
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
  children: React.ReactNode;
};

/**
 * Título que entra letra por letra (SplitText) com motion blur horizontal,
 * como algo passando em velocidade. O blur é um feGaussianBlur só no eixo X.
 * O texto vem pronto do servidor; sem JS ou com movimento reduzido, fica parado.
 * GSAP chega na primeira interação e a divisão em letras só acontece quando o
 * título entra na tela (nada de dividir a página toda de uma vez).
 */
export function Titulo({ as: Tag = "h2", className, id, children }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const filtroId = `borrao-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || movimentoReduzido()) return;
    let cancelado = false;
    let desfazer = () => {};

    const preparar = () =>
      carregarGsap().then(({ gsap, ScrollTrigger, SplitText }) => {
        if (cancelado) return;
        // já está na tela quando o motion chegou: fica como está (nada de piscar)
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        let split: ReturnType<typeof SplitText.create> | null = null;
        let tl: ReturnType<typeof gsap.timeline> | null = null;
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          once: true,
          onEnter: () => {
            // a divisão em letras só acontece aqui, na hora de animar
            const blur = document.querySelector(`#${filtroId} feGaussianBlur`);
            split = SplitText.create(el, { type: "words,chars", aria: "auto" });
            el.style.filter = `url(#${filtroId})`;
            tl = gsap.timeline({
              onComplete: () => {
                el.style.filter = "";
                split?.revert();
              },
            });
            tl.from(split.chars, { x: -90, opacity: 0, skewX: -22, duration: 1, ease: "expo.out", stagger: { each: 0.022 } }, 0);
            if (blur) tl.fromTo(blur, { attr: { stdDeviation: "22 0" } }, { attr: { stdDeviation: "0 0" }, duration: 0.95, ease: "power3.out" }, 0);
          },
        });
        desfazer = () => {
          st.kill();
          tl?.kill();
          split?.revert();
          el.style.filter = "";
        };
      });

    const desistir = aoInteragir(() => void preparar());
    return () => {
      cancelado = true;
      desistir();
      desfazer();
    };
  }, [filtroId]);

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <filter id={filtroId} x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="0 0" />
        </filter>
      </svg>
      <Tag ref={ref} id={id} className={className}>
        {children}
      </Tag>
    </>
  );
}
