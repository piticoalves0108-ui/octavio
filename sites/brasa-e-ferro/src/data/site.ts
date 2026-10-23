/**
 * ============================================================================
 *  DADOS DO NEGÓCIO: a única fonte de verdade do site
 * ============================================================================
 *  Tudo o que aparece no site (textos, cardápio, horários, contatos) e tudo o
 *  que vai para o SEO (meta tags, Open Graph, schema.org Restaurant, sitemap)
 *  sai deste arquivo. Para adaptar o site a outro cliente, edite só aqui.
 *
 *  Valores envolvidos em `confirmar('campo', valor)` são EXEMPLOS e precisam
 *  ser conferidos com o dono antes de publicar. O `npm run build` lista todos
 *  eles no terminal, e o README traz a mesma lista.
 *
 *  Este arquivo não pode importar nada do navegador: ele também roda no
 *  Node, dentro do vite.config.ts.
 * ============================================================================
 */

const pendentes: string[] = []

/** Marca um valor de exemplo que precisa ser confirmado antes de publicar. */
function confirmar<T>(campo: string, valor: T): T {
  pendentes.push(campo)
  return valor
}

/** Lista de campos ainda não confirmados (impressa no build). */
export const CAMPOS_A_CONFIRMAR = pendentes

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo

export interface Horario {
  dias: DiaSemana[]
  rotulo: string
  /** "HH:MM". Se fecha depois da meia-noite, use "24:00" ou "01:00". */
  abre: string
  fecha: string
}

/** Receita usada para montar o hambúrguer 3D de cada item do cardápio. */
export type Camada =
  | 'pao-base'
  | 'pao-topo'
  | 'carne'
  | 'smash'
  | 'veggie'
  | 'queijo'
  | 'queijo-branco'
  | 'bacon'
  | 'alface'
  | 'tomate'
  | 'cebola'
  | 'cebola-roxa'
  | 'picles'
  | 'ovo'
  | 'molho'
  | 'jalapeno'

export type Pao = 'gergelim' | 'brioche' | 'australiano'

export interface ItemCardapio {
  id: string
  nome: string
  descricao: string
  preco: number
  categoria: 'classicos' | 'smash' | 'especiais'
  selo?: string
  pao: Pao
  /** Camadas de baixo para cima, sem os pães (o pão vem de `pao`). */
  camadas: Camada[]
  /** Cor do molho no 3D: casa, barbecue, paprica, verde, ervas. */
  molho?: 'casa' | 'barbecue' | 'paprica' | 'verde' | 'ervas'
}

// ---------------------------------------------------------------------------
// Negócio
// ---------------------------------------------------------------------------

const instagramUsuario = 'delicias_nachapada'

export const site = {
  nome: 'Brasa & Ferro',
  nomeCurto: 'Brasa&Ferro',
  ramo: 'Hamburgueria artesanal',
  slogan: 'Carne de verdade. Fogo de verdade.',
  sloganLongo: 'Carne de verdade. Fogo de verdade. Sabor que não se explica — se prova.',
  descricaoSeo: confirmar(
    'descrição para o Google',
    'Hambúrguer artesanal feito na brasa e na chapa de ferro. Blend moído todo dia, pão selado na manteiga e bacon defumado na casa. Peça agora.',
  ),

  /** Domínio final, sem barra no fim. Usado no canonical, OG e sitemap. */
  url: confirmar('domínio do site', 'https://brasaeferro.com.br'),
  idioma: 'pt-BR',
  corTema: '#0D0D0D',

  contato: {
    /** Só dígitos, com DDI e DDD (ex.: 5561999999999). Vazio = usa a DM do Instagram. */
    whatsapp: confirmar('WhatsApp de pedidos', ''),
    /** Formato de exibição. */
    telefoneExibicao: confirmar('telefone de exibição', ''),
    email: confirmar('e-mail de contato', ''),
    mensagemPedido: 'Olá! Vim pelo site e quero fazer um pedido.',
  },

  redes: {
    instagram: {
      usuario: instagramUsuario,
      url: `https://www.instagram.com/${instagramUsuario}/`,
      dm: `https://ig.me/m/${instagramUsuario}`,
    },
    /** Deixe vazio para esconder o ícone. */
    ifood: confirmar('link do iFood', ''),
    tiktok: confirmar('link do TikTok', ''),
  },

  endereco: {
    rua: confirmar('endereço (rua e número)', 'Rua da Brasa, 180'),
    bairro: confirmar('bairro', 'Centro'),
    cidade: confirmar('cidade', 'Sua Cidade'),
    uf: confirmar('estado (UF)', 'BR'),
    cep: confirmar('CEP', '00000-000'),
    referencia: confirmar('ponto de referência', 'Siga o cheiro de brasa.'),
    /** Coordenadas para o schema e o link do mapa. */
    geo: confirmar('latitude e longitude', { lat: -15.7939, lng: -47.8828 }),
  },

  horarios: confirmar<Horario[]>('horário de funcionamento', [
    { dias: [2, 3, 4], rotulo: 'Terça a quinta', abre: '18:00', fecha: '23:00' },
    { dias: [5, 6], rotulo: 'Sexta e sábado', abre: '18:00', fecha: '24:00' },
    { dias: [0], rotulo: 'Domingo', abre: '18:00', fecha: '23:00' },
  ]),
  /** Texto para os dias sem horário cadastrado. */
  diaFechado: 'Segunda: chapa descansando',

  /** Endpoint que recebe o POST da newsletter (Formspree, Mailchimp, etc.). Vazio = só simula. */
  newsletterEndpoint: confirmar('endpoint da newsletter', ''),

  faixaPreco: '$$',
} as const

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

