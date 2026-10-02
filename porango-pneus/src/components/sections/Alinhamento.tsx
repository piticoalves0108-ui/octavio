"use client";

import { useEffect, useRef, useState } from "react";
import { alinhamento } from "@/content/textos";
import { AlinhamentoSvg } from "@/components/fallbacks/AlinhamentoSvg";
import { Titulo } from "@/components/motion/Titulo";
import { SeloPendente } from "@/components/ui/Pendente";
import { cn } from "@/lib/cn";
import { avisar, palco } from "@/lib/palco";

/**
 * ALINHAMENTO E BALANCEAMENTO (só aparece se o serviço estiver confirmado ou na prévia).
 * Duas rodas em 3D com laser: "Antes" mostra o ângulo errado; "Depois", as rodas paralelas.
 * Ao entrar na tela, passa sozinho de antes para depois; o botão deixa comparar.
 */
export function Alinhamento({ confirmado }: { confirmado: boolean }) {
  const [alinhado, setAlinhado] = useState(false);
  const mexeu = useRef(false);
  const secao = useRef<HTMLElement>(null);

  useEffect(() => {
    palco.alinhado = alinhado ? 1 : 0;
    avisar();
  }, [alinhado]);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    let t = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(t);
        if (e.isIntersecting && !mexeu.current) t = window.setTimeout(() => setAlinhado(true), 1600);
        if (!e.isIntersecting && !mexeu.current) setAlinhado(false);
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  const escolher = (v: boolean) => {
    mexeu.current = true;
    setAlinhado(v);
  };

  return (
    <section
      ref={secao}
      id="alinhamento"
      data-ato="alinhamento"
      aria-labelledby="titulo-alinhamento"
      className="relative z-10 flex min-h-[100svh] items-end py-16 md:items-center md:py-28"
    >
      <div className="grade gap-y-10">
        <div className="so-sem-cena pointer-events-none col-span-4 row-start-1 px-10 md:col-span-5 md:col-start-8 md:px-0">
          <AlinhamentoSvg alinhado={alinhado} className="mx-auto max-w-[min(100%,56vh)]" />
        </div>
        <div className="col-span-4 row-start-2 md:col-span-5 md:row-start-1">
          <p className="rotulo mb-4 flex-wrap">
            <b>03</b> Serviços <SeloPendente confirmado={confirmado} />
          </p>
          <Titulo id="titulo-alinhamento" className="text-[clamp(2.2rem,4.8vw,4.2rem)]">
            {alinhamento.titulo}
          </Titulo>
          <p className="mt-5 max-w-md text-faixa/85">{alinhamento.intro}</p>

          <div role="group" aria-label="Comparar antes e depois" className="mt-8 inline-flex rounded-full border border-faixa/20 p-1">
            {[
              [false, "Antes"],
              [true, "Depois"],
            ].map(([v, rotulo]) => (
              <button
                key={String(rotulo)}
                type="button"
                aria-pressed={alinhado === v}
                onClick={() => escolher(v as boolean)}
                className={cn(
                  "min-h-11 rounded-full px-6 font-display text-sm font-bold tracking-[0.14em] uppercase transition-colors",
                  alinhado === v ? (v ? "bg-sinal text-asfalto" : "bg-freio text-faixa") : "text-faixa/70 hover:text-faixa",
                )}
              >
                {rotulo as string}
              </button>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            {alinhado ? "Depois: rodas paralelas, laser no centro do alvo." : "Antes: rodas fora de ângulo, laser fora do centro."}
          </p>

          <dl className="mt-10 space-y-5">
            {alinhamento.itens.map((item) => (
              <div key={item.nome} className="border-t border-linha pt-4">
                <dt className="font-display text-sm font-semibold tracking-[0.14em] text-sinal uppercase">{item.nome}</dt>
                <dd className="mt-1 text-sm text-faixa/85 md:text-base">{item.texto}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs text-cinza">{alinhamento.nota}</p>
        </div>
      </div>
    </section>
  );
}
