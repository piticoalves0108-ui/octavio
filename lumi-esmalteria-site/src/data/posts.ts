/** Tendências e cuidados: conteúdo editorial do blog (textos gerais de cuidado, não promessas). */

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: "Cuidados" | "Tendências" | "Nail art" | "Bem-estar";
  readingTime: string;
  palette: string[];
  body: { heading?: string; text: string }[];
}

export const posts: Post[] = [
  {
    slug: "cores-da-estacao",
    title: "As cores da estação: do café ao sálvia",
    excerpt: "Marrons chocolate, verdes suaves e nudes luminosos dominam as mãos mais elegantes desta temporada.",
    category: "Tendências",
    readingTime: "4 min",
    palette: ["#6B4232", "#9CAF95", "#E3BFAF", "#B7A7D6"],
    body: [
      { text: "As tendências de esmalte acompanham a moda: quando as roupas ficam mais terrosas e minimalistas, as unhas seguem o mesmo caminho. Nesta estação, os tons naturais ganham força, mas com personalidade." },
      { heading: "Café e chocolate", text: "Os marrons profundos substituem o preto em quem quer um visual sofisticado sem tanto contraste. Ficam lindos em unhas curtas e quadradas, com acabamento cremoso." },
      { heading: "Verde sálvia", text: "Um verde acinzentado, suave e fresco. Funciona em todos os tons de pele e combina com dourado, prata e linho." },
      { heading: "Nudes luminosos", text: "O nude certo é aquele que parece a sua unha, só que mais bonita. Procure tons um pouco mais claros ou mais rosados do que a sua pele e prefira o acabamento em gel para um brilho de vitrine." },
    ],
  },
  {
    slug: "como-fazer-o-gel-durar",
    title: "Cinco hábitos para o seu gel durar três semanas",
    excerpt: "Pequenos cuidados no dia a dia fazem a esmaltação em gel chegar inteira até a manutenção.",
    category: "Cuidados",
    readingTime: "3 min",
    palette: ["#B3122E", "#F3EEE8", "#E3BFAF"],
    body: [
      { text: "A esmaltação em gel é resistente, mas não é invencível. Estes hábitos simples ajudam a preservar o brilho e evitar descolamentos." },
      { heading: "1. Use luvas na limpeza", text: "Produtos de limpeza e água quente por muito tempo enfraquecem a aderência. Luvas resolvem." },
      { heading: "2. Hidrate as cutículas", text: "Um óleo de cutícula à noite mantém a região flexível e evita que a unha resseque e descole nas laterais." },
      { heading: "3. Não use as unhas como ferramenta", text: "Abrir latas ou tirar adesivos com as unhas é o caminho mais rápido para uma quebra." },
      { heading: "4. Nada de arrancar o gel", text: "Puxar o gel leva camadas da unha natural junto. Se descolar, venha fazer o reparo." },
      { heading: "5. Respeite a manutenção", text: "Entre 15 e 21 dias, a unha cresce e o equilíbrio muda. Manter o intervalo protege a unha natural." },
    ],
  },
  {
    slug: "spa-dos-pes-em-casa",
    title: "Um mini spa dos pés para fazer em casa",
    excerpt: "Entre uma visita e outra, um ritual de 20 minutos mantém os pés macios e a mente leve.",
    category: "Bem-estar",
    readingTime: "4 min",
    palette: ["#F4AE93", "#E8D5CE", "#9CAF95"],
    body: [
      { text: "O spa dos pés é tanto sobre a pele quanto sobre desacelerar. Dá para levar um pouco desse ritual para casa." },
      { heading: "Escalda-pés", text: "Água morna, um punhado de sal grosso e algumas gotas de óleo essencial de lavanda. Dez minutos já fazem diferença." },
      { heading: "Esfoliação suave", text: "Açúcar com óleo de amêndoas, em movimentos circulares, principalmente nos calcanhares. Evite lixas metálicas em casa." },
      { heading: "Hidratação e meia", text: "Creme espesso nos pés e meias de algodão por uma hora, ou durante a noite. A pele amanhece outra." },
    ],
  },
  {
    slug: "francesinha-moderna",
    title: "Francesinha moderna: cinco jeitos de usar",
    excerpt: "Micro, colorida, invertida ou com glitter: o clássico ganhou versões para todos os estilos.",
    category: "Nail art",
    readingTime: "3 min",
    palette: ["#F3E6E0", "#1A1A1A", "#FF6B7A", "#E6A6AE"],
    body: [
      { text: "A francesinha nunca saiu de moda, só ficou mais livre. Estas versões aparecem em desfiles e editoriais, e todas funcionam no dia a dia." },
      { heading: "Micro francesinha", text: "Uma linha finíssima na ponta, quase um contorno. Elegante em unhas amendoadas." },
      { heading: "Colorida", text: "Troque o branco por coral, vinho ou sálvia. A base leitosa deixa tudo mais suave." },
      { heading: "Invertida", text: "A cor fica na base, perto da cutícula, em formato de meia-lua. Um clássico dos anos 1920." },
      { heading: "Com brilho", text: "Glitter fino só nas pontas, para as festas sem exagero." },
    ],
  },
  {
    slug: "unha-fraca-o-que-fazer",
    title: "Unha fraca: o que funciona de verdade",
    excerpt: "Blindagem, alimentação e pausa entre alongamentos: um guia para unhas mais fortes.",
    category: "Cuidados",
    readingTime: "5 min",
    palette: ["#F3EEE8", "#D9A3A0", "#C8A27A"],
    body: [
      { text: "Unhas que descamam ou quebram com facilidade costumam ser resultado de ressecamento, química em excesso ou remoções agressivas. A boa notícia é que dá para recuperar." },
      { heading: "Proteja enquanto cresce", text: "A blindagem cria uma camada protetora sobre a unha natural e ajuda a passar pela fase crítica do crescimento." },
      { heading: "Hidratação diária", text: "Óleo de cutícula e creme de mãos todos os dias. A unha também é pele e também resseca." },
      { heading: "Remoção sempre profissional", text: "Arrancar gel ou alongamento leva camadas da unha natural. Faça a remoção com quem sabe." },
      { heading: "Procure ajuda se persistir", text: "Manchas, deformações ou fragilidade que não melhora merecem a avaliação de um dermatologista." },
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
