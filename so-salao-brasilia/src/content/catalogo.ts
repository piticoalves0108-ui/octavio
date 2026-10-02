/**
 * Linhas de produto, tecidos, cores e acabamentos.
 * O configurador 3D, o carrossel, as páginas /linhas/[slug] e o JSON-LD leem daqui.
 *
 * As cinco linhas vêm do briefing. Nomes comerciais de modelos e medidas ainda não
 * foram enviados pela fábrica: por isso cada linha tem o marcador de medidas.
 */

export type ModeloId = "cadeira" | "lavatorio" | "manicure" | "recepcao" | "espelho";
export type TecidoId = "corino" | "veludo";
export type AcabamentoId = "cromado" | "preto-fosco" | "dourado";

export type Linha = {
  slug: string;
  modelo: ModeloId;
  /** Nome curto (menus, carrossel). */
  nome: string;
  /** Nome no singular, usado no resumo do pedido e na mensagem do WhatsApp. */
  nomeDoModelo: string;
  /** Título da página da linha (h1). */
  titulo: string;
  resumo: string;
  descricao: string[];
  /** O que muda quando a pessoa troca o estofado nesta peça. */
  ondeVaiOEstofado: string;
  /** O que muda quando a pessoa troca o acabamento nesta peça. */
  ondeVaiOAcabamento: string;
  medidas: string;
  modelosDisponiveis: string;
  /** Legenda da foto ideal (frente e perfil), usada enquanto a foto real não chega. */
  fotoIdeal: { frente: string; perfil: string };
  /** Renders da própria cena 3D, usados como placeholder até a foto real chegar. */
  imagens: { frente: string; perfil: string };
  /**
   * Opcional: modelo .glb real (fotogrametria ou modelagem da peça da fábrica),
   * comprimido com Meshopt e texturas KTX2. Sem ele, o site usa a geometria procedural.
   * Veja "Modelos 3D" no README.
   */
  glb?: string;
};

