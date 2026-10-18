// Teste de memória / vazamentos (Playwright + Chromium SwiftShader).
//
//   npm run bench:memory -- [--no-build] [--port=4310] [--out=.smoke/perf] [--cycles=5] [--combat=120]
//                           [--quality=low] [--width=400 --height=225] [--query=rigmerge=0] [--label=depois]
//
// Fase 1 — ciclos de jogo: menu → (novo jogo → espera → volta ao menu) × N → novo jogo.
//   Depois de cada "novo jogo" mede geometrias, texturas, programas de shader, heap (após GC),
//   entidades e objetos na cena. Esses números NÃO podem crescer de ciclo em ciclo.
// Fase 2 — combate contínuo: `--combat` segundos REAIS com inimigos nascendo (ai.spawnEnemy) e
//   morrendo (combat.applyDamage → dissolução → remoção), magias sendo conjuradas. Amostras a cada
//   10 s; depois do aquecimento os contadores devem estabilizar (sem crescer com as mortes).
//
// Saída: bench-results/perf-memory-<data>.json + resumo no terminal. Código de saída 1 se houver
// suspeita de vazamento (limites abaixo) ou erro de página.
// O viewport é pequeno de propósito (o teste mede memória, não imagem): mais quadros por segundo
// no SwiftShader = mais tempo de jogo simulado.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const port = Number(args.port ?? 4310);
const outDir = args.out ?? '.smoke/perf';
const cycles = Math.max(1, Number(args.cycles ?? 5));
const combatSecs = Math.max(0, Number(args.combat ?? 120));
const quality = typeof args.quality === 'string' ? args.quality : 'low';
const width = Number(args.width ?? 400);
const height = Number(args.height ?? 225);
const query = typeof args.query === 'string' ? '&' + args.query.replace(/^[?&]/, '') : '';
const label = typeof args.label === 'string' ? args.label : '';

if (!args['no-build']) execSync(`npx vite build --outDir ${outDir} --emptyOutDir`, { stdio: 'inherit' });
mkdirSync('bench-results', { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--outDir', outDir], { stdio: 'pipe' });
const killServer = () => {
  try {
    server.kill();
  } catch {}
};
process.on('exit', killServer);
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

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'],
});
const errors = [];
const report = { date: new Date().toISOString(), quality, viewport: [width, height], query, cycles: [], combat: [], verdict: {} };
let exitCode = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Amostra (com GC forçado antes). */
const sample = (page, label) =>
  page.evaluate(async (label) => {
    const g = window.__game;
    for (let i = 0; i < 3; i++) {
      window.gc?.();
      await new Promise((r) => setTimeout(r, 50));
    }
    const info = g.renderer.info;
    let objects = 0;
    g.scene.traverse(() => objects++);
    const ents = g.entities;
    const kinds = {};
    for (const e of ents.all ?? []) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    const m = performance.memory;
    return {
      label,
      t: +g.elapsed.toFixed(1),
      state: g.state,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null,
      entities: (ents.all ?? []).length,
      kinds,
      sceneObjects: objects,
      drv: window.__memDriver ? { ...window.__memDriver, list: undefined } : null,
    };
  }, label);

