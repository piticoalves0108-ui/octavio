/**
 * Converte uma foto real nos formatos e tamanhos que o site usa.
 *
 *   npm run foto -- <pasta> <id> <arquivo>
 *   npm run foto -- galeria g-classico ~/Downloads/burger.jpg
 *
 * Pastas: cardapio, ingredientes, galeria, hero. Gera AVIF e WebP em
 * public/images/<pasta>/<id>-<largura>.{avif,webp}.
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const LARGURAS = { cardapio: [800, 480], ingredientes: [720, 420], galeria: [1200, 720], hero: [1000, 600] }
const [pasta, id, arquivo] = process.argv.slice(2)
if (!LARGURAS[pasta] || !id || !arquivo) {
  console.error('Uso: npm run foto -- <cardapio|ingredientes|galeria|hero> <id> <arquivo>')
  process.exit(1)
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'images', pasta)
await mkdir(out, { recursive: true })
for (const w of LARGURAS[pasta]) {
  const img = sharp(arquivo).rotate().resize({ width: w, withoutEnlargement: false })
  await img.clone().webp({ quality: 80 }).toFile(join(out, `${id}-${w}.webp`))
  await img.clone().avif({ quality: 52 }).toFile(join(out, `${id}-${w}.avif`))
  console.log(`✓ ${pasta}/${id}-${w}.{webp,avif}`)
}
