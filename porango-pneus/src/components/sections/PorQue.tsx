import { diferenciais } from "@/content/site";
import { Revelar } from "@/components/motion/Revelar";
import { Titulo } from "@/components/motion/Titulo";
import { SeloPendente, Texto } from "@/components/ui/Pendente";
import { visiveis } from "@/lib/pendente";

/** 5. POR QUE TROCAR NA PORANGO: atendimento, garantia e pagamento. Só informação confirmada. */
export function PorQue() {
  const lista = visiveis(diferenciais);
  if (!lista.length) return null;
  return (
    <section id="por-que" aria-labelledby="titulo-por-que" className="secao-solida z-10 py-28 md:py-40">
      <div className="grade gap-y-14">
        <div className="col-span-4 md:col-span-5">
          <p className="rotulo mb-4">
            <b>05</b> Por que trocar na Porango
          </p>
          <Titulo id="titulo-por-que" className="text-[clamp(2.6rem,5.6vw,5.4rem)]">
            Sem enrolação
          </Titulo>
          <p className="mt-6 max-w-sm text-cinza">Pneu certo, preço justo e a informação clara antes de você sair de casa.</p>
        </div>
        <ol className="col-span-4 md:col-span-7 md:col-start-6">
          {lista.map((d, i) => (
            <Revelar as="li" key={d.titulo} atraso={i * 60}>
              <div className="group grid grid-cols-[3rem_1fr] gap-x-4 border-t border-linha py-7 transition-colors hover:border-sinal md:grid-cols-[4rem_14rem_1fr] md:gap-x-8">
                <span className="font-display text-sm font-semibold text-sinal tabular-nums">0{i + 1}</span>
                <h3 className="flex flex-wrap items-center gap-3 text-2xl md:text-3xl">
                  {d.titulo}
                  <SeloPendente confirmado={d.confirmado} />
                </h3>
                <p className="col-start-2 mt-2 text-faixa/85 md:col-start-3 md:mt-1">
                  <Texto>{d.texto}</Texto>
                </p>
              </div>
            </Revelar>
          ))}
        </ol>
      </div>
    </section>
  );
}
