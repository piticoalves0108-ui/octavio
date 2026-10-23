/**
 * SOBRE: história curta + números que contam até o valor quando aparecem.
 */
import { useEffect, useRef } from 'react'
import { sobre } from '../data/site'
import { getGsap, prefersReducedMotion } from '../lib/motion'
import { LogoMark } from '../components/Logo'

export function About() {
  const numbers = useRef<HTMLDListElement>(null)

  useEffect(() => {
    const { gsap, ScrollTrigger } = getGsap()
    const els = numbers.current?.querySelectorAll<HTMLElement>('[data-count]') ?? []
    const triggers: ScrollTrigger[] = []
    els.forEach((el) => {
      const target = Number(el.dataset.count)
      if (prefersReducedMotion()) {
        el.textContent = target.toLocaleString('pt-BR')
        return
      }
      el.textContent = '0'
      const obj = { v: 0 }
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              v: target,
              duration: 2.2,
              ease: 'power3.out',
              onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('pt-BR')),
            }),
        }),
      )
    })
    return () => triggers.forEach((t) => t.kill())
  }, [])

  return (
    <section id="sobre" aria-labelledby="sobre-titulo" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="smoke-css -top-20 right-[-10%] h-[50vmax] w-[50vmax]" />
      <LogoMark className="pointer-events-none absolute -right-24 bottom-10 h-[28rem] w-[28rem] text-white opacity-[0.035] md:right-[-6rem]" />
      <div className="relative mx-auto grid max-w-[1400px] gap-16 px-5 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
        <div>
          <p className="eyebrow" data-reveal>{sobre.eyebrow}</p>
          <h2 id="sobre-titulo" className="metal-text mt-4 text-[clamp(3.4rem,9vw,7.5rem)]" data-reveal>
            {sobre.titulo}
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-creme/85 md:text-xl">
            {sobre.paragrafos.map((p, i) => (
              <p key={i} data-reveal className={i === sobre.paragrafos.length - 1 ? 'text-creme' : ''}>
                {p}
              </p>
            ))}
          </div>
          <p className="mt-10 font-display text-3xl tracking-wide" data-reveal>
            <span className="text-ember" data-text={sobre.assinatura}>{sobre.assinatura}</span>
          </p>
        </div>

        <dl ref={numbers} className="grid grid-cols-2 gap-3 self-center sm:gap-4">
          {sobre.numeros.map((n, i) => (
            <div
              key={n.rotulo}
              data-reveal
              className={`metal metal-border group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-5 sm:min-h-52 sm:p-7 ${i % 2 ? 'translate-y-6' : ''}`}
            >
              <span aria-hidden className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(232,120,40,0.22),transparent_65%)] opacity-60 transition-opacity duration-700 group-hover:opacity-100" />
              <dt className="order-2 text-sm text-cinza">{n.rotulo}</dt>
              <dd className="order-1 font-display text-[clamp(3rem,6vw,4.75rem)] leading-none text-creme">
                <span data-count={n.valor}>{n.valor.toLocaleString('pt-BR')}</span>
                <span className="text-[0.55em] text-ambar">{n.sufixo}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
