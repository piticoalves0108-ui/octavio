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
  nome: 'Delícias na Chapada',
  nomeCurto: 'Delícias',
  ramo: 'Hamburgueria artesanal',
  slogan: 'Carne de verdade. Fogo de verdade.',
  sloganLongo: 'Carne de verdade. Fogo de verdade. Sabor que não se explica — se prova.',
  descricaoSeo: confirmar(
    'descrição para o Google',
    'X-Tudo, X-Bacon, X-Picanha, X-Costela e mais: hambúrguer artesanal ou industrial feito na chapa. Peça pelo WhatsApp (62) 99687-1621.',
  ),

  /** Domínio final, sem barra no fim. Usado no canonical, OG e sitemap. */
  url: confirmar('domínio do site', 'https://deliciasnachapada.com.br'),
  idioma: 'pt-BR',
  corTema: '#0D0D0D',

  contato: {
    /** Só dígitos, com DDI e DDD (ex.: 5561999999999). Vazio = usa a DM do Instagram. */
    // O cliente passou "62 9687-1621" (formato antigo, de 8 dígitos). Todo celular
    // de DDD 62 hoje tem o 9 na frente: (62) 99687-1621. Confirmar com o dono.
    whatsapp: confirmar('WhatsApp (confirmar o 9 a mais)', '5562996871621'),
    /** Formato de exibição. */
    telefoneExibicao: '(62) 99687-1621',
    /** Para o link tel: e o schema (só dígitos, com +55). */
    telefoneInternacional: '+5562996871621',
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
    // Endereço do rodapé do cardápio enviado pelo cliente.
    rua: 'Rua 20, Qd. 26, Lt. 10B',
    bairro: 'Bairro Rodoviário',
    cidade: "São João d'Aliança",
    uf: 'GO',
    cep: confirmar('CEP', '73760-000'),
    referencia: 'Portal da Chapada dos Veadeiros',
    /** Coordenadas para o schema (centro da cidade; ajuste para o ponto exato). */
    geo: confirmar('latitude e longitude exatas', { lat: -14.7069, lng: -47.5244 }),
  },

  horarios: confirmar<Horario[]>('horário de funcionamento', [
    { dias: [2, 3, 4], rotulo: 'Terça a quinta', abre: '18:00', fecha: '23:00' },
    { dias: [5, 6], rotulo: 'Sexta e sábado', abre: '18:00', fecha: '24:00' },
    { dias: [0], rotulo: 'Domingo', abre: '18:00', fecha: '23:00' },
  ]),
  /** Texto para os dias sem horário cadastrado. */
  diaFechado: 'Segunda: chapa descansando',

  /**
   * Painel do dono (abre em /#painel): botões Aberto / Fechado com senha.
   * `url`: endereço do App da Web do Google Apps Script (painel/status.gs; passo a
   * passo no README). Vazio = modo demonstração: a mudança vale só no navegador
   * de quem clicou, com a senha `senhaDemo`.
   */
  painel: {
    url: 'https://script.google.com/macros/s/AKfycbzSjAF4_qW-aM3jMxFRuvEAJACyFQrKHkP-rppo8RgPV_vyGIvSxogtMufP3shtHHr-0Q/exec',
    senhaDemo: '1234',
    /** De quanto em quanto tempo o site confere se abriu ou fechou (ms). */
    intervalo: 30000,
  },

  /** Endpoint que recebe o POST da newsletter (Formspree, Mailchimp, etc.). Vazio = só simula. */
  newsletterEndpoint: confirmar('endpoint da newsletter', ''),

  faixaPreco: '$$',
} as const

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

const todasAsSecoes = [
  { id: 'sobre', rotulo: 'Sobre' },
  { id: 'cardapio', rotulo: 'Lanches' },
  { id: 'mais', rotulo: 'Mais pratos' },
  { id: 'ingredientes', rotulo: 'Ingredientes' },
  { id: 'galeria', rotulo: 'Galeria' },
  { id: 'depoimentos', rotulo: 'Depoimentos' },
  { id: 'onde', rotulo: 'Onde estamos' },
]

