// Gera tudo que depende de navegador: prévias dos prospects, prints dos exemplos,
// imagens de compartilhamento (WhatsApp/Instagram) e o .zip do site.
// Uso: node ferramentas/build.mjs            (precisa do Playwright com Chromium)
//      node ferramentas/build.mjs --sem-imagens   (só gera as páginas de prévia)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(RAIZ, 'site');
const SEM_IMAGENS = process.argv.includes('--sem-imagens');

const V = require(path.join(SITE, 'motor.js'));
const marca = (() => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(SITE, 'config.js'), 'utf8'), ctx);
  return ctx.window.VITRINE_CONFIG;
})();
const URL_SITE = String(marca.url || 'https://vitrine61.pages.dev').replace(/\/+$/, '');
const { prospects } = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dados', 'prospects.json'), 'utf8'));

const esc = V.esc;
const escreve = (arq, conteudo) => { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, conteudo); };

// ------------------------------------------------------------------ 1. páginas de prévia
// HTML estático com as etiquetas de compartilhamento (o WhatsApp lê só o <head>)
// e o site desenhado na hora com o config.js atual (assim, trocar o WhatsApp da marca vale para todas).
function paginaPrevia(p) {
  const c = V.normalizar(p.cfg);
  const titulo = 'Prévia do site: ' + c.nome;
  const desc = 'Veja como ficaria o site da ' + c.nome + '. Toque para abrir no celular.';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(URL_SITE + '/previa/' + p.id + '/og.jpg')}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(URL_SITE + '/previa/' + p.id + '/')}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>
