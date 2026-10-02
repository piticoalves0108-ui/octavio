/**
 * Dados do negócio: fonte única para textos, links, SEO e JSON-LD.
 *
 * Regra do projeto: só entra aqui o que foi confirmado. Onde falta informação,
 * o valor fica como `{{CONFIRMAR: ...}}` (ou `null` com o marcador no
 * comentário) e o site esconde aquilo em produção. Rode `npm run pendencias`
 * para listar tudo o que ainda precisa ser confirmado com o Bruce.
 */

export const negocio = {
  nome: "Churrasquinho do Bruce",
  ramo: "Churrasquinho, hambúrguer e almoço",
  slogan: "Espeto saindo agora.",

  endereco: {
    linha: "QI 23 nº 01, Setor Industrial",
    bairro: "Taguatinga Norte",
    cidade: "Brasília",
    uf: "DF",
    referencia: "Em frente ao Top Life Miami Beach",
    completo: "QI 23 nº 01, Setor Industrial, Taguatinga Norte (em frente ao Top Life Miami Beach)",
    // {{CONFIRMAR: CEP do endereço (QI 23 nº 01). Entra no JSON-LD quando for preenchido}}
    cep: null as string | null,
  },

  // {{CONFIRMAR: latitude e longitude exatas da porta (copie do Google Maps). Sem isso o JSON-LD sai sem "geo"}}
  geo: null as { latitude: number; longitude: number } | null,

  whatsapp: {
    exibicao: "(61) 99177-8057",
    e164: "+5561991778057",
    mensagemPronta: "Olá! Vim pelo site e quero fazer um pedido.",
  },

  instagram: {
    usuario: "churrasquinhodobruce",
    url: "https://www.instagram.com/churrasquinhodobruce/",
  },

  // {{CONFIRMAR: link da loja no iFood (achado em pesquisa pública em 01/10/2026; conferir se é a loja certa)}}
  ifood:
    "https://www.ifood.com.br/delivery/brasilia-df/churrasquinho-do-bruce-setor-industrial-taguatinga/c26e70f6-5817-4e8b-929d-f209eeb81a3d",

  /**
   * Horário confirmado: segunda a sábado, das 11h às 23h.
   * Dias no padrão do JS: 0 = domingo ... 6 = sábado.
   * {{CONFIRMAR: horário de domingo e de feriados (hoje o site trata domingo como fechado)}}
   */
  horario: {
    dias: [1, 2, 3, 4, 5, 6],
    abre: 11,
    fecha: 23,
    resumo: "Segunda a sábado, das 11h às 23h",
    curto: "Seg a sáb · 11h às 23h",
  },

  delivery: "Delivery pelo iFood",

  // {{CONFIRMAR: o Bruce aceita reserva para grupos? Se sim, troque para true e o formulário de reserva aparece em Como chegar}}
  aceitaReservaGrupos: null as boolean | null,

  // {{CONFIRMAR: faixa de preço para o Google ("$", "$$"...). Fica fora do JSON-LD até ser preenchida}}
  faixaDePreco: null as string | null,
} as const;

export type Negocio = typeof negocio;
