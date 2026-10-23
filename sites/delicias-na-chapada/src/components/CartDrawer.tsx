/**
 * Carrinho + finalização do pedido.
 * Lista os itens (quantidade, remover), pede nome, entrega ou retirada,
 * endereço e pagamento, e abre o WhatsApp com o pedido completo.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { formasDeEntrega, formasDePagamento } from '../data/pedido'
import { canalPedido, formatarPreco, site } from '../data/site'
import { useCarrinho } from '../lib/carrinho'
import { dadosVazios, lerValor, linkDoPedido, mensagemPedido, type DadosPedido } from '../lib/mensagem'
import { scrollToId } from '../lib/motion'
import { IconBag, IconCheck, IconClose, IconMinus, IconPlus, IconTrash, IconWhatsApp } from './Icons'

const STORAGE_DADOS = 'dnc-dados-v1'

type Erros = Partial<Record<keyof DadosPedido, string>>

function validar(d: DadosPedido): Erros {
  const e: Erros = {}
  if (!d.nome.trim()) e.nome = 'Diga seu nome.'
  if (!d.entrega) e.entrega = 'Escolha delivery ou retirada.'
  if (d.entrega === 'delivery') {
    if (!d.endereco.trim()) e.endereco = 'Informe rua e número.'
    if (!d.bairro.trim()) e.bairro = 'Informe o bairro.'
  }
  if (!d.pagamento) e.pagamento = 'Escolha a forma de pagamento.'
  return e
}

const campo =
  'mt-1.5 w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-creme placeholder:text-cinza/70 focus:border-ambar/70 focus:outline-none'

export function CartDrawer() {
  const { carrinhoAberto, fecharCarrinho, detalhar, total, quantidade, alterarQtd, remover, limpar } = useCarrinho()
  const dialog = useRef<HTMLDialogElement>(null)
  const [dados, setDados] = useState<DadosPedido>(dadosVazios)
  const [erros, setErros] = useState<Erros>({})
  const [enviado, setEnviado] = useState<string | null>(null)
  const uid = useId()
  const itens = detalhar(formatarPreco)

  // Lembra nome, endereço e pagamento para o próximo pedido.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_DADOS)
      if (salvo) setDados({ ...dadosVazios, ...JSON.parse(salvo), troco: '', obs: '' })
    } catch {
      /* sem armazenamento: começa vazio */
    }
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (carrinhoAberto && !d.open) {
      setEnviado(null)
      d.showModal()
    }
    if (!carrinhoAberto && d.open) d.close()
  }, [carrinhoAberto])

  useEffect(() => {
    const d = dialog.current!
    const onClose = () => fecharCarrinho()
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [fecharCarrinho])

  const set = <K extends keyof DadosPedido>(k: K, v: DadosPedido[K]) => {
    setDados((d) => ({ ...d, [k]: v }))
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }))
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const errs = validar(dados)
    setErros(errs)
    const primeiro = Object.keys(errs)[0]
    if (primeiro) {
      const el = document.getElementById(`${uid}-${primeiro}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }
    const msg = mensagemPedido(itens, total, dados)
    const link = linkDoPedido(msg)
    try {
      const { nome, entrega, endereco, bairro, complemento, pagamento } = dados
      localStorage.setItem(STORAGE_DADOS, JSON.stringify({ nome, entrega, endereco, bairro, complemento, pagamento }))
    } catch {
      /* ignora */
    }
    // Sem WhatsApp configurado, o link vai para o direct (que não aceita texto): copia o pedido.
    if (!site.contato.whatsapp) navigator.clipboard?.writeText(msg).catch(() => undefined)
    window.open(link, '_blank', 'noopener')
    setEnviado(link)
  }

  const fechar = () => dialog.current?.close()
  const erro = (k: keyof DadosPedido) =>
    erros[k] ? (
      <p id={`${uid}-${k}-erro`} className="mt-1.5 text-xs text-[#ff8a7a]">
        {erros[k]}
      </p>
    ) : null
  const borda = (k: keyof DadosPedido) => (erros[k] ? 'border-[#ff8a7a]/70' : 'border-white/10')

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${uid}-titulo`}
      className="m-0 ml-auto h-[100dvh] max-h-none w-[min(100vw,480px)] max-w-none overflow-hidden border-l border-white/10 bg-grafite p-0 text-creme shadow-[0_0_120px_rgba(0,0,0,0.8)]"
      onClick={(e) => e.target === dialog.current && fechar()}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 md:px-6">
          <div>
            <p className="eyebrow">Seu pedido</p>
            <h2 id={`${uid}-titulo`} className="mt-1 font-display text-4xl leading-none">
              {quantidade ? `${quantidade} ${quantidade === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
            </h2>
          </div>
          <button type="button" onClick={fechar} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-ambar hover:text-ambar" aria-label="Fechar carrinho">
            <IconClose />
          </button>
        </div>

        {enviado ? (
          // Confirmação depois de abrir o WhatsApp
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <IconCheck width={30} height={30} />
            </span>
            <h3 className="font-display text-4xl leading-none">Pedido pronto!</h3>
            <p className="max-w-xs text-sm text-cinza">
              Abrimos o {canalPedido()} com o seu pedido. É só tocar em <strong className="text-creme">enviar</strong> por lá.
              {!site.contato.whatsapp && ' O texto do pedido foi copiado: cole na conversa.'}
            </p>
            <a href={enviado} target="_blank" rel="noopener" className="link-ember text-sm text-ambar-claro">
              O {canalPedido()} não abriu? Toque aqui.
            </a>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setEnviado(null)}>
                <span className="btn-label">Voltar ao pedido</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  limpar()
                  fechar()
                }}
              >
                <span className="btn-label">Novo pedido</span>
              </button>
            </div>
          </div>
        ) : quantidade === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/5 text-cinza">
              <IconBag width={28} height={28} />
            </span>
            <p className="max-w-xs text-cinza">Seu pedido está vazio. Escolha um lanche, uma porção ou uma bebida no cardápio.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                fechar()
                window.setTimeout(() => scrollToId('cardapio'), 80)
              }}
            >
              <span className="btn-label">Ver cardápio</span>
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5 md:px-6" data-lenis-prevent>
              {/* Itens */}
              <ul className="space-y-3">
                {itens.map((i) => (
                  <li key={i.key} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-2xl leading-none">{i.produto.nome}</p>
                        {i.linhas.map((l) => (
                          <p key={l.grupo} className="mt-1 text-xs text-cinza">
                            <span className="text-creme/70">{l.grupo}:</span> {l.texto}
                          </p>
                        ))}
                        {i.obs && <p className="mt-1 text-xs text-cinza italic">Obs.: {i.obs}</p>}
                      </div>
                      <button type="button" onClick={() => remover(i.key)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-cinza transition-colors hover:bg-brasa/15 hover:text-[#ff8a7a]" aria-label={`Remover ${i.produto.nome}`}>
                        <IconTrash width={17} height={17} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-white/15" role="group" aria-label={`Quantidade de ${i.produto.nome}`}>
                        <button type="button" onClick={() => alterarQtd(i.key, -1)} disabled={i.qtd <= 1} className="grid h-9 w-9 place-items-center rounded-full hover:text-ambar disabled:opacity-40" aria-label="Diminuir">
                          <IconMinus width={16} height={16} />
                        </button>
                        <span className="w-6 text-center font-display text-xl tabular-nums">{i.qtd}</span>
                        <button type="button" onClick={() => alterarQtd(i.key, 1)} className="grid h-9 w-9 place-items-center rounded-full hover:text-ambar" aria-label="Aumentar">
                          <IconPlus width={16} height={16} />
                        </button>
                      </div>
                      <p className="text-right">
                        {i.qtd > 1 && <span className="mr-2 text-xs text-cinza">{formatarPreco(i.precoUnit)} cada</span>}
                        <span className="font-display text-2xl text-ambar">{formatarPreco(i.subtotal)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Dados do pedido */}
              <div className="mt-8 space-y-6">
                <div>
                  <label htmlFor={`${uid}-nome`} className="text-sm font-semibold">
                    Seu nome
                  </label>
                  <input
                    id={`${uid}-nome`}
                    value={dados.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    autoComplete="name"
                    aria-invalid={Boolean(erros.nome)}
                    aria-describedby={erros.nome ? `${uid}-nome-erro` : undefined}
                    className={`${campo} ${borda('nome')}`}
                  />
                  {erro('nome')}
                </div>

                <fieldset id={`${uid}-entrega`} tabIndex={-1} aria-describedby={erros.entrega ? `${uid}-entrega-erro` : undefined} className="outline-none">
                  <legend className="text-sm font-semibold">Como quer receber?</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {formasDeEntrega.map((f) => (
                      <label
                        key={f.id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors ${
                          dados.entrega === f.id ? 'border-ambar/70 bg-ambar/10' : `${borda('entrega')} hover:border-white/25`
                        }`}
                      >
                        <input type="radio" name={`${uid}-entrega-r`} checked={dados.entrega === f.id} onChange={() => set('entrega', f.id)} className="mt-0.5 h-4 w-4 accent-[#e8a33d]" />
                        <span>
                          <span className="block text-sm font-semibold">{f.nome}</span>
                          <span className="block text-xs text-cinza">{f.detalhe}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {erro('entrega')}
                </fieldset>

                {dados.entrega === 'delivery' && (
                  <div className="space-y-4 rounded-2xl border border-white/[0.08] p-4">
                    <div>
                      <label htmlFor={`${uid}-endereco`} className="text-sm font-semibold">
                        Rua e número
                      </label>
                      <input id={`${uid}-endereco`} value={dados.endereco} onChange={(e) => set('endereco', e.target.value)} autoComplete="street-address" aria-invalid={Boolean(erros.endereco)} aria-describedby={erros.endereco ? `${uid}-endereco-erro` : undefined} className={`${campo} ${borda('endereco')}`} />
                      {erro('endereco')}
                    </div>
                    <div>
                      <label htmlFor={`${uid}-bairro`} className="text-sm font-semibold">
                        Bairro
                      </label>
                      <input id={`${uid}-bairro`} value={dados.bairro} onChange={(e) => set('bairro', e.target.value)} aria-invalid={Boolean(erros.bairro)} aria-describedby={erros.bairro ? `${uid}-bairro-erro` : undefined} className={`${campo} ${borda('bairro')}`} />
                      {erro('bairro')}
                    </div>
                    <div>
                      <label htmlFor={`${uid}-complemento`} className="text-sm font-semibold">
                        Complemento ou referência <span className="font-normal text-cinza">(opcional)</span>
                      </label>
                      <input id={`${uid}-complemento`} value={dados.complemento} onChange={(e) => set('complemento', e.target.value)} className={`${campo} border-white/10`} />
                    </div>
                  </div>
                )}

                <fieldset id={`${uid}-pagamento`} tabIndex={-1} aria-describedby={erros.pagamento ? `${uid}-pagamento-erro` : undefined} className="outline-none">
                  <legend className="text-sm font-semibold">Forma de pagamento</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {formasDePagamento.map((f) => (
                      <label
                        key={f.id}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                          dados.pagamento === f.id ? 'border-ambar/70 bg-ambar/10' : `${borda('pagamento')} hover:border-white/25`
                        }`}
                      >
                        <input type="radio" name={`${uid}-pagamento-r`} checked={dados.pagamento === f.id} onChange={() => set('pagamento', f.id)} className="h-4 w-4 accent-[#e8a33d]" />
                        {f.nome}
                      </label>
                    ))}
                  </div>
                  {erro('pagamento')}
                </fieldset>

                {dados.pagamento === 'dinheiro' && (
                  <div>
                    <label htmlFor={`${uid}-troco`} className="text-sm font-semibold">
                      Troco para quanto? <span className="font-normal text-cinza">(deixe vazio se não precisar)</span>
                    </label>
                    <input id={`${uid}-troco`} value={dados.troco} onChange={(e) => set('troco', e.target.value)} inputMode="decimal" placeholder="Ex.: 100" className={`${campo} border-white/10`} />
                    {lerValor(dados.troco) !== null && lerValor(dados.troco)! < total && <p className="mt-1.5 text-xs text-ambar-claro">O valor é menor que o total do pedido ({formatarPreco(total)}).</p>}
                  </div>
                )}

                <div>
                  <label htmlFor={`${uid}-obs`} className="text-sm font-semibold">
                    Observações <span className="font-normal text-cinza">(opcional)</span>
                  </label>
                  <textarea id={`${uid}-obs`} value={dados.obs} onChange={(e) => set('obs', e.target.value)} rows={2} maxLength={240} className={`${campo} resize-none border-white/10`} />
                </div>
              </div>
            </div>

            {/* Total + enviar */}
            <div className="border-t border-white/[0.07] bg-carvao/70 px-5 py-4 md:px-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-cinza">Total{dados.entrega === 'delivery' ? ' (sem a entrega)' : ''}</span>
                <span className="font-display text-4xl text-ambar">{formatarPreco(total)}</span>
              </div>
              <button type="submit" className="btn btn-primary mt-3 w-full !min-h-14 text-base">
                <span className="btn-label">
                  <IconWhatsApp /> Enviar pedido no {canalPedido()}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
