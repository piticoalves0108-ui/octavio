/**
 * npm run captura
 *
 * Renderiza, a partir da PRÓPRIA cena 3D (rota /captura), tudo o que o site
 * usa quando o WebGL não está rodando:
 *   public/poster/hero-desktop-{1280,1920}.avif + .webp   (pôster/LCP, 16:9)
 *   public/poster/hero-mobile-{720,1080}.avif + .webp     (pôster retrato)
 *   public/video/hero-{desktop,mobile}.{webm,mp4}         (loop de 8 s, aparelhos fracos)
 *   public/renders/peca-*.webp, hamburguer.webp           (miniaturas sem WebGL)
 *   src/app/opengraph-image.jpg, src/app/cardapio/opengraph-image.jpg
 *   public/icone-{192,512}.png, src/app/apple-icon.png
 *
 * Requisitos: Chromium (Playwright) e ffmpeg no PATH. Variáveis opcionais:
 *   CHROMIUM_PATH  caminho do executável do Chromium
 *   CAPTURA_URL    usar um servidor já rodando (senão sobe `next dev` na porta 3123)
 *   SEM_VIDEO=1    pula o vídeo (mais rápido)
 *   SO=poster,og,miniaturas,video,icones   roda só essas etapas
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright-core";

const raiz = new URL("..", import.meta.url).pathname;
const pub = (...p) => join(raiz, "public", ...p);
const tmp = join(raiz, ".captura");
mkdirSync(tmp, { recursive: true });
["poster", "video", "renders"].forEach((d) => mkdirSync(pub(d), { recursive: true }));

let servidor = null;
let url = process.env.CAPTURA_URL;
if (!url) {
  url = "http://localhost:3123";
  servidor = spawn("npx", ["next", "dev", "-p", "3123"], { cwd: raiz, stdio: "ignore", env: { ...process.env, CAPTURA: "1" } });
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${url}/captura`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const caminhosChromium = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean);
const navegador = await chromium.launch({
  executablePath: caminhosChromium.find((c) => existsSync(c)),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function abrir(caminho, largura, altura, escala = 1) {
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: escala });
  await pagina.addInitScript(() => sessionStorage.setItem("brasa-acesa", "1"));
  await pagina.goto(`${url}${caminho}`, { waitUntil: "load" });
  await pagina.waitForFunction(() => window.__captura, null, { timeout: 120_000 });
  await pagina.evaluate(() => document.fonts.ready);
  return pagina;
}

async function quadro(pagina, tempo, intro = 0) {
  // dois quadros: o primeiro compila shaders/ambiente, o segundo sai limpo
  await pagina.evaluate(([t, i]) => window.__captura.quadro(t, i), [tempo, intro]);
  await pagina.evaluate(([t, i]) => window.__captura.quadro(t, i), [tempo, intro]);
}

let p;
let png;
const etapas = process.env.SO ? process.env.SO.split(",") : ["poster", "og", "miniaturas", "video", "icones"];
const fazer = (etapa) => etapas.includes(etapa) && !(etapa === "video" && process.env.SEM_VIDEO);

const foto = (pagina, transparente = false) => pagina.screenshot({ type: "png", omitBackground: transparente });

// ------------------------------------------------------------- pôsteres
if (fazer("poster")) {
console.log("pôster desktop...");
p = await abrir("/captura?modo=hero", 1920, 1080);
await quadro(p, 1.2, 0);
png = await foto(p);
await sharp(png).avif({ quality: 52, effort: 6 }).toFile(pub("poster", "hero-desktop-1920.avif"));
await sharp(png).resize(1280).avif({ quality: 50, effort: 6 }).toFile(pub("poster", "hero-desktop-1280.avif"));
await sharp(png).webp({ quality: 72 }).toFile(pub("poster", "hero-desktop-1920.webp"));
await p.close();

console.log("pôster mobile...");
p = await abrir("/captura?modo=hero", 540, 1170, 2);
await quadro(p, 1.2, 0);
png = await foto(p);
await sharp(png).resize(1080).avif({ quality: 50, effort: 6 }).toFile(pub("poster", "hero-mobile-1080.avif"));
await sharp(png).resize(720).avif({ quality: 50, effort: 6 }).toFile(pub("poster", "hero-mobile-720.avif"));
await sharp(png).resize(1080).webp({ quality: 70 }).toFile(pub("poster", "hero-mobile-1080.webp"));
await p.close();
}

// ------------------------------------------------------------- OG
if (fazer("og")) {
for (const [og, destino] of [
  ["home", join(raiz, "src/app/opengraph-image.jpg")],
  ["cardapio", join(raiz, "src/app/cardapio/opengraph-image.jpg")],
]) {
  console.log(`og ${og}...`);
  p = await abrir(`/captura?modo=hero&og=${og}`, 1200, 630);
  await quadro(p, 2.4, 1);
  await sharp(await foto(p)).jpeg({ quality: 84, mozjpeg: true }).toFile(destino);
  await p.close();
}
writeFileSync(join(raiz, "src/app/opengraph-image.alt.txt"), "Churrasquinho do Bruce: espeto girando sobre a grelha com brasas acesas. Espeto saindo agora.");
writeFileSync(join(raiz, "src/app/cardapio/opengraph-image.alt.txt"), "Cardápio do Churrasquinho do Bruce: espetinho, hambúrguer, almoço e bebida.");
}

// ------------------------------------------------------------- miniaturas
if (fazer("miniaturas")) {
for (const peca of ["carne", "frango", "linguica", "queijo"]) {
  console.log(`miniatura ${peca}...`);
  p = await abrir(`/captura?modo=peca&peca=${peca}`, 640, 640);
  await quadro(p, 0, 1);
  await sharp(await foto(p, true)).trim({ threshold: 1 }).resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 80, alphaQuality: 90 }).toFile(pub("renders", `peca-${peca}.webp`));
  await p.close();
}
console.log("miniatura hambúrguer...");
p = await abrir("/captura?modo=hamburguer", 900, 900);
await quadro(p, 0, 1);
await sharp(await foto(p, true)).trim({ threshold: 1 }).webp({ quality: 80, alphaQuality: 90 }).toFile(pub("renders", "hamburguer.webp"));
await p.close();
}

// ------------------------------------------------------------- vídeo
if (fazer("video")) {
  for (const [nome, largura, altura] of [
    ["desktop", 960, 540],
    ["mobile", 432, 936],
  ]) {
    console.log(`vídeo ${nome} (8 s a 24 fps)...`);
    const pasta = join(tmp, `quadros-${nome}`);
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(pasta, { recursive: true });
    p = await abrir("/captura?modo=hero", largura, altura);
    const FPS = 24;
    for (let i = 0; i < 8 * FPS; i++) {
      await quadro(p, i / FPS, 0);
      await p.screenshot({ path: join(pasta, `${String(i).padStart(4, "0")}.png`) });
    }
    await p.close();
    const entrada = ["-y", "-framerate", String(FPS), "-i", join(pasta, "%04d.png")];
    execFileSync("ffmpeg", [...entrada, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "48", "-row-mt", "1", "-an", pub("video", `hero-${nome}.webm`)], { stdio: "ignore" });
    execFileSync("ffmpeg", [...entrada, "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", pub("video", `hero-${nome}.mp4`)], { stdio: "ignore" });
  }
}

// ------------------------------------------------------------- ícones
if (fazer("icones")) {
const svg = join(raiz, "src/app/icon.svg");
await sharp(svg).resize(192).png().toFile(pub("icone-192.png"));
await sharp(svg).resize(512).png().toFile(pub("icone-512.png"));
await sharp(svg).resize(180).png().toFile(join(raiz, "src/app/apple-icon.png"));
}

await navegador.close();
servidor?.kill();
console.log("pronto.");
