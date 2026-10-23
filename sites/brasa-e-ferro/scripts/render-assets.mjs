/**
 * Gera as imagens do site a partir do 3D procedural (studio.html):
 *   public/images/{hero,cardapio,ingredientes,galeria}/<id>-<largura>.{avif,webp}
 *   public/og-image.jpg (1200x630) e public/icons/*.png
 *
 * Uso:
 *   npm run assets                    # tudo
 *   npm run assets -- --so=cardapio   # só os shots cujo nome contém "cardapio"
 *   npm run assets -- --escala=2      # supersampling (mais nítido, mais lento)
 *   npm run assets -- --sem-og        # pula OG e ícones
 *   npm run assets -- --og            # só OG e ícones
 *
 * Requer o Chromium do Playwright (npx playwright install chromium).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const only = typeof args.so === 'string' ? args.so : ''
const scale = Number(args.escala ?? 1.5)

const server = await createServer({ root, logLevel: 'warn', server: { port: 5199, strictPort: false } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
page.on('console', (m) => m.type() === 'error' && console.error('  [navegador]', m.text()))
page.on('pageerror', (e) => console.error('  [navegador]', e.message))

try {
  await page.goto(`${base}/studio.html`)
  await page.waitForFunction(() => window.__STUDIO__?.done, null, { timeout: 60_000 })
  const shots = args.og ? [] : (await page.evaluate(() => window.__STUDIO__.shots)).filter((s) => s.key.includes(only))
  console.log(`Renderizando ${shots.length} imagens (escala ${scale})…`)

  for (const shot of shots) {
    const t0 = Date.now()
    await page.goto(`${base}/studio.html?shot=${shot.key}&escala=${scale}`)
    await page.waitForFunction(() => window.__STUDIO__?.done, null, { timeout: 600_000 })
    const { png, error } = await page.evaluate(() => ({ png: window.__STUDIO__.png, error: window.__STUDIO__.error }))
    if (error || !png) throw new Error(`${shot.key}: ${error ?? 'sem imagem'}`)
    const buf = Buffer.from(png.split(',')[1], 'base64')
    const cache = join(root, '.render-cache', `${shot.key}.png`)
    await mkdir(dirname(cache), { recursive: true })
    await writeFile(cache, buf)

    const outDir = join(root, 'public', 'images', dirname(shot.key))
    await mkdir(outDir, { recursive: true })
    const id = shot.key.split('/')[1]
    for (const w of shot.sizes) {
      const img = sharp(buf).resize({ width: w })
      await img.clone().webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(join(outDir, `${id}-${w}.webp`))
      await img.clone().avif({ quality: 52, effort: 5 }).toFile(join(outDir, `${id}-${w}.avif`))
    }
    console.log(`  ✓ ${shot.key} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
  }

  if (!args['sem-og'] && (!only || args.og)) {
    // Ícones a partir do favicon.svg
    const svg = await readFile(join(root, 'public', 'favicon.svg'))
    const icons = join(root, 'public', 'icons')
    await mkdir(icons, { recursive: true })
    for (const [name, size] of [['icon-32', 32], ['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
      await sharp(svg, { density: 512 }).resize(size, size).png().toFile(join(icons, `${name}.png`))
    }
    // Maskable: ícone com margem de segurança sobre fundo carvão
    const inner = await sharp(svg, { density: 512 }).resize(360, 360).png().toBuffer()
    await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0d0d0d' } })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toFile(join(icons, 'icon-maskable-512.png'))
    console.log('  ✓ ícones')

    // Open Graph: página og.html (fontes e layout do site) fotografada em 1200x630
    const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
    await og.goto(`${base}/og.html`)
    await og.waitForFunction(() => window.__OG_READY__ === true, null, { timeout: 60_000 })
    const shotBuf = await og.screenshot({ type: 'png' })
    await sharp(shotBuf).jpeg({ quality: 86, mozjpeg: true }).toFile(join(root, 'public', 'og-image.jpg'))
    await og.close()
    console.log('  ✓ og-image.jpg')
  }
} finally {
  await browser.close()
  await server.close()
}
