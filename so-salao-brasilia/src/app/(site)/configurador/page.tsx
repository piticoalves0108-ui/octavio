import type { Metadata } from "next";
import { secaoConfigurador } from "@/content/textos";
import { negocio } from "@/content/negocio";
import { Configurador } from "@/components/configurador/Configurador";
import { JsonLd } from "@/components/layout/JsonLd";
import { schemaTrilha } from "@/lib/schema";

const descricao =
  "Monte a sua peça em 3D: escolha o modelo, o estofado em corino ou veludo, a cor e o acabamento da base. O pedido de orçamento chega no WhatsApp da fábrica com a sua escolha.";

export const metadata: Metadata = {
  title: "Configurador 3D de móveis para salão",
  description: descricao,
  alternates: { canonical: "/configurador" },
  openGraph: { title: `Configurador 3D | ${negocio.nome}`, description: descricao, url: "/configurador" },
};

export default function PaginaConfigurador() {
  return (
    <div className="tema-escuro min-h-[100svh] bg-grafite pt-28 pb-24 text-gelo md:pt-36">
      <div className="conteiner">
        <p className="sobretitulo text-champanhe">{secaoConfigurador.sobretitulo}</p>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,5.6vw,5.2rem)] leading-none">{secaoConfigurador.titulo}</h1>
        <p className="mt-6 max-w-2xl texto-grande text-nevoa">{secaoConfigurador.texto}</p>
        <div className="mt-14">
          <Configurador sincronizarUrl nivelTitulo={2} prioridade />
        </div>
      </div>
      <JsonLd
        dados={schemaTrilha([
          { nome: "Início", caminho: "/" },
          { nome: "Configurador", caminho: "/configurador" },
        ])}
      />
    </div>
  );
}
