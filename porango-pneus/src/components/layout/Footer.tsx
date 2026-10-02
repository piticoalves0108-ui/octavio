import { negocio } from "@/content/site";
import { LinkTransicao } from "@/components/motion/Transicao";
import { Texto } from "@/components/ui/Pendente";
import { IconeInstagram } from "@/components/ui/Icones";
import { enderecoCompleto } from "@/lib/contato";

export function Footer() {
  const ano = new Date().getFullYear();
  return (
    <footer className="secao-solida relative z-10 border-t border-linha pt-20 pb-28 md:pb-16">
      <div className="grade gap-y-12">
        <div className="col-span-4 md:col-span-7">
          <p className="font-display text-[clamp(3rem,11vw,10.5rem)] leading-[0.85] font-bold tracking-tight uppercase">
            Porango
            <br />
            <span className="text-sinal">Pneus</span>
          </p>
        </div>
        <div className="col-span-4 flex flex-col gap-8 md:col-span-4 md:col-start-9 md:justify-end">
          <div>
            <p className="rotulo mb-2">Endereço</p>
            <p className="text-faixa/90">
              <Texto>{enderecoCompleto()}</Texto>
            </p>
          </div>
          <nav aria-label="Rodapé">
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <LinkTransicao href="/" rotulo="Início" className="hover:text-sinal">
                  Início
                </LinkTransicao>
              </li>
              <li>
                <LinkTransicao href="/servicos" rotulo="Serviços" className="hover:text-sinal">
                  Serviços
                </LinkTransicao>
              </li>
              <li>
                <LinkTransicao href="/guia-do-pneu" rotulo="Guia do pneu" className="hover:text-sinal">
                  Guia do pneu
                </LinkTransicao>
              </li>
              <li>
                <LinkTransicao href="/#como-chegar" rotulo="Como chegar" className="hover:text-sinal">
                  Como chegar
                </LinkTransicao>
              </li>
            </ul>
          </nav>
          <a
            href={negocio.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start text-sm hover:text-sinal"
          >
            <IconeInstagram className="h-5 w-5" />@{negocio.instagram.usuario}
          </a>
        </div>
        <div className="faixa-tracejada col-span-4 opacity-60 md:col-span-12" aria-hidden="true" />
        <p className="col-span-4 text-sm text-cinza md:col-span-12">
          © {ano} {negocio.nome}. {negocio.cidade} - {negocio.uf}.
        </p>
      </div>
    </footer>
  );
}
