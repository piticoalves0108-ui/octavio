/**
 * Selo "Aberto agora" / "Fechado agora" (verde ou vermelho).
 * Só aparece depois que o dono escolhe no painel (o horário de site.ts pode ser de exemplo).
 */
import { useStatus } from '../lib/status'

export function StatusBadge({ className = '', curto = false }: { className?: string; curto?: boolean }) {
  const { aberto, texto, manual } = useStatus()
  if (aberto === null || !manual) return null
  const rotulo = curto ? (aberto ? 'Aberto' : 'Fechado') : texto
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
        aberto ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-[#ff6b5a]/40 bg-brasa/15 text-[#ff8a7a]'
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${aberto ? 'animate-pulse bg-emerald-400' : 'bg-[#ff6b5a]'}`} />
      {rotulo}
    </span>
  )
}
