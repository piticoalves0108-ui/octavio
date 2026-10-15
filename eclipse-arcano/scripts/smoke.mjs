// Teste de fumaça: compila (se preciso), sobe o preview, abre o jogo no Chromium
// headless, inicia um novo jogo, simula alguns segundos de entrada e coleta erros,
// métricas e uma captura de tela.
// Uso: node scripts/smoke.mjs [--quality=low|medium|high|ultra] [--no-build] [--seconds=8] [--shot=bench-results/smoke.png] [--query=autostart] [--port=4180] [--out=dist]
// Em paralelo com outros agentes, use --port e --out exclusivos (ex.: --port=4191 --out=.smoke/world).
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const seconds = Number(args.seconds ?? 8);
const shot = args.shot ?? 'bench-results/smoke.png';
const query = args.query ?? 'autostart';
const port = Number(args.port ?? 4180);
const outDir = args.out ?? 'dist';

if (!args['no-build']) execSync(`npx vite build --outDir ${outDir} --emptyOutDir`, { stdio: 'inherit' });
mkdirSync('bench-results', { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--outDir', outDir], { stdio: 'pipe' });
process.on('exit', () => server.kill());
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview não subiu')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('Local')) {
      clearTimeout(t);
      resolve();
    }
  });
});

const errors = [];
const warnings = [];
let exitCode = 0;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') errors.push(t);
    else if (m.type() === 'warning') warnings.push(t);
    else if (args.verbose) console.log('[page]', t);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  if (args.quality) {
    await page.addInitScript((q) => {
      try {
        const k = 'eclipse-arcano:settings';
        const cur = JSON.parse(localStorage.getItem(k) || '{}');
        localStorage.setItem(k, JSON.stringify({ ...cur, quality: q, overrides: {} }));
      } catch {}
    }, args.quality);
  }
  await page.goto(`http://localhost:${port}/?${query}`);
  await page.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 120000 });
  // Entrada simulada: andar, correr, girar câmera, pular, atacar
  const sim = async (code, ms) => {
    await page.evaluate((c) => window.__game.input.simulate(c, true), code);
    await page.waitForTimeout(ms);
    await page.evaluate((c) => window.__game.input.simulate(c, false), code);
  };
  await page.waitForTimeout(1000);
  await sim('KeyW', 1500);
  await page.evaluate(() => window.__game.input.simulate('ShiftLeft', true));
  await sim('KeyW', 1500);
  await page.evaluate(() => window.__game.input.simulate('ShiftLeft', false));
  await sim('Space', 200);
  await sim('Mouse0', 150);
  await page.waitForTimeout(Math.max(0, seconds * 1000 - 4500));
  const report = await page.evaluate(() => {
    const g = window.__game;
    const p = g.sys.player.entity.position;
    return { state: g.state, player: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), state: g.sys.player.state }, perf: g.sys.perf.report() };
  });
  console.log(JSON.stringify(report, null, 2));
  await page.screenshot({ path: shot, timeout: 120000 });
  console.log(`Captura: ${shot}`);
} catch (err) {
  exitCode = 1;
  console.error('FALHA:', err.message);
} finally {
  await browser.close();
  server.kill();
}
if (warnings.length) console.log(`Avisos (${warnings.length}):\n  ` + [...new Set(warnings)].slice(0, 15).join('\n  '));
if (errors.length) {
  console.log(`ERROS (${errors.length}):\n  ` + [...new Set(errors)].slice(0, 25).join('\n  '));
  exitCode = 1;
}
process.exit(exitCode);
