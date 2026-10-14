// Gera Reels (1080x1920, MP4) mostrando sites de exemplo rolando dentro de um celular, com legendas.
// Uso: node ferramentas/videos.mjs   (precisa do Playwright e do ffmpeg com libx264)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(RAIZ, 'site');
const SAIDA = path.join(RAIZ, 'videos');
fs.mkdirSync(SAIDA, { recursive: true });

const FPS = 30;
const VIDEOS = [
  { arq: '01-barbearia', nicho: 'barbearia', fundo: '#2E4BFF', tinta: '#FFFFFF', destaque: '#FFD24A', duracao: 14,
    falas: ['Sua barbearia ainda depende <em>só do Instagram?</em>', 'Site com <em>agendamento no WhatsApp</em>, mapa e horário', '<em>R$250</em>, pronto em 48h. Você vê antes de pagar'] },
  { arq: '02-pizzaria', nicho: 'pizzaria', fundo: '#14151A', tinta: '#FFFFFF', destaque: '#FFD24A', duracao: 14,
    falas: ['O cliente pesquisa <em>"pizzaria perto de mim"</em>…', '…e acha a sua com <em>botão de pedir</em> no WhatsApp', 'Site profissional por <em>R$250</em>. Link na bio'] },
  { arq: '03-oficina', nicho: 'oficina', fundo: '#FFD24A', tinta: '#14151A', destaque: '#2E4BFF', duracao: 14,
    falas: ['Oficina sem site <em>perde orçamento</em>', 'Com site: orçamento pelo <em>WhatsApp</em> em 1 toque', 'Peça a <em>prévia grátis</em> do seu. Link na bio'] }
];

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const servidor = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/__reel.html') { res.writeHead(200, { 'content-type': TIPOS['.html'] }); res.end(paginaReel); return; }
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(SITE, path.normalize(u));
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
let paginaReel = '';
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs').catch(() => import('playwright'));
const args = process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] : [];
const navegador = await chromium.launch({ args });
const LOGO = fs.readFileSync(path.join(SITE, 'img', 'logo.svg'), 'utf8');

for (const v of VIDEOS) {
  paginaReel = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Manrope:wght@700;800&display=swap">
<style>*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;overflow:hidden;background:${v.fundo};color:${v.tinta};font-family:Manrope,sans-serif;position:relative}
.topo{position:absolute;left:70px;top:70px;display:flex;align-items:center;gap:16px;font-family:"Bricolage Grotesque";font-weight:800;font-size:36px}.topo svg{width:64px;height:64px;border-radius:14px}
.fala{position:absolute;left:70px;right:70px;top:170px;height:300px;display:flex;align-items:center;font-family:"Bricolage Grotesque";font-weight:800;font-size:76px;line-height:1.02;letter-spacing:-.03em;opacity:0;transform:translateY(30px);transition:none}
.fala em{font-style:normal;color:${v.destaque}}
.cel{position:absolute;left:50%;top:500px;width:${390 * 1.62 + 24}px;height:${844 * 1.62 + 24}px;margin-left:-${(390 * 1.62 + 24) / 2}px;border-radius:70px;border:12px solid #0b0b0d;background:#0b0b0d;overflow:hidden;box-shadow:0 50px 100px -40px rgba(0,0,0,.6)}
.cel iframe{width:390px;height:844px;border:0;transform:scale(1.62);transform-origin:0 0;background:#fff}
</style></head><body>
<div class="topo">${LOGO}<span>Vitrine 61</span></div>
${v.falas.map((f, i) => `<div class="fala" id="f${i}"><div>${f}</div></div>`).join('')}
<div class="cel"><iframe id="q" src="${BASE}/exemplos/?n=${v.nicho}"></iframe></div>
</body></html>`;

  const pg = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await pg.goto(`${BASE}/__reel.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await pg.evaluate(() => document.fonts.ready);
  // Espera o site de exemplo terminar de desenhar dentro do iframe.
  await pg.waitForFunction(() => { const d = document.getElementById('q').contentDocument; return d && d.querySelector('.hero'); }, null, { timeout: 30000 });
  await pg.evaluate(() => {
    const d = document.getElementById('q').contentDocument;
    d.querySelectorAll('.revela').forEach(e => e.classList.add('in'));
    const s = d.createElement('style'); s.textContent = '.revela{transition:none!important}html{scroll-behavior:auto!important}.zap::after{animation:none!important}'; d.head.appendChild(s);
  });
  await pg.waitForTimeout(600);
  // Para no fim do site, na chamada final (o rodapé não precisa aparecer).
  const alturaMax = await pg.evaluate(() => {
    const d = document.getElementById('q').contentDocument, fim = d.querySelector('.final');
    const max = d.documentElement.scrollHeight - 844;
    return fim ? Math.min(max, fim.offsetTop - 260) : max;
  });

  const total = v.duracao * FPS;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
    path.join(SAIDA, v.arq + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });

  const suave = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const trecho = v.duracao / v.falas.length;
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    // Rola o site em 3 etapas, com pausas, para dar tempo de ler.
    const etapas = [[1.2, 4.2, 0, 0.32], [5.2, 8.6, 0.32, 0.7], [9.4, 12.6, 0.7, 1]];
    let frac = 0;
    for (const [a, b, de, ate] of etapas) { if (t >= b) frac = ate; else if (t > a) { frac = de + (ate - de) * suave((t - a) / (b - a)); break; } else break; }
    await pg.evaluate(([y, t, trecho, n]) => {
      document.getElementById('q').contentWindow.scrollTo(0, y);
      for (let k = 0; k < n; k++) {
        const el = document.getElementById('f' + k), ini = k * trecho, fim = ini + trecho;
        const ent = Math.min(1, Math.max(0, (t - ini) / 0.35)), sai = k === n - 1 ? 1 : Math.min(1, Math.max(0, (fim - t) / 0.3));
        const o = Math.min(ent, sai);
        el.style.opacity = o; el.style.transform = `translateY(${(1 - ent) * 30}px)`;
      }
    }, [Math.round(frac * alturaMax), t, trecho, v.falas.length]);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise(ok => ff.stdin.once('drain', ok));
  }
  ff.stdin.end();
  await new Promise((ok, erro) => ff.on('close', c => (c === 0 ? ok() : erro(new Error('ffmpeg ' + c)))));
  await pg.close();
  console.log('Vídeo:', v.arq + '.mp4', Math.round(fs.statSync(path.join(SAIDA, v.arq + '.mp4')).size / 1024) + ' KB');
}

await navegador.close();
servidor.close();
