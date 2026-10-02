"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cena } from "@/lib/cena";
import { palco } from "@/lib/palco";

const Experiencia = dynamic(() => import("./Experiencia"), { ssr: false });

type Aparelho = "video" | "mobile" | "desktop";

/** Decide o que o aparelho aguenta. Muito fraco ou sem WebGL de verdade: vídeo. */
function avaliarAparelho(): Aparelho {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2)) return "video";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return "video";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "video";
  }
  const toque = window.matchMedia("(pointer: coarse)").matches;
  return toque && Math.min(screen.width, screen.height) < 820 ? "mobile" : "desktop";
}

/**
 * Palco 3D fixo atrás da página (só na home).
 *
 * Estratégia de carregamento (LCP e TBT protegidos):
 * 1. O hero chega com o pôster AVIF (mesmo enquadramento da cena).
 * 2. O chunk do 3D (three + R3F) só é baixado com o hero na tela E depois da
 *    primeira interação (mouse, toque, scroll, tecla). Quem não interage
 *    continua vendo o pôster, que é um frame da própria cena. Assim o
 *    three.js nunca disputa a main thread com o carregamento da página.
 * 3. Movimento reduzido ou economia de dados: fica no pôster.
 *    Aparelho muito fraco: vídeo em loop gravado da própria cena.
 */
export function Palco() {
  const [aparelho, setAparelho] = useState<Exclude<Aparelho, "video"> | null>(null);

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cena.ponteiro.x = (e.clientX / window.innerWidth) * 2 - 1;
      cena.ponteiro.y = -((e.clientY / window.innerHeight) * 2 - 1);
      cena.ponteiro.ativo = true;
    };
    const sair = () => (cena.ponteiro.ativo = false);
    window.addEventListener("pointermove", mover, { passive: true });
    document.documentElement.addEventListener("pointerleave", sair);

    const limpar = () => {
      window.removeEventListener("pointermove", mover);
      document.documentElement.removeEventListener("pointerleave", sair);
    };

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduzido || economia) return limpar;

    const EVENTOS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    let iniciado = false;

    const iniciar = () => {
      if (iniciado) return;
      const algumaSecao3D = Object.values(cena.secoes).some(Boolean);
      if (!algumaSecao3D) return; // espera o hero (ou outra seção 3D) aparecer
      iniciado = true;
      EVENTOS.forEach((ev) => window.removeEventListener(ev, iniciar));
      const resultado = avaliarAparelho();
      if (resultado === "video") {
        palco.set("video");
        return;
      }
      cena.intro = 0;
      palco.set("carregando");
      setAparelho(resultado);
    };

    EVENTOS.forEach((ev) => window.addEventListener(ev, iniciar, { passive: true }));

    return () => {
      limpar();
      EVENTOS.forEach((ev) => window.removeEventListener(ev, iniciar));
      palco.set("poster");
    };
  }, []);

  if (!aparelho) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[100lvh]">
      <Experiencia
        mobile={aparelho === "mobile"}
        onPronto={() => palco.set("3d")}
        onFallback={() => {
          setAparelho(null);
          palco.set("video");
        }}
      />
    </div>
  );
}
