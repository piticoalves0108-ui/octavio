/**
 * Módulo virtual "virtual:imagens".
 *
 * - Build normal e dev: exporta null (as imagens vêm de /images/...).
 * - Build de arquivo único (npm run build:html): exporta as imagens em WebP
 *   como data URI, uma largura por imagem, para o HTML funcionar sozinho.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const ID = 'virtual:imagens'

/** Largura embutida de cada pasta (a maior gerada por npm run assets). */
export const LARGURA_EMBUTIDA: Record<string, number> = {
  hero: 1000,
  cardapio: 800,
  ingredientes: 720,
  galeria: 1200,
}

export function imagensPlugin(embutir: boolean, root: string): Plugin {
  return {
    name: 'brasa-imagens',
    resolveId(source) {
      if (source === ID) return `\0${ID}`
    },
    load(id) {
      if (id !== `\0${ID}`) return
      if (!embutir) return 'export default null'
      const mapa: Record<string, string> = {}
      for (const [pasta, w] of Object.entries(LARGURA_EMBUTIDA)) {
        const dir = join(root, 'public', 'images', pasta)
        for (const arq of readdirSync(dir)) {
          const m = arq.match(new RegExp(`^(.+)-${w}\\.webp$`))
          if (!m) continue
          mapa[`${pasta}/${m[1]}`] = `data:image/webp;base64,${readFileSync(join(dir, arq)).toString('base64')}`
        }
      }
      return `export default ${JSON.stringify(mapa)}`
    },
  }
}
