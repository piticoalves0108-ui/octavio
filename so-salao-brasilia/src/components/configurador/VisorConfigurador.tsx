"use client";

/**
 * Visor 3D do configurador. Antes do WebGL (ou sem ele), mostra o render estático do
 * modelo escolhido; com WebGL, a cena em frameloop "demand" (só desenha quando muda).
 */
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { linhaPorModelo } from "@/content/catalogo";
import { secaoConfigurador } from "@/content/textos";
import { useConfiguracao } from "@/lib/configuracao";
import { cn } from "@/lib/cn";
import { giroscopioDisponivel, ligarGiroscopio, useGiro, useNaTela } from "@/components/cena3d/giro";
import { useCarregar3D } from "@/components/cena3d/carregar";
import { IconeGiro } from "@/components/ui/icones";

const CenaConfigurador = dynamic(() => import("@/components/cena3d/CenaConfigurador"), { ssr: false });

export function VisorConfigurador({ className, prioridade = false }: { className?: string; prioridade?: boolean }) {
  const { ref, visivel } = useNaTela<HTMLDivElement>("150px");
  const { carregar, nivel } = useCarregar3D(visivel);
  const [pronto, setPronto] = useState(false);
  const { controle, handlers } = useGiro(-0.55);
  const modelo = useConfiguracao((s) => s.modelo);
  const tecido = useConfiguracao((s) => s.tecido);
  const cor = useConfiguracao((s) => s.cor);
  const acabamento = useConfiguracao((s) => s.acabamento);
  const linha = linhaPorModelo(modelo);
  const tem3D = carregar && pronto;

  const [podeGiroscopio, setPodeGiroscopio] = useState(false);
  const [giroscopioLigado, setGiroscopioLigado] = useState(false);
  const desligar = useRef<(() => void) | null>(null);
  useEffect(() => setPodeGiroscopio(giroscopioDisponivel()), []);
  useEffect(() => () => desligar.current?.(), []);

  const alternarGiroscopio = async () => {
    if (giroscopioLigado) {
      desligar.current?.();
      desligar.current = null;
      setGiroscopioLigado(false);
      return;
    }
    const fn = await ligarGiroscopio(controle);
    if (fn) {
      desligar.current = fn;
      setGiroscopioLigado(true);
    }
  };

  const semTresD = nivel === "video" || nivel === "sem-webgl";

  return (
    <div ref={ref} className={cn("relative overflow-hidden rounded-[1.75rem] bg-[#ece5df]", className)}>
      <Image
        key={linha.modelo}
        src={linha.imagens.frente}
        alt={`${linha.nomeDoModelo}: pré-visualização ilustrativa.`}
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        priority={prioridade}
        className={cn("object-contain transition-opacity duration-500", tem3D ? "opacity-0" : "opacity-100")}
      />
      {carregar && (
        <div
          {...handlers}
          tabIndex={pronto ? 0 : -1}
          role="group"
          aria-roledescription="visualizador 3D"
          aria-label={`${linha.nomeDoModelo} em 3D. Use as setas esquerda e direita para girar.`}
          className={cn(
            "absolute inset-0 cursor-grab transition-opacity duration-700 active:cursor-grabbing",
            tem3D ? "opacity-100" : "opacity-0",
          )}
        >
          <CenaConfigurador
            visivel={visivel}
            controle={controle}
            modelo={modelo}
            tecido={tecido}
            cor={cor}
            acabamento={acabamento}
            aoPrimeiroQuadro={() => setPronto(true)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-2">
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-gelo/85 px-3.5 py-2 text-xs font-medium text-tinta backdrop-blur transition-opacity duration-700",
            tem3D ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!tem3D}
        >
          <IconeGiro className="size-4" />
          {secaoConfigurador.dicaGiro}
        </p>
        {podeGiroscopio && tem3D && (
          <button
            type="button"
            onClick={alternarGiroscopio}
            aria-pressed={giroscopioLigado}
            className="pointer-events-auto min-h-10 rounded-full bg-gelo/85 px-4 text-xs font-medium text-tinta backdrop-blur"
          >
            {secaoConfigurador.giroscopio}
            {giroscopioLigado ? ": ligado" : ""}
          </button>
        )}
      </div>

      {semTresD && (
        <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-gelo/90 px-4 py-3 text-sm text-tinta backdrop-blur">
          Imagem ilustrativa. Neste aparelho o 3D fica desligado, mas a sua escolha vai escrita no pedido.
        </p>
      )}
    </div>
  );
}
