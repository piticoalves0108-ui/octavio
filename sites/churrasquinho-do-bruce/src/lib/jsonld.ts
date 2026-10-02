import { negocio } from "@/content/negocio";
import { SITE_URL } from "@/lib/site";

const DIAS_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const doisDigitos = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** JSON-LD schema.org/Restaurant. Campos ainda não confirmados ficam de fora. */
export function jsonLdRestaurante() {
  const { endereco, horario } = negocio;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurante`,
    name: negocio.nome,
    description: `${negocio.ramo} em ${endereco.bairro} - ${endereco.uf}. ${endereco.referencia}.`,
    url: SITE_URL,
    telephone: negocio.whatsapp.e164,
    servesCuisine: ["Churrasco", "Hambúrguer"],
    hasMenu: `${SITE_URL}/cardapio`,
    image: [`${SITE_URL}/opengraph-image.jpg`],
    address: {
      "@type": "PostalAddress",
      streetAddress: endereco.linha,
      addressLocality: `${endereco.bairro}, ${endereco.cidade}`,
      addressRegion: endereco.uf,
      addressCountry: "BR",
      ...(endereco.cep ? { postalCode: endereco.cep } : {}),
    },
    ...(negocio.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: negocio.geo.latitude, longitude: negocio.geo.longitude } }
      : {}),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: horario.dias.map((d) => DIAS_SCHEMA[d]),
        opens: doisDigitos(horario.abre),
        closes: doisDigitos(horario.fecha),
      },
    ],
    sameAs: [negocio.instagram.url, negocio.ifood],
    ...(negocio.faixaDePreco ? { priceRange: negocio.faixaDePreco } : {}),
    ...(negocio.aceitaReservaGrupos !== null ? { acceptsReservations: negocio.aceitaReservaGrupos } : {}),
  };
}

/** Serializa para <script type="application/ld+json"> sem permitir fechar a tag. */
export function serializarJsonLd(dados: unknown) {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}
