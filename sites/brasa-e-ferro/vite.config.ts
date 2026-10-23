import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoPlugin } from './seo/plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoPlugin()],
  build: {
    target: 'es2022',
    // O Three.js fica num chunk próprio (import dinâmico) e só carrega com o hero.
    chunkSizeWarningLimit: 800,
  },
  server: { host: true },
  preview: { host: true },
})
