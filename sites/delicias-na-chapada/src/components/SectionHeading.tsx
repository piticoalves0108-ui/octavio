import type { ReactNode } from 'react'

/** Cabeçalho padrão das seções: rótulo, título com reflexo metálico e subtítulo. */
export function SectionHeading({ eyebrow, title, subtitle, id, align = 'left', children }: { eyebrow: string; title: string; subtitle?: string; id: string; align?: 'left' | 'center'; children?: ReactNode }) {
  return (
    <header className={`max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <p className="eyebrow" data-reveal>{eyebrow}</p>
      <h2 id={id} className="metal-text mt-4 text-[clamp(3rem,8vw,6.5rem)]" data-reveal>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 max-w-xl text-base text-cinza md:text-lg" data-reveal style={align === 'center' ? { marginInline: 'auto' } : undefined}>
          {subtitle}
        </p>
      )}
      {children}
    </header>
  )
}
