"use client";

/**
 * Título de seção que entra linha a linha (GSAP SplitText com máscara), uma vez,
 * quando chega a 85% da tela. O texto já vem renderizado do servidor (SEO e sem JS);
 * com movimento reduzido, nada acontece.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { carregarGsap, carregarSplitText } from "@/lib/gsap";
import { movimentoReduzidoAgora } from "@/lib/movimento";

type Props = {
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  className?: string;
  children: ReactNode;
};

export function TituloAnimado({ as: Tag = "h2", id, className, children }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || movimentoReduzidoAgora()) return;
    // Já visível quando o JS chegou: não esconde o que a pessoa está lendo.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    let cancelado = false;
    let desfazer = () => {};

    Promise.all([carregarGsap(), carregarSplitText(), document.fonts.ready]).then(([{ gsap }, SplitText]) => {
      if (cancelado) return;
      const ctx = gsap.context(() => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.15,
              ease: "expo.out",
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            }),
        });
      }, el);
      desfazer = () => ctx.revert();
    });

    return () => {
      cancelado = true;
      desfazer();
    };
  }, []);

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
