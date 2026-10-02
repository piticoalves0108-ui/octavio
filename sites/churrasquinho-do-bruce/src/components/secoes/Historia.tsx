import { Foto } from "@/components/Foto";
import { Marcador, Texto } from "@/components/Pendente";
import { Parallax } from "@/components/motion/Parallax";
import { Revelar } from "@/components/motion/Revelar";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { anoDeAbertura, blocosHistoria, introHistoria } from "@/content/historia";
import { mostrarPendencias } from "@/lib/pendente";
import { cn } from "@/lib/utils";

/** Layout editorial dos 3 blocos (foto + texto alternando no grid de 12). */
const LAYOUT = [
  { foto: "lg:col-span-5 lg:col-start-1", texto: "lg:col-span-5 lg:col-start-7 lg:self-end", velocidade: 0.12 },
  { foto: "lg:col-span-7 lg:col-start-6 lg:order-2", texto: "lg:col-span-4 lg:col-start-1 lg:order-1 lg:self-center", velocidade: -0.08 },
  { foto: "lg:col-span-4 lg:col-start-2", texto: "lg:col-span-5 lg:col-start-8 lg:self-center", velocidade: 0.1 },
];

/** Seção 3: "Na brasa desde..." */
export function Historia() {
  return (
    <section id="historia" aria-labelledby="titulo-historia" className="relative z-[1] bg-carvao py-28 md:py-44">
      <div className="moldura">
        <div className="grade gap-y-8">
          <p className="rotulo col-span-12 text-brasa">Na brasa</p>
          <TituloCalor id="titulo-historia" className="titulo-lg col-span-12 text-osso lg:col-span-8">
            {anoDeAbertura ? (
              <>
                Na brasa desde <span className="text-ambar">{anoDeAbertura}</span>
              </>
            ) : mostrarPendencias ? (
              <>
                Na brasa desde <Marcador texto="{{CONFIRMAR: ano de abertura}}" className="align-middle" />
              </>
            ) : (
              <>
                Na brasa, <span className="text-ambar">na QI 23</span>
              </>
            )}
          </TituloCalor>
          <Texto valor={introHistoria} como="p" className="col-span-12 text-xl leading-relaxed text-osso/85 lg:col-span-5 lg:col-start-8 lg:self-end" />
        </div>

        <ol className="mt-20 flex flex-col gap-24 md:mt-32 md:gap-40">
          {blocosHistoria.map((bloco, i) => (
            <li key={bloco.id} className="grade items-start gap-y-8" aria-labelledby={`historia-${bloco.id}`}>
              <div className={cn("col-span-12 md:col-span-8", LAYOUT[i].foto)}>
                <Parallax velocidade={LAYOUT[i].velocidade}>
                  <Foto foto={bloco.foto} sizes="(min-width: 1024px) 45vw, 90vw" className="rounded-3xl" />
                </Parallax>
              </div>
              <Revelar className={cn("col-span-12 md:col-span-8", LAYOUT[i].texto)}>
                <p className="rotulo text-ambar">{bloco.rotulo}</p>
                <h3 id={`historia-${bloco.id}`} className="titulo titulo-md mt-4 text-osso">
                  {bloco.titulo}
                </h3>
                <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-osso/85">{bloco.texto}</p>
                <Texto valor={bloco.historia} como="p" className="mt-4 max-w-[46ch] text-osso/85" />
              </Revelar>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
