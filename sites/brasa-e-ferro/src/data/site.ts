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
  // carnes
  | 'carne'
  | 'costela'
  | 'smash'
  | 'veggie'
  // queijos e cremes
  | 'queijo' // cheddar
  | 'mussarela'
  | 'queijo-branco'
  | 'creme-queijo'
  // frios e embutidos
  | 'bacon'
  | 'presunto'
  | 'salsicha'
  | 'calabresa'
  | 'carne-seca'
  | 'ovo'
  // vegetais, frutas e crocantes
  | 'alface'
  | 'tomate'
  | 'cebola'
  | 'cebola-roxa'
  | 'cebola-crispy'
  | 'aneis-cebola'
  | 'picles'
  | 'jalapeno'
  | 'abacaxi'
  | 'abacaxi-mel'
  | 'milho'
  | 'banana-terra'
  | 'batata-palha'
  | 'molho'

export type Pao = 'gergelim' | 'brioche' | 'australiano'

export interface ItemCardapio {
  id: string
  nome: string
  descricao: string
  /** Preço com hambúrguer artesanal (ou preço único). */
  preco: number
  /** Preço com hambúrguer industrial (só nos tradicionais). */
  precoIndustrial?: number
  categoria: 'tradicionais' | 'artesanais'
  selo?: string
  pao: Pao
  /** Camadas de baixo para cima, sem os pães (o pão vem de `pao`). */
  camadas: Camada[]
  /** Cor do molho no 3D: casa, barbecue, paprica, verde, ervas, creme-queijo. */
  molho?: 'casa' | 'barbecue' | 'paprica' | 'verde' | 'ervas' | 'creme-queijo'
}

