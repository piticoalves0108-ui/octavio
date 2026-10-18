// Teste ponta a ponta (Playwright + Chromium/SwiftShader): joga de verdade com entrada simulada
// (teclado e mouse no canvas). `window.__game` é usado para LER estado e, quando registrado como
// "atalho", para teleportar em trajetos longos ou acelerar o que é lento no SwiftShader.
//
// Uso: node scripts/e2e.mjs [--no-build] [--port=4311] [--out=.smoke/qa-core] [--steps=a,b,...]
//                           [--quality=low] [--size=800x450] [--shots=bench-results/e2e] [--report=...]
// Etapas (na ordem): boot, newgame, walk, flight, combat, death, boss, nav, save, reload, quickload, robust
// Partes que dependem de rpg/narrativa/ui/áudio são opcionais: o script detecta o que existe.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const PORT = Number(args.port ?? 4311);
const OUT = args.out ?? '.smoke/qa-core';
const SHOTS = args.shots ?? 'bench-results/e2e';
const REPORT = args.report ?? `${SHOTS}/e2e-report.json`;
const QUALITY = args.quality ?? 'low';
const [VW, VH] = String(args.size ?? '800x450').split('x').map(Number);
const ALL_STEPS = ['boot', 'newgame', 'walk', 'flight', 'combat', 'death', 'boss', 'nav', 'save', 'reload', 'quickload', 'robust'];
const STEPS = args.steps ? String(args.steps).split(',').map((s) => s.trim()) : ALL_STEPS;
const PLAYER_START = { x: -520, z: 553 };

if (!args['no-build']) execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, { stdio: 'inherit' });
mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUT], { stdio: 'pipe' });
const killServer = () => {
  try {
    server.kill();
  } catch {
    /* já encerrado */
  }
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
});

// ------------------------------------------------------------------ estado do relatório
const report = { startedAt: new Date().toISOString(), quality: QUALITY, viewport: `${VW}x${VH}`, steps: [], console: { errors: [], warnings: [], expectedErrors: [] }, ok: false };
let cur = null; // etapa atual
let expectErrors = false;
let shotN = 0;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: VW, height: VH } });
const page = await context.newPage();
page.setDefaultTimeout(180000);
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') (expectErrors ? report.console.expectedErrors : report.console.errors).push(`[${cur?.step ?? '-'}] ${t}`);
  else if (m.type() === 'warning') report.console.warnings.push(`[${cur?.step ?? '-'}] ${t}`);
  else if (args.verbose) console.log('[page]', t);
});
page.on('pageerror', (e) => (expectErrors ? report.console.expectedErrors : report.console.errors).push(`[${cur?.step ?? '-'}] pageerror: ${e.message}`));
await page.addInitScript((q) => {
  try {
    const k = 'eclipse-arcano:settings';
    const c = JSON.parse(localStorage.getItem(k) || '{}');
    localStorage.setItem(k, JSON.stringify({ ...c, quality: q, overrides: {} }));
  } catch {
    /* sem armazenamento */
  }
}, QUALITY);

