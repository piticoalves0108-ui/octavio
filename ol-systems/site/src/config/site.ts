/**
 * Dados do negócio: tudo o que é informação real da OL Systems fica aqui.
 *
 * Regra: não invente nada. Onde a informação ainda não foi confirmada com o
 * dono, o texto leva o marcador {{CONFIRMAR: ...}}. A página mostra esses
 * marcadores destacados em amarelo para ninguém publicar com dado errado.
 * A lista completa está no README.
 */

export const confirmar = (oQue: string) => `{{CONFIRMAR: ${oQue}}}`;

export const site = {
  name: "OL Systems", // {{CONFIRMAR: grafia exata do nome e logo}}
  instagram: {
    handle: "ol_systemss",
    url: "https://www.instagram.com/ol_systemss/",
  },

  /**
   * WhatsApp só com dígitos: 55 + DDD + número. Ex.: "5561999998888".
   * {{CONFIRMAR: DDD e número}}
   * Enquanto estiver vazio, os botões abrem o Direct do Instagram para não
   * levar o cliente a um número errado.
   */
  whatsapp: "",
  whatsappMessage: "Olá! Vim pelo site e quero um site para o meu negócio.",

  price: 250,
  // Espaço inquebrável: "R$" e "250" nunca ficam em linhas separadas.
  priceLabel: "R$\u00a0250",
  // 250 / 30 = 8,33. Usado na ancoragem "menos de R$ 9 por dia".
  pricePerDayLabel: "menos de R$\u00a09 por dia",

  serviceArea: confirmar("só a cidade/região ou o Brasil todo, online"),
  cnpj: confirmar("CNPJ"),

  /**
   * Domínio de produção. Na Vercel o domínio do projeto é usado
   * automaticamente; defina NEXT_PUBLIC_SITE_URL quando tiver domínio próprio.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),

  analytics: {
    // {{CONFIRMAR: IDs do GA4 e do Pixel}}. Vazio = script não é carregado.
    ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? "",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  },
} as const;

/** Regras comerciais que ainda dependem do dono. Aparecem na página e no FAQ. */
export const terms = {
  setupFee: confirmar("tem taxa de criação ou começa só com a 1ª mensalidade?"),
  loyalty: confirmar("tem fidelidade mínima? multa para cancelar?"),
  cancel: confirmar("o que acontece com o site e o domínio se cancelar"),
  deliveryTime: confirmar("prazo de entrega do site"),
  updateTime: confirmar("prazo de cada atualização, ex.: até 24 h úteis"),
  updateScope: confirmar(
    "o que conta como atualização: texto, foto, preço, nova seção, nova página?",
  ),
  updateLimit: confirmar("atualizações ilimitadas ou com limite por mês?"),
  pages: confirmar("quantas páginas ou seções o site tem"),
  domainHosting: confirmar("domínio .com.br e hospedagem inclusos?"),
  domainOwner: confirmar("o domínio fica registrado no nome de quem?"),
  ssl: confirmar("certificado SSL incluso?"),
  extras: confirmar("e-mail profissional e Google Meu Negócio inclusos?"),
  payment: confirmar("formas de pagamento: Pix, cartão, boleto, recorrência"),
  cnpjRequired: confirmar("precisa ter CNPJ para contratar?"),
  trustLine: confirmar("ex.: sem taxa de adesão · sem fidelidade · no ar em X dias"),
} as const;

export const PENDING_RE = /\{\{CONFIRMAR:[^}]*\}\}/g;
export const isPending = (s: string) => /\{\{CONFIRMAR:/.test(s);

/** Link único de todos os CTAs. */
export function contactHref() {
  if (site.whatsapp) {
    return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.whatsappMessage)}`;
  }
  return `https://ig.me/m/${site.instagram.handle}`;
}

export const contactChannel = site.whatsapp ? "whatsapp" : "instagram";
