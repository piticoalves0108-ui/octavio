/**
 * Imagem responsiva (AVIF + WebP) com shimmer enquanto carrega.
 * As imagens ficam em /public/images/<pasta>/<id>-<largura>.{avif,webp}.
 *
 * No arquivo HTML único (npm run build:html) as imagens vêm embutidas como
 * data URI e só entram depois da hidratação: assim o HTML pré-renderizado
 * não carrega cada imagem duas vezes.
 */
import { useEffect, useRef, useState } from 'react'
import imagens from 'virtual:imagens'

interface Props {
  pasta: 'cardapio' | 'ingredientes' | 'galeria' | 'hero'
  id: string
  larguras: number[]
  alt: string
  width: number
  height: number
  sizes: string
  className?: string
  imgClassName?: string
  eager?: boolean
  /** Imagem principal da página (LCP). */
  priority?: boolean
}

export function Picture({ pasta, id, larguras, alt, width, height, sizes, className = '', imgClassName = '', eager, priority }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  const embutida = imagens ? imagens[`${pasta}/${id}`] : null
  const src = (w: number, ext: string) => `/images/${pasta}/${id}-${w}.${ext}`
  const set = (ext: string) => larguras.map((w) => `${src(w, ext)} ${w}w`).join(', ')

  useEffect(() => setMounted(true), [])

  // A imagem pode terminar de carregar antes da hidratação do React.
  const atual = embutida ? (mounted ? embutida : undefined) : src(larguras[0], 'webp')
  useEffect(() => {
    const el = img.current
    if (el?.getAttribute('src') && el.complete && el.naturalWidth > 0) setLoaded(true)
  }, [atual])

  const imgEl = (
    <img
      ref={img}
      src={atual}
      srcSet={embutida ? undefined : set('webp')}
      sizes={embutida ? undefined : sizes}
      alt={alt}
      width={width}
      height={height}
      loading={eager || priority || embutida ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
    />
  )

  if (embutida) return <span className={`block ${loaded ? '' : 'img-loading'} ${className}`}>{imgEl}</span>

  return (
    <picture className={`block ${loaded ? '' : 'img-loading'} ${className}`}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      {imgEl}
    </picture>
  )
}
