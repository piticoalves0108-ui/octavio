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
   * WhatsApp só com dígitos: 55 + DDD + número. (62) 99929-1420.
   * Se ficar vazio, os botões abrem o Direct do Instagram.
   */
  whatsapp: "5562999291420",
  whatsappMessage: "Olá! Vim pelo site e quero um site para o meu negócio.",

  price: 250,
  // Espaço inquebrável: "R$" e "250" nunca ficam em linhas separadas.
  priceLabel: "R$\u00a0250",
  // 250 / 30 = 8,33. Usado na ancoragem "menos de R$ 9 por dia".
  pricePerDayLabel: "menos de R$\u00a09 por dia",

  serviceArea: "todo o Centro-Oeste",
  // Sem CNPJ: o rodapé e a política de privacidade não mostram a linha do CNPJ.
  cnpj: "",

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
  setupFee: "Sem taxa de adesão: você começa pagando só a 1ª mensalidade.",
  loyalty: "Sem fidelidade.",
  cancel: "O site é excluído e sai do ar.",
  deliveryTime: "1 dia",
  updateTime: "até 3 horas",
  updateScope: confirmar(
    "o que conta como atualização: texto, foto, preço, nova seção, nova página?",
  ),
  updateLimit: "Sim. Não tem limite: peça quantas atualizações quiser.",
  hosting: "Hospedagem inclusa.",
  domain: "O domínio (.com.br) não está incluso: é contratado à parte.",
  ssl: "Certificado SSL incluso: o site abre com o cadeado de conexão segura.",
  extras: confirmar("e-mail profissional e Google Meu Negócio inclusos?"),
  payment: "Pix",
  cnpjRequired: "Não. Você não precisa ter CNPJ para contratar.",
  trustLine: "Sem taxa de adesão · Sem fidelidade · No ar em 1 dia",
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
