/**
 * Botão/link com efeito magnético, ripple no clique e glow no hover.
 */
import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import { useMagnetic } from '../hooks/useMagnetic'

type Variant = 'primary' | 'ghost'

function addRipple(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const size = Math.max(r.width, r.height) * 2.2
  const span = document.createElement('span')
  span.className = 'ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${e.clientX - r.left}px`
  span.style.top = `${e.clientY - r.top}px`
  el.appendChild(span)
  span.addEventListener('animationend', () => span.remove())
}

interface Common {
  variant?: Variant
  children: ReactNode
  magnetic?: boolean
  className?: string
}

export function ButtonLink({ variant = 'primary', children, magnetic = true, className = '', ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = useRef<HTMLAnchorElement>(null)
  useMagnetic(magnetic ? ref : { current: null })
  return (
    <a ref={ref} className={`btn btn-${variant} ${className}`} data-cursor="hover" onPointerDown={addRipple} {...rest}>
      <span className="btn-label">{children}</span>
    </a>
  )
}

export function Button({ variant = 'primary', children, magnetic = true, className = '', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null)
  useMagnetic(magnetic ? ref : { current: null })
  return (
    <button ref={ref} className={`btn btn-${variant} ${className}`} data-cursor="hover" onPointerDown={addRipple} {...rest}>
      <span className="btn-label">{children}</span>
    </button>
  )
}
