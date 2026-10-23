import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoPlugin } from './seo/plugin.ts'
import { imagensPlugin } from './plugins/imagens.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // "html" = arquivo único (npm run build:html): tudo embutido, sem divisão de código.
  const single = mode === 'html'
  return {
    plugins: [react(), tailwindcss(), seoPlugin({ single, root }), imagensPlugin(single, root)],
    build: single
      ? {
          target: 'es2022',
          outDir: 'dist-html',
          assetsInlineLimit: () => true,
          cssCodeSplit: false,
          modulePreload: false,
          copyPublicDir: false,
          chunkSizeWarningLimit: 5000,
          rolldownOptions: { output: { codeSplitting: false } },
        }
      : {
          target: 'es2022',
          // O Three.js fica num chunk próprio (import dinâmico) e só carrega com o hero.
          chunkSizeWarningLimit: 800,
        },
    server: { host: true },
    preview: { host: true },
  }
})
