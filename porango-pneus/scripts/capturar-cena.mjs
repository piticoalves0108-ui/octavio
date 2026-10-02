#!/usr/bin/env node
/**
 * Grava, a partir da PRÓPRIA cena 3D, o pôster do hero (AVIF + JPG) e o vídeo curto
 * em loop (WebM + MP4) usado em aparelhos muito fracos.
 *
 * Uso (com o site rodando em outra aba: `npm run dev` ou `npm run start`):
 *   npm run capturar                  # pôster + vídeo, desktop e celular
 *   npm run capturar -- --so-poster   # só os pôsteres
 *   npm run capturar -- --formato=mobile   # só o celular
 *   URL=http://localhost:3000 CHROMIUM=/caminho/do/chrome npm run capturar
 *
 * Precisa de: playwright-core (dev), sharp (dev) e ffmpeg no PATH.
 * O modo ?captura do site desliga o amortecimento e deixa o relógio da cena
 * nas mãos deste script, então cada quadro sai idêntico em qualquer máquina.
 * O balanço do pneu e a poeira têm período de 6 s: o vídeo fecha o loop sem salto.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const URL_SITE = process.env.URL || "http://localhost:3000";
const SO_POSTER = process.argv.includes("--so-poster");
// --formato=mobile (ou desktop) grava só um dos formatos
const FORMATO = process.argv.find((a) => a.startsWith("--formato="))?.split("=")[1];
const RAIZ = new URL("..", import.meta.url).pathname;
const PASTA_IMG = join(RAIZ, "public/images/hero");
const PASTA_VIDEO = join(RAIZ, "public/video");
const TEMP = join(RAIZ, ".captura-temp");

const CANDIDATOS = [
  process.env.CHROMIUM,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executavel = CANDIDATOS.find((c) => existsSync(c));

const FORMATOS = [
  { nome: "desktop", poster: { w: 1920, h: 1080 }, video: { w: 1280, h: 720 } },
  { nome: "mobile", poster: { w: 828, h: 1792, saida: 720 }, video: { w: 540, h: 1170 } },
];
const SEGUNDOS = 6;
const FPS = 30;

// Esconde todo o HTML: só o Canvas aparece na captura.
const CSS_SO_CENA = `
  header, footer, main section, .preloader, .so-sem-cena, nextjs-portal,
  a[aria-label="Cotar meu pneu pelo WhatsApp"] { visibility: hidden !important; }
`;

async function abrir(browser, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.addInitScript(() => sessionStorage.setItem("porango-visto", "1"));
  await page.goto(`${URL_SITE}/?captura`, { waitUntil: "load", timeout: 180_000 });
  await page.addStyleTag({ content: CSS_SO_CENA });
  await page.waitForSelector("html[data-cena='pronta']", { timeout: 180_000 });
  await page.waitForTimeout(1500);
  return page;
}

async function quadro(page, t, caminho) {
  await page.evaluate(async (tempo) => {
    window.__palco.relogioCaptura = tempo;
    window.__avisar();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
  }, t);
  await page.screenshot({ path: caminho, type: "png" });
}

async function main() {
  if (!executavel) throw new Error("Chromium não encontrado. Defina CHROMIUM=/caminho/do/chrome");
  mkdirSync(PASTA_IMG, { recursive: true });
  mkdirSync(PASTA_VIDEO, { recursive: true });
  rmSync(TEMP, { recursive: true, force: true });
  mkdirSync(TEMP, { recursive: true });

  const browser = await chromium.launch({
    executablePath: executavel,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  for (const f of FORMATOS.filter((x) => !FORMATO || x.nome === FORMATO)) {
    // ---------- pôster ----------
    console.log(`[${f.nome}] pôster ${f.poster.w}x${f.poster.h}`);
    let page = await abrir(browser, f.poster.w, f.poster.h);
    const png = join(TEMP, `poster-${f.nome}.png`);
    await quadro(page, 0, png);
    await page.close();
    // celular: grava em 828 px e entrega em 720 px (≈ 412 px de tela × DPR 1,75)
    const base = f.poster.saida ? await sharp(png).resize({ width: f.poster.saida }).toBuffer() : png;
    await sharp(base).avif({ quality: f.poster.saida ? 46 : 52, effort: 6 }).toFile(join(PASTA_IMG, `poster-${f.nome}.avif`));
    await sharp(base).jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(join(PASTA_IMG, `poster-${f.nome}.jpg`));

    if (SO_POSTER) continue;

    // ---------- vídeo em loop ----------
    console.log(`[${f.nome}] vídeo ${f.video.w}x${f.video.h}, ${SEGUNDOS * FPS} quadros`);
    page = await abrir(browser, f.video.w, f.video.h);
    const pasta = join(TEMP, f.nome);
    mkdirSync(pasta, { recursive: true });
    const total = SEGUNDOS * FPS;
    for (let i = 0; i < total; i++) {
      await quadro(page, i / FPS, join(pasta, `q${String(i).padStart(4, "0")}.png`));
      if (i % 30 === 0) console.log(`  quadro ${i}/${total}`);
    }
    await page.close();

    const entrada = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(pasta, "q%04d.png")];
    execFileSync("ffmpeg", [
      ...entrada,
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an",
      join(PASTA_VIDEO, `hero-${f.nome}.webm`),
    ]);
    execFileSync("ffmpeg", [
      ...entrada,
      "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
      join(PASTA_VIDEO, `hero-${f.nome}.mp4`),
    ]);
  }

  await browser.close();
  rmSync(TEMP, { recursive: true, force: true });
  console.log("Pronto: public/images/hero e public/video atualizados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
