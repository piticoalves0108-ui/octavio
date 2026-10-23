/**
 * Progresso do carregamento inicial (fontes + cena 3D) para o preloader.
 */
type Listener = (progress: number, done: boolean) => void

const tasks = new Map<string, boolean>()
const listeners = new Set<Listener>()
let finished = false

function emit() {
  const total = tasks.size || 1
  const done = [...tasks.values()].filter(Boolean).length
  const all = tasks.size > 0 && done === total
  listeners.forEach((l) => l(done / total, all))
}

export const loader = {
  /** Registra uma etapa; o preloader espera todas (com limite de tempo). */
  track(name: string, p: Promise<unknown>) {
    if (finished) return
    tasks.set(name, false)
    emit()
    p.catch(() => undefined).finally(() => {
      tasks.set(name, true)
      emit()
    })
  },
  subscribe(l: Listener) {
    listeners.add(l)
    emit()
    return () => listeners.delete(l)
  },
  finish() {
    finished = true
  },
}
