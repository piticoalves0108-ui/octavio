/**
 * Preloader: a chapa esquenta (do ferro frio ao vermelho-brasa) enquanto o
 * logo se desenha. Some quando as fontes e a cena 3D estão prontas, com um
 * tempo mínimo (para a animação respirar) e um máximo (para nunca prender ninguém).
 */
import { useEffect, useRef, useState } from 'react'
import { loader } from '../lib/loader'
import { getGsap, prefersReducedMotion } from '../lib/motion'
import { LogoMark } from './Logo'

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const word = useRef<SVGTextElement>(null)
  const status = useRef<HTMLParagraphElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const el = root.current!
    const reduced = prefersReducedMotion()
    const MIN = reduced ? 250 : 1700
    const MAX = 6000
    const start = performance.now()
    let target = 0
    let ready = false
    let shown = 0
    let last = start
    let raf = 0
    let finished = false
    document.documentElement.style.overflow = 'hidden'

    const unsub = loader.subscribe((p, all) => {
      target = p
      ready = all
    })

    const finish = () => {
      finished = true
      loader.finish()
      cancelAnimationFrame(raf)
      if (status.current) status.current.textContent = 'Chapa no ponto.'
      const { gsap } = getGsap()
      const done = () => {
        document.documentElement.style.overflow = ''
        setGone(true)
        onDone()
      }
      if (reduced) {
        gsap.to(el, { opacity: 0, duration: 0.3, onComplete: done })
        return
      }
      gsap
        .timeline({ onComplete: done })
        .to(el.querySelector('.pl-griddle'), { scale: 1.08, duration: 0.35, ease: 'power2.out' })
        .to(el.querySelector('.pl-content'), { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' }, '+=0.1')
        .to(el.querySelector('.pl-top'), { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
        .to(el.querySelector('.pl-bottom'), { yPercent: 100, duration: 0.9, ease: 'expo.inOut' }, '<')
        // O hero começa a entrar antes da cortina terminar.
        .add(() => onDone(), '-=0.55')
    }

    const tick = () => {
      const now = performance.now()
      const t = now - start
      const dt = (now - last) / 1000
      last = now
      const timeCap = Math.min(1, t / MIN)
      const loadCap = ready ? 1 : 0.12 + target * 0.78
      const goal = t > MAX ? 1 : Math.min(timeCap, loadCap)
      // Suavização por tempo (não por quadro): em aparelho lento não demora mais.
      shown += (goal - shown) * (reduced ? 1 : 1 - Math.exp(-dt * 7))
      if (goal === 1 && (shown > 0.99 || t > MAX)) shown = 1
      const pct = Math.round(shown * 100)
      if (counter.current) counter.current.textContent = String(pct).padStart(3, '0')
      el.style.setProperty('--heat', shown.toFixed(3))
      if (word.current) word.current.style.strokeDashoffset = String(520 * (1 - shown))
      if (shown >= 1 && !finished) finish()
      else if (!finished) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      unsub()
      document.documentElement.style.overflow = ''
    }
    // onDone muda a cada render do App; o efeito roda uma vez só.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  return (
    <div
      ref={root}
      className="preloader fixed inset-0 z-[120] flex items-center justify-center"
      style={{ ['--heat' as string]: 0 }}
      role="status"
      aria-live="polite"
      aria-label="Carregando o site"
    >
      <div className="pl-top metal absolute inset-x-0 top-0 h-1/2" />
      <div className="pl-bottom metal absolute inset-x-0 bottom-0 h-1/2" />
      <div className="pl-content relative flex flex-col items-center px-6 text-center">
        <div className="pl-griddle relative grid h-56 w-56 place-items-center rounded-full md:h-64 md:w-64">
          {/* ferro: fica rubro conforme esquenta */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 55%, rgba(255,140,50,calc(var(--heat) * 0.6)), rgba(193,39,45,calc(var(--heat) * 0.42)) 42%, rgba(40,20,14,0.9) 70%), #161412',
              boxShadow:
                '0 0 calc(var(--heat) * 90px) calc(var(--heat) * 10px) rgba(224,92,30,calc(var(--heat) * 0.45)), inset 0 0 0 2px rgba(245,240,232,0.08), inset 0 -18px 40px rgba(0,0,0,0.6)',
            }}
          />
          <div className="absolute inset-3 rounded-full border border-white/5" />
          {/* ondas de calor */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" style={{ opacity: 'var(--heat)' }}>
            <span className="heat-line" style={{ left: '30%', animationDelay: '0s' }} />
            <span className="heat-line" style={{ left: '50%', animationDelay: '0.6s' }} />
            <span className="heat-line" style={{ left: '68%', animationDelay: '1.1s' }} />
          </div>
          <LogoMark className="relative h-24 w-24 text-creme md:h-28 md:w-28" />
        </div>
        <svg viewBox="0 0 520 90" className="mt-8 w-[min(80vw,420px)]" aria-hidden>
          <text
            ref={word}
            x="50%"
            y="72"
            textAnchor="middle"
            className="font-display"
            style={{
              fontSize: 88,
              letterSpacing: 4,
              fill: 'rgba(245,240,232,calc(var(--heat) * var(--heat)))',
              stroke: '#e8a33d',
              strokeWidth: 1.2,
              strokeDasharray: 520,
              strokeDashoffset: 520,
            }}
          >
            BRASA &amp; FERRO
          </text>
        </svg>
        <div className="mt-4 flex items-baseline gap-3 font-display text-ambar">
          <span ref={counter} className="text-5xl tabular-nums">000</span>
          <span className="text-xl">%</span>
        </div>
        <p ref={status} className="mt-2 text-xs tracking-[0.3em] text-cinza uppercase">
          Esquentando a chapa…
        </p>
      </div>
      <style>{`
        .preloader { animation: pl-failsafe 0.6s 9s forwards; }
        @keyframes pl-failsafe { to { opacity: 0; visibility: hidden; } }
        .heat-line { position:absolute; bottom:-20%; width:2px; height:60%; border-radius:2px;
          background: linear-gradient(to top, transparent, rgba(255,200,140,0.25), transparent);
          filter: blur(2px); animation: heat-rise 2.2s ease-in infinite; }
        @keyframes heat-rise { 0% { transform: translateY(0) scaleX(1); opacity:0 } 30% { opacity:1 }
          100% { transform: translateY(-120%) scaleX(3) skewX(12deg); opacity:0 } }
      `}</style>
    </div>
  )
}
