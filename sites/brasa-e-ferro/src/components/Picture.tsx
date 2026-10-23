/**
 * Imagem responsiva (AVIF + WebP) com shimmer enquanto carrega.
 * As imagens ficam em /public/images/<pasta>/<id>-<largura>.{avif,webp}.
 */
import { useEffect, useRef, useState } from 'react'

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
}

export function Picture({ pasta, id, larguras, alt, width, height, sizes, className = '', imgClassName = '', eager }: Props) {
  const [loaded, setLoaded] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  const src = (w: number, ext: string) => `/images/${pasta}/${id}-${w}.${ext}`
  const set = (ext: string) => larguras.map((w) => `${src(w, ext)} ${w}w`).join(', ')
  // A imagem pode terminar de carregar antes da hidratação do React.
  useEffect(() => {
    if (img.current?.complete) setLoaded(true)
  }, [])
  return (
    <picture className={`block ${loaded ? '' : 'img-loading'} ${className}`}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        ref={img}
        src={src(larguras[0], 'webp')}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </picture>
  )
}
