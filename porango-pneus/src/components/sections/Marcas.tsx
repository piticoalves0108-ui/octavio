import { marcas } from "@/content/site";
import { Marquee } from "@/components/motion/Marquee";
import { Texto } from "@/components/ui/Pendente";
import { pendente, visiveisTexto } from "@/lib/pendente";

/** 4. MARCAS QUE TRABALHAMOS: faixa corrida que acelera com a rolagem. Só marcas confirmadas. */
export function Marcas() {
  const lista = visiveisTexto(marcas);
  if (!lista.length) return null;
  // repete até encher a faixa
  const itens = Array.from({ length: Math.max(2, Math.ceil(8 / lista.length)) }, () => lista).flat();

  return (
    <section id="marcas" aria-labelledby="titulo-marcas" className="secao-solida z-10 border-y border-linha py-16 md:py-24">
      <div className="grade mb-10">
        <p className="rotulo col-span-4 md:col-span-6">
          <b>04</b> <span id="titulo-marcas">Marcas que trabalhamos</span>
        </p>
      </div>
      {/* lista acessível (a faixa animada é decorativa) */}
      <ul className="sr-only">
        {lista.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <Marquee>
        {itens.map((m, i) => (
          <span key={i} className="flex items-center">
            {pendente(m) ? (
              // prévia: espaço da marca, com o marcador pequeno ao lado
              <span className="flex items-center gap-4 px-8 md:px-12">
                <span className="font-display text-[clamp(2.6rem,7vw,6.5rem)] leading-none font-bold whitespace-nowrap text-transparent uppercase [-webkit-text-stroke:1.5px_rgba(244,244,242,0.35)]">
                  Marca
                </span>
                <span className="max-w-[16rem] text-xs leading-tight whitespace-normal">
                  <Texto>{m}</Texto>
                </span>
              </span>
            ) : (
              <span className="px-8 font-display text-[clamp(2.6rem,7vw,6.5rem)] leading-none font-bold whitespace-nowrap uppercase md:px-12">
                {m}
              </span>
            )}
            <svg viewBox="0 0 40 24" className="h-6 w-10 text-sinal" aria-hidden="true">
              <path d="M0 24 L10 0 L20 0 L10 24 Z M20 24 L30 0 L40 0 L30 24 Z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
