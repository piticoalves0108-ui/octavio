/**
 * Navbar fixa: encolhe e ganha blur ao rolar, destaca a seção atual e tem
 * menu em tela cheia no celular (Esc fecha, foco volta para o botão).
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { canalPedido, linkPedido, navegacao } from '../data/site'
import { getLenis, scrollToId } from '../lib/motion'
import { ButtonLink } from './Button'
import { IconClose, IconFlame, IconMenu } from './Icons'
import { Logo } from './Logo'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const menuBtn = useRef<HTMLButtonElement>(null)
  const firstLink = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    navegacao.forEach((n) => {
      const el = document.getElementById(n.id)
      if (el) io.observe(el)
    })
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    const lenis = getLenis()
    if (open) {
      lenis?.stop()
      document.documentElement.style.overflow = 'hidden'
      firstLink.current?.focus()
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    lenis?.start()
    document.documentElement.style.overflow = ''
  }, [open])

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    const wasOpen = open
    setOpen(false)
    // Espera o menu fechar para o scroll suave voltar a funcionar.
    window.setTimeout(() => scrollToId(id), wasOpen ? 60 : 0)
    if (wasOpen) menuBtn.current?.focus({ preventScroll: true })
  }

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-[80] transition-[padding,background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-brasa)] ${
        scrolled ? 'border-b border-white/[0.06] bg-carvao/65 py-2.5 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent py-5'
      }`}
    >
      <nav aria-label="Principal" className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 md:px-8">
        <a href="#inicio" onClick={go('inicio')} className={`transition-transform duration-500 ${scrolled ? 'scale-90' : ''} origin-left`} data-cursor="hover">
          <Logo />
        </a>

        <ul className="hidden items-center gap-7 text-sm text-creme/85 lg:flex">
          {navegacao.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} onClick={go(n.id)} className="link-ember" aria-current={active === n.id ? 'true' : undefined}>
                {n.rotulo}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ButtonLink
            href={linkPedido()}
            target="_blank"
            rel="noopener"
            className={`hidden !min-h-11 sm:inline-flex ${scrolled ? '!px-5' : ''}`}
            aria-label={`Peça agora pelo ${canalPedido()} (abre em nova aba)`}
          >
            <IconFlame width={18} height={18} /> Peça Agora
          </ButtonLink>
          <button
            ref={menuBtn}
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-creme transition-colors hover:border-ambar lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((o) => !o)}
            data-cursor="hover"
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </nav>
    </header>

      {/* Menu do celular (fora do header: o blur do header criaria outro contexto para o "fixed") */}
      <div
        id="menu-mobile"
        className={`fixed inset-0 z-[79] flex flex-col justify-between bg-carvao/95 px-6 pt-28 pb-10 backdrop-blur-xl transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        aria-hidden={!open}
      >
        <ul className="space-y-2">
          {navegacao.map((n, i) => (
            <li
              key={n.id}
              className="transition-[transform,opacity] duration-700 ease-[var(--ease-brasa)]"
              style={{ transform: open ? 'none' : 'translateY(24px)', opacity: open ? 1 : 0, transitionDelay: open ? `${80 + i * 50}ms` : '0ms' }}
            >
              <a
                ref={i === 0 ? firstLink : undefined}
                href={`#${n.id}`}
                onClick={go(n.id)}
                tabIndex={open ? 0 : -1}
                className="flex items-baseline gap-4 font-display text-5xl text-creme transition-colors hover:text-ambar"
              >
                <span className="text-sm text-ambar">{String(i + 1).padStart(2, '0')}</span>
                {n.rotulo}
              </a>
            </li>
          ))}
        </ul>
        <ButtonLink href={linkPedido()} target="_blank" rel="noopener" tabIndex={open ? 0 : -1} className="w-full" magnetic={false}>
          <IconFlame width={18} height={18} /> Peça Agora pelo {canalPedido()}
        </ButtonLink>
      </div>
    </>
  )
}
