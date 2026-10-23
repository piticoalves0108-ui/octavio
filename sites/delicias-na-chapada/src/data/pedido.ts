/**
 * ============================================================================
 *  CARDÁPIO COMPLETO PARA PEDIDOS
 * ============================================================================
 *  Cada produto tem um preço base e, quando precisa, grupos de opções:
 *   - "unica": escolhe uma (ex.: tamanho, sabor, molho). Uma opção com
 *     `preco` SUBSTITUI o preço base (ex.: porção grande, suco de laranja).
 *   - "multipla": marca várias, até `max` (ex.: adicionais). Uma opção com
 *     `acrescimo` SOMA ao preço.
 *
 *  Os lanches (com foto 3D) vêm de `cardapio` em site.ts. O resto foi copiado
 *  das fotos do cardápio enviadas pelo cliente.
 * ============================================================================
 */
import { cardapio, site, type ItemCardapio } from './site'

export interface Opcao {
  id: string
  nome: string
  /** Substitui o preço base do produto. */
  preco?: number
  /** Soma ao preço do produto. */
  acrescimo?: number
}

export interface Grupo {
  id: string
  titulo: string
  tipo: 'unica' | 'multipla'
  /** Mínimo de escolhas (unica: 1). */
  min: number
  /** Máximo de escolhas (unica: 1). */
  max: number
  /** Opções já marcadas ao abrir. */
  padrao?: string[]
  opcoes: Opcao[]
}

export interface Produto {
  id: string
  nome: string
  descricao?: string
  preco: number
  grupos?: Grupo[]
  /** Foto (gerada do 3D) dos lanches. */
  imagem?: { pasta: 'cardapio'; id: string }
}

export interface SecaoCardapio {
  titulo?: string
  produtos: Produto[]
}

export interface Categoria {
  id: string
  titulo: string
  nota?: string
  secoes: SecaoCardapio[]
}

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Grupo de escolha única com as opções no formato [nome, preço?]. */
function unica(id: string, titulo: string, opcoes: (string | [string, number])[], padrao?: string): Grupo {
  const ops = opcoes.map((o) => (Array.isArray(o) ? { id: slug(o[0]), nome: o[0], preco: o[1] } : { id: slug(o), nome: o }))
  return { id, titulo, tipo: 'unica', min: 1, max: 1, padrao: padrao ? [slug(padrao)] : undefined, opcoes: ops }
}

/** Grupo de várias escolhas, sem custo extra. */
function multipla(id: string, titulo: string, nomes: string[], max: number, opts: { min?: number; todasMarcadas?: boolean } = {}): Grupo {
  const opcoes = nomes.map((n) => ({ id: slug(n), nome: n }))
  return { id, titulo, tipo: 'multipla', min: opts.min ?? 0, max, padrao: opts.todasMarcadas ? opcoes.map((o) => o.id) : undefined, opcoes }
}

/** Porção com tamanho pequeno e grande. */
const porcao = (nome: string, pequena: number, grande: number): Produto => ({
  id: `porcao-${slug(nome)}`,
  nome,
  preco: pequena,
  grupos: [unica('tamanho', 'Tamanho', [['Pequena', pequena], ['Grande', grande]], 'Pequena')],
})

const simples = (prefixo: string, nome: string, preco: number, descricao?: string): Produto => ({
  id: `${prefixo}-${slug(nome)}`,
  nome,
  preco,
  descricao,
})

// ---------------------------------------------------------------------------
// Lanches (os mesmos cards 3D da seção Lanches)
// ---------------------------------------------------------------------------

const grupoAdicionais: Grupo = {
  id: 'adicionais',
  titulo: 'Adicionais',
  tipo: 'multipla',
  min: 0,
  max: cardapio.adicionais.length,
  opcoes: cardapio.adicionais.map((a) => ({
    id: slug(a.nome),
    nome: a.nome === 'Outros' ? 'Outro adicional (diga qual na observação)' : a.nome,
    acrescimo: a.preco,
  })),
}

