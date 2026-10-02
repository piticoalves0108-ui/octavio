import { negocio } from "@/content/site";
import { MapaSvg } from "@/components/fallbacks/MapaSvg";
import { Revelar } from "@/components/motion/Revelar";
import { Titulo } from "@/components/motion/Titulo";
import { Texto } from "@/components/ui/Pendente";
import { BotaoComoChegar, LinkInstagram, LinkLigar, LinkWhatsTexto } from "@/components/ui/LinksContato";
import { enderecoCompleto } from "@/lib/contato";

const DIAS: Record<string, string> = {
  Monday: "Seg",
  Tuesday: "Ter",
  Wednesday: "Qua",
  Thursday: "Qui",
  Friday: "Sex",
  Saturday: "Sáb",
  Sunday: "Dom",
};

/** 7. COMO CHEGAR: endereço, horário, mapa estilizado e botão para o Google Maps. */
export function ComoChegar() {
  return (
    <section id="como-chegar" aria-labelledby="titulo-como-chegar" className="secao-solida z-10 py-28 md:py-40">
      <div className="grade gap-y-14">
        <div className="col-span-4 md:col-span-5">
          <p className="rotulo mb-4">
            <b>07</b> Como chegar
          </p>
          <Titulo id="titulo-como-chegar" className="text-[clamp(2.6rem,5.6vw,5.4rem)]">
            Passa aqui
          </Titulo>

          <dl className="mt-10 space-y-7">
            <div>
              <dt className="rotulo mb-1">Endereço</dt>
              <dd className="text-xl">
                <address className="not-italic">
                  <Texto>{enderecoCompleto()}</Texto>
                </address>
                {negocio.endereco.referencia && <span className="mt-1 block text-sm text-cinza">{negocio.endereco.referencia}</span>}
              </dd>
            </div>
            <div>
              <dt className="rotulo mb-1">Horário</dt>
              <dd className="text-xl">
                {negocio.horarios.length ? (
                  <ul>
                    {negocio.horarios.map((h) => (
                      <li key={h.rotulo} className="flex justify-between gap-6 border-b border-linha py-2">
                        <span>{h.rotulo}</span>
                        <span className="tabular-nums">
                          {h.abre} às {h.fecha}
                        </span>
                        <span className="sr-only">({h.dias.map((d) => DIAS[d]).join(", ")})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Texto>{negocio.horarioTexto}</Texto>
                )}
              </dd>
            </div>
            <div>
              <dt className="rotulo mb-1">Telefone</dt>
              <dd className="text-xl">
                <LinkLigar origem="como_chegar" className="!min-h-0 !border-0 !p-0 !font-sans !text-xl !tracking-normal !normal-case" />
              </dd>
            </div>
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <BotaoComoChegar origem="como_chegar" />
            <LinkWhatsTexto origem="como_chegar" />
          </div>
          <LinkInstagram origem="como_chegar" className="mt-6 inline-flex items-center gap-2 text-sm text-faixa/80 hover:text-sinal" />
        </div>

        <Revelar className="col-span-4 md:col-span-6 md:col-start-7">
          <div className="overflow-hidden rounded-[28px] border border-linha">
            <MapaSvg />
          </div>
        </Revelar>
      </div>
    </section>
  );
}