export const linhas: Linha[] = [
  {
    slug: "cadeiras",
    modelo: "cadeira",
    nome: "Cadeiras",
    nomeDoModelo: "Cadeira de cabeleireiro",
    titulo: "Cadeiras de cabeleireiro sob encomenda",
    resumo: "A peça que a cliente mais sente. Estofado e base escolhidos por você, feitos na nossa fábrica.",
    descricao: [
      "A cadeira é onde a cliente passa a maior parte do atendimento, e a peça que mais aparece nas fotos do seu salão. Por isso ela é feita sob encomenda, com o estofado e o acabamento da base que combinam com o seu espaço.",
      "Monte a combinação no configurador, mande pelo WhatsApp e receba o orçamento. Prefere ver de perto? O showroom fica dentro da fábrica, na QI 19.",
    ],
    ondeVaiOEstofado: "assento, encosto e braços",
    ondeVaiOAcabamento: "base, coluna e apoio de pés",
    medidas: "{{CONFIRMAR: medidas das cadeiras (altura, largura, profundidade e regulagem de altura)}}",
    modelosDisponiveis: "{{CONFIRMAR: nomes e fotos dos modelos de cadeira fabricados}}",
    fotoIdeal: {
      frente: "Foto ideal: cadeira de frente, fundo neutro claro, luz suave de estúdio, câmera na altura do assento.",
      perfil: "Foto ideal: a mesma cadeira de perfil (90°), mostrando a curva do encosto e a base.",
    },
    imagens: { frente: "/images/renders/cadeira-frente.avif", perfil: "/images/renders/cadeira-perfil.avif" },
  },
  {
    slug: "lavatorios",
    modelo: "lavatorio",
    nome: "Lavatórios",
    nomeDoModelo: "Lavatório",
    titulo: "Lavatórios para salão de beleza",
    resumo: "Conforto na lavagem e acabamento que conversa com as cadeiras do salão.",
    descricao: [
      "O lavatório é o momento de descanso da cliente. Escolha o estofado e o acabamento para que ele combine com as cadeiras e o resto do salão.",
      "Como toda a linha, o lavatório é produzido sob encomenda na nossa fábrica em Taguatinga Norte, com entrega em até 7 dias úteis.",
    ],
    ondeVaiOEstofado: "assento e encosto",
    ondeVaiOAcabamento: "pés e detalhes metálicos",
    medidas: "{{CONFIRMAR: medidas dos lavatórios e tipo de cuba (louça, cor, posição)}}",
    modelosDisponiveis: "{{CONFIRMAR: modelos de lavatório fabricados e se a cuba e o misturador acompanham}}",
    fotoIdeal: {
      frente: "Foto ideal: lavatório de frente, com a cuba visível ao fundo, em fundo claro.",
      perfil: "Foto ideal: lavatório de perfil, mostrando a inclinação do encosto até a cuba.",
    },
    imagens: { frente: "/images/renders/lavatorio-frente.avif", perfil: "/images/renders/lavatorio-perfil.avif" },
  },
  {
    slug: "bancadas-de-manicure",
    modelo: "manicure",
    nome: "Bancadas de manicure",
    nomeDoModelo: "Bancada de manicure",
    titulo: "Bancadas de manicure para salão e esmalteria",
    resumo: "Espaço de trabalho organizado para a profissional e apoio confortável para a cliente.",
    descricao: [
      "Na esmalteria, a bancada é o posto de trabalho inteiro: apoio para as mãos da cliente, gavetas para o material e lugar para os esmaltes à vista.",
      "Escolha a cor do estofado do apoio e o acabamento dos metais. A produção é sob encomenda, para o seu espaço.",
    ],
    ondeVaiOEstofado: "almofada de apoio das mãos",
    ondeVaiOAcabamento: "pés e puxadores",
    medidas: "{{CONFIRMAR: medidas das bancadas de manicure e número de gavetas}}",
    modelosDisponiveis: "{{CONFIRMAR: modelos de bancada fabricados (simples, dupla, com prateleira de esmaltes)}}",
    fotoIdeal: {
      frente: "Foto ideal: bancada de frente, do lado da cliente, com o apoio de mãos em destaque.",
      perfil: "Foto ideal: bancada de perfil, mostrando as gavetas e a altura do tampo.",
    },
    imagens: { frente: "/images/renders/manicure-frente.avif", perfil: "/images/renders/manicure-perfil.avif" },
  },
  {
    slug: "recepcao",
    modelo: "recepcao",
    nome: "Recepção",
    nomeDoModelo: "Balcão de recepção",
    titulo: "Balcões de recepção para salão de beleza",
    resumo: "A primeira impressão de quem entra. Frente estofada e acabamento no tom da sua marca.",
    descricao: [
      "A recepção é a primeira coisa que a cliente vê ao entrar. Um balcão com frente estofada deixa claro, logo na porta, o padrão do seu salão.",
      "Combine a cor do estofado com as cadeiras e escolha o acabamento do friso e do rodapé.",
    ],
    ondeVaiOEstofado: "frente do balcão",
    ondeVaiOAcabamento: "friso superior e rodapé",
    medidas: "{{CONFIRMAR: medidas dos balcões de recepção (largura, altura, formato reto ou curvo)}}",
    modelosDisponiveis: "{{CONFIRMAR: modelos de recepção fabricados}}",
    fotoIdeal: {
      frente: "Foto ideal: balcão de frente, como a cliente vê ao entrar, com a parede da marca ao fundo.",
      perfil: "Foto ideal: balcão em diagonal, mostrando a curva da frente e o tampo.",
    },
    imagens: { frente: "/images/renders/recepcao-frente.avif", perfil: "/images/renders/recepcao-perfil.avif" },
  },
  {
    slug: "espelhos",
    modelo: "espelho",
    nome: "Espelhos",
    nomeDoModelo: "Espelho",
    titulo: "Espelhos para salão de beleza",
    resumo: "O ponto de luz de cada estação. Moldura no mesmo estofado e acabamento das cadeiras.",
    descricao: [
      "Cada cadeira pede um espelho à altura. Com moldura no mesmo estofado e acabamento, a estação de trabalho fica completa e o salão ganha unidade.",
      "Escolha a combinação no configurador e peça o orçamento junto com as cadeiras.",
    ],
    ondeVaiOEstofado: "moldura",
    ondeVaiOAcabamento: "contorno e pés",
    medidas: "{{CONFIRMAR: medidas dos espelhos e se a moldura estofada está disponível}}",
    modelosDisponiveis: "{{CONFIRMAR: modelos de espelho fabricados (de parede, de chão, com bancada)}}",
    fotoIdeal: {
      frente: "Foto ideal: espelho de frente, refletindo o salão, com a moldura bem iluminada.",
      perfil: "Foto ideal: espelho em diagonal, mostrando a espessura da moldura.",
    },
    imagens: { frente: "/images/renders/espelho-frente.avif", perfil: "/images/renders/espelho-perfil.avif" },
  },
];

