/**
 * App da versão em arquivo único: as mesmas seções e componentes do site Next.js,
 * com as páginas viradas rotas por "#".
 */
import { useEffect } from "react";
import Inicio from "@/app/(site)/page";
import PaginaShowroom from "@/app/(site)/showroom/page";
import { Moldura } from "@/components/layout/Moldura";
import { Configurador } from "@/components/configurador/Configurador";
import { ConteudoLinha } from "@/components/secoes/ConteudoLinha";
import { classesBotao } from "@/components/ui/botao";
import { secaoConfigurador } from "@/content/textos";
import { linhaPorSlug, linhas } from "@/content/catalogo";
import { negocio } from "@/content/negocio";
import { configuracaoDosParams, useConfiguracao } from "@/lib/configuracao";
import { LinkTransicao } from "./Transicao";
import { useRota } from "./rotas";

const TITULO_HOME = `${negocio.nome} | Fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF`;

function PaginaConfigurador({ busca }: { busca: string }) {
  useEffect(() => {
    const parcial = configuracaoDosParams(new URLSearchParams(busca));
    if (Object.keys(parcial).length) useConfiguracao.getState().definir(parcial);
  }, [busca]);
  return (
    <div className="tema-escuro min-h-[100svh] bg-grafite pt-28 pb-24 text-gelo md:pt-36">
      <div className="conteiner">
        <p className="sobretitulo text-champanhe">{secaoConfigurador.sobretitulo}</p>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,5.6vw,5.2rem)] leading-none">{secaoConfigurador.titulo}</h1>
        <p className="mt-6 max-w-2xl texto-grande text-nevoa">{secaoConfigurador.texto}</p>
        <div className="mt-14">
          <Configurador nivelTitulo={2} prioridade />
        </div>
      </div>
    </div>
  );
}

function NaoEncontrada() {
  return (
    <section className="grid min-h-[80svh] place-items-center px-6 pt-28 text-center">
      <div>
        <p className="sobretitulo text-champanhe-texto">Página não encontrada</p>
        <h1 className="mt-5 text-[clamp(2.6rem,6vw,5rem)] leading-none">Essa peça não está no showroom.</h1>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <LinkTransicao href="/" className={classesBotao("primario")}>
            Voltar ao início
          </LinkTransicao>
        </div>
      </div>
    </section>
  );
}

function Pagina() {
  const rota = useRota();
  const slug = rota.caminho.match(/^\/linhas\/([^/]+)$/)?.[1];
  const linha = slug ? linhaPorSlug(slug) : undefined;

  useEffect(() => {
    document.title =
      rota.caminho === "/"
        ? TITULO_HOME
        : rota.caminho === "/configurador"
          ? `Configurador 3D | ${negocio.nome}`
          : rota.caminho === "/showroom"
            ? `Showroom na QI 19 | ${negocio.nome}`
            : linha
              ? `${linha.titulo} | ${negocio.nome}`
              : negocio.nome;
  }, [rota.caminho, linha]);

  if (rota.caminho === "/") return <Inicio />;
  if (rota.caminho === "/configurador") return <PaginaConfigurador busca={rota.busca} />;
  if (rota.caminho === "/showroom") return <PaginaShowroom />;
  if (linha) return <ConteudoLinha key={linha.slug} linha={linha} />;
  return <NaoEncontrada />;
}

export function App() {
  return (
    <Moldura>
      <Pagina />
    </Moldura>
  );
}

export const rotasConhecidas = ["/", "/configurador", "/showroom", ...linhas.map((l) => `/linhas/${l.slug}`)];
