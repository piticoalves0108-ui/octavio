/**
 * Dados reais do negócio. É a única fonte desses dados no site:
 * cabeçalho, rodapé, JSON-LD, links de WhatsApp, mapa e páginas leem daqui.
 *
 * Tudo que ainda não foi confirmado com o dono está marcado com {{CONFIRMAR: ...}}.
 * Rode `npm run confirmar` para listar todos os marcadores do projeto.
 */

export type DiaDaSemana = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type FaixaDeHorario = {
  dias: DiaDaSemana[];
  abre: string; // "09:00"
  fecha: string; // "18:00"
};

export const negocio = {
  nome: "Só Salão Brasília",
  ramo: "Fábrica de móveis para salão de beleza e esmalteria",
  descricaoCurta:
    "Fábrica própria de móveis para salão de beleza e esmalteria em Taguatinga Norte, Brasília - DF. Produção sob encomenda com entrega em até 7 dias úteis e parcelamento em até 12x sem juros no cartão.",

  endereco: {
    logradouro: "QI 19, lotes 34 a 38",
    bairro: "Setor Industrial, Taguatinga Norte",
    cidade: "Brasília",
    uf: "DF",
    pais: "BR",
    completo: "QI 19, lotes 34 a 38, Setor Industrial, Taguatinga Norte, Brasília - DF",
    // Só entra no JSON-LD quando for preenchido com um CEP válido (formato 00000-000).
    cep: "{{CONFIRMAR: CEP da fábrica}}",
    // Só entra no JSON-LD quando for preenchido. Pegue no Google Maps: clique com o botão
    // direito no pino da fábrica e copie os dois números. {{CONFIRMAR: latitude e longitude exatas da fábrica}}
    geo: null as null | { latitude: number; longitude: number },
  },

  // Os três números são WhatsApp. O primeiro é o do botão flutuante e o que recebe
  // os pedidos do configurador. {{CONFIRMAR: qual número deve receber os orçamentos do site}}
  whatsapps: [
    { exibicao: "(61) 99999-7349", e164: "5561999997349" },
    { exibicao: "(61) 99911-6311", e164: "5561999116311" },
    { exibicao: "(61) 98417-4212", e164: "5561984174212" },
  ],

  instagram: {
    usuario: "@sosalaobrasilia",
    url: "https://www.instagram.com/sosalaobrasilia/",
  },

  // Fatos públicos já confirmados (não altere sem falar com o dono).
  fatos: {
    prazoDiasUteis: 7,
    parcelasSemJuros: 12,
    fabricaPropria: true,
    showroomNaFabrica: true,
    producaoSobEncomenda: true,
  },

  showroom: {
    titulo: "Showroom na fábrica, na QI 19",
    // Texto exibido no site enquanto o horário não for confirmado.
    horarioTexto: "{{CONFIRMAR: horário do showroom}}",
    // Preencha para o horário aparecer no site e no JSON-LD (openingHoursSpecification).
    // Um diretório público (Bendito Guia) cita seg. a sex. das 9h às 18h e sáb. das 9h às 13h,
    // mas isso não foi confirmado com o dono. Exemplo de preenchimento:
    // [
    //   { dias: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], abre: "09:00", fecha: "18:00" },
    //   { dias: ["Saturday"], abre: "09:00", fecha: "13:00" },
    // ]
    horario: [] as FaixaDeHorario[],
  },
} as const;

/** Número que recebe o botão flutuante e os pedidos do configurador. */
export const whatsappPrincipal = negocio.whatsapps[0];

/** Mensagem pronta do botão flutuante (exatamente a URL definida no briefing). */
export const linkWhatsappPadrao =
  "https://wa.me/5561999997349?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20um%20or%C3%A7amento%20de%20m%C3%B3veis%20para%20sal%C3%A3o.";

export const linkTelefone = `tel:+${whatsappPrincipal.e164}`;

/** "Como chegar": abre o Google Maps com rota até a fábrica. */
export const linkComoChegar = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${negocio.nome}, ${negocio.endereco.completo}`,
)}`;

/** Mapa incorporado (só carrega quando a pessoa pede, para não pesar a página). */
export const linkMapaIncorporado = `https://www.google.com/maps?q=${encodeURIComponent(
  negocio.endereco.completo,
)}&output=embed`;

const nomesDosDias: Record<DiaDaSemana, string> = {
  Monday: "seg.",
  Tuesday: "ter.",
  Wednesday: "qua.",
  Thursday: "qui.",
  Friday: "sex.",
  Saturday: "sáb.",
  Sunday: "dom.",
};

function formatarHora(hora: string) {
  const [h, m] = hora.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** Linhas de horário prontas para exibir. Sem horário confirmado, devolve o marcador. */
export function horarioParaExibir(): string[] {
  const faixas = negocio.showroom.horario as readonly FaixaDeHorario[];
  if (faixas.length === 0) return [negocio.showroom.horarioTexto];
  return faixas.map((f) => {
    const dias =
      f.dias.length > 2
        ? `${nomesDosDias[f.dias[0]]} a ${nomesDosDias[f.dias[f.dias.length - 1]]}`
        : f.dias.map((d) => nomesDosDias[d]).join(" e ");
    return `${dias}: ${formatarHora(f.abre)} às ${formatarHora(f.fecha)}`;
  });
}
