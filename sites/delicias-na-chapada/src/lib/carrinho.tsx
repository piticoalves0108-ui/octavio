/**
 * Carrinho de pedidos.
 *
 * Guarda só o essencial de cada item (produto, opções escolhidas, observação e
 * quantidade). Nome, descrição e preço sempre vêm do cardápio atual, então um
 * preço alterado em pedido.ts vale também para carrinhos salvos no navegador.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { produtos, type Grupo, type Opcao, type Produto } from '../data/pedido'
import { getLenis } from './motion'

/** Opções marcadas por grupo: { tamanho: ['grande'], adicionais: ['bacon', 'carne'] } */
export type Selecao = Record<string, string[]>

export interface ItemCarrinho {
  key: string
  produtoId: string
  sel: Selecao
  obs: string
  qtd: number
}

export interface LinhaOpcao {
  grupo: string
  texto: string
}

export interface ItemDetalhado extends ItemCarrinho {
  produto: Produto
  linhas: LinhaOpcao[]
  precoUnit: number
  subtotal: number
}

const STORAGE = 'dnc-carrinho-v1'

// ---------------------------------------------------------------------------
// Preço e validação
// ---------------------------------------------------------------------------

function opcoesMarcadas(g: Grupo, sel: Selecao): Opcao[] {
  const ids = sel[g.id] ?? []
  return g.opcoes.filter((o) => ids.includes(o.id))
}

/** Preço de uma unidade com as opções escolhidas. */
export function precoUnitario(p: Produto, sel: Selecao) {
  let base = p.preco
  let extra = 0
  for (const g of p.grupos ?? []) {
    for (const o of opcoesMarcadas(g, sel)) {
      if (o.preco !== undefined) base = o.preco
      if (o.acrescimo) extra += o.acrescimo
    }
  }
  return Math.round((base + extra) * 100) / 100
}

/** Seleção inicial: opções-padrão de cada grupo. */
export function selecaoInicial(p: Produto): Selecao {
  const sel: Selecao = {}
  for (const g of p.grupos ?? []) sel[g.id] = [...(g.padrao ?? [])]
  return sel
}

/** Grupos que ainda não têm o mínimo de escolhas. */
export function gruposPendentes(p: Produto, sel: Selecao) {
  return (p.grupos ?? []).filter((g) => (sel[g.id]?.length ?? 0) < g.min)
}

/** Texto das opções escolhidas, por grupo (para o carrinho e o WhatsApp). */
export function linhasDoItem(p: Produto, sel: Selecao, formatar: (v: number) => string): LinhaOpcao[] {
  const linhas: LinhaOpcao[] = []
  for (const g of p.grupos ?? []) {
    const ops = opcoesMarcadas(g, sel)
    if (!ops.length) continue
    const texto = ops.map((o) => (o.acrescimo ? `${o.nome} (+${formatar(o.acrescimo)})` : o.nome)).join(', ')
    linhas.push({ grupo: g.titulo.replace(/\s*\(.*\)$/, ''), texto })
  }
  return linhas
}

function chave(produtoId: string, sel: Selecao, obs: string) {
  const ordenada = Object.keys(sel)
    .sort()
    .map((k) => `${k}:${[...sel[k]].sort().join('+')}`)
    .join('|')
  return `${produtoId}#${ordenada}#${obs.trim().toLowerCase()}`
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface CarrinhoCtx {
  itens: ItemCarrinho[]
  quantidade: number
  total: number
  detalhar: (formatar: (v: number) => string) => ItemDetalhado[]
  adicionar: (produtoId: string, sel: Selecao, obs: string, qtd: number) => void
  alterarQtd: (key: string, delta: number) => void
  remover: (key: string) => void
  limpar: () => void
  produtoAberto: string | null
  abrirProduto: (id: string) => void
  fecharProduto: () => void
  carrinhoAberto: boolean
  abrirCarrinho: () => void
  fecharCarrinho: () => void
  /** Último item adicionado (para o aviso "adicionado ao pedido"). */
  aviso: { nome: string; id: number } | null
}

const Ctx = createContext<CarrinhoCtx | null>(null)

export function useCarrinho() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCarrinho fora do CarrinhoProvider')
  return c
}

function carregar(): ItemCarrinho[] {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return []
    const lista = JSON.parse(raw) as ItemCarrinho[]
    // Descarta itens de produtos que saíram do cardápio.
    return Array.isArray(lista) ? lista.filter((i) => produtos[i.produtoId] && i.qtd > 0) : []
  } catch {
    return []
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [pronto, setPronto] = useState(false)
  const [produtoAberto, setProdutoAberto] = useState<string | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [aviso, setAviso] = useState<CarrinhoCtx['aviso']>(null)

  // Carrega depois da hidratação (o HTML pré-renderizado começa com o carrinho vazio).
  useEffect(() => {
    setItens(carregar())
    setPronto(true)
  }, [])

  useEffect(() => {
    if (!pronto) return
    try {
      localStorage.setItem(STORAGE, JSON.stringify(itens))
    } catch {
      /* navegação privada ou armazenamento bloqueado: segue sem salvar */
    }
  }, [itens, pronto])

  // Pausa o smooth scroll enquanto uma janela estiver aberta.
  useEffect(() => {
    const lenis = getLenis()
    if (produtoAberto || carrinhoAberto) lenis?.stop()
    else lenis?.start()
  }, [produtoAberto, carrinhoAberto])

  const adicionar = useCallback((produtoId: string, sel: Selecao, obs: string, qtd: number) => {
    const key = chave(produtoId, sel, obs)
    setItens((atual) => {
      const existe = atual.find((i) => i.key === key)
      if (existe) return atual.map((i) => (i.key === key ? { ...i, qtd: i.qtd + qtd } : i))
      return [...atual, { key, produtoId, sel, obs: obs.trim(), qtd }]
    })
    setAviso({ nome: produtos[produtoId]?.nome ?? 'Item', id: Date.now() })
  }, [])

  const alterarQtd = useCallback((key: string, delta: number) => {
    setItens((atual) => atual.map((i) => (i.key === key ? { ...i, qtd: Math.max(1, Math.min(99, i.qtd + delta)) } : i)))
  }, [])

  const remover = useCallback((key: string) => setItens((atual) => atual.filter((i) => i.key !== key)), [])
  const limpar = useCallback(() => setItens([]), [])

  const valor = useMemo<CarrinhoCtx>(() => {
    const total = itens.reduce((s, i) => s + precoUnitario(produtos[i.produtoId], i.sel) * i.qtd, 0)
    return {
      itens,
      quantidade: itens.reduce((s, i) => s + i.qtd, 0),
      total: Math.round(total * 100) / 100,
      detalhar: (formatar) =>
        itens.map((i) => {
          const produto = produtos[i.produtoId]
          const precoUnit = precoUnitario(produto, i.sel)
          return { ...i, produto, linhas: linhasDoItem(produto, i.sel, formatar), precoUnit, subtotal: Math.round(precoUnit * i.qtd * 100) / 100 }
        }),
      adicionar,
      alterarQtd,
      remover,
      limpar,
      produtoAberto,
      abrirProduto: (id) => {
        setCarrinhoAberto(false)
        setProdutoAberto(id)
      },
      fecharProduto: () => setProdutoAberto(null),
      carrinhoAberto,
      abrirCarrinho: () => {
        setProdutoAberto(null)
        setCarrinhoAberto(true)
      },
      fecharCarrinho: () => setCarrinhoAberto(false),
      aviso,
    }
  }, [itens, adicionar, alterarQtd, remover, limpar, produtoAberto, carrinhoAberto, aviso])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
