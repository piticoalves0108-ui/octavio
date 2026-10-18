import { img } from "./images";

/** Textos institucionais. Depoimentos e equipe são ilustrativos: troque pelos reais antes de publicar. */

export const testimonials = [
  {
    quote:
      "Recebemos o projeto 3D com cada gaveta já pensada para os nossos utensílios. Na montagem, nada precisou ser adaptado: tudo encaixou ao milímetro.",
    name: "Mariana e Rafael T.",
    project: "Cozinha Jacarandá",
    location: "Lago Sul",
  },
  {
    quote:
      "O closet virou o meu lugar preferido da casa. A iluminação que acende quando abro as portas parece coisa de loja de grife.",
    name: "Camila R.",
    project: "Closet Âmbar",
    location: "Lago Sul",
  },
  {
    quote:
      "Como arquiteta, o que mais valorizo é o detalhamento executivo. A equipe respeitou o desenho e ainda sugeriu ferragens melhores.",
    name: "Helena M.",
    project: "Parceira · Estúdio Lume",
    location: "Brasília",
  },
  {
    quote:
      "Prazo cumprido, obra limpa e um pós-venda que realmente responde. Já estamos fazendo o segundo ambiente.",
    name: "Eduardo S.",
    project: "Estúdio Cumaru",
    location: "Águas Claras",
  },
  {
    quote:
      "O painel ripado escondeu a porta do lavabo de um jeito que as visitas sempre perguntam onde fica o banheiro.",
    name: "Família Andrade",
    project: "Living Ripado",
    location: "Jardim Botânico",
  },
];

export const team = [
  { name: "Luísa Andrade", role: "Arquiteta · Direção de projetos", image: img.people[0] },
  { name: "Thiago Moreira", role: "Designer de interiores", image: img.people[3] },
  { name: "Beatriz Lemos", role: "Arquiteta · Projetos executivos", image: img.people[2] },
  { name: "Carlos Nogueira", role: "Mestre marceneiro · Produção", image: img.people[7] },
  { name: "Renata Sales", role: "Gestão de obra e montagem", image: img.people[6] },
];

export const values = [
  {
    title: "Design autoral",
    text: "Nada sai de catálogo. Cada peça nasce de um briefing e é desenhada para o espaço, a rotina e o acervo de quem vai usá-la.",
    icon: "PenTool",
  },
  {
    title: "Sustentabilidade",
    text: "Painéis com certificação FSC, colas sem formaldeído adicionado, madeira de reflorestamento e reaproveitamento de sobras na própria fábrica.",
    icon: "Leaf",
  },
  {
    title: "Durabilidade",
    text: "Chapas de 18 a 25 mm, ferragens europeias com amortecimento e garantia estrutural de 10 anos. Móvel planejado para durar décadas.",
    icon: "ShieldCheck",
  },
  {
    title: "Atendimento personalizado",
    text: "Um arquiteto acompanha o projeto do primeiro café à entrega das chaves, com cronograma claro e um canal direto de comunicação.",
    icon: "HeartHandshake",
  },
] as const;

/** As quatro etapas resumidas exibidas na home */
export const creativeProcess = [
  {
    n: "01",
    title: "Briefing",
    text: "Uma conversa sobre rotina, hábitos e desejos. Entendemos o que você guarda, como cozinha, quem recebe e como imagina o espaço.",
    duration: "1 encontro",
  },
  {
    n: "02",
    title: "Projeto 3D",
    text: "Medição a laser e projeto 3D fotorrealista, com materiais reais, ferragens e iluminação. Você caminha pelo ambiente antes de ele existir.",
    duration: "7 a 10 dias",
  },
  {
    n: "03",
    title: "Produção",
    text: "Corte em CNC, fitamento a laser e acabamento manual na nossa fábrica. Cada peça passa por inspeção antes de ser embalada.",
    duration: "30 a 45 dias",
  },
  {
    n: "04",
    title: "Montagem",
    text: "Equipe própria, obra protegida e limpa. Regulamos cada porta e entregamos o ambiente pronto para viver, com manual de cuidados.",
    duration: "3 a 7 dias",
  },
];

