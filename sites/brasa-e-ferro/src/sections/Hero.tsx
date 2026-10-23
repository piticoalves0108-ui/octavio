/**
 * HERO + vista explodida.
 *
 * Uma seção alta (≈320vh) com um "palco" sticky de 100svh:
 *  - 0% → 20% do scroll: o título sai e o hambúrguer se aproxima;
 *  - 16% → 60%: as camadas se separam e os rótulos aparecem ao lado de cada uma;
 *  - o resto: segura a vista explodida até a próxima seção.
 * Com movimento reduzido ou sem WebGL, vira um hero estático e a anatomia
 * aparece como lista.
 */
import { useEffect, useRef, useState } from 'react'
import { anatomia, burgerHero, canalPedido, hero, linkPedido } from '../data/site'
import { loader } from '../lib/loader'
import { getGsap, scrollToId } from '../lib/motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { ButtonLink } from '../components/Button'
import { Picture } from '../components/Picture'
import { IconArrowRight, IconFlame } from '../components/Icons'
import type { BurgerExperience, LayerAnchor } from '../three/experience'

type Mode = 'loading' | '3d' | 'static'

export function Hero({ ready }: { ready: boolean }) {
  const wrap = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const uiRef = useRef<HTMLDivElement>(null)
  const anatomyRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<HTMLOListElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const exp = useRef<BurgerExperience | null>(null)
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<Mode>('loading')

  // 1) Carrega a cena 3D sob demanda (chunk separado do Three.js).
  useEffect(() => {
    let disposed = false
    const host = canvasHost.current!
    const job = (async () => {
      const { hasWebGL, detectQuality } = await import('../three/quality')
      if (!hasWebGL()) {
        setMode('static')
        return
      }
      const { BurgerExperience } = await import('../three/experience')
      if (disposed) return
      const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const e = new BurgerExperience(host, {
        quality: detectQuality(),
        reducedMotion: rm,
        recipe: burgerHero,
        onFrame: placeLabels,
      })
      exp.current = e
      await e.warmup()
      if (disposed) {
        e.dispose()
        return
      }
      e.start()
      setMode('3d')
    })().catch((err) => {
      console.warn('3D indisponível, usando imagem estática.', err)
      setMode('static')
    })
    loader.track('cena 3D', job)
    return () => {
      disposed = true
      exp.current?.dispose()
      exp.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Posiciona os rótulos da vista explodida a cada frame (sem re-render do React).
  function placeLabels(anchors: LayerAnchor[], explode: number) {
    const list = labelsRef.current
    const st = stage.current
    if (!list || !st) return
    const w = st.clientWidth
    const narrow = w < 640
    const items = list.children
    for (let i = 0; i < items.length; i++) {
      const li = items[i] as HTMLElement
      const a = anchors.find((x) => x.camada === li.dataset.camada)
      if (!a) continue
      const right = narrow ? true : i % 2 === 0
      const gap = narrow ? 10 : 34
      const x = right ? a.x + a.r + gap : a.x - a.r - gap
      // Cada rótulo acende quando a sua camada já se separou.
      const local = Math.min(1, Math.max(0, (explode - 0.25 - i * 0.07) / 0.3))
      li.style.transform = `translate3d(${x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) translate(${right ? '0' : '-100%'}, -50%)`
      li.style.opacity = local.toFixed(3)
      li.dataset.side = right ? 'r' : 'l'
      const line = li.querySelector<HTMLElement>('.lbl-line')
      if (line) line.style.transform = `scaleX(${local.toFixed(3)})`
    }
  }

  // 2) Mouse → rotação/parallax do hambúrguer.
  useEffect(() => {
    if (mode !== '3d') return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      exp.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [mode])

  // 3) Entrada, depois do preloader: título sobe, UI aparece, hambúrguer cai e se monta.
  useEffect(() => {
    if (!ready) return
    const { gsap } = getGsap()
    const ctx = gsap.context(() => {
      gsap.set('.hero-intro', { autoAlpha: 0, y: 24 })
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('.hero-word', { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, duration: reduced ? 0.01 : 1.3, stagger: 0.07 })
        .to('.hero-intro', { autoAlpha: 1, y: 0, duration: reduced ? 0.01 : 1, stagger: 0.08 }, '-=0.9')
        // A máscara só serve para a entrada; depois libera o brilho do texto em brasa.
        .set('.hero-line', { overflow: 'visible' })
    }, wrap)
    exp.current?.setIntro(1)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Se o 3D ficar pronto depois do preloader, ele entra sozinho.
  useEffect(() => {
    if (ready && mode === '3d') exp.current?.setIntro(1)
  }, [ready, mode])

  // 4) Scroll: progresso da seção → cena 3D; título e UI saem; anatomia entra.
  useEffect(() => {
    if (!ready || reduced || mode !== '3d') return
    const { gsap, ScrollTrigger } = getGsap()
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrap.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => exp.current?.setScroll(self.progress),
      })
      gsap
        .timeline({ scrollTrigger: { trigger: wrap.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
        .to(titleRef.current, { yPercent: -18, autoAlpha: 0, ease: 'none', duration: 0.18 }, 0)
        .to(uiRef.current, { y: 40, autoAlpha: 0, ease: 'none', duration: 0.12 }, 0)
        .fromTo(anatomyRef.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: 'none', duration: 0.12 }, 0.2)
        .to(anatomyRef.current, { autoAlpha: 0, ease: 'none', duration: 0.08 }, 0.92)
        .set({}, {}, 1)
    }, wrap)
    return () => ctx.revert()
  }, [ready, mode, reduced])

  const scrollable = !reduced && mode !== 'static'

  return (
    <section
      id="inicio"
      ref={wrap}
      aria-labelledby="hero-titulo"
      className="relative"
      style={{ height: scrollable ? '320svh' : undefined }}
    >
      <div ref={stage} className="sticky top-0 h-svh min-h-[560px] overflow-hidden">
        {/* Fundo: brilho quente, calor da chapa, fumaça CSS */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(120,50,20,0.38),rgba(13,13,13,0)_70%)]" />
          <div className="heat-glow absolute inset-x-0 bottom-0 h-[55%]" />
          <div className="smoke-css top-[10%] left-[8%] h-[40vmax] w-[40vmax]" />
          <div className="smoke-css top-[30%] right-[4%] h-[35vmax] w-[35vmax]" style={{ animationDelay: '-7s' }} />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-carvao to-transparent" />
        </div>

        {/* Título gigante atrás do hambúrguer (linha 1 em cima, linha 2 embaixo no desktop) */}
        <div ref={titleRef} className="absolute inset-0">
          <h1
            id="hero-titulo"
            className="flex h-full flex-col items-center justify-start px-4 pt-[15svh] text-center font-display leading-[0.85] tracking-tight md:justify-between md:pt-[13svh] md:pb-[17svh]"
          >
            <span className="hero-line block overflow-hidden pb-[0.04em]">
              <span className="hero-word block text-[clamp(3.6rem,13vw,13rem)] text-creme">{hero.tituloLinha1}</span>
            </span>
            <span className="hero-line block overflow-hidden pb-[0.06em]">
              <span className="hero-word block text-[clamp(3.6rem,13vw,13rem)]">
                <span className="text-ember" data-text={hero.tituloLinha2}>{hero.tituloLinha2}</span>
              </span>
            </span>
          </h1>
        </div>

        {/* Imagem estática (aparece antes do 3D e quando não há WebGL) */}
        <div
          ref={posterRef}
          aria-hidden={mode === '3d'}
          className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 ${mode === '3d' ? 'opacity-0' : 'opacity-100'}`}
        >
          <Picture
            pasta="hero"
            id="poster"
            larguras={[1000, 600]}
            sizes="(min-width: 768px) 64svh, 88vw"
            alt="Hambúrguer artesanal com pão de gergelim, bacon, cheddar derretido, carne grelhada, tomate e alface"
            width={1000}
            height={1000}
            priority
            className="!bg-transparent"
            imgClassName="h-auto w-[min(88vw,64svh)] max-w-none translate-y-[3%]"
          />
        </div>

        {/* Canvas WebGL */}
        <div ref={canvasHost} className="absolute inset-0" />

        {/* Interface do hero */}
        <div ref={uiRef} className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-5 pb-8 md:flex-row md:items-end md:justify-between md:px-8 md:pb-10">
          <div className="max-w-md">
            <p className="hero-intro eyebrow">{hero.eyebrow}</p>
            <p className="hero-intro mt-3 text-lg text-creme/90 md:text-xl">{hero.subtitulo}</p>
            <div className="hero-intro mt-5 flex flex-wrap gap-3">
              <ButtonLink href={linkPedido()} target="_blank" rel="noopener" aria-label={`${hero.cta} pelo ${canalPedido()} (abre em nova aba)`}>
                <IconFlame width={18} height={18} /> {hero.cta}
              </ButtonLink>
              <ButtonLink
                variant="ghost"
                href="#cardapio"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToId('cardapio')
                }}
              >
                {hero.ctaSecundario} <IconArrowRight width={18} height={18} />
              </ButtonLink>
            </div>
          </div>
          {scrollable && (
            <div className="hero-intro hidden items-center gap-4 text-xs tracking-[0.3em] text-cinza uppercase md:flex" aria-hidden>
              <span>{hero.dica}</span>
              <span className="relative h-14 w-px overflow-hidden bg-white/15">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollhint_1.8s_ease-in-out_infinite] bg-ambar" />
              </span>
            </div>
          )}
        </div>

        {/* Vista explodida: título e rótulos de cada camada */}
        <div ref={anatomyRef} className={`pointer-events-none absolute inset-0 z-10 ${scrollable ? 'invisible opacity-0' : 'hidden'}`}>
          <div className="absolute top-24 left-5 max-w-xs md:top-auto md:bottom-12 md:left-8">
            <p className="eyebrow">{anatomia.subtitulo}</p>
            <h2 className="metal-text mt-3 text-[clamp(2.4rem,5vw,4.5rem)]">{anatomia.titulo}</h2>
          </div>
          <ol ref={labelsRef} className="absolute inset-0" aria-label="Camadas do hambúrguer, de cima para baixo">
            {anatomia.camadas.map((c, i) => (
              <li key={c.camada} data-camada={c.camada} className="group absolute top-0 left-0 flex items-center opacity-0 will-change-transform data-[side=l]:flex-row-reverse">
                <span className="lbl-line h-px w-6 origin-left bg-gradient-to-r from-ambar to-transparent group-data-[side=l]:origin-right group-data-[side=l]:bg-gradient-to-l sm:w-10" />
                <span className="px-2 group-data-[side=l]:text-right">
                  <span className="block font-display text-[1.05rem] leading-none text-creme sm:text-2xl">
                    <span className="mr-1.5 text-ambar">{String(i + 1).padStart(2, '0')}</span>
                    {c.nome}
                  </span>
                  <span className="mt-1 hidden max-w-[16rem] text-xs text-cinza sm:block">{c.detalhe}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Anatomia em lista: movimento reduzido ou sem WebGL */}
      {!scrollable && (
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8">
          <p className="eyebrow">{anatomia.subtitulo}</p>
          <h2 className="metal-text mt-3 text-5xl">{anatomia.titulo}</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {anatomia.camadas.map((c, i) => (
              <li key={c.camada} className="metal metal-border rounded-2xl p-5">
                <span className="font-display text-xl text-ambar">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-display text-2xl">{c.nome}</p>
                <p className="mt-1 text-sm text-cinza">{c.detalhe}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <style>{`@keyframes scrollhint { 0% { transform: translateY(-100%) } 100% { transform: translateY(200%) } }`}</style>
    </section>
  )
}
