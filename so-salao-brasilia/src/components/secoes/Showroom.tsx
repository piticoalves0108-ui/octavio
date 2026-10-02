import {
  horarioParaExibir,
  linkComoChegar,
  linkTelefone,
  linkWhatsappPadrao,
  negocio,
  whatsappPrincipal,
} from "@/content/negocio";
import { secaoShowroom } from "@/content/textos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { classesBotao } from "@/components/ui/botao";
import { FotoReservada } from "@/components/ui/FotoReservada";
import { IconeInstagram, IconeMapa, IconeTelefone, IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Magnetico } from "@/components/ui/Magnetico";
import { Texto } from "@/components/ui/Texto";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";
import { Mapa } from "./Mapa";

export function Showroom({ comoTituloDaPagina = false }: { comoTituloDaPagina?: boolean }) {
  return (
    <section id="showroom" aria-labelledby="titulo-showroom" className="secao bg-rose-claro">
      <div className="grade gap-y-14">
        <div className="col-span-12 lg:col-span-5">
          <p className="sobretitulo text-champanhe-texto">{secaoShowroom.sobretitulo}</p>
          <TituloAnimado as={comoTituloDaPagina ? "h1" : "h2"} id="titulo-showroom" className="titulo-secao mt-5">
            {secaoShowroom.titulo}
          </TituloAnimado>
          <p className="mt-6 texto-grande text-tinta-suave">{secaoShowroom.texto}</p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="sobretitulo text-champanhe-texto">Endereço</dt>
              <dd className="mt-2">
                <address className="not-italic">{negocio.endereco.completo}</address>
              </dd>
            </div>
            <div>
              <dt className="sobretitulo text-champanhe-texto">Horário</dt>
              <dd className="mt-2 space-y-1">
                {horarioParaExibir().map((h) => (
                  <p key={h}>
                    <Texto>{h}</Texto>
                  </p>
                ))}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="sobretitulo text-champanhe-texto">WhatsApp</dt>
              <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {negocio.whatsapps.map((w, i) => (
                  <LinkRastreado
                    key={w.e164}
                    href={
                      i === 0
                        ? linkWhatsappPadrao
                        : linkWhatsapp("Olá! Vim pelo site e quero visitar o showroom.", w.e164)
                    }
                    evento="whatsapp_clique"
                    origem={`showroom-numero-${i + 1}`}
                    externo
                    className="inline-flex min-h-11 items-center underline decoration-grafite/30 underline-offset-4 hover:decoration-grafite"
                  >
                    {w.exibicao}
                  </LinkRastreado>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <Magnetico>
              <LinkRastreado
                href={linkComoChegar}
                evento="como_chegar_clique"
                origem="showroom"
                externo
                className={classesBotao("primario")}
              >
                <IconeMapa className="size-5" />
                {secaoShowroom.comoChegar}
              </LinkRastreado>
            </Magnetico>
            <LinkRastreado
              href={linkTelefone}
              evento="telefone_clique"
              origem="showroom"
              className={classesBotao("secundario")}
            >
              <IconeTelefone className="size-5" />
              {secaoShowroom.ligar}: {whatsappPrincipal.exibicao}
            </LinkRastreado>
            <LinkRastreado
              href={linkWhatsappPadrao}
              evento="whatsapp_clique"
              origem="showroom-botao"
              externo
              className={classesBotao("secundario")}
            >
              <IconeWhatsapp className="size-5" />
              WhatsApp
            </LinkRastreado>
            <LinkRastreado
              href={negocio.instagram.url}
              evento="instagram_clique"
              origem="showroom"
              externo
              className={classesBotao("secundario")}
            >
              <IconeInstagram className="size-5" />
              {negocio.instagram.usuario}
            </LinkRastreado>
          </div>
        </div>

        <div className="col-span-12 grid gap-6 lg:col-span-6 lg:col-start-7">
          <Mapa />
          <FotoReservada
            proporcao="16/9"
            fotoIdeal={secaoShowroom.fotoIdeal}
            marcador="{{CONFIRMAR: foto da fachada e do showroom}}"
          />
        </div>
      </div>
    </section>
  );
}
