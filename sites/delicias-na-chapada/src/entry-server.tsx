/**
 * Renderização no build (SSG): gera o HTML da página para SEO e primeira pintura rápida.
 * Usado por scripts/prerender.mjs.
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
