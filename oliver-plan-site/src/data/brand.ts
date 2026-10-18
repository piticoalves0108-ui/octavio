/**
 * Identidade da marca. Todo texto institucional, contato e SEO sai daqui.
 *
 * Há dois presets prontos. Troque com NEXT_PUBLIC_BRAND=atelie (ou oliver) no .env.local.
 * Os dados de contato marcados com "CONFIRMAR" precisam ser validados com a empresa
 * antes de publicar: não foi possível abrir o Instagram da Oliver Plan durante a criação.
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
  founded: number;
  siteUrl: string;
  contact: {
    /** Somente dígitos, com DDI e DDD (formato wa.me) */
    whatsapp: string;
    whatsappDisplay: string;
    phoneDisplay: string;
    email: string;
    instagram: string;
    pinterest?: string;
  };
  showroom: {
    street: string;
    district: string;
    city: string;
    state: string;
    zip?: string;
    hours: { days: string; time: string }[];
    mapQuery: string;
  };
  stats: { value: number; suffix?: string; prefix?: string; label: string }[];
}

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
    // CONFIRMAR: o ano de 2016 vem do cadastro "Oliver Planejados" (Barueri) no Solutudo.
    founded: 2016,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.oliverplan.com.br",
    contact: {
      // CONFIRMAR: número provisório; troque pelo WhatsApp comercial da Oliver Plan.
      whatsapp: "5511900000000",
      whatsappDisplay: "(11) 90000-0000",
      phoneDisplay: "(11) 90000-0000",
      email: "contato@oliverplan.com.br",
      instagram: "oliverplanoficial",
      pinterest: "oliverplan",
    },
    showroom: {
      // CONFIRMAR: endereço do cadastro público "Oliver Planejados" (Barueri - SP).
      street: "Rua São Fernando, 751 · Loja 35",
      district: "Jardim Julio",
      city: "Barueri",
      state: "SP",
      hours: [
        { days: "Segunda a sexta", time: "9h às 18h" },
        { days: "Sábado", time: "9h às 13h" },
      ],
      mapQuery: "Rua São Fernando, 751, Barueri - SP",
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
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ateliefoma.com.br",
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

export const fullAddress = `${brand.showroom.street}, ${brand.showroom.district}, ${brand.showroom.city} - ${brand.showroom.state}`;

export const navigation = [
  { href: "/ambientes", label: "Ambientes" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/processo", label: "Processo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/showroom", label: "Showroom" },
  { href: "/contato", label: "Contato" },
] as const;