export const navegacao = [
  { id: 'sobre', rotulo: 'Sobre' },
  { id: 'cardapio', rotulo: 'Cardápio' },
  { id: 'ingredientes', rotulo: 'Ingredientes' },
  { id: 'galeria', rotulo: 'Galeria' },
  { id: 'depoimentos', rotulo: 'Depoimentos' },
  { id: 'onde', rotulo: 'Onde estamos' },
] as const

export const hero = {
  eyebrow: 'Hamburgueria artesanal',
  tituloLinha1: 'Carne de verdade.',
  tituloLinha2: 'Fogo de verdade.',
  subtitulo: 'Sabor que não se explica — se prova.',
  cta: 'Peça Agora',
  ctaSecundario: 'Ver cardápio',
  dica: 'Role para desmontar',
}

/** Rótulos da vista explodida (a ordem segue as camadas do hambúrguer do hero). */
export const anatomia = {
  titulo: 'Anatomia de um clássico',
  subtitulo: 'Sete camadas. Nenhum atalho.',
  camadas: [
    { camada: 'pao-topo', nome: 'Pão com gergelim', detalhe: 'Fermentação lenta, selado na manteiga' },
    { camada: 'bacon', nome: 'Bacon defumado', detalhe: 'Defumado na casa por 8 horas' },
    { camada: 'queijo', nome: 'Cheddar inglês', detalhe: 'Derretido sob a cúpula' },
    { camada: 'carne', nome: 'Blend 180 g', detalhe: 'Costela e acém, selado na brasa' },
    { camada: 'tomate', nome: 'Tomate', detalhe: 'Fatia grossa, sal grosso' },
    { camada: 'alface', nome: 'Alface americana', detalhe: 'Crocante, lavada no dia' },
    { camada: 'pao-base', nome: 'Base', detalhe: 'Tostada para segurar o suco' },
  ] satisfies { camada: Camada; nome: string; detalhe: string }[],
}

/** Camadas do hambúrguer do hero, de baixo para cima (sem os pães). */
export const burgerHero: { pao: Pao; camadas: Camada[] } = {
  pao: 'gergelim',
  camadas: ['alface', 'tomate', 'carne', 'queijo', 'bacon'],
}

export const sobre = {
  eyebrow: 'Nossa história',
  titulo: 'Nasceu na chapa.',
  paragrafos: confirmar('história da casa', [
    'Começou com uma chapa de ferro fundido, um saco de carvão e uma ideia teimosa: hambúrguer bom não tem atalho.',
    'A carne é moída todo dia. O pão sai do forno de madrugada. O bacon passa a noite no defumador. Cada lanche é montado na hora, na sua frente.',
    'Sem pressa. Sem congelado. Sem conversa fiada. Só fogo, ferro e respeito pelo que vai no prato.',
  ]),
  numeros: confirmar('números da casa', [
    { valor: 6, sufixo: '', rotulo: 'anos na brasa' },
    { valor: 120, sufixo: ' mil+', rotulo: 'hambúrgueres servidos' },
    { valor: 180, sufixo: ' g', rotulo: 'de blend moído no dia' },
    { valor: 8, sufixo: ' h', rotulo: 'de defumação do bacon' },
  ]),
  assinatura: 'Feito com fogo. Servido com orgulho.',
}

