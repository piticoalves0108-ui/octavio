import { useEffect, type RefObject } from 'react'
import { getGsap, isFinePointer, prefersReducedMotion } from '../lib/motion'

/**
 * Efeito magnético: o elemento é "puxado" na direção do cursor quando ele chega perto.
 * Só com mouse e sem movimento reduzido.
 */
export function useMagnetic(ref: RefObject<HTMLElement | null>, strength = 0.35, area = 36) {
  useEffect(() => {
    const el = ref.current
    if (!el || !isFinePointer() || prefersReducedMotion()) return
    const { gsap } = getGsap()
    const inner = el.querySelector<HTMLElement>('.btn-label')
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
    const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3.out' }) : null
    const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3.out' }) : null

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const inside = Math.abs(dx) < r.width / 2 + area && Math.abs(dy) < r.height / 2 + area
      if (inside) {
        xTo(dx * strength)
        yTo(dy * strength)
        ixTo?.(dx * strength * 0.35)
        iyTo?.(dy * strength * 0.35)
      } else {
        xTo(0)
        yTo(0)
        ixTo?.(0)
        iyTo?.(0)
      }
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      gsap.set([el, inner].filter(Boolean), { x: 0, y: 0 })
    }
  }, [ref, strength, area])
}
