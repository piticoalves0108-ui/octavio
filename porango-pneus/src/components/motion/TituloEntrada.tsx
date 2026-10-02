"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { movimentoReduzido } from "@/lib/gsap";
import { palco } from "@/lib/palco";
import { EVENTO_FIM_PRELOADER } from "@/components/motion/Preloader";

type Linha = { texto: string; className?: string };

/**
 * Título de abertura (h1 do hero e das páginas internas).
 *
 * Mesmo efeito dos outros títulos (letra por letra, com motion blur horizontal),
 * mas as letras já vêm divididas no HTML do servidor e a animação usa Web Animations.
 * Motivo: o h1 é o maior texto da primeira dobra. Se fosse dividido depois (SplitText
 * em tempo de execução), as letras virariam elementos novos pintados só depois do
 * preloader e o LCP iria lá para frente. Assim, o h1 é pintado no primeiro quadro e
 * a entrada não cria nada novo.
 */
export function TituloEntrada({
  linhas,
  className,
  id,
  as: Tag = "h1",
}: {
  linhas: Linha[];
  className?: string;
  id?: string;
  as?: "h1" | "h2";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const filtroId = `borrao-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || movimentoReduzido()) return;
    // visita repetida (sem preloader): o título já está na tela, não pisca de novo
    if (document.documentElement.classList.contains("sem-preloader")) return;

    let raf = 0;
    const animacoes: Animation[] = [];
    const tocar = () => {
      const letras = el.querySelectorAll<HTMLElement>("[data-letra]");
      letras.forEach((letra, i) => {
        animacoes.push(
          letra.animate(
            [
              { transform: "translateX(-90px) skewX(-22deg)", opacity: 0 },
              { transform: "none", opacity: 1 },
            ],
            { duration: 1000, delay: i * 22, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
          ),
        );
      });
      // motion blur só no eixo X, diminuindo junto com a entrada
      const blur = document.querySelector(`#${filtroId} feGaussianBlur`);
      if (!blur) return;
      el.style.filter = `url(#${filtroId})`;
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / (950 + letras.length * 22));
        const v = 22 * Math.pow(1 - t, 3);
        blur.setAttribute("stdDeviation", `${v.toFixed(2)} 0`);
        if (t < 1) raf = requestAnimationFrame(passo);
        else el.style.filter = "";
      };
      raf = requestAnimationFrame(passo);
    };

    if (palco.introLiberada) tocar();
    else window.addEventListener(EVENTO_FIM_PRELOADER, tocar, { once: true });
    return () => {
      window.removeEventListener(EVENTO_FIM_PRELOADER, tocar);
      cancelAnimationFrame(raf);
      animacoes.forEach((a) => a.cancel());
      el.style.filter = "";
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
        <span className="sr-only">{linhas.map((l) => l.texto).join(" ")}</span>
        <span aria-hidden="true" className="block">
          {linhas.map((linha, li) => {
            const palavras = linha.texto.split(" ");
            return (
              <span key={li} className={cn("block", linha.className)}>
                {palavras.map((palavra, pi) => (
                  <span key={pi}>
                    <span className="inline-block whitespace-nowrap">
                      {Array.from(palavra).map((c, ci) => (
                        <span key={ci} data-letra="" className="inline-block">
                          {c}
                        </span>
                      ))}
                    </span>
                    {pi < palavras.length - 1 ? " " : null}
                  </span>
                ))}
              </span>
            );
          })}
        </span>
      </Tag>
    </>
  );
}
