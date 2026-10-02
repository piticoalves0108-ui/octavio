"use client";

import { useRef } from "react";
import { IconeWhatsApp } from "@/components/ui/Icones";
import { cn } from "@/lib/cn";
import { linkWhatsApp } from "@/lib/contato";
import { movimentoReduzido } from "@/lib/gsap";
import { carregarMotion, MOLA } from "@/lib/motion";
import { medir, type Evento } from "@/lib/track";

type Props = {
  children?: React.ReactNode;
  mensagem?: string;
  origem: string;
  evento?: Evento;
  className?: string;
  /** Dados extras para a medição (ex.: medida escolhida). */
  extra?: Record<string, string | number>;
  variante?: "sinal" | "fantasma";
};

/**
 * "Cotar meu pneu": botão magnético (puxa na direção do mouse, com mola do Motion)
 * e, no hover, uma marca de banda de rodagem se desenha por baixo (CSS).
 * O Motion só é baixado quando o mouse chega no botão.
 */
export function BotaoCotar({
  children = "Cotar meu pneu",
  mensagem,
  origem,
  evento = "cotar_pneu",
  className,
  extra,
  variante = "sinal",
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rotulo = useRef<HTMLSpanElement>(null);
  const motion = useRef<Awaited<ReturnType<typeof carregarMotion>> | null>(null);
  const link = linkWhatsApp(mensagem);

  const mover = (x: number, y: number) => {
    const m = motion.current;
    if (!m || !ref.current || !rotulo.current) return;
    m.animate(ref.current, { x, y }, MOLA);
    m.animate(rotulo.current, { x: x * 0.45, y: y * 0.45 }, MOLA);
  };

  return (
    <a
      ref={ref}
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("botao group", variante === "sinal" ? "botao-sinal" : "botao-fantasma", className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || movimentoReduzido()) return;
        carregarMotion().then((m) => (motion.current = m));
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mover((e.clientX - (r.left + r.width / 2)) * 0.32, (e.clientY - (r.top + r.height / 2)) * 0.42);
      }}
      onPointerLeave={() => mover(0, 0)}
      onClick={() => medir(evento, { origem, canal: link.pendente ? "instagram" : "whatsapp", ...extra })}
    >
      <span ref={rotulo} className="relative z-10 inline-flex items-center gap-3">
        <IconeWhatsApp className="h-5 w-5" />
        {children}
      </span>
      <svg
        className="marca-pneu pointer-events-none absolute -bottom-5 left-1/2 h-3 w-[86%] -translate-x-1/2 text-sinal"
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        aria-hidden="true"
        fill="none"
      >
        <path
          pathLength={1}
          d="M0 10 L6 2 L12 10 L18 2 L24 10 L30 2 L36 10 L42 2 L48 10 L54 2 L60 10 L66 2 L72 10 L78 2 L84 10 L90 2 L96 10 L102 2 L108 10 L114 2 L120 10"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="bevel"
        />
      </svg>
    </a>
  );
}
