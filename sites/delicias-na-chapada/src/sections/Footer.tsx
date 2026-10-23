/**
 * RODAPÉ: chamada final com texto em brasa, newsletter com estados de
 * carregamento, redes sociais e logo que acende ao aparecer.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { linkPedido, navegacao, rodape, site } from '../data/site'
import { getGsap, prefersReducedMotion, scrollToId } from '../lib/motion'
import { ButtonLink } from '../components/Button'
import { IconArrowUp, IconCheck, IconFlame, IconInstagram, IconMail, IconTikTok, IconWhatsApp, IconBag } from '../components/Icons'
import { LogoMark } from '../components/Logo'

type Estado = 'ocioso' | 'enviando' | 'ok' | 'erro'

function Newsletter() {
  const [estado, setEstado] = useState<Estado>('ocioso')
  const [msg, setMsg] = useState('')

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = String(new FormData(form).get('email') ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEstado('erro')
      setMsg('Confere o e-mail? Parece que faltou alguma coisa.')
      return
    }
    setEstado('enviando')
    setMsg('')
    try {
      if (site.newsletterEndpoint) {
        const r = await fetch(site.newsletterEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!r.ok) throw new Error(String(r.status))
      } else {
        // Sem endpoint configurado (veja site.ts): simula o envio.
        await new Promise((res) => setTimeout(res, 1100))
        console.info('[newsletter] Configure site.newsletterEndpoint para receber os e-mails.')
      }
      setEstado('ok')
      setMsg('Pronto! Você vai saber dos lançamentos antes de todo mundo.')
      form.reset()
    } catch {
      setEstado('erro')
      setMsg('Não deu para enviar agora. Tenta de novo em instantes.')
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="w-full max-w-md">
      <label htmlFor="news-email" className="font-display text-3xl leading-none">
        {rodape.newsletterTitulo}
      </label>
      <p className="mt-2 text-sm text-cinza">{rodape.newsletterTexto}</p>
      <div className="metal-border mt-5 flex items-center gap-2 rounded-full bg-white/[0.03] p-1.5 focus-within:bg-white/[0.05]">
        <IconMail className="ml-3 shrink-0 text-cinza" width={18} height={18} />
        <input
          id="news-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="seu@email.com"
          required
          aria-invalid={estado === 'erro'}
          aria-describedby="news-msg"
          className="min-w-0 flex-1 bg-transparent py-2 text-creme placeholder:text-cinza/70 focus:outline-none"
          disabled={estado === 'enviando'}
        />
        <button type="submit" className="btn btn-primary !min-h-11 !px-5" disabled={estado === 'enviando'} aria-busy={estado === 'enviando'}>
          <span className="btn-label">
            {estado === 'enviando' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-carvao/30 border-t-carvao" aria-hidden />
                <span>Enviando</span>
              </>
            ) : estado === 'ok' ? (
              <>
                <IconCheck width={18} height={18} /> Feito
              </>
            ) : (
              'Quero'
            )}
          </span>
        </button>
      </div>
      <p id="news-msg" role="status" className={`mt-3 min-h-5 text-sm ${estado === 'erro' ? 'text-[#ff8a7a]' : 'text-ambar-claro'}`}>
        {msg}
      </p>
    </form>
  )
}

export function Footer() {
  const logo = useRef<HTMLDivElement>(null)
  const [ano, setAno] = useState<number | null>(null)

  useEffect(() => {
    setAno(new Date().getFullYear())
    if (prefersReducedMotion()) return
    const { gsap } = getGsap()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.foot-letter',
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.04, ease: 'expo.out', scrollTrigger: { trigger: logo.current, start: 'top 92%' } },
      )
    }, logo)
    return () => ctx.revert()
  }, [])

  const redes = [
    { href: site.redes.instagram.url, rotulo: `Instagram @${site.redes.instagram.usuario}`, icon: <IconInstagram /> },
    site.contato.whatsapp ? { href: linkPedido(), rotulo: 'WhatsApp', icon: <IconWhatsApp /> } : null,
    site.redes.ifood ? { href: site.redes.ifood, rotulo: 'iFood', icon: <IconBag /> } : null,
    site.redes.tiktok ? { href: site.redes.tiktok, rotulo: 'TikTok', icon: <IconTikTok /> } : null,
  ].filter(Boolean) as { href: string; rotulo: string; icon: React.ReactNode }[]

  // Nome em duas linhas no logo gigante; "NA" em brasa.
  const linhas = ['DELÍCIAS', 'NA CHAPADA']

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06]">
      {/* Chamada final */}
      <div className="relative mx-auto max-w-[1400px] px-5 py-24 text-center md:px-8 md:py-32">
        <div aria-hidden className="heat-glow absolute inset-x-0 bottom-0 h-full opacity-70" />
        <p className="relative font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-none text-creme" data-reveal>
          {rodape.chamada}
        </p>
        <p className="relative mt-1 font-display text-[clamp(3.4rem,11vw,9rem)] leading-[0.9]" data-reveal>
          <span className="text-ember" data-text={rodape.chamadaDestaque}>{rodape.chamadaDestaque}</span>
        </p>
        <div className="relative mt-10 flex justify-center" data-reveal>
          <ButtonLink
            href="#cardapio"
            className="!min-h-14 !px-9 text-lg"
            onClick={(e) => {
              e.preventDefault()
              scrollToId('cardapio')
            }}
          >
            <IconFlame /> Peça Agora
          </ButtonLink>
        </div>
      </div>

      <div className="metal relative border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
          <Newsletter />
          <nav aria-label="Rodapé">
            <p className="text-xs font-semibold tracking-[0.28em] text-ambar uppercase">Navegue</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-creme/85">
              {navegacao.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    className="link-ember"
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToId(n.id)
                    }}
                  >
                    {n.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-ambar uppercase">Siga o fogo</p>
            <ul className="mt-5 flex gap-3">
              {redes.map((r) => (
                <li key={r.rotulo}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener"
                    aria-label={`${r.rotulo} (abre em nova aba)`}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-creme transition-all duration-300 hover:-translate-y-1 hover:border-ambar hover:text-ambar hover:shadow-[0_0_24px_-4px_rgba(232,163,61,0.6)]"
                  >
                    {r.icon}
                  </a>
                </li>
              ))}
            </ul>
            {site.contato.telefoneExibicao && (
              <a href={`tel:${site.contato.telefoneInternacional}`} className="link-ember mt-5 inline-block font-display text-2xl tracking-wide text-creme">
                <span className="sr-only">Telefone: </span>
                {site.contato.telefoneExibicao}
              </a>
            )}
            {site.contato.email && (
              <a href={`mailto:${site.contato.email}`} className="link-ember mt-1 inline-block text-sm text-cinza">
                {site.contato.email}
              </a>
            )}
          </div>
        </div>

        {/* Logo gigante */}
        <div ref={logo} className="mx-auto flex max-w-[1400px] items-end gap-4 overflow-hidden px-5 md:px-8" aria-hidden>
          <LogoMark className="mb-[1.5vw] hidden h-[9vw] w-[9vw] shrink-0 text-creme/80 md:block" />
          <p className="font-display text-[clamp(4rem,13vw,13rem)] leading-[0.82] whitespace-nowrap">
            {linhas.map((linha, l) => (
              <span key={l} className="flex">
                {linha.split('').map((c, i) => (
                  <span
                    key={i}
                    data-text={c}
                    className={`foot-letter inline-block ${l === 1 && i < 2 ? 'text-ember' : 'metal-text'}`}
                  >
                    {c === ' ' ? '\u00a0' : c}
                  </span>
                ))}
              </span>
            ))}
          </p>
        </div>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 border-t border-white/[0.06] px-5 py-6 text-xs text-cinza sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>
            © {ano ?? ''} {site.nome}. {rodape.assinatura}
          </p>
          <button
            type="button"
            onClick={() => scrollToId('inicio')}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-4 py-2 transition-colors hover:border-ambar hover:text-ambar sm:self-auto"
          >
            Voltar ao topo <IconArrowUp width={16} height={16} />
          </button>
        </div>
      </div>
    </footer>
  )
}
