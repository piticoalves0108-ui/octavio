import { perguntas, type Pergunta } from "@/content/textos";
import { linkWhatsappPadrao } from "@/content/negocio";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Texto } from "@/components/ui/Texto";
import { classesBotao } from "@/components/ui/botao";
import { IconeWhatsapp } from "@/components/ui/icones";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";

/** Perguntas frequentes. As já confirmadas (prazo e pagamento) vêm abertas. */
export function Duvidas({ itens = perguntas }: { itens?: Pergunta[] }) {
  return (
    <section id="duvidas" aria-labelledby="titulo-duvidas" className="secao">
      <div className="grade gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <p className="sobretitulo text-champanhe-texto">Perguntas frequentes</p>
          <TituloAnimado id="titulo-duvidas" className="titulo-secao mt-5">
            Antes de pedir, tire suas dúvidas.
          </TituloAnimado>
          <p className="mt-6 text-tinta-suave">Não achou a sua? Pergunte direto para a fábrica.</p>
          <LinkRastreado
            href={linkWhatsappPadrao}
            evento="whatsapp_clique"
            origem="duvidas"
            externo
            className={classesBotao("secundario", "mt-6")}
          >
            <IconeWhatsapp className="size-4" />
            Perguntar no WhatsApp
          </LinkRastreado>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:col-start-6">
          <Accordion type="multiple" defaultValue={["prazo", "pagamento"]}>
            {itens.map((p) => (
              <AccordionItem key={p.id} value={p.id}>
                <AccordionTrigger>{p.pergunta}</AccordionTrigger>
                <AccordionContent>
                  <Texto>{p.resposta}</Texto>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
