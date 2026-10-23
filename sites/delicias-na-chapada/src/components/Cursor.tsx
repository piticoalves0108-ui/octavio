/**
 * Cursor personalizado: ponto âmbar + anel que segue com atraso, cresce sobre
 * elementos clicáveis e mostra um rótulo (data-cursor-label). Só com mouse.
 */
import { useEffect, useRef } from 'react'
import { getGsap, isFinePointer, prefersReducedMotion } from '../lib/motion'

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return
    const { gsap } = getGsap()
    const d = dot.current!
    const r = ring.current!
    document.documentElement.classList.add('cursor-on')
    gsap.set([d, r], { xPercent: -50, yPercent: -50, opacity: 0 })
    const dx = gsap.quickTo(d, 'x', { duration: 0.08, ease: 'power3' })
    const dy = gsap.quickTo(d, 'y', { duration: 0.08, ease: 'power3' })
    const rx = gsap.quickTo(r, 'x', { duration: 0.45, ease: 'power3' })
    const ry = gsap.quickTo(r, 'y', { duration: 0.45, ease: 'power3' })
    let visible = false
    let hovering = false

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!visible) {
        visible = true
        gsap.to([d, r], { opacity: 1, duration: 0.3 })
      }
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
    }
    const over = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest<HTMLElement>('a, button, [data-cursor], input, label, summary')
      const isInput = t?.tagName === 'INPUT'
      const text = t?.dataset.cursorLabel ?? ''
      const next = Boolean(t) && !isInput
      if (next === hovering && label.current?.textContent === text) return
      hovering = next
      if (label.current) label.current.textContent = text
      gsap.to(r, {
        scale: next ? (text ? 2.3 : 1.7) : 1,
        backgroundColor: next ? 'rgba(232,163,61,0.12)' : 'rgba(232,163,61,0)',
        borderColor: next ? 'rgba(232,163,61,0.9)' : 'rgba(245,240,232,0.45)',
        duration: 0.4,
        ease: 'power3.out',
      })
      gsap.to(d, { scale: next ? 0.4 : 1, duration: 0.3 })
    }
    const down = () => gsap.to(r, { scale: '-=0.25', duration: 0.15, yoyo: true, repeat: 1 })
    const leave = () => {
      visible = false
      gsap.to([d, r], { opacity: 0, duration: 0.3 })
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      document.documentElement.classList.remove('cursor-on')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[150] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div
        ref={ring}
        className="fixed top-0 left-0 grid h-10 w-10 place-items-center rounded-full border opacity-0"
        style={{ borderColor: 'rgba(245,240,232,0.45)' }}
      >
        <span ref={label} className="text-[5px] font-semibold tracking-[0.2em] text-ambar-claro uppercase" />
      </div>
      <div ref={dot} className="fixed top-0 left-0 h-1.5 w-1.5 rounded-full bg-ambar opacity-0 shadow-[0_0_12px_rgba(232,163,61,0.9)]" />
    </div>
  )
}
