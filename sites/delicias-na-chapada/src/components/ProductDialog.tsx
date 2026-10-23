/**
 * Janela do produto: escolhe as opções (tamanho, sabor, adicionais…),
 * escreve uma observação, define a quantidade e adiciona ao pedido.
 * No celular abre como uma folha que sobe da base da tela.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { produtos, type Grupo } from '../data/pedido'
import { formatarPreco } from '../data/site'
import { gruposPendentes, precoUnitario, selecaoInicial, useCarrinho, type Selecao } from '../lib/carrinho'
import { IconBag, IconClose, IconMinus, IconPlus } from './Icons'
import { Picture } from './Picture'

function ajuda(g: Grupo) {
  if (g.tipo === 'unica') return 'Escolha 1'
  if (g.max >= g.opcoes.length) return g.min ? `Escolha pelo menos ${g.min}` : 'Opcional'
  return `Até ${g.max}`
}

export function ProductDialog() {
  const { produtoAberto, fecharProduto, adicionar } = useCarrinho()
  const dialog = useRef<HTMLDialogElement>(null)
  const produto = produtoAberto ? produtos[produtoAberto] : null
  const [sel, setSel] = useState<Selecao>({})
  const [obs, setObs] = useState('')
  const [qtd, setQtd] = useState(1)
  const [tentou, setTentou] = useState(false)
  const uid = useId()

  // Abre/fecha o <dialog> conforme o estado e reinicia as escolhas.
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (produto) {
      setSel(selecaoInicial(produto))
      setObs('')
      setQtd(1)
      setTentou(false)
      if (!d.open) d.showModal()
    } else if (d.open) d.close()
  }, [produto])

  useEffect(() => {
    const d = dialog.current!
    const onClose = () => fecharProduto()
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [fecharProduto])

  const marcar = (g: Grupo, opcaoId: string, marcado: boolean) => {
    setSel((s) => {
      const atual = s[g.id] ?? []
      if (g.tipo === 'unica') return { ...s, [g.id]: [opcaoId] }
      if (marcado) return atual.length >= g.max ? s : { ...s, [g.id]: [...atual, opcaoId] }
      return { ...s, [g.id]: atual.filter((x) => x !== opcaoId) }
    })
  }

  const pendentes = produto ? gruposPendentes(produto, sel) : []
  const unit = produto ? precoUnitario(produto, sel) : 0

  const confirmar = () => {
    if (!produto) return
    if (pendentes.length) {
      setTentou(true)
      document.getElementById(`${uid}-${pendentes[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    adicionar(produto.id, sel, obs, qtd)
    dialog.current?.close()
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${uid}-titulo`}
      className="m-auto max-h-[92svh] w-[min(94vw,560px)] overflow-hidden rounded-[1.75rem] border border-white/10 bg-grafite p-0 text-creme shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] max-sm:mx-0 max-sm:mt-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
    >
      {produto && (
        <div className="flex max-h-[92svh] flex-col">
          {/* Cabeçalho */}
          <div className="relative flex gap-4 border-b border-white/[0.07] p-5 pr-14 md:p-6 md:pr-16">
            {produto.imagem && (
              <Picture
                pasta="cardapio"
                id={produto.imagem.id}
                larguras={[480]}
                sizes="96px"
                alt=""
                width={480}
                height={480}
                className="h-20 w-20 shrink-0 rounded-2xl bg-[radial-gradient(circle_at_50%_55%,rgba(224,110,40,0.3),transparent_70%)] md:h-24 md:w-24"
                imgClassName="h-full w-full object-contain"
              />
            )}
            <div className="min-w-0">
              <h2 id={`${uid}-titulo`} className="font-display text-4xl leading-none">
                {produto.nome}
              </h2>
              {produto.descricao && <p className="mt-2 text-sm leading-relaxed text-cinza">{produto.descricao}</p>}
              <p className="mt-2 font-display text-2xl text-ambar">{formatarPreco(unit)}</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-ambar hover:text-ambar"
              aria-label="Fechar"
            >
              <IconClose />
            </button>
          </div>

          {/* Opções */}
          <div className="scroll-thin flex-1 space-y-6 overflow-y-auto p-5 md:p-6" data-lenis-prevent>
            {produto.grupos?.map((g) => {
              const marcadas = sel[g.id] ?? []
              const faltando = tentou && marcadas.length < g.min
              return (
                <fieldset key={g.id} id={`${uid}-${g.id}`} aria-describedby={`${uid}-${g.id}-ajuda`}>
                  <legend className="flex w-full items-baseline justify-between gap-3">
                    <span className="font-display text-2xl leading-none">{g.titulo}</span>
                    <span
                      id={`${uid}-${g.id}-ajuda`}
                      className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase ${
                        faltando ? 'bg-brasa/20 text-[#ff8a7a]' : g.min ? 'bg-ambar/15 text-ambar-claro' : 'bg-white/5 text-cinza'
                      }`}
                    >
                      {faltando ? 'Obrigatório' : ajuda(g)}
                    </span>
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {g.opcoes.map((o) => {
                      const ativo = marcadas.includes(o.id)
                      const bloqueado = g.tipo === 'multipla' && !ativo && marcadas.length >= g.max
                      return (
                        <label
                          key={o.id}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
                            ativo ? 'border-ambar/70 bg-ambar/10' : 'border-white/10 hover:border-white/25'
                          } ${bloqueado ? 'cursor-not-allowed opacity-45' : ''}`}
                        >
                          <input
                            type={g.tipo === 'unica' ? 'radio' : 'checkbox'}
                            name={`${uid}-${g.id}`}
                            checked={ativo}
                            disabled={bloqueado}
                            onChange={(e) => marcar(g, o.id, e.currentTarget.checked)}
                            className="h-4 w-4 shrink-0 accent-[#e8a33d]"
                          />
                          <span className="flex-1 text-sm">{o.nome}</span>
                          {o.preco !== undefined && <span className="text-sm text-creme/80 tabular-nums">{formatarPreco(o.preco)}</span>}
                          {o.acrescimo ? <span className="text-sm text-ambar tabular-nums">+{formatarPreco(o.acrescimo)}</span> : null}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}

            <div>
              <label htmlFor={`${uid}-obs`} className="font-display text-2xl leading-none">
                Observação <span className="font-sans text-xs tracking-wide text-cinza uppercase">opcional</span>
              </label>
              <textarea
                id={`${uid}-obs`}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                maxLength={160}
                rows={2}
                placeholder="Ex.: sem cebola, bem passado…"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-creme placeholder:text-cinza/70 focus:border-ambar/70 focus:outline-none"
              />
            </div>
          </div>

          {/* Rodapé: quantidade + adicionar */}
          <div className="flex items-center gap-3 border-t border-white/[0.07] bg-carvao/60 p-4 md:p-5">
            <div className="flex items-center rounded-full border border-white/15" role="group" aria-label="Quantidade">
              <button type="button" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-full hover:text-ambar disabled:opacity-40" disabled={qtd <= 1} aria-label="Diminuir quantidade">
                <IconMinus width={18} height={18} />
              </button>
              <output className="w-6 text-center font-display text-2xl tabular-nums" aria-live="polite">
                {qtd}
              </output>
              <button type="button" onClick={() => setQtd((q) => Math.min(99, q + 1))} className="grid h-11 w-11 place-items-center rounded-full hover:text-ambar" aria-label="Aumentar quantidade">
                <IconPlus width={18} height={18} />
              </button>
            </div>
            <button type="button" onClick={confirmar} className="btn btn-primary flex-1 !min-h-12 !px-4">
              <span className="btn-label">
                <IconBag width={18} height={18} /> Adicionar · {formatarPreco(unit * qtd)}
              </span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
