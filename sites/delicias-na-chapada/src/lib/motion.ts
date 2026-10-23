/**
 * GSAP + ScrollTrigger + Lenis, inicializados uma vez só no navegador.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

let registered = false
let lenis: Lenis | null = null

export function getGsap() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return { gsap, ScrollTrigger }
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isFinePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** Liga o smooth scroll (Lenis) sincronizado com o ScrollTrigger. */
export async function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis
  const { default: LenisCtor } = await import('lenis')
  const { gsap, ScrollTrigger } = getGsap()
  lenis = new LenisCtor({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.2, autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function getLenis() {
  return lenis
}

/** Rola até uma seção (suave quando possível) e move o foco para ela. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const offset = id === 'inicio' ? 0 : -72
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.4 })
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  // Acessibilidade: leva o foco do teclado junto.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
  history.replaceState(null, '', `#${id}`)
}
