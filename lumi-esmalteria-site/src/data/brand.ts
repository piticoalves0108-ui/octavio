/**
 * Identidade e contato da Lumi Esmalteria.
 * Dados confirmados: nome, Instagram @esmalterialumi e WhatsApp (61) 99668-0622.
 * Itens marcados com CONFIRMAR (endereço e horários) precisam ser validados antes de publicar.
 */

const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const isLiveSite = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

export const brand = {
  name: "Lumi Esmalteria",
  short: "Lumi",
  tagline: "Nail design & autocuidado",
  description:
    "Esmalteria em Brasília para quem trata as unhas como um ritual: nail design, esmaltação em gel, alongamento e spa dos pés num espaço leve e acolhedor. Agende pelo WhatsApp.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "https://www.lumiesmalteria.com.br"),
  contact: {
    whatsapp: "5561996680622",
    whatsappDisplay: "(61) 99668-0622",
    instagram: "esmalterialumi",
  },
  location: {
    // CONFIRMAR: endereço completo do espaço (hoje só sabemos que é em Brasília, pelo DDD 61)
    address: undefined as string | undefined,
    city: "Brasília",
    state: "DF",
    mapQuery: "Brasília - DF",
  },
  // CONFIRMAR: horários de funcionamento
  hours: [
    { days: "Segunda a sexta", time: "9h às 20h" },
    { days: "Sábado", time: "9h às 18h" },
    { days: "Domingo", time: "Fechado" },
  ],
  /** Faixa de atendimento por dia da semana (0 = domingo), usada no agendamento */
  schedule: { 0: null, 1: [9, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20], 6: [9, 18] } as Record<number, [number, number] | null>,
};

export const fullAddress = brand.location.address ? `${brand.location.address}, ${brand.location.city} - ${brand.location.state}` : `${brand.location.city} - ${brand.location.state}`;

export const navigation = [
  { href: "/servicos", label: "Serviços" },
  { href: "/galeria", label: "Galeria" },
  { href: "/cores", label: "Cores" },
  { href: "/sobre", label: "Sobre" },
  { href: "/tendencias", label: "Tendências" },
  { href: "/clube", label: "Clube" },
  { href: "/contato", label: "Contato" },
] as const;
