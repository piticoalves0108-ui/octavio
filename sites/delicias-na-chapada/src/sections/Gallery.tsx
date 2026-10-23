/**
 * GALERIA: grid masonry com hover cinematográfico (zoom lento, vinheta,
 * legenda subindo) e lightbox acessível (<dialog>, setas e Esc).
 */
import { useEffect, useRef, useState } from 'react'
import { galeria, site } from '../data/site'
import { SectionHeading } from '../components/SectionHeading'
import { Picture } from '../components/Picture'
import { IconChevronLeft, IconChevronRight, IconClose, IconExpand, IconInstagram } from '../components/Icons'
import { ButtonLink } from '../components/Button'
import { getLenis } from '../lib/motion'

const DIM = {
  retrato: { w: 960, h: 1280 },
  paisagem: { w: 1280, h: 900 },
  quadrado: { w: 1000, h: 1000 },
} as const

export function Gallery() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [atual, setAtual] = useState<number | null>(null)
  const itens = galeria.itens

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (atual !== null && !d.open) {
      d.showModal()
      getLenis()?.stop()
    }
    if (atual === null && d.open) d.close()
  }, [atual])

  useEffect(() => {
    const d = dialog.current!
    const onClose = () => {
      setAtual(null)
      getLenis()?.start()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setAtual((a) => (a === null ? a : (a + 1) % itens.length))
      if (e.key === 'ArrowLeft') setAtual((a) => (a === null ? a : (a - 1 + itens.length) % itens.length))
    }
    d.addEventListener('close', onClose)
    d.addEventListener('keydown', onKey)
    return () => {
      d.removeEventListener('close', onClose)
      d.removeEventListener('keydown', onKey)
    }
  }, [itens.length])

  const item = atual !== null ? itens[atual] : null

  return (
    <section id="galeria" aria-labelledby="galeria-titulo" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="galeria-titulo" eyebrow={galeria.eyebrow} title={galeria.titulo} subtitle={galeria.subtitulo} />
          <div data-reveal>
            <ButtonLink variant="ghost" href={site.redes.instagram.url} target="_blank" rel="noopener" aria-label={`Instagram @${site.redes.instagram.usuario} (abre em nova aba)`}>
              <IconInstagram /> @{site.redes.instagram.usuario}
            </ButtonLink>
          </div>
        </div>

        <ul className="mt-14 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
          {itens.map((g, i) => {
            const d = DIM[g.formato]
            return (
              <li key={g.id} className="break-inside-avoid" data-reveal>
                <button
                  type="button"
                  onClick={() => setAtual(i)}
                  className="group relative block w-full overflow-hidden rounded-[1.5rem] text-left"
                  data-cursor-label="Ver"
                  aria-label={`Ampliar foto: ${g.legenda}`}
                >
                  <Picture
                    pasta="galeria"
                    id={g.id}
                    larguras={[720, 1200]}
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 92vw"
                    alt={g.alt}
                    width={d.w}
                    height={d.h}
                    imgClassName="w-full scale-[1.02] brightness-[0.82] saturate-[0.85] transition-[transform,filter] duration-[1600ms] ease-[var(--ease-brasa)] group-hover:scale-[1.1] group-hover:brightness-100 group-hover:saturate-100 group-focus-visible:scale-[1.1]"
                  />
                  {/* vinheta e luz quente no hover */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_45%,rgba(0,0,0,0.65))]" />
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-brasa/0 via-ambar/0 to-ambar/0 mix-blend-screen transition-all duration-1000 group-hover:via-ambar/10 group-hover:to-ambar/25" />
                  <span className="absolute inset-x-0 bottom-0 flex translate-y-3 items-end justify-between gap-3 p-5 opacity-80 transition-all duration-700 ease-[var(--ease-brasa)] group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="font-display text-2xl leading-none text-creme drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{g.legenda}</span>
                    <span className="grid h-10 w-10 shrink-0 scale-75 place-items-center rounded-full border border-white/30 bg-carvao/50 opacity-0 backdrop-blur transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                      <IconExpand width={16} height={16} />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 text-xs text-cinza/80">
          Imagens ilustrativas geradas a partir do modelo 3D do site. Substitua pelas fotos do Instagram da casa.
        </p>
      </div>

      <dialog
        ref={dialog}
        aria-label={item ? item.legenda : 'Foto ampliada'}
        className="m-auto max-h-[92svh] w-[min(94vw,1100px)] overflow-visible bg-transparent p-0 text-creme"
        onClick={(e) => e.target === dialog.current && setAtual(null)}
      >
        {item && (
          <figure className="relative">
            <Picture
              pasta="galeria"
              id={item.id}
              larguras={[720, 1200]}
              sizes="94vw"
              alt={item.alt}
              width={DIM[item.formato].w}
              height={DIM[item.formato].h}
              eager
              className="overflow-hidden rounded-2xl"
              imgClassName="max-h-[80svh] w-full object-contain"
            />
            <figcaption className="mt-4 flex items-center justify-between gap-4">
              <span className="font-display text-3xl">{item.legenda}</span>
              <span className="flex gap-2">
                <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 hover:border-ambar" onClick={() => setAtual((a) => (a! - 1 + itens.length) % itens.length)} aria-label="Foto anterior">
                  <IconChevronLeft />
                </button>
                <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 hover:border-ambar" onClick={() => setAtual((a) => (a! + 1) % itens.length)} aria-label="Próxima foto">
                  <IconChevronRight />
                </button>
                <button type="button" autoFocus className="grid h-11 w-11 place-items-center rounded-full bg-ambar text-carvao" onClick={() => setAtual(null)} aria-label="Fechar">
                  <IconClose />
                </button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </section>
  )
}
