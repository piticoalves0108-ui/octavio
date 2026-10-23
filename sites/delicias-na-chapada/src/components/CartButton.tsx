/**
 * Botão do pedido sempre à mão:
 *  - celular: barra no rodapé da tela ("Peça Agora" leva ao cardápio; com itens, abre o pedido);
 *  - computador: pílula no canto inferior direito quando há itens.
 * Também mostra o aviso "adicionado ao pedido".
 */
import { useEffect, useRef, useState } from 'react'
import { formatarPreco } from '../data/site'
import { useCarrinho } from '../lib/carrinho'
import { getGsap, prefersReducedMotion, scrollToId } from '../lib/motion'
import { IconBag, IconCheck, IconFlame } from './Icons'

export function CartButton() {
  const { quantidade, total, abrirCarrinho, aviso } = useCarrinho()
  const [depoisDoHero, setDepoisDoHero] = useState(false)
  const [noRodape, setNoRodape] = useState(false)
  const [avisoVisivel, setAvisoVisivel] = useState<string | null>(null)
  const pilula = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const hero = document.getElementById('inicio')
    const foot = document.querySelector('footer')
    const io1 = new IntersectionObserver(([e]) => setDepoisDoHero(!e.isIntersecting && e.boundingClientRect.top < 0))
    const io2 = new IntersectionObserver(([e]) => setNoRodape(e.isIntersecting))
    if (hero) io1.observe(hero)
    if (foot) io2.observe(foot)
    return () => {
      io1.disconnect()
      io2.disconnect()
    }
  }, [])

  // Aviso e "pulinho" do botão a cada item adicionado.
  useEffect(() => {
    if (!aviso) return
    setAvisoVisivel(aviso.nome)
    if (!prefersReducedMotion() && pilula.current) {
      getGsap().gsap.fromTo(pilula.current, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
    }
    const t = window.setTimeout(() => setAvisoVisivel(null), 2600)
    return () => window.clearTimeout(t)
  }, [aviso])

  const temItens = quantidade > 0
  const mostrarCelular = temItens || (depoisDoHero && !noRodape)
  const resumo = `${quantidade} ${quantidade === 1 ? 'item' : 'itens'} · ${formatarPreco(total)}`

  return (
    <>
      {/* Aviso "adicionado" */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[85] flex justify-center md:inset-x-auto md:right-6 md:bottom-24">
        {avisoVisivel && (
          <p className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-carvao/90 px-4 py-2.5 text-sm text-creme shadow-xl backdrop-blur animate-[toast_0.35s_ease-out]">
            <IconCheck width={16} height={16} className="text-emerald-300" /> {avisoVisivel} adicionado ao pedido
          </p>
        )}
      </div>

      {/* Celular */}
      <div className={`fixed inset-x-4 bottom-4 z-[70] transition-all duration-500 ease-[var(--ease-brasa)] md:hidden ${mostrarCelular ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'}`}>
        {temItens ? (
          <button type="button" onClick={abrirCarrinho} className="btn btn-primary w-full !min-h-14 !justify-between shadow-[0_10px_40px_-8px_rgba(193,39,45,0.7)]" tabIndex={mostrarCelular ? 0 : -1}>
            <span className="btn-label w-full justify-between">
              <span className="flex items-center gap-2">
                <IconBag /> Ver pedido
              </span>
              <span className="text-sm">{resumo}</span>
            </span>
          </button>
        ) : (
          <button type="button" onClick={() => scrollToId('cardapio')} className="btn btn-primary w-full !min-h-14 shadow-[0_10px_40px_-8px_rgba(193,39,45,0.7)]" tabIndex={mostrarCelular ? 0 : -1} aria-hidden={!mostrarCelular}>
            <span className="btn-label">
              <IconFlame /> Peça Agora
            </span>
          </button>
        )}
      </div>

      {/* Computador */}
      <button
        ref={pilula}
        type="button"
        onClick={abrirCarrinho}
        tabIndex={temItens ? 0 : -1}
        aria-hidden={!temItens}
        className={`btn btn-primary fixed right-6 bottom-6 z-[70] hidden !min-h-14 !px-6 shadow-[0_14px_40px_-10px_rgba(193,39,45,0.75)] transition-all duration-500 md:inline-flex ${
          temItens ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
        }`}
      >
        <span className="btn-label">
          <IconBag /> Ver pedido <span className="rounded-full bg-carvao/15 px-2.5 py-0.5 text-sm">{resumo}</span>
        </span>
      </button>
      <style>{`@keyframes toast { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }`}</style>
    </>
  )
}