export function lancheParaProduto(item: ItemCardapio): Produto {
  const grupos: Grupo[] = []
  if (item.precoIndustrial) {
    grupos.push(unica('hamburguer', 'Hambúrguer', [['Artesanal', item.preco], ['Industrial', item.precoIndustrial]], 'Artesanal'))
  }
  grupos.push(grupoAdicionais)
  return { id: item.id, nome: item.nome, descricao: item.descricao, preco: item.preco, grupos, imagem: { pasta: 'cardapio', id: item.id } }
}

const lanches = cardapio.itens.map(lancheParaProduto)

// ---------------------------------------------------------------------------
// Demais categorias (fotos do cardápio do cliente)
// ---------------------------------------------------------------------------

const sabores = ['Maracujá', 'Graviola', 'Limão', 'Cupuaçu', 'Acerola', 'Morango']

export const categorias: Categoria[] = [
  {
    id: 'porcoes',
    titulo: 'Porções',
    secoes: [
      {
        produtos: [
          porcao('Batata simples', 14, 17),
          porcao('Batata com mussarela', 15, 20),
          porcao('Batata com mussarela e bacon', 20, 25),
          porcao('Batata com cheddar', 15, 20),
          porcao('Batata com cheddar e bacon', 21, 26),
          simples('porcao', 'Carne seca com mandioca', 50, 'Porção de 500 g.'),
          {
            id: 'porcao-tambaqui-ou-tilapia',
            nome: 'Tambaqui ou tilápia',
            descricao: 'Porção de 500 g.',
            preco: 45,
            grupos: [unica('peixe', 'Peixe', ['Tambaqui', 'Tilápia'])],
          },
          simples('porcao', 'Frango frito', 35, 'Porção de 450 g.'),
        ],
      },
    ],
  },
  {
    id: 'pasteis',
    titulo: 'Pastéis',
    nota: 'Cada pastel tem 20 cm.',
    secoes: [
      {
        titulo: 'Tradicionais',
        produtos: [
          simples('pastel', 'Carne', 12),
          simples('pastel', 'Presunto com queijo', 14),
          simples('pastel', 'Queijo', 12),
          simples('pastel', 'Frango', 12),
        ],
      },
      {
        titulo: 'Especiais',
        produtos: [
          simples('pastel', 'Carne com queijo', 14),
          simples('pastel', 'Carne com catupiry', 14),
          simples('pastel', 'Frango com catupiry', 14),
          simples('pastel', 'Frango com queijo', 14),
          simples('pastel', 'Costela com queijo', 15),
          simples('pastel', 'Pastel à moda da casa', 16, 'Calabresa, presunto, carne, queijo, mussarela, catupiry e milho.'),
        ],
      },
      {
        titulo: 'Doces',
        produtos: [simples('pastel', 'Banana com queijo e canela', 14), simples('pastel', 'Nutella com queijo', 14)],
      },
    ],
  },
  {
    id: 'massas',
    titulo: 'Massas',
    secoes: [
      {
        produtos: [
          {
            id: 'massa-monte-seu-macarrao',
            nome: 'Monte seu macarrão',
            descricao: 'Escolha a massa, o molho, os queijos, as carnes e os acompanhamentos.',
            preco: 24.99,
            grupos: [
              unica('macarrao', 'Macarrão', ['Espaguete', 'Penne']),
              unica('molho', 'Molho', ['Vermelho', 'Branco', 'Rosé']),
              multipla('queijos', 'Queijos (até 2)', ['Mussarela', 'Parmesão'], 2, { todasMarcadas: true }),
              multipla('carnes', 'Carnes (até 3)', ['Carne', 'Frango', 'Bacon'], 3, { todasMarcadas: true }),
              multipla(
                'acompanhamentos',
                'Acompanhamentos',
                ['Alho', 'Cebola', 'Pimenta-do-reino', 'Milho', 'Tomate', 'Azeitona', 'Cogumelo', 'Palmito', 'Orégano', 'Manjericão'],
                10,
              ),
            ],
          },
          {
            id: 'massa-nhoque',
            nome: 'Nhoque 500 g',
            descricao: 'Com carne, queijo mussarela, parmesão e manjericão.',
            preco: 35,
            grupos: [unica('molho', 'Molho', ['Vermelho', 'Branco', 'Rosé'])],
          },
        ],
      },
    ],
  },
  {
    id: 'cachorro-quente',
    titulo: 'Cachorro-quente',
    secoes: [
      {
        produtos: [simples('hotdog', 'Cachorro-quente', 14.99, 'Salsicha, presunto, queijo mussarela, batata palha, milho, maionese e ketchup.')],
      },
    ],
  },
  {
    id: 'caldos',
    titulo: 'Caldos',
    secoes: [
      {
        produtos: [
          simples('caldo', 'Caldo de frango', 12),
          simples('caldo', 'Caldo de carne', 12),
          simples('caldo', 'Caldo de abóbora cabotiá', 12),
          simples('caldo', 'Mocotó com dobradinha', 14),
        ],
      },
    ],
  },
  {
    id: 'bebidas',
    titulo: 'Bebidas',
    secoes: [
      {
        titulo: 'Sucos e cremes',
        produtos: [
          {
            id: 'bebida-suco-natural',
            nome: 'Suco natural',
            preco: 8,
            grupos: [unica('sabor', 'Sabor', [...sabores.map((s) => [s, 8] as [string, number]), ['Laranja', 10], ['Manga', 8]])],
          },
          {
            id: 'bebida-creme',
            nome: 'Creme',
            preco: 10,
            grupos: [unica('sabor', 'Sabor', [...sabores, 'Manga'])],
          },
        ],
      },
      { titulo: 'Drinks', produtos: [simples('bebida', 'Caipirinha', 20)] },
      {
        titulo: 'Refrigerantes',
        produtos: [
          simples('bebida', 'Coca-Cola 1,5 L', 10),
          simples('bebida', 'Coca-Cola 2 L', 12),
          simples('bebida', 'Coca-Cola Zero 1,5 L', 12),
          simples('bebida', 'Guaraná 1,5 L', 9),
          simples('bebida', 'Guaraná 2 L', 9),
        ],
      },
      {
        titulo: 'Em lata',
        produtos: [simples('bebida', 'Coca-Cola lata', 5), simples('bebida', 'Guaraná lata', 5), simples('bebida', 'Fanta lata', 5)],
      },
    ],
  },
]

