/** Monta a arte do Open Graph (1200x630) com as fontes e cores do site. */
import '@fontsource/bebas-neue/400.css'
import '@fontsource-variable/inter'
import { site } from './data/site'

declare global {
  interface Window {
    __OG_READY__?: boolean
  }
}

const el = document.getElementById('og')!
document.body.style.cssText = 'margin:0;background:#0d0d0d'
el.innerHTML = `
<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:radial-gradient(60% 80% at 72% 55%, #4a2210 0%, #1a0f09 45%, #0d0d0d 75%);font-family:'Inter Variable',sans-serif;color:#f5f0e8">
  <div style="position:absolute;inset:auto 0 0 0;height:45%;background:radial-gradient(60% 100% at 70% 100%, rgba(224,92,30,.45), transparent 70%)"></div>
  <img id="burger" src="/images/hero/poster-1000.webp" style="position:absolute;right:-150px;top:-120px;width:880px;height:880px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))" />
  <div style="position:absolute;left:72px;top:92px;width:560px">
    <div style="display:flex;align-items:center;gap:14px;color:#e8a33d;font-size:18px;font-weight:600;letter-spacing:.3em;text-transform:uppercase">
      <span style="width:36px;height:1px;background:#e8a33d"></span>${site.ramo}
    </div>
    <div style="font-family:'Bebas Neue';font-size:150px;line-height:.86;margin-top:22px">BRASA<span style="color:#e8a33d">&amp;</span><br/>FERRO</div>
    <div style="font-family:'Bebas Neue';font-size:46px;line-height:1;margin-top:26px;background:linear-gradient(90deg,#ffd27a,#e8a33d 35%,#ff7a2e 60%,#c1272d);-webkit-background-clip:text;color:transparent">Carne de verdade. Fogo de verdade.</div>
    <div style="margin-top:22px;font-size:20px;color:#aaa49b">@${site.redes.instagram.usuario}</div>
  </div>
</div>`

const img = document.getElementById('burger') as HTMLImageElement
Promise.all([document.fonts.ready, img.decode().catch(() => undefined)]).then(() => {
  window.__OG_READY__ = true
})