export interface Adicional {
  nome: string
  preco: number
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
    'X-Tudo, X-Bacon, X-Picanha, X-Costela e mais: hambúrguer artesanal ou industrial feito na chapa. Peça pelo Instagram @delicias_nachapada.',
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

/** Rótulos da vista explodida, de cima para baixo (a mesma receita do X-Tudo do cardápio). */
export const anatomia = {
  titulo: 'Anatomia do X-Tudo',
  subtitulo: '14 ingredientes. Tudo no mesmo pão.',
  camadas: [
    { camada: 'pao-topo', nome: 'Pão', detalhe: 'Tostado na chapa' },
    { camada: 'batata-palha', nome: 'Batata palha', detalhe: 'Crocante' },
    { camada: 'milho', nome: 'Milho', detalhe: 'Milho verde' },
    { camada: 'abacaxi', nome: 'Abacaxi', detalhe: 'Fatia inteira' },
    { camada: 'ovo', nome: 'Ovo', detalhe: 'Frito na chapa' },
    { camada: 'salsicha', nome: 'Salsicha', detalhe: 'Em rodelas' },
    { camada: 'calabresa', nome: 'Calabresa', detalhe: 'Fatiada e grelhada' },
    { camada: 'bacon', nome: 'Bacon', detalhe: 'Em tiras' },
    { camada: 'presunto', nome: 'Presunto', detalhe: 'Fatia dobrada' },
    { camada: 'mussarela', nome: 'Mussarela', detalhe: 'Derretida' },
    { camada: 'carne', nome: 'Hambúrguer', detalhe: 'Artesanal ou industrial' },
    { camada: 'tomate', nome: 'Tomate', detalhe: 'Em rodelas' },
    { camada: 'alface', nome: 'Alface', detalhe: 'Fresca' },
    { camada: 'molho', nome: 'Molho', detalhe: 'Na base' },
    { camada: 'pao-base', nome: 'Pão (base)', detalhe: 'Segura tudo' },
  ] satisfies { camada: Camada; nome: string; detalhe: string }[],
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

/** Cardápio do perfil @delicias_nachapada (foto do cardápio enviada pelo cliente). */
export const cardapio = {
  eyebrow: 'Cardápio',
  titulo: 'Escolha sua brasa.',
  subtitulo: 'Os tradicionais saem com hambúrguer artesanal ou industrial. Peça pelo direct ou pelo WhatsApp.',
  categorias: [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'tradicionais', rotulo: 'Tradicionais' },
    { id: 'artesanais', rotulo: 'Artesanais' },
  ],
  itens: [
    // --- Hambúrguer tradicional (artesanal / industrial) ---
    {
      id: 'x-tudo',
      nome: 'X-Tudo',
      descricao: 'Pão, hambúrguer, mussarela, bacon, ovo, salsicha, calabresa, presunto, abacaxi, milho, tomate, alface, batata palha e molho.',
      preco: 24,
      precoIndustrial: 21,
      categoria: 'tradicionais',
      selo: '14 ingredientes',
      pao: 'gergelim',
      camadas: ['molho', 'alface', 'tomate', 'carne', 'mussarela', 'presunto', 'bacon', 'calabresa', 'salsicha', 'ovo', 'abacaxi', 'milho', 'batata-palha'],
      molho: 'casa',
    },
    {
      id: 'x-tudo-duplo',
      nome: 'X-Tudo Duplo',
      descricao: 'Pão, 2 hambúrgueres, mussarela, bacon, ovo, salsicha, calabresa, presunto, abacaxi, milho, tomate, alface, batata palha e molho.',
      preco: 26,
      precoIndustrial: 24,
      categoria: 'tradicionais',
      selo: '2 hambúrgueres',
      pao: 'gergelim',
      camadas: ['molho', 'alface', 'tomate', 'carne', 'mussarela', 'carne', 'presunto', 'bacon', 'calabresa', 'salsicha', 'ovo', 'abacaxi', 'milho', 'batata-palha'],
      molho: 'casa',
    },
    {
      id: 'x-bacon',
      nome: 'X-Bacon',
      descricao: 'Pão, hambúrguer, mussarela, bacon, ovo, cebola, tomate, alface e molho.',
      preco: 20,
      precoIndustrial: 18,
      categoria: 'tradicionais',
      pao: 'gergelim',
      camadas: ['molho', 'alface', 'tomate', 'carne', 'mussarela', 'bacon', 'ovo', 'cebola'],
      molho: 'casa',
    },
    {
      id: 'x-salada',
      nome: 'X-Salada',
      descricao: 'Pão, hambúrguer, mussarela, presunto, ovo, milho, tomate e alface.',
      preco: 20,
      precoIndustrial: 18,
      categoria: 'tradicionais',
      pao: 'gergelim',
      camadas: ['alface', 'tomate', 'carne', 'mussarela', 'presunto', 'ovo', 'milho'],
    },
    // --- Artesanais ---
    {
      id: 'x-caseirao',
      nome: 'X-Caseirão',
      descricao: 'Pão, 2 hambúrgueres, mussarela, bacon, cheddar, batata palha, tomate, alface e molho.',
      preco: 26,
      categoria: 'artesanais',
      selo: '2 hambúrgueres',
      pao: 'brioche',
      camadas: ['molho', 'alface', 'tomate', 'carne', 'queijo', 'carne', 'mussarela', 'bacon', 'batata-palha'],
      molho: 'casa',
    },
    {
      id: 'x-costela',
      nome: 'X-Costela',
      descricao: 'Pão, hambúrguer de costela, mussarela, tomate e molho.',
      preco: 32.9,
      categoria: 'artesanais',
      pao: 'brioche',
      camadas: ['molho', 'tomate', 'costela', 'mussarela'],
      molho: 'casa',
    },
    {
      id: 'x-burguer-da-terra',
      nome: 'X-Burguer da Terra',
      descricao: 'Pão, hambúrguer, banana-da-terra, carne seca, creme de queijo e molho.',
      preco: 38,
      categoria: 'artesanais',
      pao: 'brioche',
      camadas: ['molho', 'carne', 'creme-queijo', 'carne-seca', 'banana-terra'],
      molho: 'casa',
    },
    {
      id: 'x-picanha',
      nome: 'X-Picanha',
      descricao: 'Pão, hambúrguer, mussarela, cebola crispy e molho.',
      preco: 39.9,
      categoria: 'artesanais',
      pao: 'brioche',
      camadas: ['molho', 'carne', 'mussarela', 'cebola-crispy'],
      molho: 'casa',
    },
    {
      id: 'x-da-casa',
      nome: 'X-da Casa',
      descricao: 'Pão, hambúrguer, mussarela, bacon, anéis de cebola e molho.',
      preco: 22,
      categoria: 'artesanais',
      pao: 'brioche',
      camadas: ['molho', 'carne', 'mussarela', 'bacon', 'aneis-cebola'],
      molho: 'casa',
    },
    {
      id: 'x-burguer-de-abacaxi',
      nome: 'X-Burguer de Abacaxi',
      descricao: 'Pão, hambúrguer, creme de queijo, bacon, abacaxi com mel e molho.',
      preco: 36,
      categoria: 'artesanais',
      pao: 'brioche',
      camadas: ['molho', 'carne', 'creme-queijo', 'bacon', 'abacaxi-mel'],
      molho: 'casa',
    },
  ] satisfies ItemCardapio[] as ItemCardapio[],
  adicionaisTitulo: 'Adicionais',
  adicionaisTexto: 'Turbine qualquer lanche.',
  adicionais: [
    { nome: 'Carne', preco: 7 },
    { nome: 'Mussarela', preco: 5 },
    { nome: 'Presunto', preco: 5 },
    { nome: 'Bacon', preco: 5 },
    { nome: 'Salsicha', preco: 4 },
    { nome: 'Outros', preco: 3 },
  ] satisfies Adicional[] as Adicional[],
}

/** Hambúrguer do hero: o X-Tudo do cardápio (a anatomia lista as mesmas camadas). */
export const burgerHero = (() => {
  const x = cardapio.itens.find((i) => i.id === 'x-tudo')!
  return { pao: x.pao, camadas: x.camadas, molho: x.molho }
})()

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
    { id: 'g-classico', legenda: 'X-Tudo saindo da chapa', alt: 'X-Tudo com batata palha, milho, abacaxi, ovo, salsicha, calabresa, bacon, presunto, mussarela, hambúrguer, tomate e alface sobre a chapa', formato: 'retrato' },
    { id: 'g-chapa', legenda: 'Hambúrguer na chapa', alt: 'Três hambúrgueres selando na chapa de ferro com fumaça subindo', formato: 'paisagem' },
    { id: 'g-abacaxi', legenda: 'X-Burguer de Abacaxi', alt: 'Hambúrguer com creme de queijo, bacon e abacaxi com mel sobre a chapa', formato: 'quadrado' },
    { id: 'g-duplo', legenda: 'X-Tudo Duplo', alt: 'X-Tudo Duplo, com dois hambúrgueres e todos os ingredientes, sobre a chapa', formato: 'retrato' },
    { id: 'g-anatomia', legenda: 'Camada por camada', alt: 'X-Tudo desmontado, com as camadas flutuando uma acima da outra', formato: 'retrato' },
    { id: 'g-onion', legenda: 'Anéis de cebola do X-da Casa', alt: 'Pilha de anéis de cebola empanados e dourados', formato: 'quadrado' },
    { id: 'g-dupla', legenda: 'X-Caseirão e X-Picanha', alt: 'Dois hambúrgueres lado a lado sobre a chapa', formato: 'paisagem' },
    { id: 'g-bacon', legenda: 'X-Bacon', alt: 'X-Bacon com mussarela, bacon, ovo e cebola sobre a chapa', formato: 'quadrado' },
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
