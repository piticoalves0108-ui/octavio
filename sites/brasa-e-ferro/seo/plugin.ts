/**
 * Plugin do Vite que gera o SEO a partir de src/data/site.ts:
 *  - meta tags, canonical, Open Graph e Twitter Card no <head>
 *  - JSON-LD schema.org do tipo Restaurant (com cardápio e horários)
 *  - robots.txt, sitemap.xml e site.webmanifest no build
 *  - aviso no terminal com os campos que ainda precisam ser confirmados
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import {
  CAMPOS_A_CONFIRMAR,
  cardapio,
  enderecoCompleto,
  galeria,
  site,
  type Horario,
} from '../src/data/site.ts'

const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** schema.org não aceita "24:00": usa "23:59". */
const horaSchema = (h: string) => (h === '24:00' ? '23:59' : h)

export function tituloPagina() {
  return `${site.nome} | ${site.ramo} em ${site.endereco.cidade}`
}

function jsonLd() {
  const base = site.url
  const telefone = site.contato.telefoneExibicao || undefined
  const sameAs = [site.redes.instagram.url, site.redes.ifood, site.redes.tiktok].filter(Boolean)

  const categorias = cardapio.categorias.filter((c) => c.id !== 'todos')

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${base}/#restaurante`,
    name: site.nome,
    description: site.descricaoSeo,
    slogan: site.slogan,
    url: `${base}/`,
    image: [`${base}/og-image.jpg`, ...galeria.itens.slice(0, 3).map((g) => `${base}/images/galeria/${g.id}-1200.webp`)],
    logo: `${base}/icons/icon-512.png`,
    telephone: telefone,
    email: site.contato.email || undefined,
    priceRange: site.faixaPreco,
    servesCuisine: ['Hambúrguer artesanal', 'Hamburgueria', 'Lanches'],
    acceptsReservations: false,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.endereco.rua,
      addressLocality: site.endereco.cidade,
      addressRegion: site.endereco.uf,
      postalCode: site.endereco.cep,
      addressCountry: 'BR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.endereco.geo.lat,
      longitude: site.endereco.geo.lng,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.nome}, ${enderecoCompleto()}`)}`,
    openingHoursSpecification: (site.horarios as readonly Horario[]).map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dias.map((d) => DIAS_SCHEMA[d]),
      opens: h.abre,
      closes: horaSchema(h.fecha),
    })),
    sameAs,
    hasMenu: {
      '@type': 'Menu',
      name: 'Cardápio',
      url: `${base}/#cardapio`,
      inLanguage: 'pt-BR',
      hasMenuSection: [
      ...categorias.map((cat) => ({
        '@type': 'MenuSection',
        name: cat.rotulo,
        hasMenuItem: cardapio.itens
          .filter((i) => i.categoria === cat.id)
          .map((i) => ({
            '@type': 'MenuItem',
            name: i.nome,
            description: i.descricao,
            image: `${base}/images/cardapio/${i.id}-800.webp`,
            ...(i.selo === 'Vegetariano' ? { suitableForDiet: 'https://schema.org/VegetarianDiet' } : {}),
            offers: i.precoIndustrial
              ? [
                  { '@type': 'Offer', name: 'Com hambúrguer artesanal', price: i.preco.toFixed(2), priceCurrency: 'BRL' },
                  { '@type': 'Offer', name: 'Com hambúrguer industrial', price: i.precoIndustrial.toFixed(2), priceCurrency: 'BRL' },
                ]
              : { '@type': 'Offer', price: i.preco.toFixed(2), priceCurrency: 'BRL' },
          })),
      })),
      {
        '@type': 'MenuSection',
        name: cardapio.adicionaisTitulo,
        hasMenuItem: cardapio.adicionais.map((a) => ({
          '@type': 'MenuItem',
          name: a.nome,
          offers: { '@type': 'Offer', price: a.preco.toFixed(2), priceCurrency: 'BRL' },
        })),
      },
      ],
    },
  }

  // "<" escapado evita que um texto do cardápio feche a tag <script>.
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
}

/**
 * @param favicon data URI do favicon (arquivo HTML único). Sem ele, usa os
 *   arquivos de /public (favicon, ícones PNG e manifest).
 */
