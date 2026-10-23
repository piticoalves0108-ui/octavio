/**
 * CARDÁPIO: filtros por categoria + cards com tilt 3D, reflexo de luz que
 * segue o mouse e uma faixa de brilho que atravessa o card no hover.
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { cardapio, formatarPreco, linkPedido, canalPedido, type ItemCardapio } from '../data/site'
import { getGsap, isFinePointer, prefersReducedMotion } from '../lib/motion'
import { SectionHeading } from '../components/SectionHeading'
import { Picture } from '../components/Picture'
import { IconBag } from '../components/Icons'

function MenuCard({ item, index }: { item: ItemCardapio; index: number }) {
  const card = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const tilt = useRef<{ rx: (v: number) => void; ry: (v: number) => void } | null>(null)

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return
    const { gsap } = getGsap()
    tilt.current = {
      rx: gsap.quickTo(inner.current, 'rotationX', { duration: 0.6, ease: 'power3.out' }),
      ry: gsap.quickTo(inner.current, 'rotationY', { duration: 0.6, ease: 'power3.out' }),
    }
  }, [])

  const move = (e: PointerEvent) => {
    if (!tilt.current || e.pointerType !== 'mouse') return
    const r = card.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    tilt.current.ry((x - 0.5) * 16)
    tilt.current.rx(-(y - 0.5) * 14)
    card.current!.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    card.current!.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }
  const leave = () => {
    tilt.current?.rx(0)
    tilt.current?.ry(0)
  }

  const pedido = linkPedido(`Olá! Vim pelo site e quero pedir um ${item.nome}.`)

  return (
    <article
      ref={card}
      data-menu-card
      data-categoria={item.categoria}
      className="group [perspective:1100px]"
      onPointerMove={move}
      onPointerLeave={leave}
      data-reveal
      style={{ transitionDelay: `${(index % 4) * 40}ms` }}
    >
      <div
        ref={inner}
        className="metal metal-border relative flex h-full flex-col overflow-hidden rounded-[1.75rem] [transform-style:preserve-3d] transition-shadow duration-500 group-hover:shadow-[0_30px_80px_-30px_rgba(232,120,40,0.45)]"
      >
        {/* luz que segue o mouse */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,30%), rgba(255,200,130,0.16), transparent 45%)' }}
        />
        {/* faixa de brilho (light sweep) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-full z-10 w-2/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-[1100ms] ease-[var(--ease-brasa)] group-hover:translate-x-[300%]"
        />
        <div className="relative aspect-square overflow-hidden">
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_55%,rgba(224,110,40,0.28),transparent_70%)] transition-transform duration-700 group-hover:scale-110" />
          <Picture
            pasta="cardapio"
            id={item.id}
            larguras={[480, 800]}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 90vw"
            alt={`${item.nome}: ${item.descricao}`}
            width={800}
            height={800}
            className="relative h-full w-full !bg-transparent"
            imgClassName="h-full w-full object-contain p-3 transition-transform duration-700 ease-[var(--ease-brasa)] [transform:translateZ(40px)] group-hover:scale-[1.07] group-hover:-rotate-3"
          />
          {item.selo && (
            <span className="absolute top-4 left-4 z-20 rounded-full border border-ambar/40 bg-carvao/70 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-ambar-claro uppercase backdrop-blur">
              {item.selo}
            </span>
          )}
        </div>
        <div className="relative z-20 flex flex-1 flex-col p-6 pt-2 [transform:translateZ(30px)]">
          <h3 className="font-display text-[2.1rem] leading-none text-creme">{item.nome}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-cinza">{item.descricao}</p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            {item.precoIndustrial ? (
              // Tradicionais: preço com hambúrguer artesanal e com industrial.
              <dl className="flex items-end gap-4">
                <div>
                  <dt className="text-[0.65rem] font-semibold tracking-[0.16em] text-cinza uppercase">Artesanal</dt>
                  <dd className="font-display text-3xl leading-none text-ambar">{formatarPreco(item.preco)}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold tracking-[0.16em] text-cinza uppercase">Industrial</dt>
                  <dd className="font-display text-2xl leading-none text-creme/85">{formatarPreco(item.precoIndustrial)}</dd>
                </div>
              </dl>
            ) : (
              <p className="font-display text-3xl leading-none text-ambar">
                <span className="sr-only">Preço: </span>
                {formatarPreco(item.preco)}
              </p>
            )}
            <a
              href={pedido}
              target="_blank"
              rel="noopener"
              className="btn btn-ghost !min-h-11 !px-4 text-sm"
              data-cursor-label="Pedir"
              aria-label={`Pedir ${item.nome} pelo ${canalPedido()} (abre em nova aba)`}
            >
              <span className="btn-label">
                <IconBag width={17} height={17} /> Pedir
              </span>
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}

/** Adicionais: ocupa duas colunas no fim da grade, com pontilhado de cardápio. */
function Adicionais() {
  return (
    <aside
      aria-labelledby="adicionais-titulo"
      className="metal metal-border relative flex flex-col justify-between gap-8 overflow-hidden rounded-[1.75rem] p-6 sm:col-span-2 md:p-8"
      data-reveal
    >
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,120,40,0.22),transparent_65%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="adicionais-titulo" className="font-display text-[2.6rem] leading-none text-creme">
            {cardapio.adicionaisTitulo}
          </h3>
          <p className="text-sm text-cinza">{cardapio.adicionaisTexto}</p>
        </div>
        <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {cardapio.adicionais.map((a) => (
            <li key={a.nome} className="flex items-baseline gap-3">
              <span className="font-display text-2xl leading-none text-creme">{a.nome}</span>
              <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/20" />
              <span className="font-display text-2xl leading-none text-ambar">{formatarPreco(a.preco)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6">
        <p className="max-w-xs text-sm text-cinza">Escolha o lanche e diga os adicionais na hora do pedido.</p>
        <a
          href={linkPedido('Olá! Vim pelo site e quero fazer um pedido com adicionais.')}
          target="_blank"
          rel="noopener"
          className="btn btn-primary !min-h-11 !px-5 text-sm"
          aria-label={`Pedir com adicionais pelo ${canalPedido()} (abre em nova aba)`}
        >
          <span className="btn-label">
            <IconBag width={17} height={17} /> Montar meu pedido
          </span>
        </a>
      </div>
    </aside>
  )
}

export function Menu() {
  const [cat, setCat] = useState('todos')
  const grid = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  // Transição suave ao trocar de categoria.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (prefersReducedMotion()) return
    const { gsap } = getGsap()
    const cards = grid.current?.querySelectorAll('[data-menu-card]')
    if (cards?.length) gsap.fromTo(cards, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' })
  }, [cat])

  const itens = cardapio.itens.filter((i) => cat === 'todos' || i.categoria === cat)

  return (
    <section id="cardapio" aria-labelledby="cardapio-titulo" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="cardapio-titulo" eyebrow={cardapio.eyebrow} title={cardapio.titulo} subtitle={cardapio.subtitulo} />
          <div role="group" aria-label="Filtrar o cardápio" className="flex flex-wrap gap-2" data-reveal>
            {cardapio.categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cat === c.id}
                onClick={() => setCat(c.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
                  cat === c.id
                    ? 'border-ambar bg-ambar text-carvao shadow-[0_0_24px_-4px_rgba(232,163,61,0.6)]'
                    : 'border-white/15 text-creme/80 hover:border-ambar/60 hover:text-creme'
                }`}
              >
                {c.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div ref={grid} className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
          {itens.map((item, i) => (
            <MenuCard key={item.id} item={item} index={i} />
          ))}
          <Adicionais />
        </div>
      </div>
    </section>
  )
}
