/**
 * Painel do dono: abre no endereço do site + "#painel" (ou pelo link
 * "Área do dono" no rodapé). Pede a senha e mostra dois botões: Aberto e
 * Fechado. O site inteiro passa a mostrar o status escolhido.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { site } from '../data/site'
import { getLenis } from '../lib/motion'
import { useStatus } from '../lib/status'
import { IconCheck, IconClose } from './Icons'
import { LogoMark } from './Logo'

const HASH = '#painel'

function hora(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function OwnerPanel() {
  const { aberto, manual, atualizado, demo, entrar, definir } = useStatus()
  const dialog = useRef<HTMLDialogElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [visivel, setVisivel] = useState(false)
  const [senha, setSenha] = useState('')
  const [logado, setLogado] = useState(false)
  const [carregando, setCarregando] = useState<'entrar' | 'aberto' | 'fechado' | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const uid = useId()

  // Abre quando o endereço termina em #painel.
  useEffect(() => {
    const ver = () => setVisivel(location.hash === HASH)
    ver()
    window.addEventListener('hashchange', ver)
    return () => window.removeEventListener('hashchange', ver)
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (visivel && !d.open) {
      d.showModal()
      getLenis()?.stop()
      window.setTimeout(() => campo.current?.focus(), 50)
    }
    if (!visivel && d.open) d.close()
  }, [visivel])

  useEffect(() => {
    const d = dialog.current!
    const onClose = () => {
      setVisivel(false)
      getLenis()?.start()
      if (location.hash === HASH) history.replaceState(null, '', location.pathname + location.search)
    }
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  const login = async (e: FormEvent) => {
    e.preventDefault()
    if (!senha) {
      setErro('Digite a senha.')
      return
    }
    setCarregando('entrar')
    setErro('')
    const r = await entrar(senha)
    setCarregando(null)
    if (r.ok) setLogado(true)
    else {
      setErro(r.erro ?? 'Senha incorreta.')
      campo.current?.select()
    }
  }

  const mudar = async (novo: boolean) => {
    setCarregando(novo ? 'aberto' : 'fechado')
    setErro('')
    setAviso('')
    const r = await definir(novo, senha)
    setCarregando(null)
    if (r.ok) setAviso(novo ? 'Pronto! O site agora mostra que a loja está ABERTA.' : 'Pronto! O site agora mostra que a loja está FECHADA.')
    else setErro(r.erro ?? 'Não foi possível salvar.')
  }

  const sair = () => {
    setLogado(false)
    setSenha('')
    setAviso('')
    setErro('')
  }

  const fechar = () => dialog.current?.close()
  const quando = hora(atualizado)
  // O site só mostra aberto/fechado depois que o dono escolhe aqui.
  const atual = manual ? aberto : null

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${uid}-titulo`}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-carvao/95 p-0 text-creme backdrop-blur-xl"
    >
      <div className="flex min-h-full items-center justify-center overflow-y-auto p-5" data-lenis-prevent>
        <div className="metal metal-border relative w-full max-w-md rounded-[2rem] p-7 md:p-9">
          <button type="button" onClick={fechar} className="absolute top-5 right-5 grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-ambar hover:text-ambar" aria-label="Fechar o painel e voltar ao site">
            <IconClose />
          </button>

          <div className="flex items-center gap-3 pr-12">
            <LogoMark className="h-12 w-12 shrink-0 text-creme" />
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-ambar uppercase">{site.nome}</p>
              <h2 id={`${uid}-titulo`} className="font-display text-4xl leading-none">
                Painel do dono
              </h2>
            </div>
          </div>

          {demo && (
            <p className="mt-6 rounded-2xl border border-ambar/30 bg-ambar/10 p-4 text-sm leading-relaxed text-ambar-claro">
              <strong className="text-creme">Modo demonstração.</strong> A mudança aparece só neste navegador. Senha de teste:{' '}
              <strong className="text-creme">{site.painel.senhaDemo}</strong>. Para valer para todos os clientes, configure o painel (veja o README).
            </p>
          )}

          {!logado ? (
            <form onSubmit={login} noValidate className="mt-7">
              <label htmlFor={`${uid}-senha`} className="text-sm font-semibold">
                Senha
              </label>
              <input
                ref={campo}
                id={`${uid}-senha`}
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value)
                  setErro('')
                }}
                autoComplete="current-password"
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? `${uid}-erro` : undefined}
                className={`mt-1.5 w-full rounded-xl border bg-white/[0.03] px-4 py-3.5 text-creme focus:border-ambar/70 focus:outline-none ${erro ? 'border-[#ff8a7a]/70' : 'border-white/10'}`}
              />
              {erro && (
                <p id={`${uid}-erro`} role="alert" className="mt-2 text-sm text-[#ff8a7a]">
                  {erro}
                </p>
              )}
              <button type="submit" className="btn btn-primary mt-5 w-full !min-h-14" disabled={carregando === 'entrar'} aria-busy={carregando === 'entrar'}>
                <span className="btn-label">
                  {carregando === 'entrar' && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-carvao/30 border-t-carvao" />}
                  {carregando === 'entrar' ? 'Entrando…' : 'Entrar'}
                </span>
              </button>
            </form>
          ) : (
            <div className="mt-7">
              <p className="text-sm text-cinza">Agora o site mostra:</p>
              <p className={`mt-1 font-display text-5xl leading-none ${atual ? 'text-emerald-300' : atual === false ? 'text-[#ff8a7a]' : 'text-cinza'}`}>
                {atual === null ? 'Nada ainda' : atual ? 'Aberto' : 'Fechado'}
              </p>
              <p className="mt-1 text-xs text-cinza">
                {atual === null ? 'Escolha abaixo para o site mostrar se a loja está aberta.' : quando ? `Alterado em ${quando}` : 'Escolhido no painel'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Status da loja">
                <button
                  type="button"
                  onClick={() => mudar(true)}
                  disabled={carregando !== null}
                  aria-pressed={atual === true}
                  className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-display text-3xl tracking-wide transition-all duration-300 disabled:cursor-wait ${
                    atual === true
                      ? 'border-emerald-400 bg-emerald-500 text-carvao shadow-[0_0_40px_-8px_rgba(52,211,153,0.7)]'
                      : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10'
                  }`}
                >
                  {carregando === 'aberto' ? <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : 'Aberto'}
                  <span className="font-sans text-[0.7rem] font-semibold tracking-wider uppercase opacity-80">{atual === true ? 'Agora' : 'Abrir a loja'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => mudar(false)}
                  disabled={carregando !== null}
                  aria-pressed={atual === false}
                  className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-display text-3xl tracking-wide transition-all duration-300 disabled:cursor-wait ${
                    atual === false
                      ? 'border-[#ff6b5a] bg-brasa text-creme shadow-[0_0_40px_-8px_rgba(193,39,45,0.8)]'
                      : 'border-[#ff6b5a]/40 text-[#ff8a7a] hover:bg-brasa/15'
                  }`}
                >
                  {carregando === 'fechado' ? <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : 'Fechado'}
                  <span className="font-sans text-[0.7rem] font-semibold tracking-wider uppercase opacity-80">{atual === false ? 'Agora' : 'Fechar a loja'}</span>
                </button>
              </div>

              <div aria-live="polite" className="min-h-6">
                {aviso && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-emerald-300">
                    <IconCheck width={18} height={18} className="mt-0.5 shrink-0" /> {aviso}
                  </p>
                )}
                {erro && (
                  <p role="alert" className="mt-4 text-sm text-[#ff8a7a]">
                    {erro}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                <button type="button" onClick={fechar} className="btn btn-ghost !min-h-11 !px-5 text-sm">
                  <span className="btn-label">Ver o site</span>
                </button>
                <button type="button" onClick={sair} className="link-ember text-sm text-cinza">
                  Sair do painel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