/** Todos os produtos, por id (lanches + demais categorias). */
export const produtos: Record<string, Produto> = Object.fromEntries(
  [...lanches, ...categorias.flatMap((c) => c.secoes.flatMap((s) => s.produtos))].map((p) => [p.id, p]),
)

/** Menor e maior preço possíveis (para mostrar "a partir de"). */
export function faixaDePreco(p: Produto) {
  const precos = [p.preco]
  for (const g of p.grupos ?? []) for (const o of g.opcoes) if (o.preco !== undefined) precos.push(o.preco)
  return { min: Math.min(...precos), max: Math.max(...precos) }
}

// ---------------------------------------------------------------------------
// Pedido: formas de entrega e de pagamento
// ---------------------------------------------------------------------------

export const formasDeEntrega = [
  { id: 'delivery', nome: 'Delivery', detalhe: 'Taxa de entrega combinada pelo WhatsApp' },
  { id: 'retirada', nome: 'Retirar no local', detalhe: `${site.endereco.rua}, ${site.endereco.bairro}` },
] as const

export const formasDePagamento = [
  { id: 'pix', nome: 'Pix' },
  { id: 'credito', nome: 'Cartão de crédito' },
  { id: 'debito', nome: 'Cartão de débito' },
  { id: 'dinheiro', nome: 'Dinheiro' },
] as const

export type FormaEntrega = (typeof formasDeEntrega)[number]['id']
export type FormaPagamento = (typeof formasDePagamento)[number]['id']
