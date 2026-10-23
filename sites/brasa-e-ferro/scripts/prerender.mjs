/**
 * Pré-renderiza a página (SSG) para SEO: injeta o HTML gerado pelo React
 * (dist-ssr/entry-server.js) no dist/index.html.
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const template = await readFile(join(root, 'dist', 'index.html'), 'utf8')
const { render } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)

const html = template.replace('<!--app-html-->', render())
await writeFile(join(root, 'dist', 'index.html'), html)
await rm(join(root, 'dist-ssr'), { recursive: true, force: true })
console.log('✓ dist/index.html pré-renderizado')
