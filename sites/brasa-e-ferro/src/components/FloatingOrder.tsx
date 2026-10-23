/**
 * Botão "Peça Agora" fixo no rodapé da tela (celular), visível depois do hero.
 */
import { useEffect, useState } from 'react'
import { canalPedido, linkPedido } from '../data/site'
import { IconFlame } from './Icons'

export function FloatingOrder() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('inicio')
    const foot = document.querySelector('footer')
    let pastHero = false
    let atFooter = false
    const update = () => setShow(pastHero && !atFooter)
    const io1 = new IntersectionObserver(([e]) => {
      pastHero = !e.isIntersecting && e.boundingClientRect.top < 0
      update()
    })
    const io2 = new IntersectionObserver(([e]) => {
      atFooter = e.isIntersecting
      update()
    })
    if (hero) io1.observe(hero)
    if (foot) io2.observe(foot)
    return () => {
      io1.disconnect()
      io2.disconnect()
    }
  }, [])
  return (
    <div
      className={`fixed inset-x-4 bottom-4 z-[70] transition-all duration-500 ease-[var(--ease-brasa)] md:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
      }`}
    >
      <a
        href={linkPedido()}
        target="_blank"
        rel="noopener"
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        className="btn btn-primary w-full !min-h-14 shadow-[0_10px_40px_-8px_rgba(193,39,45,0.7)]"
        aria-label={`Peça agora pelo ${canalPedido()} (abre em nova aba)`}
      >
        <span className="btn-label">
          <IconFlame /> Peça Agora
        </span>
      </a>
    </div>
  )
}
