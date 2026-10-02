import type { Metadata } from "next";
import { negocio } from "@/content/negocio";
import { perguntas } from "@/content/textos";
import { Showroom } from "@/components/secoes/Showroom";
import { Duvidas } from "@/components/secoes/Duvidas";
import { HidratarAoVer } from "@/components/layout/HidratarAoVer";
import { JsonLd } from "@/components/layout/JsonLd";
import { schemaTrilha } from "@/lib/schema";

const descricao = `Visite o showroom da ${negocio.nome} dentro da fábrica: ${negocio.endereco.completo}. Veja tecidos e acabamentos de perto. Atendimento pelo WhatsApp ${negocio.whatsapps[0].exibicao}.`;

export const metadata: Metadata = {
  title: "Showroom na QI 19, Taguatinga Norte",
  description: descricao,
  alternates: { canonical: "/showroom" },
  openGraph: { title: `Showroom na QI 19 | ${negocio.nome}`, description: descricao, url: "/showroom" },
};

export default function PaginaShowroom() {
  return (
    <>
      <div className="pt-20">
        <Showroom comoTituloDaPagina />
      </div>
      <HidratarAoVer>
        <Duvidas
          itens={perguntas.filter((p) => ["showroom", "prazo", "pagamento", "frete", "montagem"].includes(p.id))}
        />
      </HidratarAoVer>
      <JsonLd
        dados={schemaTrilha([
          { nome: "Início", caminho: "/" },
          { nome: "Showroom", caminho: "/showroom" },
        ])}
      />
    </>
  );
}
