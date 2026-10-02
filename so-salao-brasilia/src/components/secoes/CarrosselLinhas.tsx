"use client";

/**
 * Catálogo em carrossel 3D (coverflow): cards em curva com CSS 3D, que funciona sem
 * WebGL e mantém textos e links acessíveis. Arrastar, setas do teclado, botões e
 * pontos navegam. Hover: tilt (Motion) e troca de foto frente → perfil.
 * Com movimento reduzido, vira uma lista horizontal simples.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { linhas, type Linha } from "@/content/catalogo";
import { useMovimentoReduzido } from "@/lib/movimento";
import { cn } from "@/lib/cn";
import { IconeSeta, IconeSetaEsquerda } from "@/components/ui/icones";
import { LinkTransicao } from "@/components/layout/Transicao";

export function CarrosselLinhas() {
  const [ativo, setAtivo] = useState(0);
  const reduzido = useMovimentoReduzido();
  const arraste = useRef<{ x: number; id: number; moveu: boolean } | null>(null);
  const total = linhas.length;

  const ir = useCallback((i: number) => setAtivo(Math.max(0, Math.min(total - 1, i))), [total]);

  if (reduzido) {
    return (
      <ul className="conteiner flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6" aria-label="Linhas de produto">
        {linhas.map((l, i) => (
          <li key={l.slug} className="w-[min(22rem,78vw)] flex-none snap-start">
            <Cartao linha={l} ativo indice={i} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label="Linhas de produto"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          ir(ativo + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          ir(ativo - 1);
        }
      }}
    >
      <div
        className="relative h-[clamp(34rem,62vw,40rem)] touch-pan-y select-none [perspective:1800px]"
        onPointerDown={(e) => {
          arraste.current = { x: e.clientX, id: e.pointerId, moveu: false };
        }}
        onPointerMove={(e) => {
          const a = arraste.current;
          if (!a || a.id !== e.pointerId) return;
          if (Math.abs(e.clientX - a.x) > 8) a.moveu = true;
        }}
        onPointerUp={(e) => {
          const a = arraste.current;
          arraste.current = null;
          if (!a || !a.moveu) return;
          const dx = e.clientX - a.x;
          if (dx < -40) ir(ativo + 1);
          else if (dx > 40) ir(ativo - 1);
        }}
        onPointerCancel={() => (arraste.current = null)}
        onClickCapture={(e) => {
          // Um arraste não deve virar clique num link do card.
          if (arraste.current?.moveu) e.preventDefault();
        }}
      >
        {linhas.map((l, i) => {
          const d = i - ativo;
          const dist = Math.abs(d);
          return (
            <div
              key={l.slug}
              className="absolute top-0 left-1/2 w-[min(23rem,74vw)] transition-[transform,opacity,filter] duration-700 ease-[var(--ease-saida)] [transform-style:preserve-3d]"
              style={{
                transform: `translateX(-50%) translateX(${d * 64}%) translateZ(${-dist * 170}px) rotateY(${-Math.sign(d) * Math.min(dist, 2) * 28}deg)`,
                zIndex: 20 - dist,
                opacity: dist > 2 ? 0 : 1 - dist * 0.18,
                filter: dist === 0 ? "none" : `saturate(${1 - dist * 0.25})`,
                pointerEvents: dist > 2 ? "none" : "auto",
              }}
              onFocusCapture={() => setAtivo(i)}
              onClick={() => d !== 0 && setAtivo(i)}
              aria-hidden={dist > 2 || undefined}
            >
              <Cartao linha={l} ativo={d === 0} indice={i} />
            </div>
          );
        })}
      </div>

      <div className="conteiner mt-8 flex items-center justify-between gap-6">
        <p className="text-sm text-tinta-suave" aria-live="polite">
          <span className="font-serif text-2xl text-tinta">{String(ativo + 1).padStart(2, "0")}</span> /{" "}
          {String(total).padStart(2, "0")} · {linhas[ativo].nome}
        </p>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex" role="group" aria-label="Escolher linha">
            {linhas.map((l, i) => (
              <button
                key={l.slug}
                type="button"
                onClick={() => setAtivo(i)}
                aria-label={l.nome}
                aria-current={i === ativo ? "true" : undefined}
                className="grid size-11 place-items-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full bg-grafite transition-all duration-500",
                    i === ativo ? "w-8" : "w-1.5 opacity-30",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => ir(ativo - 1)}
            disabled={ativo === 0}
            aria-label="Linha anterior"
            className="grid size-12 place-items-center rounded-full border border-grafite/20 transition-colors hover:bg-grafite hover:text-gelo disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-current"
          >
            <IconeSetaEsquerda className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => ir(ativo + 1)}
            disabled={ativo === total - 1}
            aria-label="Próxima linha"
            className="grid size-12 place-items-center rounded-full border border-grafite/20 transition-colors hover:bg-grafite hover:text-gelo disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-current"
          >
            <IconeSeta className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Cartao({ linha, ativo, indice }: { linha: Linha; ativo: boolean; indice: number }) {
  const [perfil, setPerfil] = useState(false);
  const moldura = useRef<HTMLDivElement>(null);

  // Tilt com Motion, carregado no primeiro hover (fora do JS inicial).
  useEffect(() => {
    const el = moldura.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let desligar: (() => void) | undefined;
    let cancelado = false;
    const iniciar = () =>
      import("@/components/ui/magnetismo").then((m) => {
        if (!cancelado) desligar = m.ligarInclinacao(el, el);
      });
    el.addEventListener("pointerenter", iniciar, { once: true });
    return () => {
      cancelado = true;
      el.removeEventListener("pointerenter", iniciar);
      desligar?.();
    };
  }, []);

  return (
    <article className="group/cartao" aria-labelledby={`linha-${linha.slug}`}>
      <div
        ref={moldura}
        className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-[#ece5df] shadow-[0_40px_80px_-40px_rgba(42,42,46,0.45)]"
        onPointerEnter={(e) => e.pointerType === "mouse" && setPerfil(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setPerfil(false)}
      >
        <Image
          src={linha.imagens.frente}
          alt={`${linha.nomeDoModelo} de frente (imagem ilustrativa gerada da cena 3D).`}
          fill
          sizes="(min-width: 768px) 23rem, 74vw"
          className={cn("object-cover transition-opacity duration-700", perfil ? "opacity-0" : "opacity-100")}
        />
        <Image
          src={linha.imagens.perfil}
          alt={`${linha.nomeDoModelo} de perfil (imagem ilustrativa gerada da cena 3D).`}
          fill
          sizes="(min-width: 768px) 23rem, 74vw"
          className={cn("object-cover transition-opacity duration-700", perfil ? "opacity-100" : "opacity-0")}
        />
        <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-gelo/85 px-3 py-1.5 font-serif text-lg leading-none backdrop-blur">
          {String(indice + 1).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPerfil((p) => !p);
          }}
          aria-pressed={perfil}
          tabIndex={ativo ? 0 : -1}
          className={cn(
            "absolute right-4 bottom-4 min-h-10 rounded-full bg-gelo/85 px-4 text-xs font-medium backdrop-blur transition-[opacity,background-color] hover:bg-gelo",
            !ativo && "pointer-events-none opacity-0",
          )}
        >
          {perfil ? "Ver de frente" : "Ver de perfil"}
        </button>
      </div>
      <div
        className={cn("mt-6 transition-opacity duration-500", ativo ? "opacity-100" : "pointer-events-none opacity-0")}
      >
        <h3 id={`linha-${linha.slug}`} className="text-[2rem]">
          {linha.nome}
        </h3>
        <p className="mt-2 text-tinta-suave">{linha.resumo}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] font-medium">
          <LinkTransicao
            href={`/configurador?modelo=${linha.modelo}`}
            tabIndex={ativo ? 0 : -1}
            className="inline-flex min-h-11 items-center gap-2 underline decoration-grafite/30 underline-offset-[6px] hover:decoration-grafite"
          >
            Configurar
            <span className="sr-only"> {linha.nomeDoModelo}</span>
          </LinkTransicao>
          <LinkTransicao
            href={`/linhas/${linha.slug}`}
            tabIndex={ativo ? 0 : -1}
            className="inline-flex min-h-11 items-center gap-2 underline decoration-grafite/30 underline-offset-[6px] hover:decoration-grafite"
          >
            Ver a linha
            <span className="sr-only"> de {linha.nome.toLowerCase()}</span>
          </LinkTransicao>
        </div>
      </div>
    </article>
  );
}
