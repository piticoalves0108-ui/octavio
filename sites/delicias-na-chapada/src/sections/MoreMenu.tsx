/**
 * MAIS PRATOS: porções, pastéis, massas, cachorro-quente, caldos e bebidas,
 * em abas. Cada item abre a janela de opções e entra no pedido.
 */
import { useRef, useState, type KeyboardEvent } from 'react'
import { categorias, faixaDePreco, type Produto } from '../data/pedido'
import { formatarPreco } from '../data/site'
import { useCarrinho } from '../lib/carrinho'
import { SectionHeading } from '../components/SectionHeading'
import { IconPlus } from '../components/Icons'

function precoTexto(p: Produto) {
  const tamanho = p.grupos?.find((g) => g.id === 'tamanho')
  if (tamanho) return tamanho.opcoes.map((o) => `${o.nome.charAt(0)} ${formatarPreco(o.preco ?? p.preco)}`).join(' · ')
  const { min, max } = faixaDePreco(p)
  return min === max ? formatarPreco(min) : `${formatarPreco(min)} a ${formatarPreco(max)}`
}

function detalhesOpcoes(p: Produto) {
  const g = p.grupos?.find((x) => x.id !== 'tamanho' && x.tipo === 'unica')
  if (!g || p.descricao) return null
  return `${g.titulo}: ${g.opcoes.map((o) => o.nome).join(', ')}`
}

export function MoreMenu() {
  const [ativa, setAtiva] = useState(categorias[0].id)
  const { abrirProduto } = useCarrinho()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const cat = categorias.find((c) => c.id === ativa)!

  // Setas do teclado trocam de aba (padrão WAI-ARIA).
  const teclas = (e: KeyboardEvent, i: number) => {
    const n = categorias.length
    const alvo = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (alvo < 0) return
    e.preventDefault()
    setAtiva(categorias[alvo].id)
    tabs.current[alvo]?.focus()
  }

  return (
    <section id="mais" aria-labelledby="mais-titulo" className="relative overflow-hidden py-24 md:py-32">
      <div aria-hidden className="smoke-css top-10 right-[-12%] h-[45vmax] w-[45vmax]" />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-8">
        <SectionHeading
          id="mais-titulo"
          eyebrow="Mais do cardápio"
          title="Tem mais na chapa."
          subtitle="Porções, pastéis, massas, caldos e bebidas. Toque no item para escolher as opções e adicionar ao pedido."
        />

        <div role="tablist" aria-label="Categorias" className="scroll-thin -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0" data-reveal>
          {categorias.map((c, i) => {
            const sel = c.id === ativa
            const qtd = c.secoes.reduce((s, x) => s + x.produtos.length, 0)
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                role="tab"
                id={`tab-${c.id}`}
                aria-selected={sel}
                aria-controls={`painel-${c.id}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => setAtiva(c.id)}
                onKeyDown={(e) => teclas(e, i)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-300 ${
                  sel ? 'border-ambar bg-ambar text-carvao shadow-[0_0_24px_-4px_rgba(232,163,61,0.6)]' : 'border-white/15 text-creme/80 hover:border-ambar/60 hover:text-creme'
                }`}
              >
                {c.titulo}
                <span className={`rounded-full px-1.5 text-[0.7rem] font-semibold ${sel ? 'bg-carvao/15' : 'bg-white/10'}`}>{qtd}</span>
              </button>
            )
          })}
        </div>

        <div key={cat.id} role="tabpanel" id={`painel-${cat.id}`} aria-labelledby={`tab-${cat.id}`} tabIndex={0} className="mt-8 animate-[painel_0.5s_var(--ease-brasa)] outline-none">
          {cat.nota && <p className="mb-6 text-sm text-ambar-claro">{cat.nota}</p>}
          <div className="space-y-10">
            {cat.secoes.map((s, si) => (
              <div key={si}>
                {s.titulo && <h3 className="mb-4 font-display text-3xl leading-none text-creme/90">{s.titulo}</h3>}
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {s.produtos.map((p) => {
                    const extra = detalhesOpcoes(p)
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => abrirProduto(p.id)}
                          className="metal metal-border group flex h-full w-full items-start gap-4 rounded-2xl p-5 text-left transition-transform duration-300 hover:-translate-y-0.5"
                          data-cursor-label="Pedir"
                          aria-label={`${p.nome}, ${precoTexto(p)}. Adicionar ao pedido`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-[1.65rem] leading-none text-creme">{p.nome}</span>
                            {(p.descricao || extra) && <span className="mt-1.5 block text-xs leading-relaxed text-cinza">{p.descricao ?? extra}</span>}
                            <span className="mt-3 block font-display text-xl text-ambar">{precoTexto(p)}</span>
                          </span>
                          <span
                            aria-hidden
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ambar/40 text-ambar transition-all duration-300 group-hover:border-ambar group-hover:bg-ambar group-hover:text-carvao group-hover:shadow-[0_0_24px_-4px_rgba(232,163,61,0.7)]"
                          >
                            <IconPlus width={20} height={20} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes painel { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
