/**
 * Textos das seções. Para trocar qualquer frase do site, edite aqui.
 * Marcadores {{CONFIRMAR: ...}} aparecem destacados no site até serem preenchidos.
 */

export const navegacao = [
  { rotulo: "Linhas", href: "/#linhas" },
  { rotulo: "Configurador", href: "/#configurador" },
  { rotulo: "Como funciona", href: "/#como-funciona" },
  { rotulo: "Showroom", href: "/showroom" },
  { rotulo: "Dúvidas", href: "/#duvidas" },
];

export const hero = {
  sobretitulo: "Fábrica própria · Taguatinga Norte, DF",
  // Cada item é uma linha do título. Trechos entre *asteriscos* ficam em itálico rosé.
  titulo: ["Móveis para salão", "e esmalteria,", "*direto da fábrica.*"],
  texto:
    "Escolha o modelo, a cor do estofado e o acabamento da base. A gente produz sob encomenda e entrega em até 7 dias úteis, com parcelamento em até 12x sem juros no cartão.",
  ctaPrincipal: "Monte e peça seu orçamento",
  ctaSecundario: "Visite o showroom na QI 19",
  selos: ["Entrega em até 7 dias úteis", "Até 12x sem juros no cartão", "Showroom na fábrica"],
  legendaCena: "Gire a cadeira e troque o estofado",
};

export const secaoLinhas = {
  sobretitulo: "Linhas de produto",
  titulo: "Tudo o que o salão precisa, saindo da mesma fábrica.",
  texto:
    "Cadeiras, lavatórios, bancadas de manicure, recepção e espelhos. Quando tudo sai da mesma fábrica, o salão inteiro conversa: mesmo estofado, mesmo acabamento, um só pedido.",
  avisoImagens: "Imagens geradas da nossa cena 3D, só para ilustrar. As fotos reais das peças entram em breve.",
};

export const secaoConfigurador = {
  sobretitulo: "Configurador 3D",
  titulo: "Monte a sua peça e peça o orçamento pronto.",
  texto:
    "Escolha o modelo, o estofado e o acabamento. O pedido chega no nosso WhatsApp já com a sua escolha escrita, e a conversa começa do ponto certo.",
  botaoOrcamento: "Pedir orçamento deste modelo",
  botaoCopiar: "Copiar link desta configuração",
  copiado: "Link copiado",
  dicaGiro: "Arraste para girar",
  giroscopio: "Girar com o celular",
};

export const secaoMonteSeuSalao = {
  sobretitulo: "Monte seu salão",
  titulo: "Do salão vazio ao primeiro atendimento.",
  texto: "Role a página e veja o espaço ganhar forma, peça por peça, na cor que você escolheu no configurador.",
  passos: [
    { titulo: "Cadeiras e espelhos", texto: "As estações de trabalho, de frente para os espelhos." },
    { titulo: "Lavatórios", texto: "O canto da lavagem, encostado na parede." },
    { titulo: "Bancada de manicure", texto: "O posto da manicure, com apoio para a cliente." },
    { titulo: "Recepção", texto: "O balcão que recebe quem chega." },
  ],
  cta: "Pedir orçamento do salão completo",
  rotuloCor: "Cor do salão",
};

export const secaoComoFunciona = {
  sobretitulo: "Como funciona",
  titulo: "Prazo curto e pagamento que cabe no caixa do salão.",
  numeros: [
    {
      prefixo: "até",
      valor: 7,
      inicio: 0,
      colado: "",
      sufixo: "dias úteis",
      texto: "para a entrega. A produção é sob encomenda, na nossa fábrica em Taguatinga Norte.",
    },
    {
      prefixo: "",
      valor: 12,
      inicio: 1,
      colado: "x",
      sufixo: "sem juros",
      texto: "no cartão de crédito. Você monta o salão inteiro sem descapitalizar o negócio.",
    },
  ],
  etapasTitulo: "Da escolha à montagem",
  etapas: [
    {
      numero: "01",
      titulo: "Escolha",
      texto:
        "Monte a combinação no configurador do site ou venha ao showroom na QI 19 para ver tecidos e acabamentos de perto.",
    },
    {
      numero: "02",
      titulo: "Produção",
      texto: "Com o pedido fechado, sua peça é produzida sob encomenda na nossa fábrica, em Taguatinga Norte.",
    },
    {
      numero: "03",
      titulo: "Entrega",
      texto: "Entrega em até 7 dias úteis. {{CONFIRMAR: regiões atendidas e como é cobrado o frete}}",
    },
    {
      numero: "04",
      titulo: "Montagem",
      texto: "{{CONFIRMAR: como funciona a montagem (está inclusa? quem monta? em quais regiões?)}}",
    },
  ],
};

