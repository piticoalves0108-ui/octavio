/**
 * Status da loja: aberta ou fechada.
 *
 * Quem decide é o dono, pelo painel (/#painel):
 *  - com `site.painel.url` (Google Apps Script): o status fica online, vale para
 *    todos os clientes e a senha é conferida no Apps Script;
 *  - sem a URL (modo demonstração): o status fica só neste navegador.
 * Enquanto o dono não escolher nada, vale o horário de funcionamento de site.ts.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { site } from '../data/site'
import { statusAgora, type Status } from './hours'

export interface StatusLoja {
  aberto: boolean
  atualizado: string | null
}

export interface Resultado {
  ok: boolean
  erro?: string
}

interface StatusCtx {
  /** null enquanto o site ainda não sabe (antes de carregar). */
  aberto: boolean | null
  /** "Aberto agora", "Fechado agora" ou o texto do horário. */
  texto: string
  /** O status veio do painel do dono? (senão, do horário) */
  manual: boolean
  atualizado: string | null
  demo: boolean
  entrar: (senha: string) => Promise<Resultado>
  definir: (aberto: boolean, senha: string) => Promise<Resultado>
}

const CHAVE_CACHE = 'dnc-status-cache-v1'
const CHAVE_DEMO = 'dnc-status-demo-v1'
const SEM_CONEXAO = 'Sem conexão com o painel. Confira a internet e tente de novo.'

export const modoDemo = !site.painel.url

const ler = (chave: string): StatusLoja | null => {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as StatusLoja) : null
  } catch {
    return null
  }
}

const gravar = (chave: string, v: StatusLoja) => {
  try {
    localStorage.setItem(chave, JSON.stringify(v))
  } catch {
    /* armazenamento bloqueado */
  }
}

/**
 * Conversa com o Apps Script. O corpo vai como texto puro (sem cabeçalhos extras),
 * assim o navegador não faz a checagem prévia de CORS que o Apps Script não responde.
 */
async function chamar(corpo?: Record<string, unknown>) {
  const r = await fetch(site.painel.url, corpo ? { method: 'POST', body: JSON.stringify(corpo) } : { cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

const valido = (s: unknown): s is StatusLoja => typeof s === 'object' && s !== null && typeof (s as StatusLoja).aberto === 'boolean'

const Ctx = createContext<StatusCtx | null>(null)

export function useStatus() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStatus fora do StatusProvider')
  return c
}

export function StatusProvider({ children }: { children: ReactNode }) {
  const [manual, setManual] = useState<StatusLoja | null>(null)
  const [horario, setHorario] = useState<Status | null>(null)

  // Horário de funcionamento (reserva, enquanto o dono não escolhe nada).
  useEffect(() => {
    const atualizar = () => setHorario(statusAgora())
    atualizar()
    const t = window.setInterval(atualizar, 60_000)
    return () => window.clearInterval(t)
  }, [])

  // Status do dono.
  useEffect(() => {
    if (modoDemo) {
      setManual(ler(CHAVE_DEMO))
      // Painel aberto em outra aba do mesmo navegador.
      const onStorage = (e: StorageEvent) => e.key === CHAVE_DEMO && setManual(ler(CHAVE_DEMO))
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }

    setManual(ler(CHAVE_CACHE)) // último status conhecido, para não piscar
    let vivo = true
    const buscar = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const s = await chamar()
        if (vivo && valido(s)) {
          setManual(s)
          gravar(CHAVE_CACHE, s)
        }
      } catch {
        /* sem conexão: mantém o último status conhecido */
      }
    }
    buscar()
    const t = window.setInterval(buscar, site.painel.intervalo)
    document.addEventListener('visibilitychange', buscar)
    return () => {
      vivo = false
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', buscar)
    }
  }, [])

  const entrar = useCallback(async (senha: string): Promise<Resultado> => {
    if (modoDemo) return senha === site.painel.senhaDemo ? { ok: true } : { ok: false, erro: 'Senha incorreta.' }
    try {
      const r = await chamar({ acao: 'entrar', senha })
      if (r?.ok && valido(r.status)) {
        setManual(r.status)
        gravar(CHAVE_CACHE, r.status)
      }
      return r?.ok ? { ok: true } : { ok: false, erro: r?.erro ?? 'Não foi possível entrar.' }
    } catch {
      return { ok: false, erro: SEM_CONEXAO }
    }
  }, [])

  const definir = useCallback(async (aberto: boolean, senha: string): Promise<Resultado> => {
    if (modoDemo) {
      if (senha !== site.painel.senhaDemo) return { ok: false, erro: 'Senha incorreta.' }
      const s = { aberto, atualizado: new Date().toISOString() }
      gravar(CHAVE_DEMO, s)
      setManual(s)
      return { ok: true }
    }
    try {
      const r = await chamar({ acao: 'status', senha, aberto })
      if (r?.ok && valido(r.status)) {
        setManual(r.status)
        gravar(CHAVE_CACHE, r.status)
        return { ok: true }
      }
      return { ok: false, erro: r?.erro ?? 'Não foi possível salvar.' }
    } catch {
      return { ok: false, erro: SEM_CONEXAO }
    }
  }, [])

  const valor = useMemo<StatusCtx>(() => {
    const aberto = manual ? manual.aberto : (horario?.aberto ?? null)
    const texto = manual ? (manual.aberto ? 'Aberto agora' : 'Fechado agora') : (horario?.texto ?? '')
    return { aberto, texto, manual: Boolean(manual), atualizado: manual?.atualizado ?? null, demo: modoDemo, entrar, definir }
  }, [manual, horario, entrar, definir])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
