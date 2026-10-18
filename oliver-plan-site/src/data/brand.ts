/**
 * Identidade da marca. Todo texto institucional, contato e SEO sai daqui.
 *
 * Há dois presets prontos. Troque com NEXT_PUBLIC_BRAND=atelie (ou oliver) no .env.local.
 * Os dados marcados com "CONFIRMAR" precisam ser validados com a empresa antes de publicar.
 * Campos opcionais vazios (e-mail, endereço, ano de fundação) simplesmente não aparecem no site.
 */

export type BrandKey = "oliver" | "atelie";

export interface Brand {
  key: BrandKey;
  name: string;
  /** Duas linhas do logotipo tipográfico */
  wordmark: [string, string];
  monogram: string;
  descriptor: string;
  tagline: string;
  description: string;
  /** Ano de fundação; sem ele, o site mostra a cidade no lugar de "desde 20xx" */
  founded?: number;
  siteUrl: string;
  contact: {
    /** Somente dígitos, com DDI e DDD (formato wa.me) */
    whatsapp: string;
    whatsappDisplay: string;
    phoneDisplay: string;
    /** Sem e-mail confirmado, o site oferece só o WhatsApp */
    email?: string;
    instagram: string;
    pinterest?: string;
  };
  showroom: {
    street?: string;
    district?: string;
    city: string;
    state: string;
    zip?: string;
    hours: { days: string; time: string }[];
    mapQuery: string;
  };
  stats: { value: number; suffix?: string; prefix?: string; label: string }[];
}

/**
 * URL pública. Sem NEXT_PUBLIC_SITE_URL, usa o endereço da Vercel (prévia) e, por último, o domínio previsto.
 * O site só pede indexação ao Google quando NEXT_PUBLIC_SITE_URL está definida (domínio real configurado).
 */
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrlFor = (fallback: string) => process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : fallback);
export const isLiveSite = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

const shared = {
  stats: [
    { value: 1200, suffix: "+", label: "ambientes entregues" },
    { value: 10, suffix: " anos", label: "de garantia estrutural" },
    { value: 98, suffix: "%", label: "de clientes que indicam" },
    { value: 45, suffix: " dias", label: "prazo médio de produção" },
  ],
};

export const brands: Record<BrandKey, Brand> = {
  oliver: {
    key: "oliver",
    name: "Oliver Plan",
    wordmark: ["Oliver", "Plan"],
    monogram: "OP",
    descriptor: "Móveis planejados",
    tagline: "Arquitetura sob medida",
    description:
      "Móveis planejados de alto padrão com projeto 3D, marcenaria própria e montagem com acabamento de ateliê. Cozinhas, closets, home office, salas, quartos e banheiros sob medida.",
    siteUrl: siteUrlFor("https://www.oliverplan.com.br"),
    contact: {
      // WhatsApp do link da bio do Instagram @oliverplanoficial
      whatsapp: "5561996399819",
      whatsappDisplay: "(61) 99639-9819",
      phoneDisplay: "(61) 99639-9819",
      // CONFIRMAR: e-mail comercial (o domínio oliverplan.com.br não responde hoje)
      instagram: "oliverplanoficial",
    },
    showroom: {
      // CONFIRMAR: endereço do showroom (o DDD 61 do WhatsApp indica Brasília) e horários.
      city: "Brasília",
      state: "DF",
      hours: [
        { days: "Segunda a sexta", time: "9h às 18h" },
        { days: "Sábado", time: "9h às 13h" },
      ],
      mapQuery: "Brasília - DF",
    },
    ...shared,
  },
  atelie: {
    key: "atelie",
    name: "Ateliê Forma",
    wordmark: ["Ateliê", "Forma"],
    monogram: "AF",
    descriptor: "Marcenaria autoral",
    tagline: "Arquitetura sob medida",
    description:
      "Ateliê de móveis planejados de alto padrão: projeto autoral em 3D, marcenaria própria e montagem com precisão milimétrica. Cozinhas, closets, home office, salas, quartos e banheiros.",
    founded: 2012,
    siteUrl: siteUrlFor("https://www.ateliefoma.com.br"),
    contact: {
      whatsapp: "5511900000000",
      whatsappDisplay: "(11) 90000-0000",
      phoneDisplay: "(11) 3000-0000",
      email: "projetos@ateliefoma.com.br",
      instagram: "atelieforma",
      pinterest: "atelieforma",
    },
    showroom: {
      street: "Alameda Gabriel Monteiro da Silva, 1000",
      district: "Jardim América",
      city: "São Paulo",
      state: "SP",
      zip: "01442-000",
      hours: [
        { days: "Segunda a sexta", time: "10h às 19h" },
        { days: "Sábado", time: "10h às 15h" },
      ],
      mapQuery: "Alameda Gabriel Monteiro da Silva, 1000, São Paulo - SP",
    },
    ...shared,
  },
};

const key = (process.env.NEXT_PUBLIC_BRAND as BrandKey) ?? "oliver";

export const brand: Brand = brands[key] ?? brands.oliver;

export const fullAddress = [brand.showroom.street, brand.showroom.district, `${brand.showroom.city} - ${brand.showroom.state}`].filter(Boolean).join(", ");

/** "desde 2016" quando o ano é conhecido; senão, a cidade (ex.: "Brasília · DF") */
export const brandSince = brand.founded ? `Desde ${brand.founded}` : `${brand.showroom.city} · ${brand.showroom.state}`;

export const navigation = [
  { href: "/ambientes", label: "Ambientes" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/processo", label: "Processo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/showroom", label: "Showroom" },
  { href: "/contato", label: "Contato" },
] as const;