// ------------------------------------------------------------------ utilitários
const ev = (fn, arg) => page.evaluate(fn, arg);
function check(name, ok, info) {
  const c = { name, ok: !!ok, info };
  cur.checks.push(c);
  console.log(`  ${ok ? 'OK   ' : 'FALHA'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 300) : ''}`);
  return !!ok;
}
function shortcut(text) {
  cur.shortcuts.push(text);
  console.log(`  [atalho] ${text}`);
}
async function waitSim(s) {
  const t0 = await ev(() => window.__game.elapsed);
  await page.waitForFunction((t) => window.__game.elapsed >= t, t0 + s, { timeout: 60000 + s * 30000, polling: 40 });
}
async function waitFrames(n = 2) {
  const f0 = await ev(() => window.__game.frame);
  await page.waitForFunction((f) => window.__game.frame >= f, f0 + n, { timeout: 120000, polling: 30 });
}
/** Espera uma condição (função do navegador) por até `simS` segundos de jogo. */
async function waitUntil(fn, simS, arg) {
  const t0 = await ev(() => window.__game.elapsed);
  for (;;) {
    if (await ev(fn, arg)) return true;
    const t = await ev(() => window.__game.elapsed);
    if (t - t0 > simS) return false;
    await waitFrames(1);
  }
}
async function hold(key, s) {
  await page.keyboard.down(key);
  await waitSim(s);
  await page.keyboard.up(key);
}
async function tap(key) {
  await page.keyboard.down(key);
  await waitFrames(2);
  await page.keyboard.up(key);
  await waitFrames(1);
}
async function click(button = 'left', holdS = 0) {
  await page.mouse.move(VW / 2, VH / 2);
  await page.mouse.down({ button });
  if (holdS > 0) await waitSim(holdS);
  else await waitFrames(2);
  await page.mouse.up({ button });
}
/** Renderização desligada = simulação muito mais rápida no SwiftShader (atalho de desempenho do teste). */
let fastOn = false;
async function fast(on) {
  fastOn = on;
  await ev((on) => {
    const g = window.__game;
    if (!g.__realRender) g.__realRender = g.render;
    g.render = on
      ? () => {
          g.scene.updateMatrixWorld();
          g.camera.updateMatrixWorld();
        }
      : g.__realRender;
  }, on);
}
async function shot(name) {
  const was = fastOn;
  if (was) await fast(false);
  await waitFrames(3);
  const path = `${SHOTS}/${String(++shotN).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path, timeout: 240000 });
  cur.shots.push(path);
  if (was) await fast(true);
}
const state = () => ev(() => window.__game.state);
const pinfo = () =>
  ev(() => {
    const g = window.__game;
    const p = g.sys.player;
    const e = p.entity.position;
    return { x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2), st: p.state, hp: +p.health.current.toFixed(1), hpMax: p.health.max, en: +p.energy.current.toFixed(1), hag: +(p.heightAboveGround ?? 0).toFixed(2), alive: p.entity.alive };
  });
const evCount = (k) => ev((k) => window.__e2e?.count[k] ?? 0, k);
/** Aponta a câmera (e, portanto, o "W") para um ponto: substitui o mouse-look, que o headless não tem (sem pointer lock). */
async function aimAt(x, z) {
  await ev(
    ([x, z]) => {
      const g = window.__game;
      const p = g.sys.player.entity.position;
      g.sys.camera.yaw = Math.atan2(x - p.x, z - p.z);
    },
    [x, z],
  );
}
async function teleport(x, z, yaw, why) {
  shortcut(`teleporte para (${x.toFixed(0)}, ${z.toFixed(0)}) — ${why}`);
  await ev(
    ([x, z, yaw]) => {
      const g = window.__game;
      const p = g.sys.player;
      if (p.isFlying()) p.endFlight(true);
      const V = p.entity.position.constructor;
      p.teleport(new V(x, g.physics.groundHeight(x, z), z), yaw);
      g.sys.camera.yaw = yaw;
    },
    [x, z, yaw],
  );
  await waitFrames(3);
}
async function installRecorder() {
  await ev(() => {
    const g = window.__game;
    const R = (window.__e2e = { count: {}, log: [], speed: { max: 0 }, sampler: 0 });
    const keys = ['game:state', 'game:newGame', 'game:loaded', 'game:saved', 'player:jump', 'player:dodge', 'player:flightStart', 'player:flightEnd', 'player:landed', 'player:attack', 'player:death', 'player:respawn', 'player:lockOn', 'ability:cast', 'ability:fail', 'damage', 'enemy:killed', 'boss:start', 'boss:phase', 'boss:defeated', 'location:discovered', 'location:entered', 'combat:parry', 'ultimate:charge'];
    for (const k of keys)
      g.events.on(k, (p) => {
        R.count[k] = (R.count[k] ?? 0) + 1;
        if (k === 'ultimate:charge' || k === 'damage') return;
        R.log.push({ k, t: +g.elapsed.toFixed(2), id: p?.abilityId ?? p?.bossId ?? p?.typeId ?? p?.slot ?? p?.locationId ?? (p?.to ? `${p.from}>${p.to}` : undefined), phase: p?.phase, reason: p?.reason });
        if (R.log.length > 400) R.log.shift();
      });
    // dano causado pelo jogador e recebido por ele
    R.dmg = { dealt: 0, taken: 0, hitsOnEnemies: 0 };
    g.events.on('damage', (p) => {
      if (p.target === g.sys.player.entity) R.dmg.taken += p.result?.dealt ?? 0;
      else if (p.info?.source === g.sys.player.entity) {
        R.dmg.dealt += p.result?.dealt ?? 0;
        R.dmg.hitsOnEnemies++;
      }
    });
    // amostrador de velocidade/altura (para corrida, pulo e voo)
    R.sampler = setInterval(() => {
      const p = g.sys.player;
      if (!p?.entity) return;
      R.speed.max = Math.max(R.speed.max, p.horizontalSpeed ?? 0);
      if (p.state === 'air') R.sawAir = true;
      if (p.isBlocking?.()) R.sawBlock = true;
    }, 30);
  });
}
async function resetSpeed() {
  await ev(() => (window.__e2e.speed.max = 0));
}
/** Garante o jogo em 'playing' (para rodar etapas isoladas com --steps). */
async function ensurePlaying() {
  const s = await state();
  if (s === 'playing') return;
  if (s === 'menu') {
    shortcut('ctx.newGame() para preparar a etapa isolada');
    await ev(() => window.__game.newGame());
  } else if (s === 'dead') {
    shortcut('player.respawn() para preparar a etapa');
    await ev(() => window.__game.sys.player.respawn());
  } else {
    shortcut(`setState('playing') a partir de '${s}'`);
    await ev(() => window.__game.setState('playing'));
  }
  await waitUntil(() => window.__game.state === 'playing', 20);
}
/** Procura um botão visível pelo texto (UI real ou stub). */
async function findButton(re) {
  const loc = page.locator('button, [role=button]').filter({ hasText: re });
  const n = await loc.count();
  for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return loc.nth(i);
  return null;
}
/** Passa por cinemática/diálogo de abertura, se a narrativa tiver um (opcional). */
async function skipIntro() {
  for (let i = 0; i < 6; i++) {
    const s = await state();
    if (s === 'playing') return true;
    if (s === 'cinematic' || s === 'dialogue') {
      await tap(i % 2 ? 'Space' : 'Escape');
      await waitSim(0.5);
    } else await waitSim(0.5);
  }
  if ((await state()) !== 'playing') {
    shortcut(`abertura ('${await state()}') pulada com setState('playing')`);
    await ev(() => window.__game.setState('playing'));
  }
  return (await state()) === 'playing';
}
async function bootPage(reload = false) {
  const t0 = Date.now();
  if (reload) await page.reload();
  else await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__game && ['menu', 'playing'].includes(window.__game.state), null, { timeout: 300000, polling: 200 });
  await installRecorder();
  return Date.now() - t0;
}
const sceneStats = () =>
  ev(() => {
    const g = window.__game;
    let objects = 0;
    g.scene.traverse(() => objects++);
    const m = g.renderer.info.memory;
    return { entities: g.entities.all.length, sceneChildren: g.scene.children.length, objects, listeners: g.events.listenerCount?.() ?? -1, geometries: m.geometries, textures: m.textures, interactables: g.sys.interaction?.items?.size ?? -1 };
  });

// ------------------------------------------------------------------ etapas
const steps = {
  async boot() {
    const ms = await bootPage();
    const s = await ev(() => ({ state: window.__game.state, failed: window.__gameCore?.failedInit ?? null, w: window.__game.canvas.width, h: window.__game.canvas.height, systems: Object.keys(window.__game.sys) }));
    check('jogo carrega e abre o menu principal', s.state === 'menu', { state: s.state, ms });
    check('nenhum sistema falhou no init', Array.isArray(s.failed) && s.failed.length === 0, s.failed);
    check('canvas com o tamanho da janela', s.w > 0 && s.h > 0, { w: s.w, h: s.h });
    await shot('menu');
  },

  async newgame() {
    if ((await state()) !== 'menu') {
      shortcut('quitToMenu() para começar pelo menu');
      await ev(() => window.__game.quitToMenu());
    }
    const btn = await findButton(/novo\s+jogo/i);
    if (btn) await btn.click();
    else {
      shortcut('botão "Novo jogo" não encontrado — ctx.newGame()');
      await ev(() => window.__game.newGame());
    }
    check('botão "Novo jogo" existe e foi clicado (UI)', !!btn);
    await waitUntil(() => ['playing', 'cinematic', 'dialogue'].includes(window.__game.state), 60);
    const intro = await state();
    await skipIntro();
    const p = await pinfo();
    const d = Math.hypot(p.x - PLAYER_START.x, p.z - PLAYER_START.z);
    check("estado 'playing' após o novo jogo", (await state()) === 'playing', { intro });
    check('jogador começa no pátio da cripta', d < 20, { ...p, d: +d.toFixed(1) });
    check("evento 'game:newGame' emitido", (await evCount('game:newGame')) >= 1);
    check('menu fechado durante o jogo', !(await ev(() => window.__game.sys.ui.isMenuOpen())));
    await shot('novo-jogo');
  },

  async walk() {
    await ensurePlaying();
    await fast(true);
    const p0 = await pinfo();
    await resetSpeed();
    await hold('KeyW', 2.5);
    const p1 = await pinfo();
    const walkMax = await ev(() => window.__e2e.speed.max);
    const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    check('W anda para fora da cripta', moved > 3, { moved: +moved.toFixed(2), walkMax: +walkMax.toFixed(2) });
    await resetSpeed();
    await page.keyboard.down('ShiftLeft');
    await hold('KeyW', 2);
    await page.keyboard.up('ShiftLeft');
    const runMax = await ev(() => window.__e2e.speed.max);
    check('Shift+W corre mais rápido que andar', runMax > walkMax * 1.2, { walkMax: +walkMax.toFixed(2), runMax: +runMax.toFixed(2) });
    await waitSim(0.4);
    const j0 = await evCount('player:jump');
    await ev(() => (window.__e2e.sawAir = false));
    await tap('Space');
    await waitSim(0.5);
    check('Espaço pula (evento + estado no ar)', (await evCount('player:jump')) > j0 && (await ev(() => window.__e2e.sawAir)), {});
    await waitUntil(() => window.__game.sys.player.state === 'ground', 3);
    const d0 = await evCount('player:dodge');
    await page.keyboard.down('KeyW');
    await waitSim(0.2);
    await tap('KeyQ');
    await waitSim(0.6);
    await page.keyboard.up('KeyW');
    check('Q esquiva', (await evCount('player:dodge')) > d0);
    await shot('andar-cripta');
  },

  async flight() {
    await ensurePlaying();
    await fast(true);
    await waitUntil(() => window.__game.sys.player.state === 'ground', 3);
    const e0 = (await pinfo()).en;
    await tap('KeyF');
    await waitSim(0.6);
    const f = await pinfo();
    check('F decola (estado flight + evento)', f.st === 'flight' && (await evCount('player:flightStart')) >= 1, f);
    await hold('Space', 1.5);
    const up = await pinfo();
    check('Espaço sobe no voo', up.hag > 3, { hag: up.hag });
    const a = await pinfo();
    await page.keyboard.down('ShiftLeft');
    await hold('KeyW', 3);
    await page.keyboard.up('ShiftLeft');
    const b = await pinfo();
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    check('W+Shift voa para a frente (turbo)', dist > 15 && b.st === 'flight', { dist: +dist.toFixed(1), st: b.st });
    check('voo consome energia', b.en < e0, { antes: e0, depois: b.en });
    await shot('voo');
    // pouso: segura C (descer) até tocar o chão; se não pousar, F encerra o voo
    await page.keyboard.down('KeyC');
    const landed = await waitUntil(() => window.__game.sys.player.state !== 'flight', 25);
    await page.keyboard.up('KeyC');
    if (!landed) await tap('KeyF');
    await waitUntil(() => ['ground', 'swim'].includes(window.__game.sys.player.state), 10);
    const l = await pinfo();
    check('pousa (C desce até o chão) e volta a andar', ['ground', 'swim'].includes(l.st) && (await evCount('player:landed')) >= 1, { st: l.st, landedByC: landed });
  },

  async combat() {
    await ensurePlaying();
    await fast(true);
    const camp = await ev(() => {
      const z = window.__game.sys.ai.spawner?.zones?.find((z) => z.def.id === 'acampamento_corvos');
      return z ? { x: z.center.x, z: z.center.z } : { x: 232, z: 530 };
    });
    shortcut('hora do jogo 11h (acampamento ativo de dia)');
    await ev(() => window.__game.clock.setTime(11));
    // entrada da paliçada (o resto do acampamento é cercado)
    const gate = await ev(() => {
      const g = window.__game;
      const p = g.sys.world.placePosition('portao_corvos', new (g.sys.player.entity.position.constructor)());
      return p ? { x: p.x, z: p.z } : null;
    });
    const G = gate ?? { x: camp.x + 30, z: camp.z };
    const gl = Math.hypot(G.x - camp.x, G.z - camp.z) || 1;
    const out = { x: (G.x - camp.x) / gl, z: (G.z - camp.z) / gl };
    await teleport(G.x + out.x * 110, G.z + out.z * 110, Math.atan2(-out.x, -out.z), 'ida da cripta ao Acampamento dos Corvos (~750 m)');
    // habilidades nos slots 1–4 e Forma Ascendente (sem progressão de nível no teste)
    const ab = await ev(() => {
      const a = window.__game.sys.abilities;
      for (const id of ['arcaneOrb', 'runicBlast', 'lightningStorm', 'dimensionalRift', 'ascendantForm']) if (!a.isUnlocked(id)) a.unlock(id);
      a.setSlot(0, 'arcaneOrb');
      a.setSlot(1, 'runicBlast');
      a.setSlot(2, 'lightningStorm');
      a.setSlot(3, 'dimensionalRift');
      a.addUltimateCharge(1000);
      return { slots: [...a.slots], ultimate: a.ultimate, charge: a.ultimateCharge };
    });
    shortcut(`habilidades desbloqueadas e Carga Arcana cheia: ${JSON.stringify(ab)}`);
    await waitSim(3);
    const pop = await ev(() => window.__game.sys.ai.enemies.filter((e) => e.alive && e.zoneId === 'acampamento_corvos').map((e) => e.typeId));
    check('acampamento populado ao se aproximar', pop.length >= 2, pop);
    // aproxima-se correndo pela entrada da paliçada (entrada real) até alguém entrar em combate
    await aimAt(G.x, G.z);
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await waitUntil(
      ([gx, gz]) => {
        const g = window.__game;
        const p = g.sys.player.entity.position;
        return g.sys.ai.inCombat() || Math.hypot(p.x - gx, p.z - gz) < 3;
      },
      40,
      [G.x, G.z],
    );
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    const inside = (x, z) => Math.hypot(x - camp.x, z - camp.z) < 25;
    await shot('acampamento');
    // luta com entrada real
    const r0 = await ev(() => ({ ...window.__e2e.count }));
    const usedSlots = new Set();
    let it = 0;
    let outcome = 'tempo';
    const t0 = await ev(() => window.__game.elapsed);
    let shotMid = false;
    for (;;) {
      const s = await ev(([cx, cz]) => {
        const g = window.__game;
        const pl = g.sys.player;
        const p = pl.entity.position;
        let best = null;
        let bd = 1e9;
        for (const e of g.sys.ai.enemies) {
          if (!e.alive || e.removed) continue;
          const d = Math.hypot(e.position.x - p.x, e.position.z - p.z);
          const engaged = e.state === 'combat' || e.state === 'alert' || e.state === 'search';
          if (!engaged && Math.hypot(e.position.x - cx, e.position.z - cz) > 50) continue;
          if (e.perched && d > 6) continue; // arqueira na torre: fora do alcance a pé
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
        return {
          alive: pl.entity.alive,
          st: g.state,
          target: best ? { x: best.position.x, z: best.position.z, d: bd, id: best.id, type: best.typeId } : null,
          lock: pl.lockTarget ? pl.lockTarget.id : null,
          charge: g.sys.abilities.ultimateCharge,
          asc: g.sys.abilities.ascended,
          t: g.elapsed,
        };
      }, [camp.x, camp.z]);
      if (!s.alive || s.st === 'dead') {
        outcome = 'jogador morreu';
        break;
      }
      if (!s.target) {
        outcome = 'inimigos derrotados';
        break;
      }
      if (s.t - t0 > 70) break;
      // dentro × fora da paliçada: passa pela entrada primeiro
      const me = await pinfo();
      const viaGate = inside(me.x, me.z) !== inside(s.target.x, s.target.z) && Math.hypot(me.x - G.x, me.z - G.z) > 3;
      if (viaGate) await aimAt(G.x, G.z);
      else await aimAt(s.target.x, s.target.z);
      if (s.lock === null && s.target.d < 25 && !viaGate) await tap('Tab');
      if (viaGate) {
        await hold('KeyW', 0.5);
        continue;
      }
      if (s.target.d > 3.4) {
        await hold('KeyW', Math.min(0.6, 0.12 * s.target.d));
      } else {
        const k = it++ % 8;
        if (k === 3) await click('right', 0.5); // defesa
        else if (k === 5) {
          const slot = usedSlots.size < 4 ? usedSlots.size + 1 : 1 + (it % 4);
          usedSlots.add(slot);
          await tap(`Digit${slot}`);
          await waitSim(0.5);
        } else if (k === 7 && s.charge >= 100 && !s.asc) await tap('KeyR');
        else await click('left');
        await waitSim(0.25);
      }
      if (!shotMid && (await evCount('player:attack')) > (r0['player:attack'] ?? 0) + 2) {
        shotMid = true;
        await shot('combate');
      }
    }
    const R = await ev(() => ({ count: window.__e2e.count, dmg: window.__e2e.dmg, sawBlock: window.__e2e.sawBlock, casts: window.__e2e.log.filter((l) => l.k === 'ability:cast').map((l) => l.id), fails: window.__e2e.log.filter((l) => l.k === 'ability:fail').map((l) => `${l.id}:${l.reason}`), markers: window.__game.sys.abilities.stats.zoneMarkers, asc: window.__game.sys.abilities.ascended }));
    const d = (k) => (R.count[k] ?? 0) - (r0[k] ?? 0);
    check('ataques (botão esquerdo) acertam inimigos', d('player:attack') >= 3 && R.dmg.hitsOnEnemies >= 2, { attacks: d('player:attack'), hits: R.dmg.hitsOnEnemies, dealt: Math.round(R.dmg.dealt) });
    check('defesa (botão direito) ativa o bloqueio', !!R.sawBlock);
    const castIds = [...new Set(R.casts)];
    check('habilidades 1–4 conjuradas com as teclas', castIds.filter((c) => c !== 'ascendantForm').length >= 3, { casts: castIds, fails: [...new Set(R.fails)].slice(0, 8) });
    check('marcador de mira no chão (Tempestade/Fenda)', !castIds.some((c) => c === 'lightningStorm' || c === 'dimensionalRift') || R.markers >= 1, { markers: R.markers });
    check('R ativa a Forma Ascendente', castIds.includes('ascendantForm'), { asc: R.asc });
    check('travar alvo (Tab)', d('player:lockOn') >= 1);
    // voo gratuito na Forma Ascendente
    if (R.asc) {
      const before = await pinfo();
      await tap('KeyF');
      await page.keyboard.down('Space');
      await hold('KeyW', 1.2);
      await page.keyboard.up('Space');
      const after = await pinfo();
      check('voo gratuito durante a Forma Ascendente', after.st === 'flight' && after.en >= before.en - 0.5, { antes: before.en, depois: after.en });
      await page.keyboard.down('KeyC');
      await waitUntil(() => window.__game.sys.player.state !== 'flight', 15);
      await page.keyboard.up('KeyC');
      if ((await pinfo()).st === 'flight') await tap('KeyF');
    }
    if (outcome === 'tempo') {
      shortcut('luta encerrada com dano de depuração após 70 s de jogo (SwiftShader lento)');
      await ev(() => {
        const g = window.__game;
        for (const e of g.sys.ai.enemies) if (e.alive && e.zoneId === 'acampamento_corvos') g.sys.combat.applyDamage(e, { amount: 99999, type: 'arcane', source: g.sys.player.entity });
      });
      await waitSim(0.5);
    }
    check(`luta terminou (${outcome})`, outcome !== 'tempo' || (await evCount('enemy:killed')) >= 1, { kills: (await evCount('enemy:killed')) - (r0['enemy:killed'] ?? 0), taken: Math.round(R.dmg.taken) });
    await shot('combate-fim');
  },

  async death() {
    const s = await state();
    if (s !== 'dead') await ensurePlaying();
    await fast(true);
    const alive = await ev(() => window.__game.sys.player.entity.alive);
    if (alive) {
      shortcut('dano de depuração no jogador (morte imediata)');
      await ev(() => {
        const g = window.__game;
        const p = g.sys.player;
        p.health.immortal = false;
        p.health.invulnerable = 0;
        g.sys.combat.applyDamage(p.entity, { amount: 99999, type: 'physical' });
      });
    }
    const died = await waitUntil(() => window.__game.state === 'dead', 12);
    check("morte: 'player:death' e estado 'dead'", died && (await evCount('player:death')) >= 1, { state: await state() });
    await shot('morte');
    const cp = await ev(() => ({ ...window.__game.sys.player.checkpoint }));
    const btn = await findButton(/renascer|reviver|tentar novamente|despertar|checkpoint|continuar/i);
    if (btn) await btn.click();
    else {
      shortcut('tela de derrota sem botão (UI stub) — player.respawn()');
      await ev(() => window.__game.sys.player.respawn());
    }
    await waitUntil(() => window.__game.state === 'playing', 10);
    await waitFrames(3);
    const p = await pinfo();
    const d = Math.hypot(p.x - cp.x, p.z - cp.z);
    check('renasce no checkpoint com vida cheia', (await state()) === 'playing' && p.alive && p.hp >= p.hpMax - 0.5 && d < 3, { ...p, cp, d: +d.toFixed(2) });
    check("evento 'player:respawn'", (await evCount('player:respawn')) >= 1);
    await shot('renascer');
  },

  async boss() {
    await ensurePlaying();
    await fast(true);
    const A = await ev(() => {
      const g = window.__game;
      const c = g.sys.ai.arenaCenter;
      const V = g.sys.player.entity.position.constructor;
      const ent = g.sys.world.placePosition('arena_entrada', new V());
      return { cx: c.x, cz: c.z, ex: ent?.x ?? c.x + 40, ez: ent?.z ?? c.z, gate: g.sys.world.isGateOpen('arena_guardiao'), defeated: g.sys.ai.defeatedBosses.has('guardiao_mecanico') };
    });
    if (A.defeated) {
      shortcut('chefe já derrotado neste save — defeatedBosses limpo para repetir a luta');
      await ev(() => window.__game.sys.ai.defeatedBosses.delete('guardiao_mecanico'));
    }
    const yaw = Math.atan2(A.cx - A.ex, A.cz - A.ez);
    // entrada fica 1 m além do muro: recua mais 6 m pelo corredor
    await teleport(A.ex - Math.sin(yaw) * 6, A.ez - Math.cos(yaw) * 6, yaw, 'viagem até a Câmara do Guardião');
    await ev(() => window.__game.clock.setTime(15));
    const pre = await ev(() => ({ boss: !!window.__game.sys.ai.boss, gate: window.__game.sys.world.isGateOpen('arena_guardiao') }));
    check('antes de entrar: sem chefe e portão aberto', !pre.boss && pre.gate, pre);
    const cp0 = await ev(() => ({ ...window.__game.sys.player.checkpoint }));
    // entra andando (entrada real)
    await aimAt(A.cx, A.cz);
    await page.keyboard.down('KeyW');
    const spawned = await waitUntil(() => !!window.__game.sys.ai.boss, 15);
    await page.keyboard.up('KeyW');
    await waitSim(1);
    const st = await ev(() => {
      const g = window.__game;
      const b = g.sys.ai.boss;
      return { boss: b?.typeId, kind: b?.kind, gate: g.sys.world.isGateOpen('arena_guardiao'), active: !!g.sys.ai.activeBoss(), cp: { ...g.sys.player.checkpoint } };
    });
    check('entrar na arena desperta o Guardião', spawned && st.boss === 'guardiao_mecanico' && st.kind === 'boss' && (await evCount('boss:start')) >= 1, st);
    check('portão da arena fecha durante a luta', st.gate === false);
    check('checkpoint movido para fora da arena (pedestal)', Math.hypot(st.cp.x - A.cx, st.cp.z - A.cz) > 40 && (st.cp.x !== cp0.x || st.cp.z !== cp0.z || Math.hypot(cp0.x - A.cx, cp0.z - A.cz) > 40), { cp: st.cp, centro: [A.cx, A.cz] });
    await shot('chefe-inicio');
    // alguns segundos de luta real (ataques + habilidade), com o jogador imortal para não resetar a luta
    shortcut('jogador imortal durante a luta do chefe');
    await ev(() => (window.__game.sys.player.health.immortal = true));
    for (let i = 0; i < 8; i++) {
      const b = await ev(() => {
        const g = window.__game;
        const b = g.sys.ai.boss;
        return b ? { x: b.position.x, z: b.position.z } : null;
      });
      if (!b) break;
      await aimAt(b.x, b.z);
      if (i === 0) await tap('Tab');
      await hold('KeyW', 0.3);
      await click('left');
      if (i === 4) await tap('Digit1');
      await waitSim(0.3);
    }
    const hurt = await ev(() => {
      const b = window.__game.sys.ai.boss;
      return b ? +(b.health.current / b.health.max).toFixed(3) : null;
    });
    check('golpes do jogador ferem o chefe', hurt !== null && hurt < 1, { vida: hurt });
    // fases aceleradas com dano de depuração (a luta inteira levaria minutos no SwiftShader)
    shortcut('fases 2 e 3 e derrota aceleradas com dano de depuração');
    const ph2 = await ev(() => {
      const g = window.__game;
      const b = g.sys.ai.boss;
      b.health.invulnerable = 0;
      b.health.current = Math.ceil(b.health.max * 0.66) + 5;
      g.sys.combat.applyDamage(b, { amount: 400, type: 'arcane', source: g.sys.player.entity, poiseDamage: 0 });
      return b.phase;
    });
    await waitSim(3);
    await shot('chefe-fase2');
    const ph3 = await ev(() => {
      const g = window.__game;
      const b = g.sys.ai.boss;
      for (const p of b.pillars ?? []) if (p.alive) g.sys.combat.applyDamage(p, { amount: 9999, type: 'lightning', source: g.sys.player.entity, poiseDamage: 0 });
      for (const s of b.summons ?? []) if (s.alive) g.sys.combat.kill(s);
      b.health.invulnerable = 0;
      b.health.current = Math.ceil(b.health.max * 0.33) + 5;
      g.sys.combat.applyDamage(b, { amount: 400, type: 'arcane', source: g.sys.player.entity, poiseDamage: 0 });
      return b.phase;
    });
    await waitSim(2);
    const phases = await ev(() => window.__e2e.log.filter((l) => l.k === 'boss:phase').map((l) => l.phase));
    check("fases avançam ('boss:phase' 2 e 3)", ph2 === 2 && ph3 === 3 && phases.includes(2) && phases.includes(3), { ph2, ph3, phases });
    await ev(() => {
      const g = window.__game;
      const b = g.sys.ai.boss;
      b.health.invulnerable = 0;
      b.health.floor = 0;
      g.sys.combat.applyDamage(b, { amount: 99999, type: 'arcane', source: g.sys.player.entity, poiseDamage: 0 });
    });
    const defeated = await waitUntil(() => (window.__e2e.count['boss:defeated'] ?? 0) >= 1, 5);
    check("'boss:defeated' emitido", defeated);
    const reopened = await waitUntil(() => window.__game.sys.world.isGateOpen('arena_guardiao'), 10);
    check('portão reabre após a vitória', reopened);
    await waitSim(2.5);
    await shot('chefe-derrotado');
    await ev(() => (window.__game.sys.player.health.immortal = false));
    // sai e volta andando: o chefe não renasce
    await teleport(A.ex - Math.sin(yaw) * 8, A.ez - Math.cos(yaw) * 8, yaw, 'sair da arena para testar o renascimento do chefe');
    await waitSim(1.5);
    await aimAt(A.cx, A.cz);
    await hold('KeyW', 4);
    const re = await ev(() => ({ boss: !!window.__game.sys.ai.boss && window.__game.sys.ai.boss.alive, defeated: window.__game.sys.ai.defeatedBosses.has('guardiao_mecanico'), spawn: !!window.__game.sys.ai.spawnBoss('guardiao_mecanico') }));
    check('chefe derrotado não renasce', !re.boss && re.defeated && !re.spawn, re);
  },

  async nav() {
    // inimigo na vila com a reta bloqueada por casas: deve contornar pelo grafo (world.findPath)
    await ensurePlaying();
    await fast(true);
    const V0 = await ev(() => {
      const g = window.__game;
      const v = g.sys.world.placePosition('poco', new (g.sys.player.entity.position.constructor)());
      return { x: v.x, z: v.z };
    });
    await teleport(V0.x, V0.z, 0, 'praça da vila (teste de caminho dos inimigos)');
    shortcut('jogador imortal e parado; inimigo agressivo criado atrás de uma casa');
    const sp = await ev(([vx, vz]) => {
      const g = window.__game;
      const pl = g.sys.player;
      pl.health.immortal = true;
      g.sys.ai.ambient = false;
      const V = pl.entity.position.constructor;
      const P = pl.entity.position;
      const a = new V();
      const b = new V(P.x, P.y + 1.1, P.z);
      // procura um ponto com a reta bloqueada e caminho pelo grafo
      for (let i = 0; i < 400; i++) {
        const ang = (i * 2.399) % (Math.PI * 2);
        const r = 22 + (i % 7) * 4;
        const x = vx + Math.sin(ang) * r;
        const z = vz + Math.cos(ang) * r;
        const y = g.physics.groundHeight(x, z, g.heightfield.heightAt(x, z) + 1.6);
        if (Math.abs(y - P.y) > 1.5) continue;
        a.set(x, y + 1.1, z);
        if (g.physics.lineOfSight(a, b, true)) continue;
        const near = g.physics.near ? g.physics.near(x, z, 1.2) : null;
        if (near && near.size > 0) continue;
        const path = g.sys.world.findPath({ x, z }, { x: P.x, z: P.z });
        if (!path || path.length < 4) continue;
        const e = g.sys.ai.spawnEnemy('corvo_saqueador', new V(x, y, z), { aggro: true });
        if (!e) return null;
        window.__navE = e;
        window.__navUsed = 0;
        return { x: +x.toFixed(1), z: +z.toFixed(1), d: +Math.hypot(x - P.x, z - P.z).toFixed(1), nodes: path.length };
      }
      return null;
    }, [V0.x, V0.z]);
    check('ponto de teste com a reta bloqueada encontrado', !!sp, sp);
    if (!sp) return;
    let best = 1e9;
    for (let i = 0; i < 60; i++) {
      await waitSim(0.5);
      const r = await ev(() => {
        const g = window.__game;
        const e = window.__navE;
        const P = g.sys.player.entity.position;
        if (e.navPath) window.__navUsed++;
        return { d: Math.hypot(e.position.x - P.x, e.position.z - P.z), alive: e.alive };
      });
      best = Math.min(best, r.d);
      if (r.d < 3.5 || !r.alive) break;
    }
    const used = await ev(() => window.__navUsed);
    check('inimigo contorna as casas e alcança o jogador', best < 3.5, { menorDistancia: +best.toFixed(1), amostrasComCaminho: used });
    check('inimigo usou o grafo da vila (navPath)', used > 0, { used });
    await shot('nav-vila');
    await ev(() => {
      const g = window.__game;
      if (window.__navE && !window.__navE.removed) g.entities.remove(window.__navE);
      g.sys.player.health.immortal = false;
      g.sys.ai.ambient = true;
    });
  },

  async save() {
    await ensurePlaying();
    await fast(true);
    // recarga em andamento para conferir a persistência
    await waitSim(0.5);
    // usa a habilidade de recarga mais longa disponível (as curtas acabam antes do F5)
    const a = await ev(() => {
      const g = window.__game;
      const ab = g.sys.abilities;
      g.sys.player.energy.current = g.sys.player.energy.max;
      let best = -1;
      for (const pref of ['dimensionalRift', 'lightningStorm', 'runicBlast']) {
        const i = ab.slots.indexOf(pref);
        if (i >= 0 && ab.cooldownRemaining(pref) === 0) {
          best = i;
          break;
        }
      }
      if (best < 0) best = ab.slots.findIndex((s) => s && ab.cooldownRemaining(s) === 0);
      return { slot: best, id: ab.slots[best] };
    });
    if (a.slot >= 0) {
      await tap(`Digit${a.slot + 1}`);
      await waitUntil((id) => window.__game.sys.abilities.cooldownRemaining(id) > 0, 2, a.id);
      await waitSim(0.3);
    }
    const s0 = await evCount('game:saved');
    await tap('F5');
    const saved = await waitUntil((n) => (window.__e2e.count['game:saved'] ?? 0) > n, 3, s0);
    const file = await ev(() => {
      const raw = localStorage.getItem('eclipse-arcano:save:quick');
      return raw ? JSON.parse(raw) : null;
    });
    check("F5 salva no slot 'quick' (evento + localStorage)", saved && !!file, { keys: file ? Object.keys(file.data) : null });
    check('save inclui todos os sistemas registrados', !!file && ['clock', 'abilities', 'world', 'env', 'ai', 'player'].every((k) => k in file.data), file ? Object.keys(file.data) : null);
    check('save guarda recargas em andamento', !!file && Object.keys(file.data.abilities?.cooldowns ?? {}).length >= 1, file?.data.abilities?.cooldowns);
    await shot('salvo');
  },

  async reload() {
    await fast(false);
    const ms = await bootPage(true);
    check('recarregar a página volta ao menu', (await state()) === 'menu', { ms });
    const slot = await ev(() => window.__game.sys.save.latestSlot());
    const file = await ev((slot) => JSON.parse(localStorage.getItem('eclipse-arcano:save:' + slot) || 'null'), slot);
    check('existe save para continuar', !!slot && !!file, { slot });
    if (!file) return;
    const btn = await findButton(/continuar/i);
    if (btn) await btn.click();
    else {
      shortcut('botão "Continuar" não encontrado — ctx.continueGame()');
      await ev(() => window.__game.continueGame());
    }
    check('botão "Continuar" no menu', !!btn);
    await waitUntil(() => window.__game.state === 'playing', 30);
    await fast(true);
    await waitFrames(3);
    const now = await ev(() => {
      const g = window.__game;
      const s = g.sys;
      const p = s.player.entity.position;
      return {
        state: g.state,
        p: { x: p.x, y: p.y, z: p.z },
        hp: s.player.health.current,
        en: s.player.energy.current,
        cp: { ...s.player.checkpoint },
        bosses: [...s.ai.defeatedBosses],
        boss: !!s.ai.boss,
        discovered: [...s.world.discovered].sort(),
        gates: Object.fromEntries([...(s.world.gates?.gates ?? new Map())].map(([k, v]) => [k, v.open])),
        unlocked: [...s.abilities.unlocked].sort(),
        slots: [...s.abilities.slots],
        cds: Object.fromEntries(s.abilities.slots.filter(Boolean).map((id) => [id, s.abilities.cooldownRemaining(id)])),
        clock: { day: g.clock.day, hours: g.clock.hours },
        weather: s.env.weather,
        src: s.save.lastLoadSource,
      };
    });
    const D = file.data;
    const dp = Math.hypot(now.p.x - D.player.x, now.p.z - D.player.z);
    check("continuar: estado 'playing'", now.state === 'playing', { slot, src: now.src });
    check('posição restaurada', dp < 1.5 && Math.abs(now.p.y - D.player.y) < 2, { dp: +dp.toFixed(2), dy: +(now.p.y - D.player.y).toFixed(2) });
    check('vida e energia restauradas', Math.abs(now.hp - D.player.health) < 2 && Math.abs(now.en - D.player.energy) < 6, { hp: [now.hp, D.player.health], en: [now.en, D.player.energy] });
    check('checkpoint restaurado', Math.hypot(now.cp.x - D.player.checkpoint.x, now.cp.z - D.player.checkpoint.z) < 0.5, { cp: now.cp, salvo: D.player.checkpoint });
    check('chefe derrotado persiste (e não renasce)', JSON.stringify(now.bosses.sort()) === JSON.stringify([...D.ai.defeatedBosses].sort()) && !now.boss, { bosses: now.bosses });
    check('locais descobertos persistem', JSON.stringify(now.discovered) === JSON.stringify([...D.world.discovered].sort()), { n: now.discovered.length, salvo: D.world.discovered.length });
    const gateDiff = Object.entries(D.world.gates ?? {}).filter(([k, v]) => now.gates[k] !== v);
    check('portões persistem', gateDiff.length === 0, { diff: gateDiff });
    check('habilidades e slots persistem', JSON.stringify(now.unlocked) === JSON.stringify([...D.abilities.unlocked].sort()) && JSON.stringify(now.slots) === JSON.stringify(D.abilities.slots), { unlocked: now.unlocked, slots: now.slots });
    const cdOk = Object.entries(D.abilities.cooldowns ?? {}).every(([id, [rem]]) => now.cds[id] === undefined || (now.cds[id] > 0 && now.cds[id] <= rem + 0.01));
    check('recargas persistem', Object.keys(D.abilities.cooldowns ?? {}).length === 0 || cdOk, { salvo: D.abilities.cooldowns, agora: now.cds });
    const dh = Math.abs(now.clock.hours - D.clock.hours);
    check('hora e dia persistem', now.clock.day === D.clock.day && (dh < 0.25 || dh > 23.75), { agora: now.clock, salvo: D.clock });
    const savedWeather = typeof D.env.weather === 'string' ? D.env.weather : D.env.weather?.current;
    check('clima persiste', now.weather === savedWeather, { agora: now.weather, salvo: savedWeather });
    await shot('continuar');
  },

  async quickload() {
    await ensurePlaying();
    await fast(true);
    const has = await ev(() => window.__game.sys.save.hasSave('quick'));
    if (!has) {
      await tap('F5');
      await waitSim(0.3);
    }
    const q = await ev(() => JSON.parse(localStorage.getItem('eclipse-arcano:save:quick')).data.player);
    const st0 = await sceneStats();
    await hold('KeyW', 2);
    const moved = await pinfo();
    const l0 = await evCount('game:loaded');
    await tap('F9');
    const loaded = await waitUntil((n) => (window.__e2e.count['game:loaded'] ?? 0) > n && window.__game.state === 'playing', 15, l0);
    await waitFrames(3);
    const p = await pinfo();
    const st1 = await sceneStats();
    const d = Math.hypot(p.x - q.x, p.z - q.z);
    check('F9 carrega o salvamento rápido', loaded && d < 1.5, { antes: { x: moved.x, z: moved.z }, depois: { x: p.x, z: p.z }, d: +d.toFixed(2) });
    check('F9 não duplica listeners/entidades', st1.listeners === st0.listeners && st1.entities <= st0.entities + 6, { antes: st0, depois: st1 });
    // F9 também na pausa
    await tap('Escape');
    const paused = await waitUntil(() => window.__game.state === 'paused', 3);
    const l1 = await evCount('game:loaded');
    await tap('F9');
    const fromPause = await waitUntil((n) => (window.__e2e.count['game:loaded'] ?? 0) > n && window.__game.state === 'playing', 15, l1);
    check('F9 funciona a partir da pausa', paused && fromPause, { paused });
    if ((await state()) === 'paused') await tap('Escape');
    await shot('carregamento-rapido');
  },

  async robust() {
    await ensurePlaying();
    await fast(true);
    // 1) perda de foco
    await ev(() => window.dispatchEvent(new Event('blur')));
    await waitFrames(2);
    check('perder o foco (blur) pausa o jogo', (await state()) === 'paused', await ev(() => window.__gameCore?.robustness));
    await tap('Escape');
    if (!(await waitUntil(() => window.__game.state === 'playing', 3))) {
      shortcut("retomar com setState('playing') (UI sem menu de pausa)");
      await ev(() => window.__game.setState('playing'));
    }
    // 2) aba oculta → pausa; volta sem salto de dt
    await ev(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFrames(2);
    const hid = await state();
    await ev(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    check('aba oculta (visibilitychange) pausa o jogo', hid === 'paused');
    await ev(() => window.__game.setState('playing'));
    // travada de 1,5 s no main thread: o quadro seguinte não simula mais que 0,1 s
    const e0 = await ev(() => {
      const t = performance.now();
      while (performance.now() - t < 1500) {
        /* trava proposital */
      }
      return window.__game.elapsed;
    });
    await waitFrames(1);
    const e1 = await ev(() => window.__game.elapsed);
    check('travada longa não gera salto de dt (clamp)', e1 - e0 <= 0.21, { dt: +(e1 - e0).toFixed(3) });
    // 3) pointer lock perdido sem menu aberto → pausa (evento sintético: headless não tem pointer lock real)
    shortcut('pointerlockchange sintético (sem pointer lock real no headless)');
    await ev(() => {
      window.__gameCore.wasPointerLocked = true;
      document.dispatchEvent(new Event('pointerlockchange'));
    });
    await waitFrames(2);
    check('perder o pointer lock pausa o jogo', (await state()) === 'paused');
    await ev(() => window.__game.setState('playing'));
    // 4) redimensionar
    await page.setViewportSize({ width: 1024, height: 576 });
    await waitFrames(4);
    const rs = await ev(() => ({ aspect: window.__game.camera.aspect, w: window.__game.canvas.clientWidth, h: window.__game.canvas.clientHeight }));
    check('resize atualiza câmera e canvas', Math.abs(rs.aspect - 1024 / 576) < 0.01, rs);
    await page.setViewportSize({ width: VW, height: VH });
    await waitFrames(3);
    // 5) erro isolado em um sistema e numa entidade: o jogo continua
    expectErrors = true;
    const sysName = await ev(() => {
      const g = window.__game;
      const s = g.sys.npcs ?? g.sys.vfx;
      window.__origUpd = s.update;
      s.update = () => {
        throw new Error('e2e: falha injetada no sistema');
      };
      return s.name;
    });
    const f0 = await ev(() => window.__game.frame);
    const pa = await pinfo();
    await hold('KeyW', 1);
    const pb = await pinfo();
    const f1 = await ev(() => window.__game.frame);
    await ev(() => {
      const g = window.__game;
      const s = g.sys.npcs ?? g.sys.vfx;
      s.update = window.__origUpd;
    });
    check(`erro em ${sysName}.update não derruba o jogo`, f1 > f0 + 3 && Math.hypot(pb.x - pa.x, pb.z - pa.z) > 1 && (await state()) === 'playing', { frames: f1 - f0 });
    const renderErr = await ev(() => {
      const g = window.__game;
      const orig = g.render;
      let n = 0;
      g.render = () => {
        if (n++ < 3) throw new Error('e2e: falha injetada no render');
        orig();
      };
      return true;
    });
    await waitFrames(5);
    await fast(true);
    check('erro no render não para o loop', renderErr && (await ev(() => window.__gameCore.robustness.renderErrors)) >= 1 && (await state()) === 'playing');
    expectErrors = false;
    // 6) voltar ao menu e começar de novo 2× sem duplicar listeners/entidades/malhas
    const cycles = [];
    for (let i = 0; i < 2; i++) {
      await tap('Escape');
      await waitFrames(2);
      const quit = await findButton(/sair para o menu|menu principal|voltar ao menu/i);
      if (quit) await quit.click();
      else {
        if (i === 0) shortcut('sem botão "Sair para o menu" (UI stub) — ctx.quitToMenu()');
        await ev(() => window.__game.quitToMenu());
      }
      await waitUntil(() => window.__game.state === 'menu', 5);
      const nb = await findButton(/novo\s+jogo/i);
      if (nb) await nb.click();
      else await ev(() => window.__game.newGame());
      await waitUntil(() => ['playing', 'cinematic', 'dialogue'].includes(window.__game.state), 30);
      await skipIntro();
      await waitSim(2);
      cycles.push(await sceneStats());
    }
    const [c1, c2] = cycles;
    check('novo jogo repetido não duplica listeners', c1.listeners === c2.listeners, { c1: c1.listeners, c2: c2.listeners });
    check('novo jogo repetido não acumula entidades/objetos/malhas', c2.entities <= c1.entities + 4 && c2.objects <= c1.objects * 1.05 + 20 && c2.geometries <= c1.geometries * 1.05 + 10, { c1, c2 });
    const p = await pinfo();
    check('novo jogo volta ao início com vida cheia', Math.hypot(p.x - PLAYER_START.x, p.z - PLAYER_START.z) < 20 && p.hp >= p.hpMax - 0.5, p);
    // 7) clique duplo em "Novo jogo" não inicia duas vezes
    const dbl = await ev(async () => {
      const g = window.__game;
      const n0 = window.__e2e.count['game:newGame'] ?? 0;
      await Promise.all([g.newGame(), g.newGame()]);
      return (window.__e2e.count['game:newGame'] ?? 0) - n0;
    });
    check('novo jogo concorrente é ignorado (1 início)', dbl === 1, { inicios: dbl });
    await shot('robustez');
  },
};

// ------------------------------------------------------------------ execução
let exitCode = 0;
try {
  for (const name of STEPS) {
    if (!steps[name]) {
      console.log(`etapa desconhecida: ${name}`);
      continue;
    }
    cur = { step: name, ok: false, checks: [], shortcuts: [], shots: [], ms: 0, error: null, consoleErrors: 0 };
    report.steps.push(cur);
    console.log(`\n== ${name}`);
    const t0 = Date.now();
    const e0 = report.console.errors.length;
    try {
      if (name !== 'boot' && !(await ev(() => !!window.__game).catch(() => false))) await bootPage();
      await steps[name]();
    } catch (err) {
      cur.error = String(err?.stack ?? err).slice(0, 1500);
      console.log(`  ERRO: ${String(err?.message ?? err).slice(0, 400)}`);
      try {
        await shot(`${name}-erro`);
      } catch {
        /* sem captura */
      }
    }
    cur.ms = Date.now() - t0;
    cur.consoleErrors = report.console.errors.length - e0;
    cur.ok = !cur.error && cur.checks.length > 0 && cur.checks.every((c) => c.ok) && cur.consoleErrors === 0;
    await page.keyboard.up('KeyW').catch(() => {});
    await page.keyboard.up('ShiftLeft').catch(() => {});
  }
} finally {
  report.finishedAt = new Date().toISOString();
  const perf = await ev(() => window.__game?.sys.perf.report?.()).catch(() => null);
  report.perf = perf;
  report.console.uniqueWarnings = [...new Set(report.console.warnings.map((w) => w.replace(/^\[[^\]]*\] /, '')))].slice(0, 40);
  report.ok = report.steps.every((s) => s.ok) && report.console.errors.length === 0;
  writeFileSync(REPORT, JSON.stringify(report, null, 1));
  await browser.close().catch(() => {});
  killServer();
}
const passed = report.steps.filter((s) => s.ok).length;
console.log(`\nEtapas: ${passed}/${report.steps.length} OK — verificações: ${report.steps.reduce((n, s) => n + s.checks.filter((c) => c.ok).length, 0)}/${report.steps.reduce((n, s) => n + s.checks.length, 0)}`);
for (const s of report.steps) console.log(`  ${s.ok ? 'OK   ' : 'FALHA'} ${s.step} (${(s.ms / 1000).toFixed(0)} s, ${s.shortcuts.length} atalhos${s.consoleErrors ? `, ${s.consoleErrors} erros de console` : ''})`);
if (report.console.errors.length) console.log(`ERROS de console (${report.console.errors.length}):\n  ` + [...new Set(report.console.errors)].slice(0, 20).join('\n  '));
if (report.console.uniqueWarnings.length) console.log(`Avisos únicos (${report.console.uniqueWarnings.length}):\n  ` + report.console.uniqueWarnings.slice(0, 15).join('\n  '));
console.log(`Relatório: ${REPORT}`);
if (!report.ok) exitCode = 1;
process.exit(exitCode);