export function headSeo(favicon?: string) {
  const titulo = tituloPagina()
  const descricao = site.descricaoSeo
  const url = `${site.url}/`
  const og = `${site.url}/og-image.jpg`
  const tags = [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descricao)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta name="theme-color" content="${site.corTema}" />`,
    `<meta name="color-scheme" content="dark" />`,
    `<meta name="geo.region" content="BR-${esc(site.endereco.uf)}" />`,
    `<meta name="geo.placename" content="${esc(site.endereco.cidade)}" />`,
    `<meta name="geo.position" content="${site.endereco.geo.lat};${site.endereco.geo.lng}" />`,
    // Open Graph
    `<meta property="og:type" content="restaurant" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${esc(site.nome)}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descricao)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(og)}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(`${site.nome}: X-Tudo com batata palha, ovo, bacon e mussarela`)}" />`,
    `<meta property="restaurant:contact_info:street_address" content="${esc(site.endereco.rua)}" />`,
    `<meta property="restaurant:contact_info:locality" content="${esc(site.endereco.cidade)}" />`,
    `<meta property="restaurant:contact_info:region" content="${esc(site.endereco.uf)}" />`,
    `<meta property="restaurant:contact_info:country_name" content="Brasil" />`,
    // Twitter / X
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(titulo)}" />`,
    `<meta name="twitter:description" content="${esc(descricao)}" />`,
    `<meta name="twitter:image" content="${esc(og)}" />`,
    // Ícones e manifest
    ...(favicon
      ? [`<link rel="icon" href="${favicon}" type="image/svg+xml" />`]
      : [
          `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
          `<link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png" />`,
          `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`,
          `<link rel="manifest" href="/site.webmanifest" />`,
        ]),
    // Dados estruturados
    `<script type="application/ld+json">\n${jsonLd()}\n</script>`,
  ]
  return tags.join('\n    ')
}

function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`
}

function sitemap() {
  const hoje = new Date().toISOString().slice(0, 10)
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${site.url}/</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${galeria.itens.map((g) => `    <image:image><image:loc>${site.url}/images/galeria/${g.id}-1200.webp</image:loc></image:image>`).join('\n')}
  </url>
</urlset>
`
}

function manifest() {
  return JSON.stringify(
    {
      name: site.nome,
      short_name: site.nomeCurto,
      description: site.descricaoSeo,
      lang: site.idioma,
      start_url: '/',
      display: 'standalone',
      background_color: site.corTema,
      theme_color: site.corTema,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )
}

/** @param single build de arquivo HTML único: favicon embutido, sem robots/sitemap/manifest. */
export function seoPlugin({ single = false, root = process.cwd() } = {}): Plugin {
  const favicon = single
    ? `data:image/svg+xml,${encodeURIComponent(readFileSync(join(root, 'public', 'favicon.svg'), 'utf8').replace(/\s+/g, ' ').trim())}`
    : undefined
  let ssr = false
  let command: 'build' | 'serve' = 'serve'
  return {
    name: 'brasa-seo',
    configResolved(config) {
      ssr = Boolean(config.build.ssr)
      command = config.command
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // O SEO só vai para a página principal (o studio.html é só para gerar imagens).
        if (!ctx.filename.endsWith('index.html')) return html
        return html.replace('<!--seo-->', headSeo(favicon))
      },
    },
    configureServer(server) {
      // Em dev, serve os mesmos arquivos gerados no build.
      server.middlewares.use((req, res, next) => {
        const files: Record<string, [string, string]> = {
          '/robots.txt': ['text/plain', robots()],
          '/sitemap.xml': ['application/xml', sitemap()],
          '/site.webmanifest': ['application/manifest+json', manifest()],
        }
        const hit = req.url ? files[req.url] : undefined
        if (!hit) return next()
        res.setHeader('Content-Type', `${hit[0]}; charset=utf-8`)
        res.end(hit[1])
      })
    },
    generateBundle() {
      if (ssr || single) return
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() })
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: manifest() })
    },
    closeBundle() {
      if (ssr || command !== 'build' || CAMPOS_A_CONFIRMAR.length === 0) return
      const lista = CAMPOS_A_CONFIRMAR.map((c) => `   • ${c}`).join('\n')
      this.warn(
        `\n\n⚠  ${CAMPOS_A_CONFIRMAR.length} campos de exemplo em src/data/site.ts ainda precisam ser confirmados com o cliente:\n${lista}\n`,
      )
    },
  }
}
