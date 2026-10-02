"use client";

import { useEffect, useRef, useState } from "react";
import { IconeGiroscopio } from "@/components/Icones";
import { useMotor } from "@/hooks/useMotor";
import { useSecaoCena } from "@/hooks/useSecaoCena";
import { cena, pedirFrame } from "@/lib/cena";
import { usePalco } from "@/lib/palco";
import { cn } from "@/lib/utils";

/** Mesmo corte do pôster e da cena: retrato abaixo de 4:5 usa o enquadramento mobile. */
export const MEDIA_RETRATO = "(max-aspect-ratio: 4/5)";

/**
 * Fundo do hero.
 * - Pôster AVIF com o mesmo enquadramento da cena 3D (é o LCP; não depende de WebGL).
 * - Em aparelhos muito fracos: vídeo curto em loop gravado da própria cena.
 * - Com 3D: o pôster some com fade quando o primeiro frame fica pronto.
 * Também marca a saída do hero (scroll) e o "abanar a brasa" (clique/toque).
 */
export function HeroFundo() {
  const ref = useRef<HTMLDivElement>(null);
  const modo = usePalco();
  const [retrato, setRetrato] = useState(false);
  useSecaoCena(ref, "hero");

  useEffect(() => {
    const mq = window.matchMedia(MEDIA_RETRATO);
    const atualizar = () => setRetrato(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  // O espeto sai da grelha conforme o hero rola para fora da tela.
  useMotor(({ gsap, reduzido }) => {
    const secao = ref.current?.parentElement;
    if (!secao || reduzido) return;
    gsap.fromTo(cena, { saida: 0 }, { saida: 1, ease: "none", scrollTrigger: { trigger: secao, start: "top top", end: "bottom top", scrub: true } });
  }, ref);

  // Abanar a brasa: clique/toque no hero (fora de botões e links).
  useEffect(() => {
    const secao = ref.current?.parentElement;
    if (!secao) return;
    const abanar = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a, button, [role=dialog]")) return;
      cena.ponteiro.x = (e.clientX / window.innerWidth) * 2 - 1;
      cena.ponteiro.y = -((e.clientY / window.innerHeight) * 2 - 1);
      cena.abanar = 1;
      pedirFrame();
    };
    secao.addEventListener("pointerdown", abanar);
    return () => secao.removeEventListener("pointerdown", abanar);
  }, []);

  return (
    <div ref={ref} data-secao-cena="hero" className="absolute inset-0 overflow-hidden">
      <picture>
        <source media={MEDIA_RETRATO} type="image/avif" srcSet="/poster/hero-mobile-720.avif 720w, /poster/hero-mobile-1080.avif 1080w" sizes="100vw" />
        <source media={MEDIA_RETRATO} type="image/webp" srcSet="/poster/hero-mobile-1080.webp 1080w" sizes="100vw" />
        <source type="image/avif" srcSet="/poster/hero-desktop-1280.avif 1280w, /poster/hero-desktop-1920.avif 1920w" sizes="100vw" />
        <img
          src="/poster/hero-desktop-1920.webp"
          width={1920}
          height={1080}
          alt="Espeto com carne, frango, linguiça e queijo coalho girando sobre a grelha, com as brasas acesas e fumaça subindo"
          fetchPriority="high"
          decoding="async"
          className="poster-hero absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      {modo === "video" && (
        <video
          key={retrato ? "retrato" : "paisagem"}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          poster={retrato ? "/poster/hero-mobile-1080.webp" : "/poster/hero-desktop-1920.webp"}
        >
          <source src={retrato ? "/video/hero-mobile.mp4" : "/video/hero-desktop.mp4"} type="video/mp4" />
          <source src={retrato ? "/video/hero-mobile.webm" : "/video/hero-desktop.webm"} type="video/webm" />
        </video>
      )}

      {/* Véus para o texto ficar legível sobre a cena */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-carvao/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-carvao from-15% via-carvao/70 to-transparent" />
    </div>
  );
}

/**
 * Dica de interação + giroscópio opcional (só aparece com o 3D rodando).
 * No iOS o giroscópio precisa de permissão, pedida no toque do botão.
 */
export function DicaInteracao() {
  const modo = usePalco();
  const [temGiroscopio, setTemGiroscopio] = useState(false);
  const [giroscopioLigado, setGiroscopioLigado] = useState(false);

  useEffect(() => {
    setTemGiroscopio("DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!giroscopioLigado) return;
    const aoInclinar = (e: DeviceOrientationEvent) => {
      cena.inclinacao.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      cena.inclinacao.y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30));
      cena.inclinacao.ativa = true;
    };
    window.addEventListener("deviceorientation", aoInclinar);
    return () => {
      window.removeEventListener("deviceorientation", aoInclinar);
      cena.inclinacao.ativa = false;
      cena.inclinacao.x = cena.inclinacao.y = 0;
    };
  }, [giroscopioLigado]);

  const alternarGiroscopio = async () => {
    if (giroscopioLigado) return setGiroscopioLigado(false);
    const Evento = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
    if (typeof Evento.requestPermission === "function") {
      try {
        if ((await Evento.requestPermission()) !== "granted") return;
      } catch {
        return;
      }
    }
    setGiroscopioLigado(true);
  };

  if (modo !== "3d") return null;

  return (
    <div className="flex items-center gap-3 text-sm text-osso/75">
      <span className="hidden md:inline">Clica na brasa pra abanar</span>
      <span className="md:hidden">Toca na brasa pra abanar</span>
      {temGiroscopio && (
        <button
          type="button"
          onClick={alternarGiroscopio}
          aria-pressed={giroscopioLigado}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-osso/90 transition-colors",
            giroscopioLigado ? "border-ambar text-ambar" : "border-carvao-3",
          )}
        >
          <IconeGiroscopio className="size-4" />
          Inclinar o celular
        </button>
      )}
    </div>
  );
}
