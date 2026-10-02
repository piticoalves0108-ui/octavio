import dynamic from "next/dynamic";
import { IconePino, IconeTelefone, IconeWhatsApp } from "@/components/Icones";
import { LinkRastreado } from "@/components/conversao/LinkRastreado";
import { StatusHorario } from "@/components/conversao/StatusHorario";
import { Magnetico } from "@/components/motion/Magnetico";
import { Revelar } from "@/components/motion/Revelar";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { negocio } from "@/content/negocio";
import { linkComoChegar, linkTelefone, linkWhatsApp } from "@/lib/links";
import { MapaEstilizado } from "./MapaEstilizado";

const ReservaGrupo = dynamic(() => import("./ReservaGrupo"));

/** Seção 5: Como chegar. */
export function ComoChegar() {
  return (
    <section id="como-chegar" aria-labelledby="titulo-como-chegar" className="relative z-[1] bg-carvao pb-12 pt-10 md:pb-20">
      <div className="moldura grade gap-y-14">
        <div className="col-span-12 lg:col-span-5">
          <p className="rotulo text-brasa">Como chegar</p>
          <TituloCalor id="titulo-como-chegar" className="titulo-lg mt-4 text-osso">
            Em frente ao <span className="text-ambar">Top Life</span> Miami Beach
          </TituloCalor>
          <Revelar className="mt-8 flex flex-col gap-6">
            <address className="text-xl not-italic leading-relaxed text-osso/90">
              {negocio.endereco.linha}
              <br />
              {negocio.endereco.bairro}, {negocio.endereco.cidade} - {negocio.endereco.uf}
            </address>
            <div className="flex flex-col gap-1">
              <p>{negocio.horario.resumo}</p>
              <StatusHorario />
            </div>
            <div className="flex flex-wrap gap-3">
              <Magnetico>
                <LinkRastreado href={linkComoChegar} evento="como_chegar" origem="como-chegar" className="botao botao-brasa">
                  <IconePino className="size-5" /> Como chegar
                </LinkRastreado>
              </Magnetico>
              <LinkRastreado href={linkTelefone} evento="ligar" origem="como-chegar" externo={false} className="botao botao-linha">
                <IconeTelefone className="size-5" /> Ligar
              </LinkRastreado>
              <LinkRastreado href={linkWhatsApp} evento="pedir_whatsapp" origem="como-chegar" className="botao botao-linha">
                <IconeWhatsApp className="size-5" /> WhatsApp
              </LinkRastreado>
            </div>
          </Revelar>
        </div>
        <div className="col-span-12 flex flex-col gap-8 lg:col-span-6 lg:col-start-7">
          <MapaEstilizado />
          {negocio.aceitaReservaGrupos === true && <ReservaGrupo />}
        </div>
      </div>
    </section>
  );
}
