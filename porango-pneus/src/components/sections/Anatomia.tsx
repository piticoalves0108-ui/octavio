"use client";

import { camadas } from "@/content/textos";
import { AnatomiaSvg } from "@/components/fallbacks/AnatomiaSvg";
import { Titulo } from "@/components/motion/Titulo";
import { cn } from "@/lib/cn";
import { FAIXAS, indiceAtivo, palco } from "@/lib/palco";
import { usePalco } from "@/lib/usePalco";

/**
 * POR DENTRO DO PNEU: vista explodida.
 * A rolagem separa as camadas em 3D e depois acende uma por vez, com a legenda ao lado.
 */
export function Anatomia() {
  const ativa = usePalco(() =>
    palco.anatomiaP > FAIXAS.explosao ? indiceAtivo(palco.anatomiaP, camadas.length, FAIXAS.explosao, 1) : -1,
  );

  return (
    <section id="anatomia" data-ato="anatomia" aria-labelledby="titulo-anatomia" className="relative z-10 h-[460vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* véu de contraste atrás do texto (o 3D continua aparecendo à direita) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-asfalto via-asfalto/70 via-40% to-transparent to-70% md:bg-gradient-to-r md:from-asfalto/90 md:via-asfalto/55 md:via-35% md:to-transparent md:to-60%"
        />
        <div className="grade h-full grid-rows-[1fr_auto] md:grid-rows-1 md:content-center">
          <div className="so-sem-cena pointer-events-none col-span-4 row-start-1 self-center px-10 pt-16 md:col-span-5 md:col-start-8 md:px-0 md:pt-0">
            <AnatomiaSvg ativa={ativa} className="mx-auto max-w-[min(100%,56vh)]" />
          </div>

          <div className="relative col-span-4 row-start-2 self-end pb-8 md:col-span-5 md:row-start-1 md:self-center md:pb-0">
            <p className="rotulo mb-4">
              <b>02</b> Por dentro do pneu
            </p>
            <Titulo id="titulo-anatomia" className="text-[clamp(2.2rem,5vw,4.4rem)]">
              Cinco camadas, um só trabalho
            </Titulo>
            <p className="mt-4 hidden max-w-md text-cinza md:block">
              Pneu bom não é só borracha. É por isso que medida e marca certas fazem diferença na estrada.
            </p>
            <ol className="mt-6 space-y-1 border-l border-linha md:mt-8">
              {camadas.map((c, i) => {
                const aceso = i === ativa;
                return (
                  <li key={c.nome} className="relative pl-5" aria-current={aceso ? "step" : undefined}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-0 -left-px h-full w-0.5 origin-top bg-sinal transition-transform duration-500",
                        aceso ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <p
                      className={cn(
                        "font-display text-base font-semibold tracking-[0.1em] uppercase transition-colors md:text-lg",
                        aceso ? "text-sinal" : "text-faixa/55",
                      )}
                    >
                      <span className="mr-3 text-sm tabular-nums">0{i + 1}</span>
                      {c.nome}
                    </p>
                    <p
                      className={cn(
                        "grid text-sm text-faixa/85 transition-[grid-template-rows,opacity,margin] duration-500 md:text-base",
                        aceso ? "mt-1 mb-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="overflow-hidden">{c.texto}</span>
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
