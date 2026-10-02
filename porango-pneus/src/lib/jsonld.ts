import { faq } from "@/content/textos";
import { negocio, servicos } from "@/content/site";
import { linkWhatsApp } from "@/lib/contato";
import { pendente, semMarcador, soNumeros, visiveis } from "@/lib/pendente";
import { SITE_URL } from "@/lib/site-url";

/**
 * JSON-LD schema.org do tipo AutomotiveBusiness + TireShop.
 * Campos com {{CONFIRMAR}} ficam de fora até serem confirmados, para o dado estruturado
 * nunca carregar informação inventada.
 */
export function jsonLdNegocio() {
  const { endereco, geo, contato } = negocio;
  const telefone = soNumeros(contato.telefone);

  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressLocality: negocio.cidade,
    addressRegion: negocio.uf,
    addressCountry: "BR",
  };
  if (!pendente(endereco.logradouro)) address.streetAddress = endereco.logradouro;
  if (!pendente(endereco.cep)) address.postalCode = endereco.cep;

  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["AutomotiveBusiness", "TireShop"],
    "@id": `${SITE_URL}/#negocio`,
    name: negocio.nome,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    address,
    sameAs: [negocio.instagram.url],
    areaServed: { "@type": "City", name: `${negocio.cidade} - ${negocio.uf}` },
    makesOffer: visiveis(servicos).map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.nome,
        description: semMarcador(s.resumo),
      },
    })),
  };

  if (telefone) dados.telephone = `+55${telefone}`;
  if (geo.latitude != null && geo.longitude != null) {
    dados.geo = { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude };
    dados.hasMap = `https://www.google.com/maps/search/?api=1&query=${geo.latitude},${geo.longitude}`;
  }
  if (negocio.horarios.length) {
    dados.openingHoursSpecification = negocio.horarios.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.dias.map((d) => `https://schema.org/${d}`),
      opens: h.abre,
      closes: h.fecha,
    }));
  }
  const whats = linkWhatsApp();
  if (!whats.pendente) {
    dados.potentialAction = {
      "@type": "CommunicateAction",
      name: "Cotar pneu pelo WhatsApp",
      target: whats.href,
    };
  }
  return dados;
}

export function jsonLdFaq() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  };
}

export function jsonLdBreadcrumb(itens: { nome: string; caminho: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: `${SITE_URL}${item.caminho}`,
    })),
  };
}