export function linhaPorModelo(modelo: ModeloId): Linha {
  return linhas.find((l) => l.modelo === modelo) ?? linhas[0];
}

export function linhaPorSlug(slug: string): Linha | undefined {
  return linhas.find((l) => l.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Tecidos, cores e acabamentos do configurador                        */
/* ------------------------------------------------------------------ */

// Os dois tecidos e os três acabamentos vêm do briefing. As cores abaixo são de
// referência (paleta da marca e tons clássicos de salão).
export const avisoCores = "Cores de referência. {{CONFIRMAR: cores e tecidos disponíveis no mostruário da fábrica}}";

export type Tecido = {
  id: TecidoId;
  nome: string;
  descricao: string;
};

export const tecidos: Tecido[] = [
  { id: "corino", nome: "Corino", descricao: "Brilho suave e limpeza fácil no dia a dia do salão." },
  { id: "veludo", nome: "Veludo", descricao: "Toque macio e cor profunda que muda com a luz." },
];

export type Cor = {
  id: string;
  nome: string;
  hex: string;
};

export const cores: Cor[] = [
  { id: "rose", nome: "Rosé", hex: "#E3B9AF" },
  { id: "nude", nome: "Nude", hex: "#D9C3B0" },
  { id: "champanhe", nome: "Champanhe", hex: "#CBB089" },
  { id: "caramelo", nome: "Caramelo", hex: "#A86F48" },
  { id: "verde-salvia", nome: "Verde-sálvia", hex: "#8E9C86" },
  { id: "grafite", nome: "Grafite", hex: "#3A3A40" },
  { id: "preto", nome: "Preto", hex: "#18181B" },
  { id: "off-white", nome: "Off-white", hex: "#EFEAE4" },
];

export type Acabamento = {
  id: AcabamentoId;
  nome: string;
  /** Cor do círculo da amostra na interface (a cena 3D usa material próprio). */
  amostra: string;
};

export const acabamentos: Acabamento[] = [
  {
    id: "cromado",
    nome: "Cromado",
    amostra: "linear-gradient(135deg,#fdfdfd 0%,#b9bcc2 45%,#f4f4f4 60%,#8d9096 100%)",
  },
  { id: "preto-fosco", nome: "Preto fosco", amostra: "linear-gradient(135deg,#3a3a3e 0%,#1b1b1e 100%)" },
  {
    id: "dourado",
    nome: "Dourado",
    amostra: "linear-gradient(135deg,#f3e2b3 0%,#c9a55c 45%,#f0dca6 62%,#9c7a3c 100%)",
  },
];

export function corPorId(id: string): Cor {
  return cores.find((c) => c.id === id) ?? cores[0];
}
export function tecidoPorId(id: string): Tecido {
  return tecidos.find((t) => t.id === id) ?? tecidos[0];
}
export function acabamentoPorId(id: string): Acabamento {
  return acabamentos.find((a) => a.id === id) ?? acabamentos[0];
}

/** Configuração inicial (usada no hero, no configurador e no "Monte seu salão"). */
export const configuracaoInicial = {
  modelo: "cadeira" as ModeloId,
  tecido: "veludo" as TecidoId,
  cor: "rose",
  acabamento: "dourado" as AcabamentoId,
};
