/**
 * Página única: preloader → hero 3D → sobre → cardápio → ingredientes →
 * galeria → depoimentos → localização → rodapé.
 */
import { useCallback, useEffect, useState } from 'react'
import { Preloader } from './components/Preloader'
import { Cursor } from './components/Cursor'
import { Navbar } from './components/Navbar'
import { FloatingOrder } from './components/FloatingOrder'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Menu } from './sections/Menu'
import { Ingredients } from './sections/Ingredients'
import { Gallery } from './sections/Gallery'
import { Testimonials } from './sections/Testimonials'
import { Location } from './sections/Location'
import { Footer } from './sections/Footer'
import { loader } from './lib/loader'
import { getGsap, prefersReducedMotion, startSmoothScroll } from './lib/motion'

export default function App() {
  const [ready, setReady] = useState(false)
  const onDone = useCallback(() => setReady(true), [])

  // As fontes entram no progresso do preloader.
  useEffect(() => {
    if (document.fonts) loader.track('fontes', document.fonts.ready)
  }, [])

  // Depois do preloader: smooth scroll + revelação dos elementos ao rolar.
  useEffect(() => {
    if (!ready) return
    const { gsap, ScrollTrigger } = getGsap()
    startSmoothScroll()
    if (prefersReducedMotion()) {
      gsap.set('[data-reveal]', { opacity: 1, y: 0 })
      return
    }
    const triggers = ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    })
    // Recalcula as posições depois que imagens e fontes assentarem.
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = window.setTimeout(refresh, 1200)
    // Link com âncora (ex.: /#cardapio) ao abrir a página.
    if (location.hash.length > 1) {
      const id = location.hash.slice(1)
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
    }
    return () => {
      triggers.forEach((tr) => tr.kill())
      window.removeEventListener('load', refresh)
      window.clearTimeout(t)
    }
  }, [ready])

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Preloader onDone={onDone} />
      <Cursor />
      <div aria-hidden className="grain" />
      <Navbar />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Hero ready={ready} />
        <About />
        <Menu />
        <Ingredients />
        <Gallery />
        <Testimonials />
        <Location />
      </main>
      <Footer />
      <FloatingOrder />
    </>
  )
}
