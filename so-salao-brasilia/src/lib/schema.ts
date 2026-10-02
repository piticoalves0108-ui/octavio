/**
 * Dados estruturados (JSON-LD, schema.org) para SEO local.
 * FurnitureStore + LocalBusiness, com um Product para cada linha de móvel.
 * Campos ainda não confirmados (CEP, coordenadas, horário) só entram quando preenchidos
 * em src/content/negocio.ts — nunca publicamos dado inventado.
 */
import { linhas, type Linha } from "@/content/catalogo";
import { negocio, whatsappPrincipal, type FaixaDeHorario } from "@/content/negocio";
import { perguntas } from "@/content/textos";
import { semPendencias, temPendencia } from "./confirmar";
import { urlAbsoluta } from "./site";

const ID_LOJA = urlAbsoluta("/#loja");

function endereco() {
  const e = negocio.endereco;
  return {
    "@type": "PostalAddress",
    streetAddress: `${e.logradouro}, ${e.bairro}`,
    addressLocality: e.cidade,
    addressRegion: e.uf,
    addressCountry: e.pais,
    ...(temPendencia(e.cep) ? {} : { postalCode: e.cep }),
  };
}

function horarios(faixas: readonly FaixaDeHorario[]) {
  return faixas.map((f) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: f.dias.map((d) => `https://schema.org/${d}`),
    opens: f.abre,
    closes: f.fecha,
  }));
}

function produto(l: Linha) {
  return {
    "@type": "Product",
    "@id": urlAbsoluta(`/linhas/${l.slug}#produto`),
    name: l.titulo,
    description: semPendencias(l.descricao[0]),
    category: "Móveis para salão de beleza",
    url: urlAbsoluta(`/linhas/${l.slug}`),
    image: urlAbsoluta(l.imagens.frente),
    brand: { "@type": "Brand", name: negocio.nome },
    manufacturer: { "@id": ID_LOJA },
    material: "Estofado em corino ou veludo; acabamento cromado, preto fosco ou dourado",
  };
}

export function schemaLoja() {
  const geo = negocio.endereco.geo;
  return {
    "@context": "https://schema.org",
    "@type": ["FurnitureStore", "LocalBusiness"],
    "@id": ID_LOJA,
    name: negocio.nome,
    description: negocio.descricaoCurta,
    url: urlAbsoluta("/"),
    image: urlAbsoluta("/images/hero/cadeira-poster.avif"),
    logo: urlAbsoluta("/icon.svg"),
    telephone: `+${whatsappPrincipal.e164}`,
    address: endereco(),
    ...(geo ? { geo: { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude } } : {}),
    ...(negocio.showroom.horario.length ? { openingHoursSpecification: horarios(negocio.showroom.horario) } : {}),
    sameAs: [negocio.instagram.url],
    areaServed: [
      { "@type": "City", name: "Brasília" },
      { "@type": "AdministrativeArea", name: "Distrito Federal e entorno" },
    ],
    paymentAccepted: "Cartão de crédito (até 12x sem juros)",
    contactPoint: negocio.whatsapps.map((w) => ({
      "@type": "ContactPoint",
      telephone: `+${w.e164}`,
      contactType: "sales",
      availableLanguage: "pt-BR",
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Móveis para salão de beleza e esmalteria",
      itemListElement: linhas.map((l) => ({
        "@type": "Offer",
        itemOffered: produto(l),
        seller: { "@id": ID_LOJA },
        deliveryLeadTime: {
          "@type": "QuantitativeValue",
          maxValue: negocio.fatos.prazoDiasUteis,
          unitCode: "DAY",
          unitText: "dias úteis",
        },
      })),
    },
  };
}

export function schemaProduto(l: Linha) {
  return { "@context": "https://schema.org", ...produto(l) };
}

export function schemaPerguntas() {
  const confirmadas = perguntas.filter((p) => semPendencias(p.resposta).length > 0);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: confirmadas.map((p) => ({
      "@type": "Question",
      name: p.pergunta,
      acceptedAnswer: { "@type": "Answer", text: semPendencias(p.resposta) },
    })),
  };
}

export function schemaTrilha(itens: { nome: string; caminho: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nome,
      item: urlAbsoluta(it.caminho),
    })),
  };
}

/** Serializa para <script type="application/ld+json"> sem permitir fechar a tag. */
export function jsonLd(dados: unknown) {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}
