import { faq } from "@/content/textos";
import { LinkTransicao } from "@/components/motion/Transicao";
import { Titulo } from "@/components/motion/Titulo";
import { IconeSeta } from "@/components/ui/Icones";

/**
 * 8. PERGUNTAS FREQUENTES: troca, TWI, rodízio, calibragem.
 *
 * Accordion com <details name="faq"> nativo (um aberto por vez): teclado e leitor de
 * tela funcionam sem nada extra, as respostas ficam no HTML (busca e sem JS) e não
 * custa nenhum byte de JavaScript. O visual segue o accordion do shadcn/ui.
 * O JSON-LD FAQPage fica só na página /guia-do-pneu, que tem as mesmas perguntas abertas.
 */
export function Faq() {
  return (
    <section id="duvidas" aria-labelledby="titulo-duvidas" className="secao-solida z-10 py-28 md:py-40">
      <div className="grade gap-y-12">
        <div className="col-span-4 md:col-span-4">
          <p className="rotulo mb-4">
            <b>08</b> Perguntas frequentes
          </p>
          <Titulo id="titulo-duvidas" className="text-[clamp(2.6rem,5vw,4.8rem)]">
            Dúvidas de quem roda
          </Titulo>
          <LinkTransicao
            href="/guia-do-pneu"
            rotulo="Guia do pneu"
            className="mt-8 inline-flex items-center gap-2 font-display text-sm font-bold tracking-[0.14em] uppercase underline decoration-sinal decoration-2 underline-offset-8 hover:text-sinal"
          >
            Guia completo do pneu
            <IconeSeta className="h-4 w-4" />
          </LinkTransicao>
        </div>
        <div className="col-span-4 border-t border-linha md:col-span-7 md:col-start-6">
          {faq.map((f) => (
            <details key={f.pergunta} name="faq" className="acordeao group border-b border-linha">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 text-left transition-colors hover:text-sinal [&::-webkit-details-marker]:hidden">
                <h3 className="text-xl leading-tight md:text-2xl">{f.pergunta}</h3>
                <span
                  aria-hidden="true"
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-faixa/25 transition-colors group-open:border-sinal group-open:bg-sinal group-hover:border-sinal"
                >
                  <span className="absolute h-0.5 w-3.5 bg-faixa group-open:bg-asfalto" />
                  <span className="absolute h-3.5 w-0.5 bg-faixa transition-transform duration-300 group-open:rotate-90 group-open:bg-asfalto" />
                </span>
              </summary>
              <p className="max-w-2xl pb-8 text-lg text-faixa/85">{f.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