export const hero = {
  eyebrow: 'Hamburgueria artesanal',
  tituloLinha1: 'Carne de verdade.',
  tituloLinha2: 'Fogo de verdade.',
  subtitulo: 'Sabor que não se explica — se prova.',
  cta: 'Peça Agora',
  ctaSecundario: 'Mais pratos',
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
  paragrafos: confirmar('texto do Sobre', [
    'Delícias na Chapada é lanche de chapa do jeito que tem que ser: pão tostado, hambúrguer suculento e recheio que não economiza.',
    'No cardápio, os tradicionais de sempre, como X-Tudo, X-Bacon e X-Salada, e os artesanais da casa, como X-Costela, X-Picanha e X-Burguer da Terra.',
    'Nos tradicionais, você escolhe o hambúrguer: artesanal ou industrial. Escolheu? É só chamar no WhatsApp.',
  ]),
  // Números tirados do próprio cardápio (atualize se o cardápio mudar).
  numeros: [
    { valor: 10, sufixo: '', rotulo: 'lanches no cardápio' },
    { valor: 14, sufixo: '', rotulo: 'ingredientes no X-Tudo' },
    { valor: 6, sufixo: '', rotulo: 'adicionais para turbinar' },
    { valor: 2, sufixo: '', rotulo: 'opções de hambúrguer nos tradicionais' },
  ],
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
  titulo: 'O que vai na chapa.',
  subtitulo: 'Seis ingredientes que aparecem em quase todo o cardápio.',
  itens: [
    {
      id: 'blend',
      nome: 'Hambúrguer',
      texto: 'Nos tradicionais, você escolhe: artesanal ou industrial. No X-Costela, o hambúrguer é de costela.',
      destaque: 'Artesanal ou industrial',
    },
    {
      id: 'pao',
      nome: 'Pão',
      texto: 'Macio por dentro, tostado na chapa por fora, para segurar até os 14 ingredientes do X-Tudo.',
      destaque: 'Tostado na chapa',
    },
    {
      id: 'queijo',
      nome: 'Mussarela e cheddar',
      texto: 'Mussarela em quase todo o cardápio. No X-Caseirão, mussarela e cheddar juntos. No X-Burguer da Terra, creme de queijo.',
      destaque: 'Derretidos',
    },
    {
      id: 'bacon',
      nome: 'Bacon',
      texto: 'Em tiras, no X-Tudo, no X-Bacon, no X-Caseirão, no X-da Casa e no X-Burguer de Abacaxi. E ainda vira adicional.',
      destaque: 'Em 6 lanches',
    },
    {
      id: 'folhas',
      nome: 'Alface e tomate',
      texto: 'A dupla que deixa o lanche leve e fresco. Vai no X-Tudo, no X-Bacon, no X-Salada e no X-Caseirão.',
      destaque: 'Frescos',
    },
    {
      id: 'molho',
      nome: 'Molho',
      texto: 'O toque final que amarra tudo. Vai em 9 dos 10 lanches do cardápio.',
      destaque: 'Em 9 de 10 lanches',
    },
  ],
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

export interface Depoimento {
  nome: string
  origem: string
  nota: number
  texto: string
}

export const depoimentos = {
  eyebrow: 'Depoimentos',
  titulo: 'Quem provou, voltou.',
  /**
   * Avaliações REAIS de clientes (Google, iFood, Instagram), com autorização.
   * Enquanto a lista estiver vazia, a seção e o link do menu ficam escondidos.
   * Exemplo: { nome: 'Ana S.', origem: 'Google', nota: 5, texto: 'O X-Tudo é enorme!' }
   */
  itens: [] as Depoimento[],
}

/** Seções do menu (Depoimentos só aparece quando houver avaliações). */
export const navegacao = todasAsSecoes.filter((n) => n.id !== 'depoimentos' || depoimentos.itens.length > 0)

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
