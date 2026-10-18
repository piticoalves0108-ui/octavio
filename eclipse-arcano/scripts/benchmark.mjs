// Benchmark automatizado (Playwright): compila, sobe o preview e roda cenários × qualidades,
// cada execução numa aba nova (localStorage limpo), lendo window.__benchResult (src/perf/Benchmark.ts).
//
// Uso:
//   npm run bench -- [--scenarios=vila_chuva,combate] [--qualities=low,medium,high,ultra]
//                    [--secs=10] [--warmup=3] [--runs=1] [--no-build] [--port=4310] [--out=.smoke/bench]
//                    [--width=800 --height=450] [--seed=1337] [--label=antes]
//                    [--gputimer] (tempo de GPU por EXT_disjoint_timer_query; ligado no --gpu)
//                    [--draws] (atribui as draw calls de 1 quadro por dono) [--shots] [--autoscale[=fps]]
//                    [--query=rigmerge=0&prewarm=0] (parâmetros extras na URL, para comparações A/B)
//                    [--cpuonly] (só simulação, sem rasterizar: custo de CPU dos sistemas sem o ruído do SwiftShader)
//                    [--overrides='{"shadowMapSize":0}'] (sobrescreve campos do preset: atribuição de custo por recurso)
//   npm run bench:gpu   → modo --gpu: janela visível, SEM SwiftShader, usando a GPU real do PC
//                         (opcional: --channel=chrome para usar o Chrome instalado; --vsync para manter o vsync)
//
// Saída: bench-results/benchmark-<modo>-<data>.json + tabela markdown no terminal.
// AVISO: no modo padrão (headless + SwiftShader) a renderização é feita pela CPU: o FPS NÃO representa
// uma GPU real. Compare CPU por sistema (ms), draw calls, triângulos e memória entre versões.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ALL_SCENARIOS = ['vila_chuva', 'voo_floresta', 'combate', 'chefe', 'tempestade', 'stress'];
const ALL_QUALITIES = ['low', 'medium', 'high', 'ultra'];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const gpu = !!args.gpu;
const list = (v, all) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : all);
const scenarios = list(args.scenarios, ALL_SCENARIOS);
const qualities = list(args.qualities, ALL_QUALITIES);
for (const s of scenarios) if (!ALL_SCENARIOS.includes(s)) throw new Error(`cenário desconhecido: ${s} (${ALL_SCENARIOS.join(', ')})`);
for (const q of qualities) if (!ALL_QUALITIES.includes(q)) throw new Error(`qualidade desconhecida: ${q}`);
const secs = Number(args.secs ?? 10);
const warmup = Number(args.warmup ?? 3);
const runs = Math.max(1, Number(args.runs ?? 1));
const port = Number(args.port ?? 4310);
const outDir = args.out ?? '.smoke/bench';
const width = Number(args.width ?? (gpu ? 1280 : 800));
const height = Number(args.height ?? (gpu ? 720 : 450));
const seed = Number(args.seed ?? 1337);
const label = typeof args.label === 'string' ? args.label : '';
const bootTimeout = Number(args['boot-timeout'] ?? 240) * 1000;
const overrides = typeof args.overrides === 'string' ? JSON.parse(args.overrides) : {};

if (!args['no-build']) execSync(`npx vite build --outDir ${outDir} --emptyOutDir`, { stdio: 'inherit' });
mkdirSync('bench-results', { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--outDir', outDir], { stdio: 'pipe' });
const killServer = () => {
  try {
    server.kill();
  } catch {}
};
process.on('exit', killServer);
process.on('SIGINT', () => {
  killServer();
  process.exit(130);
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview não subiu')), 30000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('Local')) {
      clearTimeout(t);
      resolve();
    }
  });
  server.on('exit', (c) => reject(new Error(`preview saiu (${c})`)));
});

const launchArgs = gpu
  ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-precise-memory-info', ...(args.vsync ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit'])]
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'];
const browser = await chromium.launch({
  headless: !gpu,
  args: launchArgs,
  ...(typeof args.channel === 'string' ? { channel: args.channel } : {}),
});

