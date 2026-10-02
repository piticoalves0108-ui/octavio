"use client";

import dynamic from "next/dynamic";
import type { PecaEspeto } from "@/content/cardapio";
import { negocio } from "@/content/negocio";

const Experiencia = dynamic(() => import("@/components/three/Experiencia"), { ssr: false });

export function Captura({ modo, peca, og }: { modo: string; peca?: string; og?: string }) {
  const captura =
    modo === "peca" ? { tipo: "peca" as const, peca: (peca ?? "carne") as PecaEspeto } : modo === "hamburguer" ? { tipo: "hamburguer" as const } : { tipo: "hero" as const, tempo: 0 };
  const retrato = typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8;

  return (
    <>
      {/* Esconde o resto do site; nas miniaturas, fundo transparente. */}
      <style>{`header,footer,#preloader,nextjs-portal,a[aria-label="Pedir no WhatsApp"]{display:none!important}${
        modo === "hero" ? "" : "html,body{background:transparent!important}"
      }`}</style>
    <div id="palco-captura" className="fixed inset-0 z-[300]" style={{ background: modo === "hero" ? "#121212" : "transparent" }}>
      <Experiencia mobile={retrato} captura={captura} />
      {og && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-carvao via-carvao/40 to-transparent p-14">
          <p className="rotulo text-ambar">QI 23 · Taguatinga Norte · {negocio.horario.curto}</p>
          <p className="titulo mt-3 whitespace-nowrap text-[104px] leading-[0.85] text-osso">
            {og === "cardapio" ? (
              <>
                Cardápio <span className="text-brasa">do Bruce</span>
              </>
            ) : (
              <>
                Churrasquinho <span className="text-brasa">do Bruce</span>
              </>
            )}
          </p>
          <p className="mt-4 text-3xl font-semibold text-osso/90">
            {og === "cardapio" ? "Espetinho, hambúrguer, almoço e bebida." : negocio.slogan}
          </p>
        </div>
      )}
    </div>
    </>
  );
}