export const secaoGaleria = {
  sobretitulo: "Salões que já montamos",
  titulo: "O nosso trabalho, no espaço de quem empreende.",
  texto: "Fotos de salões e esmalterias montados com móveis da Só Salão, publicadas com autorização das clientes.",
  aviso: "Espaço reservado: as fotos entram após a autorização de cada cliente.",
  ctaInstagram: "Veja mais no Instagram",
};

export type ItemGaleria = {
  id: string;
  proporcao: "4/5" | "1/1" | "3/2" | "16/9";
  fotoIdeal: string;
  /** Quando a foto real chegar: caminho em /public/images/galeria e texto alternativo. */
  imagem?: { src: string; alt: string };
};

export const galeria: ItemGaleria[] = [
  {
    id: "salao-entrada",
    proporcao: "4/5",
    fotoIdeal:
      "Salão completo visto da porta de entrada: cadeiras alinhadas de frente para os espelhos, luz natural, sem pessoas.",
  },
  {
    id: "detalhe-estofado",
    proporcao: "1/1",
    fotoIdeal: "Close no estofado e na costura de uma cadeira entregue, com luz lateral mostrando a textura.",
  },
  {
    id: "esmalteria",
    proporcao: "3/2",
    fotoIdeal: "Esmalteria com as bancadas de manicure lado a lado, vista em diagonal.",
  },
  {
    id: "lavatorios",
    proporcao: "4/5",
    fotoIdeal: "Lavatórios instalados, vistos de lado, com as cubas e a parede ao fundo.",
  },
  {
    id: "recepcao",
    proporcao: "3/2",
    fotoIdeal: "Recepção montada com o balcão em primeiro plano e a marca do salão na parede.",
  },
  {
    id: "dona-do-salao",
    proporcao: "1/1",
    fotoIdeal: "Dona ou dono do salão ao lado dos móveis novos, no dia da inauguração (com autorização de imagem).",
  },
];

export const marcadorGaleria = "{{CONFIRMAR: fotos de salões de clientes e autorização de uso de imagem}}";

export const secaoShowroom = {
  sobretitulo: "Visite o showroom",
  titulo: "Veja, toque e sente antes de decidir.",
  texto:
    "O showroom fica dentro da fábrica, na QI 19 do Setor Industrial de Taguatinga Norte. Venha ver os tecidos e os acabamentos de perto e conversar sobre o projeto do seu salão.",
  fotoIdeal: "Foto ideal: fachada da fábrica na QI 19, com a placa da Só Salão visível e a entrada do showroom.",
  mapaIlustrativo: "Mapa ilustrativo da localização",
  carregarMapa: "Carregar mapa interativo",
  comoChegar: "Como chegar",
  ligar: "Ligar",
};

export type Pergunta = {
  id: string;
  pergunta: string;
  resposta: string;
};

export const perguntas: Pergunta[] = [
  {
    id: "prazo",
    pergunta: "Qual é o prazo de entrega?",
    resposta:
      "A produção é sob encomenda e a entrega é feita em até 7 dias úteis. {{CONFIRMAR: a partir de quando o prazo é contado (pedido, pagamento ou aprovação do projeto)}}",
  },
  {
    id: "pagamento",
    pergunta: "Como funciona o pagamento?",
    resposta:
      "Você pode parcelar em até 12x sem juros no cartão. {{CONFIRMAR: outras formas de pagamento aceitas (Pix, boleto, entrada)}}",
  },
  {
    id: "frete",
    pergunta: "Vocês entregam fora de Taguatinga? Como é o frete?",
    resposta: "{{CONFIRMAR: regiões atendidas no DF e no entorno e como é cobrado o frete}}",
  },
  {
    id: "montagem",
    pergunta: "A montagem está inclusa?",
    resposta: "{{CONFIRMAR: se a montagem está inclusa, quem monta e em quais regiões}}",
  },
  {
    id: "garantia",
    pergunta: "Os móveis têm garantia?",
    resposta: "{{CONFIRMAR: prazo e cobertura da garantia}}",
  },
  {
    id: "personalizacao",
    pergunta: "Posso escolher cor, tecido e acabamento?",
    resposta:
      "Pode. Como a produção é sob encomenda, você escolhe o modelo, a cor do estofado e o acabamento da base. No configurador do site você testa as combinações e manda a escolha direto pelo WhatsApp. {{CONFIRMAR: outras personalizações possíveis (medidas especiais, bordado da marca etc.)}}",
  },
  {
    id: "showroom",
    pergunta: "Posso ver os móveis pessoalmente?",
    resposta:
      "Pode, e recomendamos. O showroom fica na própria fábrica: QI 19, lotes 34 a 38, Setor Industrial, Taguatinga Norte.",
  },
];

export const rodape = {
  chamada: "O seu próximo salão começa aqui.",
  texto: "Monte a combinação no configurador ou fale direto com a fábrica.",
  direitos: "Todos os direitos reservados.",
};
