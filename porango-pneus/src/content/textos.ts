/**
 * TEXTOS FIXOS DO SITE (conhecimento técnico geral sobre pneus).
 * Não há aqui nenhuma promessa da loja: só explicação. As promessas ficam em `site.ts`.
 */

export const hero = {
  eyebrow: "Loja de pneus · Brasília - DF",
  titulo: ["Pneu certo,", "preço justo."],
  // {{CONFIRMAR: a montagem é feita na hora?}} Se sim, o selo abaixo vira texto normal.
  complemento: "Montado na hora. {{CONFIRMAR: a montagem é feita na hora?}}",
  apoio: "Mande a medida do seu pneu pelo WhatsApp e receba a cotação sem sair de casa.",
};

/** Partes da medida 175/70 R14 84T, na ordem em que a câmera destaca. */
export const partesMedida = [
  {
    trecho: "175",
    nome: "Largura",
    texto: "175 mm de uma lateral à outra do pneu. Quanto maior, mais borracha encosta no chão.",
  },
  {
    trecho: "70",
    nome: "Perfil",
    texto: "A altura do flanco é 70% da largura: 122,5 mm. Perfil alto absorve mais buraco.",
  },
  {
    trecho: "R14",
    nome: "Aro",
    texto: "R é a construção radial. 14 é o diâmetro da roda em polegadas: o pneu só serve em roda 14.",
  },
  {
    trecho: "84",
    nome: "Índice de carga",
    texto: "84 quer dizer até 500 kg por pneu. Nunca monte um índice menor que o do manual.",
  },
  {
    trecho: "T",
    nome: "Índice de velocidade",
    texto: "T quer dizer até 190 km/h. É a velocidade máxima que o pneu aguenta com carga.",
  },
] as const;

export const medidaExemplo = { largura: "175", perfil: "70", aro: "14", carga: "84", velocidade: "T" };

/** Camadas da vista explodida, de fora para dentro. */
export const camadas = [
  {
    nome: "Banda de rodagem",
    texto: "A parte que toca o chão. Os sulcos tiram a água do caminho e seguram o carro na frenagem e na curva.",
  },
  {
    nome: "Cintas de aço",
    texto: "Lonas de aço logo abaixo da banda. Deixam o pneu firme, estável em reta e mais resistente a furo.",
  },
  {
    nome: "Carcaça",
    texto: "O esqueleto do pneu: lonas de cordonéis que seguram a pressão do ar e sustentam o peso do carro.",
  },
  {
    nome: "Flanco",
    texto: "A lateral. Absorve impacto e traz gravadas a medida, os índices e a data de fabricação.",
  },
  {
    nome: "Talão",
    texto: "Anel de arame de aço que prende o pneu no aro e veda o ar. Montagem errada danifica o talão.",
  },
] as const;

export const alinhamento = {
  titulo: "Alinhamento e balanceamento",
  intro:
    "Roda fora de ângulo arrasta o pneu de lado: ele gasta torto e o carro puxa. Roda desbalanceada faz o volante tremer.",
  itens: [
    {
      nome: "Convergência",
      texto: "As rodas da frente precisam apontar para o mesmo lado. O laser mostra quando uma está aberta ou fechada.",
    },
    {
      nome: "Cambagem",
      texto: "A inclinação da roda vista de frente. Fora do ponto, gasta só a parte de dentro ou de fora do pneu.",
    },
    {
      nome: "Balanceamento",
      texto: "Contrapesos no aro equilibram o conjunto e acabam com a vibração no volante.",
    },
  ],
  nota: "Ângulos exagerados na animação para ficar fácil de ver.",
};

export const faq = [
  {
    pergunta: "Quando é hora de trocar o pneu?",
    resposta:
      "Quando o sulco chegar a 1,6 mm, que é o mínimo permitido no Brasil. Troque antes se o pneu tiver bolha, corte no flanco, rachaduras de ressecamento ou desgaste irregular. Na dúvida, mande uma foto do pneu pelo WhatsApp.",
  },
  {
    pergunta: "Como vejo o desgaste pelo TWI?",
    resposta:
      "TWI é o indicador de desgaste: pequenas saliências de 1,6 mm no fundo dos sulcos. Procure o triângulo ou a sigla TWI no ombro do pneu e olhe o sulco alinhado a ele. Se a banda já está na altura da saliência, o pneu chegou ao limite.",
  },
  {
    pergunta: "O que é rodízio e de quanto em quanto tempo fazer?",
    resposta:
      "É trocar os pneus de posição para que gastem por igual e durem mais. O intervalo certo está no manual do seu carro; muitos fabricantes indicam a cada 10.000 km. Aproveite o rodízio para conferir alinhamento e balanceamento.",
  },
  {
    pergunta: "Qual a calibragem certa e com que frequência?",
    resposta:
      "Use a pressão indicada pela montadora: ela fica na etiqueta da coluna da porta, na tampa do tanque ou no manual. Calibre com o pneu frio, pelo menos a cada 15 dias, e não esqueça o estepe. Pneu murcho gasta nas bordas e aumenta o consumo.",
  },
  {
    pergunta: "Posso trocar só dois pneus?",
    resposta:
      "Pode, desde que sejam do mesmo eixo, com a mesma medida e de preferência o mesmo modelo. Os fabricantes de pneu recomendam montar os novos no eixo traseiro, que dá mais estabilidade em pista molhada.",
  },
  {
    pergunta: "Como sei a medida do meu pneu?",
    resposta:
      "Ela está gravada no flanco, no formato 175/70 R14 84T: largura, perfil, aro, índice de carga e de velocidade. Também aparece no manual e na etiqueta da porta. Se não achar, mande uma foto da lateral do pneu pelo WhatsApp.",
  },
] as const;