export const cardapio = {
  eyebrow: 'Cardápio',
  titulo: 'Escolha sua brasa.',
  subtitulo: 'Todos acompanham batata rústica. Peça pelo direct ou pelo WhatsApp.',
  categorias: [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'classicos', rotulo: 'Clássicos' },
    { id: 'smash', rotulo: 'Smash' },
    { id: 'especiais', rotulo: 'Especiais' },
  ],
  itens: confirmar<ItemCardapio[]>('cardápio e preços', [
    {
      id: 'brasa-classico',
      nome: 'Brasa Clássico',
      descricao: 'Blend 180 g na brasa, cheddar inglês, alface, tomate e molho da casa no pão com gergelim.',
      preco: 34.9,
      categoria: 'classicos',
      selo: 'Mais pedido',
      pao: 'gergelim',
      camadas: ['molho', 'carne', 'queijo', 'tomate', 'alface'],
    },
    {
      id: 'ferro-smash',
      nome: 'Ferro Smash',
      descricao: 'Dois smash de 90 g prensados no ferro, cheddar duplo, cebola na chapa e picles.',
      preco: 36.9,
      categoria: 'smash',
      pao: 'brioche',
      camadas: ['smash', 'queijo', 'smash', 'queijo', 'cebola', 'picles'],
    },
    {
      id: 'bacon-fumaca',
      nome: 'Bacon Fumaça',
      descricao: 'Blend 180 g, bacon defumado na casa, cheddar e barbecue de rapadura no pão australiano.',
      preco: 39.9,
      categoria: 'classicos',
      selo: 'Defumado na casa',
      pao: 'australiano',
      camadas: ['carne', 'queijo', 'bacon', 'molho'],
      molho: 'barbecue',
    },
    {
      id: 'chapa-quente',
      nome: 'Chapa Quente',
      descricao: 'Blend 180 g, queijo branco tostado, jalapeño e maionese de páprica defumada. Arde na medida.',
      preco: 37.9,
      categoria: 'especiais',
      selo: 'Picante',
      pao: 'brioche',
      camadas: ['carne', 'queijo-branco', 'jalapeno', 'molho', 'alface'],
      molho: 'paprica',
    },
    {
      id: 'ovo-na-brasa',
      nome: 'Ovo na Brasa',
      descricao: 'Blend 180 g, queijo prato, bacon, ovo com gema mole, alface e tomate.',
      preco: 38.9,
      categoria: 'especiais',
      pao: 'gergelim',
      camadas: ['carne', 'queijo', 'bacon', 'ovo', 'tomate', 'alface'],
    },
    {
      id: 'duplo-ferro',
      nome: 'Duplo Ferro',
      descricao: 'Dois blends de 150 g, cheddar duplo e bacon. Para quem chegou com fome de verdade.',
      preco: 46.9,
      categoria: 'classicos',
      selo: 'Para os fortes',
      pao: 'brioche',
      camadas: ['carne', 'queijo', 'carne', 'queijo', 'bacon'],
    },
    {
      id: 'smash-salada',
      nome: 'Smash Salada',
      descricao: 'Smash de 90 g, cheddar, alface, tomate, cebola roxa e maionese verde.',
      preco: 29.9,
      categoria: 'smash',
      pao: 'gergelim',
      camadas: ['molho', 'smash', 'queijo', 'cebola-roxa', 'tomate', 'alface'],
      molho: 'verde',
    },
    {
      id: 'verde-brasa',
      nome: 'Verde Brasa',
      descricao: 'Burger de grão-de-bico grelhado, queijo branco, tomate, alface e molho de ervas. Vegetariano.',
      preco: 32.9,
      categoria: 'especiais',
      selo: 'Vegetariano',
      pao: 'australiano',
      camadas: ['molho', 'veggie', 'queijo-branco', 'tomate', 'alface'],
      molho: 'ervas',
    },
  ]),
}

export const ingredientes = {
  eyebrow: 'Ingredientes',
  titulo: 'O que vai no fogo.',
  subtitulo: 'Seis escolhas que fazem a diferença na primeira mordida.',
  itens: confirmar('ingredientes e fornecedores', [
    {
      id: 'blend',
      nome: 'Blend da casa',
      texto: 'Costela e acém moídos todo dia, na proporção que levou dois anos para acertar. 180 g, ponto da casa.',
      destaque: 'Moído no dia',
    },
    {
      id: 'pao',
      nome: 'Pão de fermentação lenta',
      texto: 'Massa que descansa 12 horas. Sai do forno de madrugada e vai para a chapa com manteiga na hora de servir.',
      destaque: '12 h de fermentação',
    },
    {
      id: 'queijo',
      nome: 'Cheddar inglês',
      texto: 'Fatiado na casa e derretido sob a cúpula de ferro até escorrer pela borda da carne.',
      destaque: 'Derretido sob a cúpula',
    },
    {
      id: 'bacon',
      nome: 'Bacon defumado',
      texto: 'Barriga suína curada por três dias e defumada por oito horas em lenha de árvore frutífera.',
      destaque: '8 h no defumador',
    },
    {
      id: 'folhas',
      nome: 'Folhas e tomate',
      texto: 'De pequenos produtores da região, entregues duas vezes por semana. Lavados e cortados no dia.',
      destaque: 'Do produtor local',
    },
    {
      id: 'molho',
      nome: 'Molho da casa',
      texto: 'Maionese defumada com alho assado na brasa. A receita fica com a gente.',
      destaque: 'Receita guardada',
    },
  ]),
}

