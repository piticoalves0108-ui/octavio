/**
 * Gera o site inteiro num único arquivo HTML (JS, CSS, fontes, imagens e 3D
 * embutidos), que abre com dois cliques, sem servidor e sem instalar nada.
 *
 *   npm run build:html   →   entrega/brasa-e-ferro.html
 *
 * O conteúdo continua pré-renderizado (SEO e leitura antes do JS carregar).
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cliente = join(root, 'dist-html')
const servidor = join(root, 'dist-html-ssr')
const saida = join(root, 'entrega', 'brasa-e-ferro.html')

// 1) Navegador: um único JS e um único CSS, com fontes e imagens embutidas.
await build({ root, mode: 'html', logLevel: 'warn' })
// 2) Servidor: para pré-renderizar o HTML da página.
await build({
  root,
  mode: 'html',
  logLevel: 'error',
  build: { ssr: 'src/entry-server.tsx', outDir: servidor, emptyOutDir: true, copyPublicDir: false },
})

let html = await readFile(join(cliente, 'index.html'), 'utf8')
const { render } = await import(pathToFileURL(join(servidor, 'entry-server.js')).href)
html = html.replace('<!--app-html-->', () => render())

// 3) Embute o CSS e o JS no lugar das tags que apontam para os arquivos.
const ler = (url) => readFile(join(cliente, url.replace(/^\//, '')), 'utf8')
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]
for (const [tag, href] of css) {
  const conteudo = (await ler(href)).replace(/<\/style/gi, '<\\/style')
  html = html.replace(tag, () => `<style>${conteudo}</style>`)
}
const js = [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)]
for (const [tag, src] of js) {
  const conteudo = (await ler(src)).replace(/<\/script/gi, '<\\/script')
  html = html.replace(tag, () => `<script type="module">${conteudo}</script>`)
}
html = html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '')

const sobrou = html.match(/(?:src|href)="\/(?:assets|images|icons)\/[^"]+"/)
if (sobrou) throw new Error(`Ainda há arquivo externo no HTML: ${sobrou[0]}`)

await mkdir(dirname(saida), { recursive: true })
await writeFile(saida, html)
await rm(cliente, { recursive: true, force: true })
await rm(servidor, { recursive: true, force: true })
const { size } = await stat(saida)
console.log(`✓ ${saida.replace(root + '/', '')} (${(size / 1024 / 1024).toFixed(1)} MB)`)
