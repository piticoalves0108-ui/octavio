/**
 * Serviços (dados de demonstração: confirme nomes e durações com a Lumi).
 * Sem preços no site: o valor é combinado no WhatsApp.
 */

export type ServiceIcon = "Hand" | "Sparkles" | "Palette" | "Gem" | "Footprints" | "Droplets" | "Crown";

export interface Service {
  id: string;
  name: string;
  short: string;
  description: string;
  duration: number;
  durationLabel: string;
  includes: string[];
  idealFor: string[];
  icon: ServiceIcon;
  polish: string;
  featured?: boolean;
}

export const services: Service[] = [
  {
    id: "unhas-tradicionais",
    name: "Unhas Tradicionais",
    short: "Manicure e pedicure com cutilagem cuidadosa e esmaltação impecável.",
    description:
      "O clássico feito com calma: higienização, cutilagem delicada, lixamento no formato que você escolher e esmaltação em camadas finas para um acabamento liso e duradouro.",
    duration: 60,
    durationLabel: "≈ 1h (mãos e pés)",
    includes: ["Higienização e cutilagem", "Formato à sua escolha", "Base, duas camadas de cor e top coat", "Hidratação de cutículas"],
    idealFor: ["Rotina semanal", "Quem prefere esmalte tradicional", "Primeira visita"],
    icon: "Hand",
    polish: "nude-lumi",
    featured: true,
  },
  {
    id: "esmaltacao-gel",
    name: "Esmaltação em Gel",
    short: "Brilho de vitrine que dura até três semanas, sem lascar.",
    description:
      "Gel curado em cabine LED, com secagem imediata e brilho espelhado. Removemos com técnica suave, sem agredir a unha natural.",
    duration: 75,
    durationLabel: "≈ 1h15",
    includes: ["Preparação da unha natural", "Base niveladora", "Cor em gel curada em LED", "Top coat de alto brilho"],
    idealFor: ["Viagens e eventos", "Quem não tem tempo para retocar", "Unhas que lascam fácil"],
    icon: "Droplets",
    polish: "vermelho-classico",
    featured: true,
  },
  {
    id: "nail-design",
    name: "Nail Design",
    short: "Nail art autoral: francesinhas modernas, linhas, cromados e pintura à mão.",
    description:
      "Do minimalismo à arte detalhada: criamos o desenho com você, a partir de uma referência ou de uma ideia. Cada unha vira uma pequena peça de design.",
    duration: 90,
    durationLabel: "≈ 1h30",
    includes: ["Briefing do desenho", "Pintura à mão livre", "Aplicações (strass, foil, cromado)", "Selagem em gel"],
    idealFor: ["Ocasiões especiais", "Quem ama se expressar pelas unhas", "Noivas e madrinhas"],
    icon: "Palette",
    polish: "cromado-rose",
    featured: true,
  },
  {
    id: "alongamento",
    name: "Alongamento",
    short: "Fibra de vidro ou gel moldado, leve e natural, no comprimento que você quiser.",
    description:
      "Alongamento estruturado com curvatura correta e espessura fina, para unhas resistentes que parecem naturais. Manutenção a cada três ou quatro semanas.",
    duration: 150,
    durationLabel: "≈ 2h30 (manutenção ≈ 2h)",
    includes: ["Avaliação da unha natural", "Fibra de vidro ou gel", "Formato e comprimento sob medida", "Esmaltação em gel"],
    idealFor: ["Unhas frágeis ou roídas", "Quem quer comprimento", "Eventos e fotos"],
    icon: "Gem",
    polish: "rose-seda",
    featured: true,
  },
  {
    id: "spa-dos-pes",
    name: "SPA dos Pés",
    short: "Escalda-pés aromático, esfoliação, máscara hidratante e massagem relaxante.",
    description:
      "Um ritual de pausa: imersão em água morna com sais e óleos, esfoliação, remoção de calosidades, máscara nutritiva e massagem, finalizando com a esmaltação.",
    duration: 75,
    durationLabel: "≈ 1h15",
    includes: ["Escalda-pés com sais aromáticos", "Esfoliação e lixamento", "Máscara hidratante com toalha morna", "Massagem e esmaltação"],
    idealFor: ["Pés ressecados", "Desacelerar depois da semana", "Presentear alguém"],
    icon: "Footprints",
    polish: "pessego",
    featured: true,
  },
  {
    id: "blindagem",
    name: "Blindagem e Banho de Gel",
    short: "Camada protetora sobre a unha natural para fortalecer e crescer sem quebrar.",
    description:
      "Gel de fortalecimento aplicado sobre a unha natural. Ideal para quem quer deixar a unha crescer com resistência e brilho natural.",
    duration: 70,
    durationLabel: "≈ 1h10",
    includes: ["Preparação da unha", "Gel de fortalecimento", "Acabamento natural ou colorido"],
    idealFor: ["Unhas fracas", "Transição depois do alongamento", "Quem prefere um look natural"],
    icon: "Sparkles",
    polish: "porcelana",
  },
  {
    id: "dia-de-noiva",
    name: "Dia de Noiva",
    short: "Mãos e pés impecáveis para o grande dia, com prova de cor antes.",
    description:
      "Pacote com teste de cor e formato, spa das mãos e dos pés e nail design sob medida para combinar com o vestido e o buquê. Atendimento para madrinhas sob consulta.",
    duration: 180,
    durationLabel: "≈ 3h",
    includes: ["Prova de cor e formato", "Spa das mãos e dos pés", "Nail design sob medida", "Kit de retoque"],
    idealFor: ["Noivas", "Madrinhas e formandas", "Ensaios fotográficos"],
    icon: "Crown",
    polish: "champagne",
  },
];

export const featuredServices = services.filter((s) => s.featured);
export const getService = (id: string) => services.find((s) => s.id === id);