export const galeria = {
  eyebrow: 'Galeria',
  titulo: 'Direto da chapa.',
  subtitulo: 'Siga o fogo no Instagram.',
  /** As imagens ficam em /public/images/galeria (geradas por `npm run assets`). */
  itens: [
    { id: 'g-classico', legenda: 'Brasa Clássico, saindo agora', alt: 'Hambúrguer com gergelim, cheddar derretido, bacon, tomate e alface sobre fundo escuro', formato: 'retrato' },
    { id: 'g-chapa', legenda: 'Smash na chapa de ferro', alt: 'Três discos de carne selando na chapa de ferro com fumaça subindo', formato: 'paisagem' },
    { id: 'g-batata', legenda: 'Batata rústica, sal grosso', alt: 'Cone de papel com batatas fritas douradas', formato: 'quadrado' },
    { id: 'g-duplo', legenda: 'Duplo Ferro', alt: 'Hambúrguer duplo com duas carnes, cheddar e bacon em pão brioche', formato: 'retrato' },
    { id: 'g-anatomia', legenda: 'Camada por camada', alt: 'Hambúrguer desmontado com as camadas flutuando uma acima da outra', formato: 'retrato' },
    { id: 'g-onion', legenda: 'Onion rings na brasa', alt: 'Pilha de anéis de cebola empanados e dourados', formato: 'quadrado' },
    { id: 'g-dupla', legenda: 'Pra dividir (ou não)', alt: 'Dois hambúrgueres lado a lado sobre a chapa', formato: 'paisagem' },
    { id: 'g-bacon', legenda: 'Bacon Fumaça', alt: 'Hambúrguer em pão australiano escuro com bacon crocante e cheddar', formato: 'quadrado' },
  ] as const,
}

export const depoimentos = {
  eyebrow: 'Depoimentos',
  titulo: 'Quem provou, voltou.',
  /** EXEMPLOS. Troque por avaliações reais (Google, iFood) com autorização. */
  itens: confirmar('depoimentos reais', [
    { nome: 'Camila R.', origem: 'Google', nota: 5, texto: 'O melhor smash que já comi. A crosta da carne é outro nível. Voltei na mesma semana.' },
    { nome: 'Diego M.', origem: 'iFood', nota: 5, texto: 'Chegou quente, pão firme, nada encharcado. O bacon defumado vale o pedido sozinho.' },
    { nome: 'Juliana S.', origem: 'Instagram', nota: 5, texto: 'Atendimento rápido, lugar com clima e um hambúrguer que tem gosto de brasa de verdade.' },
    { nome: 'Rafael T.', origem: 'Google', nota: 5, texto: 'Pedi o Duplo Ferro achando que ia sobrar. Não sobrou nada. Nem a batata.' },
    { nome: 'Patrícia L.', origem: 'Google', nota: 5, texto: 'Finalmente um vegetariano que não é castigo. O Verde Brasa é muito bem feito.' },
  ]),
}

export const localizacao = {
  eyebrow: 'Onde estamos',
  titulo: 'A chapa tá quente.',
  subtitulo: 'Vem comer aqui ou peça para levar.',
}

export const rodape = {
  chamada: 'Tá com fome?',
  chamadaDestaque: 'A brasa tá acesa.',
  newsletterTitulo: 'Lançamentos e promoções primeiro',
  newsletterTexto: 'Um e-mail por mês. Sem spam, só fogo.',
  assinatura: 'Feito com fogo.',
}

// ---------------------------------------------------------------------------
// Utilidades derivadas
// ---------------------------------------------------------------------------

export function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Link de pedido: WhatsApp se houver número; senão, a DM do Instagram. */
export function linkPedido(mensagem: string = site.contato.mensagemPedido) {
  const numero = site.contato.whatsapp.replace(/\D/g, '')
  if (numero) return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
  return site.redes.instagram.dm
}

export function canalPedido() {
  return site.contato.whatsapp ? 'WhatsApp' : 'Instagram'
}

export function enderecoCompleto() {
  const e = site.endereco
  return `${e.rua} — ${e.bairro}, ${e.cidade} - ${e.uf}, ${e.cep}`
}

export function linkMapa() {
  const q = encodeURIComponent(`${site.nome}, ${enderecoCompleto()}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
