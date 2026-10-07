// Grava anuncio.html quadro a quadro (30 fps) e gera anuncio.mp4 (1080x1920, H.264).
//   node render.mjs            -> vídeo completo
//   node render.mjs --frames 0,90,300   -> só salva esses quadros em PNG (para conferir)
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs"));
const FPS = 30;
const arg = process.argv.indexOf("--frames");
const only = arg > 0 ? process.argv[arg + 1].split(",").map(Number) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(here, "anuncio.html"));
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);
const total = Math.round(duration * FPS);

if (only) {
  for (const f of only) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    writeFileSync(path.join(here, `quadro-${String(f).padStart(4, "0")}.png`), await page.screenshot({ type: "png" }));
  }
  await browser.close();
  console.log("quadros salvos:", only.join(", "));
  process.exit(0);
}

const ff = spawn("/usr/bin/ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  // Faixa de áudio silenciosa: alguns players e o Gerenciador de Anúncios preferem vídeo com áudio.
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
  "-shortest",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "128k",
  "-movflags", "+faststart",
  path.join(here, "anuncio.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });

const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.renderAt(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 90 === 0) console.log(`quadro ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`anuncio.mp4 pronto: ${total} quadros, ${duration} s`);
