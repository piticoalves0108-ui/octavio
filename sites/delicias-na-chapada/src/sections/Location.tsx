/**
 * LOCALIZAÇÃO: mapa estilizado em SVG (ruas que se desenham, pino com pulso),
 * endereço, botões e horários com o dia de hoje destacado e "aberto agora".
 */
import { useEffect, useRef, useState } from 'react'
import { canalPedido, enderecoCompleto, linkMapa, linkPedido, localizacao, site, type DiaSemana, type Horario } from '../data/site'
import { statusAgora, type Status } from '../lib/hours'
import { SectionHeading } from '../components/SectionHeading'
import { ButtonLink } from '../components/Button'
import { IconClock, IconPin, IconWhatsApp } from '../components/Icons'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function StyledMap({ active }: { active: boolean }) {
  const rua = site.endereco.rua.split(',')[0]
  // Ruas: [x1, y1, x2, y2, largura]
  const ruas: [number, number, number, number, number][] = [
    [0, 120, 600, 120, 14],
    [0, 300, 600, 300, 10],
    [140, 0, 140, 440, 10],
    [300, 0, 300, 440, 16],
    [460, 0, 460, 440, 10],
    [0, 400, 600, 20, 22],
  ]
  return (
    <svg viewBox="0 0 600 440" className="h-full w-full" role="img" aria-label={`Mapa ilustrativo: ${site.nome} na ${rua}`}>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(245,240,232,0.035)" />
        </pattern>
        <radialGradient id="pinGlow">
          <stop offset="0" stopColor="#e8a33d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e8a33d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="440" fill="#100f0e" />
      <rect width="600" height="440" fill="url(#grid)" />
      {/* quadras */}
      {[
        [10, 10, 120, 100], [160, 10, 125, 100], [320, 10, 125, 100], [475, 10, 115, 100],
        [10, 135, 120, 155], [160, 135, 125, 155], [475, 135, 115, 155],
        [10, 315, 120, 115], [160, 315, 125, 115], [320, 315, 125, 115], [475, 315, 115, 115],
      ].map(([x, y, w, h], k) => (
        <rect key={k} x={x} y={y} width={w} height={h} rx="8" fill={k === 6 ? '#121610' : '#181614'} />
      ))}
      <rect x="320" y="135" width="125" height="155" rx="8" fill="#1d1916" stroke="rgba(232,163,61,0.35)" />
      {/* ruas que se desenham */}
      {ruas.map(([x1, y1, x2, y2, w], k) => (
        <line
          key={k}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#2a2724"
          strokeWidth={w}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={active ? 0 : 1}
          style={{ transition: `stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1) ${k * 0.12}s` }}
        />
      ))}
      {/* rota até o pino */}
      <path
        d="M20 300 H300 V210 H382"
        fill="none"
        stroke="#e8a33d"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={active ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 2.2s cubic-bezier(.22,1,.36,1) .9s', filter: 'drop-shadow(0 0 6px rgba(232,163,61,.8))' }}
      />
      <text x="34" y="292" fill="rgba(245,240,232,0.55)" fontSize="12" letterSpacing="2" fontFamily="Inter Variable, sans-serif">
        {rua.toUpperCase()}
      </text>
      {/* pino */}
      <g transform="translate(382 210)" style={{ transition: 'transform .9s cubic-bezier(.34,1.56,.64,1) 1.9s, opacity .4s 1.9s', transform: active ? 'translate(382px,210px)' : 'translate(382px,170px)', opacity: active ? 1 : 0 }}>
        <circle r="60" fill="url(#pinGlow)" />
        <circle r="16" fill="none" stroke="#e8a33d" strokeWidth="2" className="map-pulse" />
        <circle r="16" fill="none" stroke="#e8a33d" strokeWidth="2" className="map-pulse" style={{ animationDelay: '1.1s' }} />
        <path d="M0 0c-9-12-16-19-16-29a16 16 0 0 1 32 0c0 10-7 17-16 29z" fill="#e8a33d" />
        <path d="M0-39c.9 3 4.6 4.7 4.6 9a4.6 4.6 0 0 1-9.2 0c0-2 1-3.4 2.1-4.4-.1 1.6.5 2.6 1.5 3-.3-3.1.2-5.4 1-7.6z" fill="#120c06" />
      </g>
      <style>{`.map-pulse{transform-origin:0 0;animation:mp 2.2s ease-out infinite}@keyframes mp{from{transform:scale(1);opacity:.9}to{transform:scale(3.4);opacity:0}}`}</style>
    </svg>
  )
}

export function Location() {
  const mapBox = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [hoje, setHoje] = useState<number | null>(null)

  useEffect(() => {
    // Calculado no navegador (horário local do visitante).
    const update = () => {
      setStatus(statusAgora())
      setHoje(new Date().getDay())
    }
    update()
    const t = window.setInterval(update, 60_000)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setActive(true), { threshold: 0.35 })
    if (mapBox.current) io.observe(mapBox.current)
    return () => {
      window.clearInterval(t)
      io.disconnect()
    }
  }, [])

  const horarios = site.horarios as readonly Horario[]
  const linhas = DIAS.map((nome, d) => {
    const h = horarios.find((x) => x.dias.includes(d as DiaSemana))
    return { d, nome, texto: h ? `${h.abre} – ${h.fecha === '24:00' ? '00:00' : h.fecha}` : 'Fechado' }
  })
  // Semana começando na segunda.
  const ordem = [...linhas.slice(1), linhas[0]]

  return (
    <section id="onde" aria-labelledby="onde-titulo" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <SectionHeading id="onde-titulo" eyebrow={localizacao.eyebrow} title={localizacao.titulo} subtitle={localizacao.subtitulo} />
        <div className="mt-14 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div ref={mapBox} className="metal-border relative aspect-[600/440] overflow-hidden rounded-[2rem]" data-reveal>
            <StyledMap active={active} />
            <a
              href={linkMapa()}
              target="_blank"
              rel="noopener"
              className="absolute right-4 bottom-4 rounded-full bg-carvao/80 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-ambar-claro uppercase backdrop-blur transition-colors hover:bg-ambar hover:text-carvao"
            >
              Abrir no Google Maps
            </a>
          </div>

          <div className="metal metal-border flex flex-col gap-8 rounded-[2rem] p-7 md:p-10" data-reveal>
            <div>
              <p className="flex items-center gap-2 text-sm text-cinza">
                <IconPin width={18} height={18} className="text-ambar" /> Endereço
              </p>
              <address className="mt-2 font-display text-3xl leading-tight not-italic md:text-4xl">
                {site.endereco.rua}
                <span className="block text-xl text-creme/70 md:text-2xl">
                  {site.endereco.bairro}, {site.endereco.cidade} - {site.endereco.uf}
                </span>
              </address>
              <p className="mt-2 text-sm text-cinza">{site.endereco.referencia}</p>
              <p className="sr-only">{enderecoCompleto()}</p>
            </div>

            {site.contato.telefoneExibicao && (
              <div>
                <p className="flex items-center gap-2 text-sm text-cinza">
                  <IconWhatsApp width={18} height={18} className="text-ambar" /> Telefone e WhatsApp
                </p>
                <a href={`tel:${site.contato.telefoneInternacional}`} className="link-ember mt-2 inline-block font-display text-3xl leading-tight md:text-4xl">
                  {site.contato.telefoneExibicao}
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <ButtonLink href={linkMapa()} target="_blank" rel="noopener" aria-label="Como chegar (abre o Google Maps em nova aba)">
                <IconPin width={18} height={18} /> Como chegar
              </ButtonLink>
              <ButtonLink variant="ghost" href={linkPedido()} target="_blank" rel="noopener" aria-label={`Falar no ${canalPedido()} (abre em nova aba)`}>
                <IconWhatsApp width={18} height={18} /> Falar no {canalPedido()}
              </ButtonLink>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm text-cinza">
                  <IconClock width={18} height={18} className="text-ambar" /> Horários
                </p>
                <p
                  className={`inline-flex min-h-7 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-opacity ${
                    status ? 'opacity-100' : 'opacity-0'
                  } ${status?.aberto ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-cinza'}`}
                  aria-live="polite"
                >
                  <span className={`h-2 w-2 rounded-full ${status?.aberto ? 'animate-pulse bg-emerald-400' : 'bg-cinza'}`} />
                  {status?.texto ?? 'Carregando…'}
                </p>
              </div>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Horário de funcionamento</caption>
                <tbody>
                  {ordem.map((l) => (
                    <tr key={l.d} className={`border-b border-white/[0.06] last:border-0 ${hoje === l.d ? 'text-ambar-claro' : 'text-creme/85'}`}>
                      <th scope="row" className="py-2.5 text-left font-normal">
                        {l.nome}
                        {hoje === l.d && <span className="ml-2 rounded-full bg-ambar/15 px-2 py-0.5 text-[0.65rem] tracking-wider uppercase">hoje</span>}
                      </th>
                      <td className={`py-2.5 text-right tabular-nums ${l.texto === 'Fechado' ? 'text-cinza' : ''}`}>{l.texto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-cinza">{site.diaFechado}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
