"use client";

import { useRef } from "react";
import { useMotor } from "@/hooks/useMotor";
import { useSecaoCena } from "@/hooks/useSecaoCena";
import { cena, registrarAncora } from "@/lib/cena";

/**
 * Fundo do rodapé: as brasas se apagam devagar e sobra só o brilho.
 * Com 3D, a churrasqueira aparece por trás do rodapé e o `apagar` vai de 0 a 1
 * com o scroll. Sem 3D, um brilho em CSS faz o mesmo papel e também esmaece.
 */
export function RodapeBrasa() {
  const ref = useRef<HTMLDivElement>(null);
  const brilho = useRef<HTMLDivElement>(null);
  useSecaoCena(ref, "rodape");

  useMotor(({ gsap, reduzido }) => {
    const el = ref.current;
    if (!el) return;
    const st = { trigger: el, start: "top bottom", end: "bottom bottom", scrub: reduzido ? false : true };
    gsap.fromTo(cena, { apagar: 0 }, { apagar: 1, ease: "none", scrollTrigger: st });
    if (brilho.current && !reduzido) {
      gsap.fromTo(brilho.current, { opacity: 1, scale: 1 }, { opacity: 0.45, scale: 0.85, ease: "none", scrollTrigger: st });
    }
  }, ref);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Brilho em CSS (sem WebGL). Com 3D, fica bem mais discreto. */}
      <div className="absolute inset-0 transition-opacity duration-700 [html[data-palco=3d]_&]:opacity-25">
        <div
          ref={brilho}
          className="absolute inset-x-[-10%] bottom-[-38%] h-[85%] origin-bottom bg-[radial-gradient(50%_55%_at_50%_100%,rgba(255,90,31,0.6),rgba(255,90,31,0.14)_45%,transparent_72%)]"
        />
      </div>
      {/* Âncora da churrasqueira 3D no rodapé */}
      <div ref={(el) => registrarAncora("rodape-brasa", el)} className="absolute bottom-0 left-1/2 h-[46%] w-[min(92vw,70rem)] -translate-x-1/2" />
    </div>
  );
}
