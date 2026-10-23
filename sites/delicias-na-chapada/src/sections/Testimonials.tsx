/**
 * DEPOIMENTOS: carrossel automático com transição suave (fade + blur + leve
 * deslocamento), barra de tempo, pausa ao passar o mouse ou focar, setas e
 * pontos acessíveis. Com movimento reduzido não avança sozinho.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { depoimentos } from '../data/site'
import { getGsap, prefersReducedMotion } from '../lib/motion'
import { IconChevronLeft, IconChevronRight, IconStar } from '../components/Icons'
import { SectionHeading } from '../components/SectionHeading'

const DURACAO = 6500

export function Testimonials() {
  const itens = depoimentos.itens
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [auto, setAuto] = useState(false)
  const quote = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLElement>(null)
  const visible = useRef(false)

  const go = useCallback(
    (next: number) => {
      const n = (next + itens.length) % itens.length
      const el = quote.current
      if (!el || prefersReducedMotion()) return setI(n)
      const { gsap } = getGsap()
      const dir = next > i ? 1 : -1
      gsap.to(el, {
        autoAlpha: 0,
        x: -30 * dir,
        filter: 'blur(8px)',
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          setI(n)
          gsap.fromTo(el, { autoAlpha: 0, x: 30 * dir, filter: 'blur(8px)' }, { autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out' })
        },
      })
    },
    [i, itens.length],
  )

  useEffect(() => {
    setAuto(!prefersReducedMotion())
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting))
    if (root.current) io.observe(root.current)
    return () => io.disconnect()
  }, [])

  // Avanço automático com barra de progresso.
  useEffect(() => {
    if (!auto || paused) return
    let start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      if (!visible.current) start = t - ((bar.current ? parseFloat(bar.current.dataset.p ?? '0') : 0) * DURACAO)
      const p = Math.min(1, (t - start) / DURACAO)
      if (bar.current) {
        bar.current.style.transform = `scaleX(${p})`
        bar.current.dataset.p = String(p)
      }
      if (p >= 1) go(i + 1)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [auto, paused, i, go])

  const d = itens[i]

  return (
    <section
      id="depoimentos"
      ref={root}
      aria-labelledby="depoimentos-titulo"
      aria-roledescription="carrossel"
      className="relative overflow-hidden py-28 md:py-36"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div aria-hidden className="smoke-css top-0 left-[-10%] h-[45vmax] w-[45vmax]" />
      <div className="relative mx-auto max-w-[1100px] px-5 md:px-8">
        <SectionHeading id="depoimentos-titulo" eyebrow={depoimentos.eyebrow} title={depoimentos.titulo} align="center" />

        <div className="metal metal-border relative mt-14 overflow-hidden rounded-[2rem] px-6 py-12 md:px-16 md:py-16" data-reveal>
          <span aria-hidden className="pointer-events-none absolute -top-10 left-6 font-display text-[12rem] leading-none text-ambar/15 md:left-12">
            “
          </span>
          <div ref={quote} aria-live={auto && !paused ? 'off' : 'polite'} aria-atomic="true" className="relative min-h-[13rem] md:min-h-[11rem]">
            <div className="flex gap-1 text-ambar" aria-label={`Nota ${d.nota} de 5`} role="img">
              {Array.from({ length: d.nota }).map((_, k) => (
                <IconStar key={k} width={18} height={18} />
              ))}
            </div>
            <blockquote className="mt-5 text-[clamp(1.4rem,3vw,2.2rem)] leading-snug font-light text-creme">
              <p>{d.texto}</p>
            </blockquote>
            <p className="mt-6 text-sm text-cinza">
              <span className="font-semibold text-creme">{d.nome}</span> · via {d.origem}
            </p>
          </div>

          <div className="mt-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-2" role="group" aria-label="Escolher depoimento">
              {itens.map((it, k) => (
                <button
                  key={it.nome}
                  type="button"
                  onClick={() => k !== i && go(k)}
                  aria-label={`Depoimento ${k + 1} de ${itens.length}`}
                  aria-current={k === i ? 'true' : undefined}
                  className="grid h-8 w-8 place-items-center"
                >
                  <span className={`block h-1.5 rounded-full transition-all duration-500 ${k === i ? 'w-8 bg-ambar' : 'w-1.5 bg-white/30 hover:bg-white/60'}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(i - 1)} aria-label="Depoimento anterior" className="grid h-12 w-12 place-items-center rounded-full border border-white/15 transition-colors hover:border-ambar hover:text-ambar">
                <IconChevronLeft />
              </button>
              <button type="button" onClick={() => go(i + 1)} aria-label="Próximo depoimento" className="grid h-12 w-12 place-items-center rounded-full border border-white/15 transition-colors hover:border-ambar hover:text-ambar">
                <IconChevronRight />
              </button>
            </div>
          </div>
          {auto && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
              <span ref={bar} className="block h-full origin-left scale-x-0 bg-gradient-to-r from-ambar to-brasa" />
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
