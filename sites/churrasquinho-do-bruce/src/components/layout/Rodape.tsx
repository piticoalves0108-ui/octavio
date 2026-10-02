import { IconeChama, IconeInstagram, IconePino, IconeRelogio, IconeSacola, IconeTelefone, IconeWhatsApp } from "@/components/Icones";
import { LinkRastreado } from "@/components/conversao/LinkRastreado";
import { StatusHorario } from "@/components/conversao/StatusHorario";
import { LinkTransicao } from "@/components/motion/Transicao";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { negocio } from "@/content/negocio";
import { linkComoChegar, linkIfood, linkInstagram, linkTelefone, linkWhatsApp } from "@/lib/links";
import { RodapeBrasa } from "./RodapeBrasa";

const linkRodape = "inline-flex min-h-11 items-center gap-3 text-osso/90 transition-colors hover:text-ambar";

export function Rodape() {
  const ano = new Date().getFullYear();

  return (
    <footer id="rodape" className="relative z-[1] overflow-hidden">
      <div className="relative pt-28 md:pt-40">
      <RodapeBrasa />
      <div className="moldura relative">
        <div className="grade gap-y-14">
          <div className="col-span-12 lg:col-span-7">
            <p className="rotulo text-brasa">Fim da linha</p>
            <TituloCalor className="titulo-lg mt-4 text-osso">
              Até a próxima
              <span className="block text-ambar">brasa.</span>
            </TituloCalor>
          </div>

          <dl className="col-span-12 grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:pt-6">
            <div>
              <dt className="rotulo mb-3 flex items-center gap-2 text-fumaca">
                <IconePino className="size-4" /> Endereço
              </dt>
              <dd>
                <address className="not-italic leading-relaxed">
                  {negocio.endereco.linha}
                  <br />
                  {negocio.endereco.bairro}, {negocio.endereco.cidade} - {negocio.endereco.uf}
                  <br />
                  <span className="text-ambar">{negocio.endereco.referencia}</span>
                </address>
                <LinkRastreado href={linkComoChegar} evento="como_chegar" origem="rodape" className={`${linkRodape} mt-1 font-semibold underline underline-offset-4`}>
                  Como chegar
                </LinkRastreado>
              </dd>
            </div>
            <div>
              <dt className="rotulo mb-3 flex items-center gap-2 text-fumaca">
                <IconeRelogio className="size-4" /> Horário
              </dt>
              <dd className="flex flex-col gap-2">
                <span>{negocio.horario.resumo}</span>
                <StatusHorario className="text-osso/90" />
              </dd>
            </div>
            <div>
              <dt className="rotulo mb-3 flex items-center gap-2 text-fumaca">
                <IconeTelefone className="size-4" /> Contato
              </dt>
              <dd className="flex flex-col">
                <LinkRastreado href={linkWhatsApp} evento="pedir_whatsapp" origem="rodape" className={linkRodape}>
                  <IconeWhatsApp className="size-5 text-brasa" /> WhatsApp {negocio.whatsapp.exibicao}
                </LinkRastreado>
                <LinkRastreado href={linkTelefone} evento="ligar" origem="rodape" externo={false} className={linkRodape}>
                  <IconeTelefone className="size-5 text-brasa" /> Ligar
                </LinkRastreado>
              </dd>
            </div>
            <div>
              <dt className="rotulo mb-3 flex items-center gap-2 text-fumaca">
                <IconeSacola className="size-4" /> Delivery e redes
              </dt>
              <dd className="flex flex-col">
                <LinkRastreado href={linkIfood} evento="pedir_ifood" origem="rodape" className={linkRodape}>
                  <IconeSacola className="size-5 text-brasa" /> Pedir no iFood
                </LinkRastreado>
                <LinkRastreado href={linkInstagram} evento="instagram" origem="rodape" className={linkRodape}>
                  <IconeInstagram className="size-5 text-brasa" /> @{negocio.instagram.usuario}
                </LinkRastreado>
              </dd>
            </div>
          </dl>
        </div>

        {/* Espaço da churrasqueira apagando (3D) / brilho (CSS) */}
        <div className="h-[34vh] md:h-[40vh]" />
      </div>
      </div>

      <div className="relative border-t border-osso/15 bg-carvao">
        <div className="moldura flex flex-col gap-4 py-7 text-sm text-osso/80 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <IconeChama className="h-4 w-auto text-brasa" />© {ano} {negocio.nome} · {negocio.endereco.bairro} - {negocio.endereco.uf}
          </p>
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              <li>
                <LinkTransicao href="/cardapio" className="inline-flex min-h-11 items-center hover:text-ambar">
                  Cardápio completo
                </LinkTransicao>
              </li>
              <li>
                <LinkTransicao href="/#como-chegar" className="inline-flex min-h-11 items-center hover:text-ambar">
                  Como chegar
                </LinkTransicao>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
