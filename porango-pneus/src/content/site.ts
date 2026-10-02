/**
 * DADOS DO NEGÓCIO: a fonte única da verdade do site.
 *
 * Tudo o que aparece no site sai daqui ou de `textos.ts`. Para trocar um texto,
 * troque aqui e o site inteiro (páginas, JSON-LD, botões) acompanha.
 *
 * Onde houver {{CONFIRMAR: ...}}, a informação ainda não foi confirmada com o dono.
 * - No modo prévia (padrão), o marcador aparece destacado na página.
 * - `npm run confirmar` lista todos os marcadores que faltam.
 * - Com NEXT_PUBLIC_MODO_PREVIA=false o build falha enquanto houver marcador.
 *
 * Regra da casa: não inventar preço, avaliação, prêmio, número ou depoimento.
 */

export type DiaSemana =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Horario = {
  /** Texto exibido, ex.: "Segunda a sexta" */
  rotulo: string;
  dias: DiaSemana[];
  abre: string; // "08:00"
  fecha: string; // "18:00"
};

export const negocio = {
  // {{CONFIRMAR: grafia exata do nome e logo}}
  nome: "Porango Pneus",
  nomeCurto: "Porango",
  ramo: "Loja de pneus",
  cidade: "Brasília",
  uf: "DF",

  instagram: {
    usuario: "porango.pneus",
    url: "https://www.instagram.com/porango.pneus/",
    /** Abre o Direct do Instagram. Usado como plano B enquanto o WhatsApp não for confirmado. */
    direct: "https://ig.me/m/porango.pneus",
  },

  endereco: {
    logradouro: "{{CONFIRMAR: endereço completo}}",
    bairro: "{{CONFIRMAR: bairro}}",
    cep: "{{CONFIRMAR: CEP}}",
    /** Ponto de referência curto, ex.: "ao lado do posto X". Deixe "" se não houver. */
    referencia: "",
  },

  /** Coordenadas da loja (Google Maps > clique com o botão direito no pin). */
  geo: {
    latitude: null as number | null, // {{CONFIRMAR: latitude}}
    longitude: null as number | null, // {{CONFIRMAR: longitude}}
  },

  contato: {
    /** Telefone para o link tel:. Só números, com DDD. Ex.: "6133334444" */
    telefone: "{{CONFIRMAR: telefone com DDD}}",
    /** WhatsApp. Só números, com DDD, sem o 55. Ex.: "61999998888" */
    whatsapp: "{{CONFIRMAR: DDD e número do WhatsApp}}",
  },

  /** Horário em texto livre. Aparece enquanto `horarios` estiver vazio. */
  horarioTexto: "{{CONFIRMAR: horário de funcionamento}}",
  /**
   * Horário estruturado (vai para a página e para o JSON-LD).
   * Exemplo do formato (não é o horário real):
   * { rotulo: "Segunda a sexta", dias: ["Monday","Tuesday","Wednesday","Thursday","Friday"], abre: "08:00", fecha: "18:00" }
   */
  horarios: [] as Horario[],
} as const;

/** Mensagens prontas do WhatsApp. */
export const mensagens = {
  padrao: "Olá! Vim pelo site e quero cotar um pneu.",
  semMedida:
    "Olá! Vim pelo site e quero cotar um pneu, mas não sei a medida. Posso mandar uma foto da lateral do pneu?",
  servico: (servico: string) => `Olá! Vim pelo site e quero agendar: ${servico}.`,
} as const;

export type Servico = {
  id: string;
  nome: string;
  resumo: string;
  /** Quando procurar o serviço (conhecimento geral, sem promessa da loja). */
  quando: string;
  /** false = só aparece no modo prévia, com o selo "a confirmar". */
  confirmado: boolean;
  icone: "pneu" | "montagem" | "alinhamento" | "balanceamento" | "roda" | "suspensao" | "freio";
};

/**
 * Serviços. Só "Venda de pneus" está confirmado (o ramo é loja de pneus).
 * {{CONFIRMAR: quais serviços a loja oferece (montagem, alinhamento, balanceamento, rodas, suspensão, freios)}}
 * Para confirmar: troque `confirmado` para true. Para tirar do site: apague o item.
 */