try {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript((q) => {
    try {
      localStorage.setItem('eclipse-arcano:settings', JSON.stringify({ quality: q, overrides: {}, showFps: false }));
    } catch {}
  }, quality);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // ?nointro: cinemáticas resolvidas na hora (o teste precisa do estado 'playing')
  await page.goto(`http://localhost:${port}/?memtest&nointro${query}`, { timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'menu', null, { timeout: 240000, polling: 500 });
  await wait(1500);

  // ---------------- Fase 1: ciclos novo jogo → menu ----------------
  console.log(`Fase 1: ${cycles} ciclos (novo jogo → menu) + novo jogo final`);
  for (let i = 0; i <= cycles; i++) {
    await page.evaluate(() => window.__game.newGame());
    await wait(4000);
    const s = await sample(page, `jogo ${i + 1}`);
    report.cycles.push(s);
    console.log(`  jogo ${i + 1}: geo ${s.geometries} tex ${s.textures} prog ${s.programs} heap ${s.heapMB} MB ent ${s.entities} obj ${s.sceneObjects}`);
    if (i < cycles) {
      await page.evaluate(() => window.__game.quitToMenu());
      await wait(1500);
    }
  }

  // ---------------- Fase 2: combate contínuo ----------------
  if (combatSecs > 0) {
    console.log(`Fase 2: ${combatSecs} s de combate (nascer/morrer contínuo)`);
    await page.evaluate(() => {
      const g = window.__game;
      const TYPES = ['corvo_saqueador', 'lobo_sombrio', 'corva_arqueira', 'automato_sentinela', 'mago_corrompido', 'cavaleiro_encantado', 'golem_ruinas', 'espreitador', 'cacador_furtivo', 'corvo_cristal'];
      const SPELLS = ['arcaneOrb', 'runicBlast', 'lightningStorm', 'etherealBlades', 'arcaneChains', 'dimensionalRift'];
      const drv = (window.__memDriver = { spawned: 0, killed: 0, casts: 0, errors: 0, alive: 0, list: [] });
      const pl = g.sys.player;
      const center = pl.position.clone();
      const anchor = g.sys.world.placePosition?.('campina_cervos', pl.position.clone());
      if (anchor) center.copy(anchor);
      pl.teleport(center, 0);
      pl.health.immortal = true;
      if (g.sys.ai) g.sys.ai.ambient = false;
      for (const id of SPELLS) {
        try {
          g.sys.abilities.unlock(id);
        } catch {}
      }
      const tmp = pl.position.clone();
      let spawnT = 0,
        killT = 2,
        castT = 0,
        last = g.elapsed,
        idx = 0,
        spell = 0;
      const tick = () => {
        requestAnimationFrame(tick);
        // cinemática que escapou do ?nointro: pula (o teste mede combate)
        if (g.state === 'cinematic') g.sys.quests?.cine?.skip?.();
        if (g.state !== 'playing') return;
        const dt = g.elapsed - last;
        last = g.elapsed;
        pl.health.immortal = true;
        pl.restoreEnergy?.(1e6);
        // mantém 8 inimigos vivos
        for (let i = drv.list.length - 1; i >= 0; i--) if (drv.list[i].removed || !drv.list[i].alive) drv.list.splice(i, 1);
        drv.alive = drv.list.length;
        spawnT -= dt;
        if (spawnT <= 0 && drv.list.length < 8) {
          spawnT = 0.4;
          const a = idx * 2.39996;
          const r = 8 + ((idx * 0.618034) % 1) * 8;
          tmp.set(center.x + Math.cos(a) * r, center.y, center.z + Math.sin(a) * r);
          tmp.y = g.physics.groundHeight(tmp.x, tmp.z, g.heightfield.heightAt(tmp.x, tmp.z) + 1.6);
          try {
            const e = g.sys.ai.spawnEnemy(TYPES[idx % TYPES.length], tmp, { aggro: true });
            if (e) {
              drv.list.push(e);
              drv.spawned++;
            }
          } catch {
            drv.errors++;
          }
          idx++;
        }
        // mata o mais antigo a cada 1,2 s de jogo
        killT -= dt;
        if (killT <= 0 && drv.list.length) {
          killT = 1.2;
          const e = drv.list[0];
          try {
            g.sys.combat.applyDamage(e, { amount: (e.health?.max ?? 100) * 4 + 1000, type: 'arcane', source: pl.entity, tag: 'memtest', point: e.position });
            drv.killed++;
          } catch {
            drv.errors++;
          }
        }
        // magias (efeitos, projéteis, luzes)
        castT -= dt;
        if (castT <= 0) {
          castT = 0.7;
          const ab = g.sys.abilities;
          if (!ab.currentCast?.()) {
            ab.cooldowns?.clear?.();
            const near = drv.list[drv.list.length - 1];
            if (near) g.sys.camera?.setLockTarget?.(near);
            try {
              if (ab.tryCast(SPELLS[spell++ % SPELLS.length])) drv.casts++;
            } catch {
              drv.errors++;
            }
          }
        }
      };
      tick();
    });
    const t0 = Date.now();
    while (Date.now() - t0 < combatSecs * 1000) {
      await wait(10000);
      const s = await sample(page, `combate ${Math.round((Date.now() - t0) / 1000)}s`);
      report.combat.push(s);
      console.log(
        `  ${s.label}: jogo ${s.t}s, geo ${s.geometries} tex ${s.textures} prog ${s.programs} heap ${s.heapMB} MB ent ${s.entities} obj ${s.sceneObjects} | nasc ${s.drv?.spawned} mortos ${s.drv?.killed} magias ${s.drv?.casts}`,
      );
    }
  }
  await context.close();
} catch (err) {
  errors.push('FALHA: ' + (err?.message ?? err));
  exitCode = 1;
} finally {
  await browser.close();
  killServer();
}

// ---------------- Veredito ----------------
const v = report.verdict;
const problems = [];
if (report.cycles.length >= 3) {
  // compara o 2º jogo (já com tudo carregado uma vez) com o último
  const a = report.cycles[1];
  const b = report.cycles[report.cycles.length - 1];
  v.cycles = {
    geometries: b.geometries - a.geometries,
    textures: b.textures - a.textures,
    programs: b.programs - a.programs,
    heapMB: a.heapMB !== null && b.heapMB !== null ? +(b.heapMB - a.heapMB).toFixed(1) : null,
    entities: b.entities - a.entities,
    sceneObjects: b.sceneObjects - a.sceneObjects,
  };
  if (v.cycles.textures > 2) problems.push(`ciclos: texturas +${v.cycles.textures}`);
  if (v.cycles.geometries > 20) problems.push(`ciclos: geometrias +${v.cycles.geometries}`);
  if (v.cycles.entities > 2) problems.push(`ciclos: entidades +${v.cycles.entities}`);
  if (v.cycles.sceneObjects > 40) problems.push(`ciclos: objetos na cena +${v.cycles.sceneObjects}`);
  if (v.cycles.heapMB !== null && v.cycles.heapMB > 20) problems.push(`ciclos: heap +${v.cycles.heapMB} MB`);
}
if (report.combat.length >= 4) {
  // ignora o primeiro terço (streaming do terreno, primeiros rigs) e compara o resto
  const start = report.combat[Math.floor(report.combat.length / 3)];
  const end = report.combat[report.combat.length - 1];
  const kills = (end.drv?.killed ?? 0) - (start.drv?.killed ?? 0);
  v.combat = {
    from: start.label,
    to: end.label,
    kills,
    spawned: (end.drv?.spawned ?? 0) - (start.drv?.spawned ?? 0),
    geometries: end.geometries - start.geometries,
    textures: end.textures - start.textures,
    programs: end.programs - start.programs,
    heapMB: start.heapMB !== null && end.heapMB !== null ? +(end.heapMB - start.heapMB).toFixed(1) : null,
    entities: end.entities - start.entities,
    sceneObjects: end.sceneObjects - start.sceneObjects,
  };
  const perKill = (x) => (kills > 0 ? x / kills : 0);
  if (kills < 5) problems.push(`combate: poucas mortes no período (${kills}) — teste inconclusivo`);
  if (v.combat.textures > 3 && perKill(v.combat.textures) > 0.2) problems.push(`combate: texturas +${v.combat.textures} em ${kills} mortes`);
  if (v.combat.geometries > 10 && perKill(v.combat.geometries) > 0.2) problems.push(`combate: geometrias +${v.combat.geometries} em ${kills} mortes`);
  if (v.combat.programs > 2) problems.push(`combate: programas de shader +${v.combat.programs}`);
  if (v.combat.entities > 12) problems.push(`combate: entidades +${v.combat.entities}`);
  if (v.combat.sceneObjects > 60) problems.push(`combate: objetos na cena +${v.combat.sceneObjects}`);
  if (v.combat.heapMB !== null && v.combat.heapMB > 25) problems.push(`combate: heap +${v.combat.heapMB} MB`);
}
v.problems = problems;
report.errors = [...new Set(errors)].slice(0, 30);
const stamp = report.date.replace(/[:.]/g, '-').slice(0, 19);
const file = `bench-results/perf-memory-${label ? label + '-' : ''}${stamp}.json`;
writeFileSync(file, JSON.stringify(report, null, 2));
console.log('\nVeredito:', JSON.stringify({ cycles: v.cycles, combat: v.combat }, null, 1));
if (problems.length) {
  console.log('SUSPEITAS DE VAZAMENTO:\n  ' + problems.join('\n  '));
  exitCode = 1;
} else console.log('Sem crescimento suspeito.');
if (report.errors.length) {
  console.log(`Erros de página (${report.errors.length}):\n  ` + report.errors.join('\n  '));
  exitCode = 1;
}
console.log(`Resultados: ${file}`);
process.exit(exitCode);