/** Processo completo exibido na página /processo */
export const fullProcess = [
  {
    n: "01",
    title: "Briefing",
    duration: "Encontro de 1h30",
    text: "No showroom ou por videochamada, entendemos rotina, estilo, prioridades e orçamento. Se houver arquiteto, trabalhamos a partir do projeto dele.",
    deliverables: ["Programa de necessidades", "Referências de estilo", "Faixa de investimento"],
    you: "Traga fotos do espaço, a planta e as imagens que inspiram você.",
  },
  {
    n: "02",
    title: "Visita técnica",
    duration: "Até 5 dias após o briefing",
    text: "Medição com trena a laser, conferência de prumo, esquadro, pontos elétricos e hidráulicos. Nada é desenhado sobre suposições.",
    deliverables: ["Levantamento milimétrico", "Registro fotográfico", "Checklist de infraestrutura"],
    you: "Garanta acesso ao imóvel; se estiver em obra, convidamos o seu empreiteiro.",
  },
  {
    n: "03",
    title: "Projeto 3D",
    duration: "7 a 10 dias",
    text: "Projeto fotorrealista com os materiais reais, ferragens e iluminação. Apresentamos em 3D navegável e ajustamos quantas vezes for necessário.",
    deliverables: ["Imagens 3D fotorrealistas", "Tour 3D navegável", "Memorial de materiais"],
    you: "Aprove o desenho e escolha os acabamentos com as amostras físicas em mãos.",
  },
  {
    n: "04",
    title: "Aprovação",
    duration: "1 a 3 dias",
    text: "Contrato com cronograma, especificação técnica completa e projeto executivo assinado. A partir daqui, o prazo de produção começa a contar.",
    deliverables: ["Contrato e cronograma", "Projeto executivo", "Condições de pagamento"],
    you: "Assine o executivo: ele é a garantia de que o que foi desenhado será entregue.",
  },
  {
    n: "05",
    title: "Produção",
    duration: "30 a 45 dias",
    text: "Corte em CNC de precisão, fitamento a laser, usinagem, acabamento manual e pré-montagem dos módulos críticos na fábrica.",
    deliverables: ["Fotos da produção", "Inspeção de qualidade", "Agendamento da montagem"],
    you: "Acompanhe a produção pelo canal direto com o seu arquiteto.",
  },
  {
    n: "06",
    title: "Montagem e entrega",
    duration: "3 a 7 dias",
    text: "Equipe própria e uniformizada, obra protegida e limpeza diária. Regulamos cada porta, vistoriamos juntos e entregamos o manual de cuidados.",
    deliverables: ["Vistoria de entrega", "Manual de cuidados", "Certificado de garantia de 10 anos"],
    you: "Faça a vistoria conosco e aproveite o ambiente: o pós-venda continua com você.",
  },
];

export const fabrication = [
  { title: "Seleção de chapas", text: "MDF e compensados certificados, lâminas naturais escolhidas peça a peça para casar veios.", image: img.workshop[3] },
  { title: "Corte em CNC", text: "Precisão de décimos de milímetro e otimização que reduz o desperdício a menos de 8%.", image: img.workshop[4] },
  { title: "Fitamento a laser", text: "Borda fundida à chapa, sem linha de cola aparente e com vedação total contra umidade.", image: img.workshop[0] },
  { title: "Acabamento manual", text: "Lixamento, laca PU e óleos naturais aplicados por artesãos com décadas de ofício.", image: img.workshop[1] },
  { title: "Controle de qualidade", text: "Pré-montagem dos módulos críticos e inspeção de cada frente antes da embalagem.", image: img.workshop[5] },
];

export const timeline = [
  { year: "Origem", text: "Uma pequena marcenaria de bairro, movida pela obsessão por encaixes perfeitos." },
  { year: "Fábrica", text: "Primeira CNC e o projeto 3D como regra: o cliente aprova o que vai receber." },
  { year: "Ateliê", text: "Equipe de arquitetos própria e parcerias com escritórios de interiores." },
  { year: "Hoje", text: "Mais de mil ambientes entregues, showroom próprio e garantia de 10 anos." },
];

export const faq = [
  {
    q: "Qual o prazo total, do briefing à montagem?",
    a: "Em média de 50 a 65 dias: cerca de 10 dias para projeto e aprovação, 30 a 45 dias de produção e 3 a 7 dias de montagem, dependendo do tamanho do projeto.",
  },
  {
    q: "Vocês trabalham com o projeto do meu arquiteto?",
    a: "Sim. Recebemos o projeto de interiores, fazemos o detalhamento executivo e mantemos o arquiteto informado em cada etapa, inclusive na vistoria de entrega.",
  },
  {
    q: "Como funciona o orçamento?",
    a: "O orçamento preliminar sai após o briefing, com base em metragem e acabamentos. O valor final é fechado com o projeto 3D aprovado e o memorial de materiais.",
  },
  {
    q: "Qual a garantia dos móveis?",
    a: "Garantia estrutural de 10 anos e de 5 anos para ferragens, além de visita de regulagem gratuita 6 meses após a entrega.",
  },
  {
    q: "Atendem fora da cidade do showroom?",
    a: "Atendemos a região metropolitana diretamente. Para outras cidades, avaliamos o projeto e combinamos visita técnica e logística de montagem.",
  },
  {
    q: "Quais as formas de pagamento?",
    a: "Entrada na assinatura do contrato e o saldo parcelado durante a produção. Também trabalhamos com condições especiais para projetos completos.",
  },
];

export const whyUs = [
  { title: "Projeto 3D antes de produzir", text: "Você vê, caminha e aprova cada detalhe em 3D fotorrealista.", stat: "100%", statLabel: "dos projetos aprovados em 3D" },
  { title: "Fábrica própria", text: "Do corte em CNC ao acabamento manual, sem terceirizar o que importa.", stat: "0", statLabel: "etapas terceirizadas" },
  { title: "Ferragens europeias", text: "Blum, Hettich e Häfele com amortecimento em cada porta e gaveta.", stat: "10", statLabel: "anos de garantia" },
  { title: "Montagem impecável", text: "Equipe própria, obra protegida e limpa, regulagem fina na entrega.", stat: "98%", statLabel: "de satisfação na entrega" },
];