export const servicos: Servico[] = [
  {
    id: "venda",
    nome: "Venda de pneus",
    resumo: "Você manda a medida pelo WhatsApp e recebe a cotação do pneu certo para o seu carro.",
    quando: "Sulco perto do TWI, bolha, corte no flanco ou pneu ressecado.",
    confirmado: true,
    icone: "pneu",
  },
  {
    id: "montagem",
    nome: "Montagem",
    resumo: "Desmontagem do pneu usado e montagem do novo na roda, com troca de válvula quando precisa.",
    quando: "Sempre que trocar o pneu.",
    confirmado: false,
    icone: "montagem",
  },
  {
    id: "alinhamento",
    nome: "Alinhamento",
    resumo: "Ajuste dos ângulos das rodas para o carro andar reto e o pneu gastar por igual.",
    quando: "Carro puxando para um lado, volante torto ou depois de pancada em buraco ou meio-fio.",
    confirmado: false,
    icone: "alinhamento",
  },
  {
    id: "balanceamento",
    nome: "Balanceamento",
    resumo: "Correção do peso do conjunto pneu e roda com contrapesos, para acabar com a vibração.",
    quando: "Volante tremendo em velocidade ou depois de montar pneu novo.",
    confirmado: false,
    icone: "balanceamento",
  },
  {
    id: "rodas",
    nome: "Rodas",
    resumo: "{{CONFIRMAR: venda, troca ou reparo de rodas}}",
    quando: "Roda empenada, trincada ou com vazamento no aro.",
    confirmado: false,
    icone: "roda",
  },
  {
    id: "suspensao",
    nome: "Suspensão",
    resumo: "{{CONFIRMAR: quais serviços de suspensão a loja faz}}",
    quando: "Barulho em buraco, carro balançando demais ou pneu gastando torto.",
    confirmado: false,
    icone: "suspensao",
  },
  {
    id: "freios",
    nome: "Freios",
    resumo: "{{CONFIRMAR: quais serviços de freio a loja faz}}",
    quando: "Chiado ao frear, pedal baixo ou carro puxando na frenagem.",
    confirmado: false,
    icone: "freio",
  },
];

/**
 * Marcas de pneu que a loja trabalha. Entram na faixa (marquee) só as confirmadas.
 * Escreva só o nome (ex.: "Marca X"). Não use logo sem autorização da marca.
 */
export const marcas: string[] = ["{{CONFIRMAR: marcas de pneu que a loja trabalha}}"];

export type Diferencial = { titulo: string; texto: string; confirmado: boolean };

/** "Por que trocar na Porango". Entra só o que o dono confirmar. */
export const diferenciais: Diferencial[] = [
  {
    titulo: "Atendimento",
    texto: "{{CONFIRMAR: como é o atendimento (ex.: por ordem de chegada, agendamento pelo WhatsApp)}}",
    confirmado: false,
  },
  {
    titulo: "Garantia",
    texto: "{{CONFIRMAR: garantia dos pneus e dos serviços}}",
    confirmado: false,
  },
  {
    titulo: "Pagamento",
    texto: "{{CONFIRMAR: formas de pagamento e parcelamento}}",
    confirmado: false,
  },
  {
    titulo: "Tipos de pneu",
    texto: "{{CONFIRMAR: vende pneu novo, remold ou seminovo}}",
    confirmado: false,
  },
  {
    titulo: "Veículos",
    texto: "{{CONFIRMAR: atende carro, moto, caminhonete ou caminhão}}",
    confirmado: false,
  },
];

export type FotoGaleria = {
  /** Caminho em /public/images/galeria. Vazio = placeholder. */
  src: string;
  alt: string;
  /** Descrição da foto ideal (aparece no placeholder). */
  legenda: string;
  proporcao: "4/5" | "1/1";
  /** Link do post no Instagram (opcional). */
  post?: string;
};

/**
 * Galeria. Use fotos do Instagram do cliente (com autorização) em /public/images/galeria.
 * {{CONFIRMAR: fotos da loja e da equipe, com autorização de uso}}
 * Se INSTAGRAM_ACCESS_TOKEN estiver definido, a galeria puxa os posts direto do Instagram.
 */
export const galeria: FotoGaleria[] = [
  {
    src: "",
    alt: "Fachada da Porango Pneus",
    legenda: "Fachada da loja de dia, com o nome legível e a entrada livre.",
    proporcao: "4/5",
  },
  {
    src: "",
    alt: "Pneu sendo montado na roda na máquina",
    legenda: "Mãos do montador encaixando o pneu na roda, close na máquina.",
    proporcao: "1/1",
  },
  {
    src: "",
    alt: "Equipe da Porango Pneus",
    legenda: "Equipe reunida na frente da loja, uniforme e sorriso.",
    proporcao: "4/5",
  },
  {
    src: "",
    alt: "Estoque de pneus organizado",
    legenda: "Parede de pneus empilhados por medida, luz lateral.",
    proporcao: "4/5",
  },
  {
    src: "",
    alt: "Carro no elevador durante um serviço",
    legenda: "Carro de cliente no box, roda fora, serviço em andamento.",
    proporcao: "1/1",
  },
  {
    src: "",
    alt: "Detalhe da banda de rodagem de um pneu novo",
    legenda: "Close da banda de rodagem de um pneu novo, sulcos bem marcados.",
    proporcao: "4/5",
  },
];
