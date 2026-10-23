/**
 * INGREDIENTES: scroll horizontal.
 * Desktop com movimento: a seção "prende" e os painéis correm para o lado
 * conforme a rolagem (GSAP ScrollTrigger). Celular ou movimento reduzido:
 * carrossel nativo com scroll-snap (arrastar com o dedo / setas do teclado).
 */
import { useEffect, useRef } from 'react'
import { ingredientes } from '../data/site'
import { getGsap } from '../lib/motion'
import { Picture } from '../components/Picture'

export function Ingredients() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLOListElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const { gsap, ScrollTrigger } = getGsap()
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current!
      const distance = () => el.scrollWidth - window.innerWidth + 64
      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => bar.current && (bar.current.style.transform = `scaleX(${self.progress})`),
        },
      })
      // Cada painel ganha um leve parallax na imagem.
      el.querySelectorAll<HTMLElement>('[data-ing-img]').forEach((img) => {
        gsap.fromTo(img, { xPercent: 5 }, { xPercent: -5, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
      })
      return () => ScrollTrigger.refresh()
    })
    return () => mm.revert()
  }, [])

  return (
    <section
      id="ingredientes"
      ref={section}
      aria-labelledby="ingredientes-titulo"
      className="relative overflow-hidden py-24 min-[900px]:flex min-[900px]:h-svh min-[900px]:flex-col min-[900px]:justify-center min-[900px]:py-0"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_80%_60%,rgba(193,39,45,0.12),transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-[1400px] px-5 md:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{ingredientes.eyebrow}</p>
            <h2 id="ingredientes-titulo" className="metal-text mt-4 text-[clamp(3rem,7vw,5.75rem)]">
              {ingredientes.titulo}
            </h2>
            <p className="mt-3 max-w-md text-cinza">{ingredientes.subtitulo}</p>
          </div>
          <div aria-hidden className="hidden w-48 min-[900px]:block">
            <span className="block h-px w-full bg-white/10">
              <span ref={bar} className="block h-full origin-left scale-x-0 bg-gradient-to-r from-ambar to-brasa" />
            </span>
            <span className="mt-2 block text-right text-xs tracking-[0.3em] text-cinza uppercase">Role →</span>
          </div>
        </div>
      </div>

      <div
        className="scroll-thin relative mt-10 overflow-x-auto pb-6 min-[900px]:overflow-visible min-[900px]:pb-0 [scroll-snap-type:x_mandatory] min-[900px]:[scroll-snap-type:none]"
        tabIndex={0}
        role="region"
        aria-label="Ingredientes (role para o lado)"
      >
        <ol ref={track} className="flex w-max gap-4 px-5 md:gap-6 md:px-8 min-[900px]:pl-[max(2rem,calc((100vw-1400px)/2+2rem))]">
          {ingredientes.itens.map((ing, i) => (
            <li
              key={ing.id}
              className="metal metal-border group relative flex w-[82vw] shrink-0 snap-center flex-col overflow-hidden rounded-[2rem] sm:w-[60vw] min-[900px]:h-[min(64svh,560px)] min-[900px]:w-[min(46vw,640px)] min-[900px]:flex-row"
            >
              <div className="relative aspect-square overflow-hidden min-[900px]:aspect-auto min-[900px]:w-1/2">
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(224,110,40,0.3),transparent_65%)]" />
                <div data-ing-img className="relative h-full w-full">
                  <Picture
                    pasta="ingredientes"
                    id={ing.id}
                    larguras={[420, 720]}
                    sizes="(min-width: 900px) 23vw, 82vw"
                    alt={ing.nome}
                    width={720}
                    height={720}
                    className="h-full w-full !bg-transparent"
                    imgClassName="h-full w-full object-contain p-4 transition-transform duration-1000 ease-[var(--ease-brasa)] group-hover:scale-110"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:p-8">
                <span className="font-display text-7xl leading-none text-white/10 transition-colors duration-700 group-hover:text-ambar/40" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="inline-block rounded-full border border-ambar/30 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.16em] text-ambar uppercase">
                    {ing.destaque}
                  </span>
                  <h3 className="mt-4 font-display text-4xl leading-none text-creme md:text-5xl">{ing.nome}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-cinza md:text-base">{ing.texto}</p>
                </div>
              </div>
            </li>
          ))}
          <li aria-hidden className="w-2 shrink-0 min-[900px]:w-[10vw]" />
        </ol>
      </div>
    </section>
  )
}
