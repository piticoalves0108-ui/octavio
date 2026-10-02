import { mensagens, servicos } from "@/content/site";
import { CardTilt } from "@/components/motion/CardTilt";
import { Revelar } from "@/components/motion/Revelar";
import { Titulo } from "@/components/motion/Titulo";
import { SeloPendente, Texto } from "@/components/ui/Pendente";
import { IconeServico } from "@/components/ui/Icones";
import { LinkServico } from "./LinkServico";
import { visiveis } from "@/lib/pendente";

/** 3. SERVIÇOS: só os confirmados (na prévia, os outros aparecem com selo). */
export function Servicos() {
  const lista = visiveis(servicos);
  return (
    <section id="servicos" aria-labelledby="titulo-servicos" className="secao-solida z-10 py-28 md:py-40">
      <div className="grade gap-y-14">
        <div className="col-span-4 md:col-span-6">
          <p className="rotulo mb-4">
            <b>03</b> Serviços
          </p>
          <Titulo id="titulo-servicos" className="text-[clamp(2.6rem,6.4vw,6rem)]">
            Do pneu certo à roda alinhada
          </Titulo>
        </div>
        <p className="col-span-4 self-end text-lg text-cinza md:col-span-4 md:col-start-9">
          Chame no WhatsApp com o serviço que precisa. A mensagem já vai pronta.
        </p>

        <ul className="col-span-4 grid gap-4 sm:grid-cols-2 md:col-span-12 lg:grid-cols-4" role="list">
          {lista.map((s, i) => (
            <Revelar as="li" key={s.id} atraso={(i % 4) * 90} className={i === 0 ? "sm:col-span-2" : undefined}>
              <CardTilt className="relative flex h-full min-h-[300px] flex-col rounded-[24px] border border-linha bg-borracha p-7 transition-colors hover:border-sinal/60 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <IconeServico tipo={s.icone} className="icone-gira h-12 w-12 text-sinal" />
                  <SeloPendente confirmado={s.confirmado} />
                </div>
                <h3 className={i === 0 ? "mt-10 text-[clamp(2rem,3.4vw,3rem)]" : "mt-10 text-[1.75rem]"}>{s.nome}</h3>
                <p className="mt-3 text-faixa/85">
                  <Texto>{s.resumo}</Texto>
                </p>
                <p className="mt-4 text-sm text-cinza">
                  <span className="font-semibold text-faixa/70">Quando: </span>
                  {s.quando}
                </p>
                <div className="mt-auto pt-8">
                  <LinkServico mensagem={s.id === "venda" ? mensagens.padrao : mensagens.servico(s.nome)} servico={s.id}>
                    {s.id === "venda" ? "Cotar meu pneu" : `Agendar ${s.nome.toLowerCase()}`}
                  </LinkServico>
                </div>
              </CardTilt>
            </Revelar>
          ))}
        </ul>
      </div>
    </section>
  );
}