const results = [];
let failures = 0;
try {
  for (const quality of qualities) {
    for (const scenario of scenarios) {
      for (let run = 1; run <= runs; run++) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        await context.addInitScript(
          ([q, ov]) => {
            try {
              localStorage.setItem('eclipse-arcano:settings', JSON.stringify({ quality: q, overrides: ov, showFps: false }));
            } catch {}
          },
          [quality, overrides],
        );
        const page = await context.newPage();
        const errors = [];
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text().slice(0, 300));
          else if (args.verbose) console.log('[page]', m.text());
        });
        page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
        const extra = `${gpu || args.gputimer ? '&gputimer' : ''}${args.draws ? '&draws' : ''}${args.cpuonly ? '&cpuonly' : ''}${args.autoscale ? `&autoscale=${args.autoscale === true ? 45 : args.autoscale}` : ''}${typeof args.query === 'string' ? '&' + args.query.replace(/^[?&]/, '') : ''}`;
        const url = `http://localhost:${port}/?bench=${scenario}&secs=${secs}&warmup=${warmup}&quality=${quality}&seed=${seed}${extra}`;
        const t0 = Date.now();
        process.stdout.write(`→ ${scenario} @ ${quality} (exec. ${run}/${runs})… `);
        let res;
        try {
          await page.goto(url, { timeout: 120000 });
          await page.waitForFunction(() => window.__benchDone === true, null, { timeout: bootTimeout + (warmup + secs + 60) * 1000, polling: 1000 });
          res = await page.evaluate(() => window.__benchResult);
        } catch (err) {
          res = { ok: false, scenario, quality, error: String(err?.message ?? err).split('\n')[0] };
        }
        res = { ...res, run, wallSeconds: Math.round((Date.now() - t0) / 100) / 10, pageErrors: errors.slice(0, 20) };
        if (!res.ok) failures++;
        results.push(res);
        console.log(res.ok ? `${res.fps} FPS, CPU ${res.cpuMs?.mean} ms, draws ${res.drawCalls?.mean}` : `FALHOU: ${res.error ?? 'sem resultado'}`);
        if (args.shots && res.ok) {
          await page.screenshot({ path: `bench-results/perf-${scenario}-${quality}.png`, timeout: 120000 }).catch(() => {});
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  killServer();
}

// ---------- agregação e tabela ----------
const median = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const spread = (a) => {
  const s = a.filter((x) => Number.isFinite(x));
  return s.length > 1 ? Math.max(...s) - Math.min(...s) : 0;
};
const f = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));
const rows = [];
for (const quality of qualities) {
  for (const scenario of scenarios) {
    const rs = results.filter((r) => r.ok && r.scenario === scenario && r.quality === quality);
    if (!rs.length) {
      rows.push(`| ${scenario} | ${quality} | falhou | | | | | | | | | | | |`);
      continue;
    }
    const m = (fn) => median(rs.map(fn));
    const fps = m((r) => r.fps);
    const sp = spread(rs.map((r) => r.fps));
    const top = Object.entries(rs[0].systems ?? {})
      .filter(([k]) => k !== 'render' && k !== 'bench')
      .slice(0, 3)
      .map(([k]) => `${k} ${f(m((r) => r.systems?.[k]), 2)}`)
      .join(', ');
    rows.push(
      `| ${scenario} | ${quality} | ${f(fps)}${rs.length > 1 ? ` ±${f(sp / 2)}` : ''} | ${f(m((r) => r.frameMs?.p50))} | ${f(m((r) => r.frameMs?.p95))} | ${f(m((r) => r.frameMs?.p99))} | ${f(m((r) => r.low1Fps))} | ${f(m((r) => r.cpuMs?.mean), 2)} | ${f(m((r) => r.gpuMs?.mean), 2)} | ${f(m((r) => r.drawCalls?.mean), 0)} | ${f(m((r) => (r.triangles?.mean ?? NaN) / 1000), 0)}k | ${f(m((r) => r.renderSubmitMs?.p50), 2)} | ${f(m((r) => r.memory?.programsCompiled), 0)} | ${top} |`,
    );
  }
}
const header =
  '| cenário | qualidade | FPS | p50 ms | p95 ms | p99 ms | 1% low | CPU ms | GPU ms | draws | tris | render p50 ms | shaders novos | top sistemas (ms) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
const first = results.find((r) => r.ok);
const meta = {
  date: new Date().toISOString(),
  mode: (gpu ? 'gpu' : 'swiftshader') + (args.cpuonly ? '-cpuonly' : ''),
  label,
  viewport: [width, height],
  secs,
  warmup,
  runs,
  seed,
  query: typeof args.query === 'string' ? args.query : '',
  overrides,
  renderer: first?.renderer ?? null,
  userAgent: first?.userAgent ?? null,
};
const stamp = meta.date.replace(/[:.]/g, '-').slice(0, 19);
const file = `bench-results/benchmark-${meta.mode}${label ? '-' + label : ''}-${stamp}.json`;
writeFileSync(file, JSON.stringify({ meta, results }, null, 2));
console.log(`\nModo: ${meta.mode} — renderer: ${meta.renderer?.renderer ?? 'n/d'} — viewport ${width}×${height}, ${secs}s (+${warmup}s aquecimento) × ${runs} exec.`);
if (!gpu) console.log('AVISO: SwiftShader renderiza na CPU; o FPS não representa uma GPU real. Use npm run bench:gpu no seu PC.');
console.log('\n' + header + '\n' + rows.join('\n'));
console.log(`\nResultados: ${file}`);
process.exit(failures ? 1 : 0);
