import { horarioParaExibir, linkComoChegar, linkWhatsappPadrao, negocio } from "@/content/negocio";
import { linhas } from "@/content/catalogo";
import { navegacao, rodape } from "@/content/textos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { classesBotao } from "@/components/ui/botao";
import { IconeInstagram, IconeMapa, IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Magnetico } from "@/components/ui/Magnetico";
import { Texto } from "@/components/ui/Texto";
import { LinkTransicao } from "./Transicao";
import { Marca } from "./Marca";

export function Rodape() {
  const ano = new Date().getFullYear();
  return (
    <footer className="tema-escuro relative overflow-hidden bg-grafite text-gelo">
      <div className="conteiner pt-24 pb-28 md:pt-32">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="sobretitulo text-champanhe">Só Salão Brasília</p>
            <p className="mt-6 font-serif text-[clamp(2.6rem,6.4vw,6rem)] leading-[0.98]">{rodape.chamada}</p>
            <p className="mt-6 max-w-xl texto-grande text-nevoa">{rodape.texto}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Magnetico>
                <LinkTransicao href="/configurador" className={classesBotao("rose")}>
                  Abrir o configurador
                </LinkTransicao>
              </Magnetico>
              <LinkRastreado
                href={linkWhatsappPadrao}
                evento="whatsapp_clique"
                origem="rodape"
                externo
                className={classesBotao("claro")}
              >
                <IconeWhatsapp className="size-4" />
                Falar no WhatsApp
              </LinkRastreado>
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-12 border-t border-gelo/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="sobretitulo font-sans text-champanhe">Fábrica e showroom</h2>
            <address className="mt-4 not-italic leading-relaxed text-nevoa">
              {negocio.endereco.logradouro}
              <br />
              {negocio.endereco.bairro}
              <br />
              {negocio.endereco.cidade} - {negocio.endereco.uf}
            </address>
            <ul className="mt-3 space-y-1 text-sm text-nevoa">
              {horarioParaExibir().map((h) => (
                <li key={h}>
                  <Texto>{h}</Texto>
                </li>
              ))}
            </ul>
            <LinkRastreado
              href={linkComoChegar}
              evento="como_chegar_clique"
              origem="rodape"
              externo
              className="mt-4 inline-flex min-h-11 items-center gap-2 underline decoration-gelo/30 underline-offset-4 hover:decoration-gelo"
            >
              <IconeMapa className="size-4" />
              Como chegar
            </LinkRastreado>
          </div>

          <div>
            <h2 className="sobretitulo font-sans text-champanhe">WhatsApp</h2>
            <ul className="mt-4 space-y-1">
              {negocio.whatsapps.map((w, i) => (
                <li key={w.e164}>
                  <LinkRastreado
                    href={
                      i === 0
                        ? linkWhatsappPadrao
                        : linkWhatsapp("Olá! Vim pelo site e quero um orçamento de móveis para salão.", w.e164)
                    }
                    evento="whatsapp_clique"
                    origem={`rodape-numero-${i + 1}`}
                    externo
                    className="inline-flex min-h-11 items-center hover:text-rose"
                  >
                    {w.exibicao}
                  </LinkRastreado>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="sobretitulo font-sans text-champanhe">Linhas</h2>
            <ul className="mt-4 space-y-1">
              {linhas.map((l) => (
                <li key={l.slug}>
                  <LinkTransicao
                    href={`/linhas/${l.slug}`}
                    className="inline-flex min-h-11 items-center hover:text-rose"
                  >
                    {l.nome}
                  </LinkTransicao>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="sobretitulo font-sans text-champanhe">Navegue</h2>
            <ul className="mt-4 space-y-1">
              {navegacao.map((n) => (
                <li key={n.href}>
                  <LinkTransicao href={n.href} className="inline-flex min-h-11 items-center hover:text-rose">
                    {n.rotulo}
                  </LinkTransicao>
                </li>
              ))}
              <li>
                <LinkRastreado
                  href={negocio.instagram.url}
                  evento="instagram_clique"
                  origem="rodape"
                  externo
                  className="inline-flex min-h-11 items-center gap-2 hover:text-rose"
                >
                  <IconeInstagram className="size-4" />
                  {negocio.instagram.usuario}
                </LinkRastreado>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col justify-between gap-6 border-t border-gelo/15 pt-8 text-sm text-nevoa md:flex-row md:items-end">
          <Marca claro />
          <p>
            © {ano} {negocio.nome}. {negocio.ramo} em Taguatinga Norte - DF. {rodape.direitos}
          </p>
        </div>
      </div>
    </footer>
  );
}
