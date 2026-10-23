/**
 * Marca da Delícias na Chapada: chama dentro de um anel (como um selo de chapa)
 * + nome em letra condensada.
 */
import { useId } from 'react'

export function LogoMark({ className = '', title }: { className?: string; title?: string }) {
  const gid = `lm-fire-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c1272d" />
          <stop offset="0.55" stopColor="#e07a2e" />
          <stop offset="1" stopColor="#f6c56f" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 2.6" opacity="0.6" />
      <path
        d="M24 9.5c1.6 5.6 8.6 8.6 8.6 16.3 0 5.2-3.8 9.2-8.6 9.2s-8.6-4-8.6-9.2c0-3.6 1.7-6.2 4-8.1-.2 2.9.9 4.8 2.8 5.6-.7-5.6.3-9.8 1.8-13.8z"
        fill={`url(#${gid})`}
      />
      <path d="M17 38.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 text-creme" />
      <span className="font-display text-[1.55rem] leading-none tracking-wide whitespace-nowrap">
        Delícias <span className="text-ambar">na</span> Chapada
      </span>
    </span>
  )
}