<script>window.CFG = ${JSON.stringify(p.cfg).replace(/</g, '\\u003c')};</script>
<script src="../../config.js"></script>
<script src="../../motor.js"></script>
<script>
(function () {
  var m = window.VITRINE_CONFIG || {};
  var cfg = window.CFG; cfg.modo = 'previa';
  cfg.agencia = { nome: m.nome, whatsapp: m.whatsapp, url: m.url, preco: m.preco };
  Vitrine.substituirPagina(Vitrine.gerarSite(cfg));
})();
</script>
<noscript>Abra este link no navegador do celular para ver a prévia.</noscript>
</body>
</html>
`;
}

for (const p of prospects) escreve(path.join(SITE, 'previa', p.id, 'index.html'), paginaPrevia(p));
// Lista para o botão "Importar lista pronta" da Fábrica.
escreve(path.join(SITE, 'fabrica', 'lista.json'), JSON.stringify([...prospects].sort((a, b) => a.prioridade - b.prioridade).map(p => ({ id: p.id, canal: p.canal, prioridade: p.prioridade, cfg: p.cfg }))));

// Endereço absoluto das imagens de compartilhamento.
for (const arq of ['index.html', 'p/index.html']) {
  const f = path.join(SITE, arq);
  const s = fs.readFileSync(f, 'utf8').replace(/https:\/\/[a-z0-9.-]+\/img\/og-/g, URL_SITE + '/img/og-');
  fs.writeFileSync(f, s);
}

// Lista de links de prévia para mandar (vai para a pasta de vendas).
const linhas = ['# Links de prévia prontos', '', `Base: ${URL_SITE} (troque em site/config.js e rode o build de novo se o seu endereço for outro)`, '',
  '| Prioridade | Comércio | Canal | Link da prévia | Imagem para mandar junto | De onde vieram os dados |', '|---|---|---|---|---|---|'];
for (const p of [...prospects].sort((a, b) => a.prioridade - b.prioridade)) {
  linhas.push(`| ${p.prioridade} | ${p.cfg.nome} | ${p.canal} | ${URL_SITE}/previa/${p.id}/ | imagens/previas/${p.id}.jpg | ${p.fonte || ''} |`);
}
escreve(path.join(RAIZ, 'LINKS-DAS-PREVIAS.md'), linhas.join('\n') + '\n');
console.log('Prévias geradas:', prospects.length);

if (SEM_IMAGENS) process.exit(0);

// ------------------------------------------------------------------ 2. servidor local + navegador
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(SITE, path.normalize(u));
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs').catch(() => import('playwright'));
const args = process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] : [];
const navegador = await chromium.launch({ args });

async function printCelular(url, escala = 2) {
  const pg = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: escala });
  await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(() => document.querySelectorAll('.revela').forEach(e => e.classList.add('in')));
  await pg.addStyleTag({ content: '.revela{transition:none!important}.zap::after{animation:none!important}' });
  await pg.waitForTimeout(400);
  const buf = await pg.screenshot({ type: 'jpeg', quality: 82 });
  await pg.close();
  return buf;
}

async function render(html, w, h, saida, tipo = 'jpeg') {
  const pg = await navegador.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await pg.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(200);
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  await pg.screenshot({ path: saida, type: tipo, ...(tipo === 'jpeg' ? { quality: 86 } : {}) });
  await pg.close();
}

const dataUrl = (buf, tipo = 'image/jpeg') => `data:${tipo};base64,${buf.toString('base64')}`;
const LOGO = fs.readFileSync(path.join(SITE, 'img', 'logo.svg'), 'utf8');
const FONTES = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@500;600;700;800&display=swap">';
const BASE_CSS = `*{box-sizing:border-box}body{margin:0;font-family:Manrope,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,b.t{font-family:"Bricolage Grotesque",Manrope,sans-serif;letter-spacing:-.03em;line-height:1}
.cel{border-radius:46px;border:11px solid #111;overflow:hidden;background:#111;box-shadow:0 40px 80px -30px rgba(10,12,40,.55)}
.cel img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.logo{display:flex;align-items:center;gap:14px;font-family:"Bricolage Grotesque";font-weight:800;letter-spacing:-.02em}
.logo svg{border-radius:14px}`;
const logoTag = (tam, cor = '#14151A', fonte = 30) => `<div class="logo" style="color:${cor};font-size:${fonte}px">${LOGO.replace('<svg ', `<svg width="${tam}" height="${tam}" `)}<span>${esc(marca.nome)}</span></div>`;

// ------------------------------------------------------------------ 3. prints dos exemplos
const NICHOS_EX = ['barbearia', 'pizzaria', 'petshop', 'oficina', 'salao', 'lanchonete', 'padaria', 'academia', 'restaurante', 'gas', 'loja', 'saude', 'servicos'];
const prints = {};
for (const n of NICHOS_EX) {
  prints[n] = await printCelular(`${BASE}/exemplos/?n=${n}`);
  escreve(path.join(SITE, 'img', 'exemplos', n + '.jpg'), prints[n]);
}
console.log('Prints dos exemplos:', NICHOS_EX.length);

// ------------------------------------------------------------------ 4. imagens das prévias
for (const p of prospects) {
  const shot = dataUrl(await printCelular(`${BASE}/previa/${p.id}/`));
  const nome = esc(p.cfg.nome);
  const t = V.TEMAS[p.cfg.nicho];
  // 1200x630 para a pré-visualização do link no WhatsApp
  await render(`<!doctype html><html><head>${FONTES}<style>${BASE_CSS}
    body{width:1200px;height:630px;background:${t.fundo2};color:${t.texto};display:flex;align-items:center;gap:60px;padding:0 70px;overflow:hidden;position:relative}
    .txt{flex:1}.olho{font-weight:800;font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:${t.destaque}}
    h1{font-size:${p.cfg.nome.length > 24 ? 64 : 76}px;margin:18px 0 22px}
    p{font-size:28px;margin:0 0 34px;opacity:.8}
    .bt{display:inline-block;background:${t.destaque};color:${t.sobre};font-weight:800;font-size:26px;padding:16px 30px;border-radius:999px}
    .cel{width:300px;height:649px;margin-top:150px;flex:none}</style></head><body>
    <div class="txt"><div class="olho">Prévia do site</div><h1>${nome}</h1><p>Veja como ficaria no celular.</p><span class="bt">Toque para abrir</span></div>
    <div class="cel"><img src="${shot}"></div></body></html>`, 1200, 630, path.join(SITE, 'previa', p.id, 'og.jpg'));
  // 1080x1350 para mandar como imagem no WhatsApp ou no direct
  await render(`<!doctype html><html><head>${FONTES}<style>${BASE_CSS}
    body{width:1080px;height:1350px;background:${t.fundo2};color:${t.texto};padding:80px 80px 0;overflow:hidden;text-align:center}
    .olho{font-weight:800;font-size:28px;letter-spacing:.14em;text-transform:uppercase;color:${t.destaque}}
    h1{font-size:${p.cfg.nome.length > 24 ? 70 : 84}px;margin:22px auto 18px;max-width:900px}
    p{font-size:32px;margin:0 0 50px;opacity:.78}
    .cel{width:470px;height:1017px;margin:0 auto}</style></head><body>
    <div class="olho">Fizemos uma prévia do seu site</div><h1>${nome}</h1><p>Toque no link da mensagem para ver no celular</p>
    <div class="cel"><img src="${shot}"></div></body></html>`, 1080, 1350, path.join(RAIZ, 'imagens', 'previas', p.id + '.jpg'));
}
console.log('Imagens das prévias:', prospects.length);

// ------------------------------------------------------------------ 5. imagens da marca
const fotoEx = n => dataUrl(prints[n]);
const AZUL = '#2E4BFF', AMARELO = '#FFD24A', TINTA = '#14151A', PAPEL = '#F4F3EF';
const check = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${AZUL}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

// compartilhamento da home e do link genérico de prévia
await render(`<!doctype html><html><head>${FONTES}<style>${BASE_CSS}
  body{width:1200px;height:630px;background:${PAPEL};color:${TINTA};display:flex;align-items:center;gap:40px;padding:0 70px;overflow:hidden}
  .txt{flex:1}h1{font-size:74px;margin:28px 0 20px}h1 em{font-style:normal;color:${AZUL}}p{font-size:28px;margin:0;color:#575A68}
  .cel{width:290px;height:627px;margin-top:150px;flex:none}</style></head><body>
  <div class="txt">${logoTag(56)}<h1>Site profissional em <em>48 horas</em></h1><p>${esc(marca.preco)}, pagamento único. Você vê a prévia antes de pagar.</p></div>
  <div class="cel"><img src="${fotoEx('barbearia')}"></div><div class="cel" style="margin-top:250px"><img src="${fotoEx('pizzaria')}"></div></body></html>`, 1200, 630, path.join(SITE, 'img', 'og-home.png'), 'png');
await render(`<!doctype html><html><head>${FONTES}<style>${BASE_CSS}
  body{width:1200px;height:630px;background:${TINTA};color:#fff;display:flex;align-items:center;gap:40px;padding:0 70px;overflow:hidden}
  .txt{flex:1}h1{font-size:80px;margin:28px 0 22px}h1 em{font-style:normal;color:${AMARELO}}p{font-size:28px;margin:0;opacity:.8}
  .cel{width:300px;height:649px;margin-top:150px;flex:none;border-color:#2b2c33}</style></head><body>
  <div class="txt">${logoTag(56, '#fff')}<h1>Prévia do seu <em>novo site</em></h1><p>Toque para ver como ficaria no celular.</p></div>
  <div class="cel"><img src="${fotoEx('petshop')}"></div></body></html>`, 1200, 630, path.join(SITE, 'img', 'og-previa.png'), 'png');

// foto de perfil (Instagram e WhatsApp Business)
await render(`<!doctype html><html><head>${FONTES}<style>body{margin:0;width:1080px;height:1080px;background:${AZUL};display:grid;place-items:center}svg{width:760px;height:760px;display:block}</style></head><body>${LOGO}</body></html>`, 1080, 1080, path.join(RAIZ, 'imagens', 'instagram', '00-foto-de-perfil.png'), 'png');

// posts 1080x1350
const POSTS = [
  ['01-seu-negocio-sem-site', `body{background:${AZUL};color:#fff}h1{font-size:118px;margin:46px 0 30px}h1 em{font-style:normal;color:${AMARELO}}p{font-size:40px;margin:0;opacity:.92;max-width:560px}
    .cel{position:absolute;right:-20px;bottom:-330px;width:440px;height:952px;transform:rotate(-8deg);border-color:#111;z-index:1}`,
    `${logoTag(70, '#fff', 38)}<h1>Seu negócio ainda <em>não tem site?</em></h1><p>Site profissional em 48 horas por ${esc(marca.preco)}. Você vê a prévia antes de pagar.</p><div class="cel"><img src="${fotoEx('barbearia')}"></div>`],
  ['02-site-gratis-do-google-acabou', `body{background:${TINTA};color:#fff}h1{font-size:112px;margin:46px 0 34px}h1 em{font-style:normal;color:${AMARELO}}p{font-size:40px;margin:0 0 26px;opacity:.86;max-width:900px}
    .tag{display:inline-block;background:${AMARELO};color:${TINTA};font-weight:800;font-size:30px;padding:12px 26px;border-radius:999px;margin-top:30px}`,
    `${logoTag(70, '#fff', 38)}<h1>O site grátis do Google <em>acabou.</em></h1><p>Em 2024 o Google desativou os sites feitos pelo Perfil da Empresa (o antigo Google Meu Negócio).</p><p>Quem tinha site por lá ficou sem. Quem nunca teve continua invisível.</p><span class="tag">Seu site próprio: ${esc(marca.preco)}, pagamento único</span>`],
  ['03-o-que-vem-no-site', `body{background:${PAPEL};color:${TINTA}}h1{font-size:96px;margin:46px 0 44px}ul{list-style:none;margin:0;padding:0;display:grid;gap:26px}li{display:flex;gap:22px;align-items:center;font-size:46px;font-weight:700}ul{gap:30px}`,
    `${logoTag(70, TINTA, 38)}<h1>O que vem no seu site</h1><ul>${['Botão de WhatsApp com mensagem pronta', 'Mapa e botão "Como chegar"', 'Aviso de aberto ou fechado agora', 'Serviços ou cardápio com preços', 'Suas fotos', 'Pronto para o Google', 'Hospedagem grátis inclusa'].map(x => `<li>${check}${x}</li>`).join('')}</ul>`],
  ['04-como-funciona', `body{background:${PAPEL};color:${TINTA}}h1{font-size:104px;margin:46px 0 50px}ol{list-style:none;margin:0;padding:0;display:grid;gap:30px;counter-reset:p}
    li{counter-increment:p;display:flex;gap:28px;align-items:flex-start;font-size:42px;font-weight:600}ol{gap:40px}li::before{content:counter(p);flex:none;width:76px;height:76px;border-radius:50%;background:${AZUL};color:#fff;display:grid;place-items:center;font-family:"Bricolage Grotesque";font-weight:800;font-size:40px}
    li b{display:block;font-size:48px;font-family:"Bricolage Grotesque";letter-spacing:-.02em}`,
    `${logoTag(70, TINTA, 38)}<h1>Como funciona</h1><ol><li><div><b>Você chama no WhatsApp</b>Manda nome, endereço e Instagram.</div></li><li><div><b>Recebe a prévia em 24h</b>Vê o site pronto no celular.</div></li><li><div><b>Pede ajustes</b>Fotos, preços e textos.</div></li><li><div><b>Aprova e paga</b>${esc(marca.preco)} no Pix e o site entra no ar.</div></li></ol>`],
  ['05-exemplos', `body{background:${TINTA};color:#fff}h1{font-size:100px;margin:40px 0 46px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}.cel{height:500px;border-width:7px;border-radius:30px;border-color:#2b2c33}.g span{display:block;text-align:center;font-weight:800;font-size:28px;margin-top:16px}`,
    `${logoTag(70, '#fff', 38)}<h1>Um site para cada ramo</h1><div class="g">${['barbearia:Barbearia', 'pizzaria:Pizzaria', 'petshop:Pet shop', 'oficina:Oficina'].map(x => { const [n, r] = x.split(':'); return `<div><div class="cel"><img src="${fotoEx(n)}"></div><span>${r}</span></div>`; }).join('')}</div>`],
  ['06-precos', `body{background:${PAPEL};color:${TINTA}}h1{font-size:100px;margin:46px 0 40px}.c{background:#fff;border:2px solid rgba(0,0,0,.08);border-radius:34px;padding:34px 40px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center;gap:20px}
    .c.top{border:4px solid ${AZUL}}.c b{font-family:"Bricolage Grotesque";font-size:46px;letter-spacing:-.02em}.c small{display:block;font-size:28px;color:#575A68;font-weight:600;margin-top:6px}.v{font-family:"Bricolage Grotesque";font-weight:800;font-size:64px;letter-spacing:-.03em;white-space:nowrap}.v span{font-size:28px;color:#575A68;font-family:Manrope}`,
    `${logoTag(70, TINTA, 38)}<h1>Preço justo, sem pegadinha</h1>
    <div class="c top"><div><b>Site Profissional</b><small>Pronto em 48h · hospedagem grátis</small></div><div class="v">${esc(marca.preco)}<span> único</span></div></div>
    <div class="c"><div><b>Site Sempre em Dia</b><small>Até 4 mudanças por mês · opcional</small></div><div class="v">${esc(marca.precoMensal || 'R$39,90')}<span>/mês</span></div></div>
    <div class="c"><div><b>Reels Editados</b><small>6 vídeos por mês · você grava, a gente edita</small></div><div class="v">${esc(marca.precoReels || 'R$250')}<span>/mês</span></div></div>`]
];
const RODAPE = `<div class="rod"><span>Peça a prévia do seu site, sem compromisso</span><b>Link na bio →</b></div>`;
for (const [arq, css, corpo] of POSTS) {
  await render(`<!doctype html><html><head>${FONTES}<style>${BASE_CSS}body{width:1080px;height:1350px;padding:90px 90px 80px;overflow:hidden;position:relative;display:flex;flex-direction:column}
    .rod{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:26px 34px;border-radius:24px;background:${AMARELO};color:${TINTA};font-size:30px;font-weight:700;position:relative;z-index:2}.rod b{font-family:"Bricolage Grotesque";font-size:34px;white-space:nowrap}
    ${css}</style></head><body>${corpo}${RODAPE}</body></html>`,
    1080, 1350, path.join(RAIZ, 'imagens', 'instagram', arq + '.png'), 'png');
}
console.log('Imagens da marca: ok');

await navegador.close();
servidor.close();

// ------------------------------------------------------------------ 6. .zip para subir na Cloudflare
const zip = path.join(RAIZ, 'vitrine61-site.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.', '-x', '.*'], { cwd: SITE });
console.log('Zip:', path.relative(RAIZ, zip), Math.round(fs.statSync(zip).size / 1024) + ' KB');
