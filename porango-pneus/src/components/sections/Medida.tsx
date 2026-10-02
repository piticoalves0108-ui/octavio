"use client";

import { partesMedida } from "@/content/textos";
import { FlancoSvg } from "@/components/fallbacks/FlancoSvg";
import { Titulo } from "@/components/motion/Titulo";
import { cn } from "@/lib/cn";
import { indiceAtivo, palco } from "@/lib/palco";
import { usePalco } from "@/lib/usePalco";

/**
 * 2. ENCONTRE SEU PNEU PELA MEDIDA (parte 1): leitura do flanco.
 * Seção alta com miolo sticky: a rolagem avança parte por parte da medida
 * enquanto a câmera 3D dá zoom no flanco e acende a mesma parte.
 */
export function Medida() {
  const ativo = usePalco(() => (palco.medidaP > 0 ? indiceAtivo(palco.medidaP, partesMedida.length, 0.04, 0.97) : -1));
  const destaque = ativo < 0 ? 0 : ativo;

  return (
    <section id="medida" data-ato="medida" aria-labelledby="titulo-medida" className="relative z-10 h-[400vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* véu de contraste atrás do texto (o 3D continua aparecendo à direita) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-asfalto via-asfalto/70 via-40% to-transparent to-70% md:bg-gradient-to-r md:from-asfalto/90 md:via-asfalto/55 md:via-35% md:to-transparent md:to-60%"
        />
        <div className="grade h-full grid-rows-[1fr_auto] md:grid-rows-1 md:content-center">
          {/* SVG de reserva: some quando o 3D está pronto */}
          <div className="so-sem-cena pointer-events-none col-span-4 row-start-1 self-center px-8 pt-16 md:col-span-6 md:col-start-7 md:px-0 md:pt-0">
            <FlancoSvg destaque={destaque} className="mx-auto max-w-[min(100%,58vh)]" />
          </div>

          <div className="relative col-span-4 row-start-2 self-end pb-8 md:col-span-5 md:row-start-1 md:self-center md:pb-0">
            <p className="rotulo mb-4">
              <b>01</b> Encontre seu pneu pela medida
            </p>
            <Titulo id="titulo-medida" className="text-[clamp(2.2rem,5.2vw,4.6rem)]">
              Leia a medida do seu pneu
            </Titulo>
            <p className="mt-4 max-w-md text-cinza">
              Ela está gravada no flanco, a lateral do pneu. Role e veja o que cada parte quer dizer.
            </p>

            <p className="mt-6 font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-none font-bold tracking-tight">
              <span className="sr-only">Medida de exemplo: 175/70 R14 84T</span>
              {["175", "/", "70", " ", "R14", " ", "84", "T"].map((t, i) => {
                const rank = [0, 2, 4, 6, 7].indexOf(i);
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cn(
                      "transition-colors duration-300",
                      rank === -1 ? "text-faixa/45" : rank === destaque ? "text-sinal" : "text-faixa/45",
                    )}
                  >
                    {t === " " ? " " : t}
                  </span>
                );
              })}
            </p>

            <ol className="mt-6 space-y-1 border-l border-linha">
              {partesMedida.map((p, i) => {
                const aceso = i === destaque;
                return (
                  <li key={p.nome} className="relative pl-5" aria-current={aceso ? "step" : undefined}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-0 -left-px h-full w-0.5 origin-top bg-sinal transition-transform duration-500",
                        aceso ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <p className={cn("font-display text-sm font-semibold tracking-[0.14em] uppercase transition-colors", aceso ? "text-sinal" : "text-faixa/55")}>
                      <span className="mr-2 tabular-nums">{p.trecho}</span>
                      {p.nome}
                    </p>
                    <p
                      className={cn(
                        "grid text-sm text-faixa/85 transition-[grid-template-rows,opacity,margin] duration-500 md:text-base",
                        aceso ? "mt-1 mb-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="overflow-hidden">{p.texto}</span>
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
