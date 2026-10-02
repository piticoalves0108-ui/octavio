/**
 * Grava, a partir da própria cena 3D, os arquivos estáticos do site:
 *   - pôster do hero (AVIF, mesmo enquadramento da cena)       → public/images/hero/
 *   - renders de frente e perfil de cada linha (AVIF)          → public/images/renders/
 *   - maquete do salão vazio e montado (AVIF)                   → public/images/salao/
 *   - vídeo em loop da cadeira girando (WebM + MP4)             → public/video/
 *   - imagens PNG para o Open Graph                              → src/assets/og/
 *
 * Uso (com o site rodando em outro terminal: `npm run dev`):
 *   npm run capture                      # tudo
 *   npm run capture -- --so=renders      # hero | renders | salao | video | og
 *
 * Variáveis: BASE_URL (padrão http://localhost:3000) e CHROMIUM_PATH (opcional;
 * sem ela, use `npx playwright install chromium` antes).
 */
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const so = process.argv.find((a) => a.startsWith("--so="))?.slice(5);
const quer = (etapa) => !so || so.split(",").includes(etapa);

const CONFIG = "tecido=veludo&cor=rose&acabamento=dourado";
const MODELOS = ["cadeira", "lavatorio", "manicure", "recepcao", "espelho"];
const ANGULO_HERO = -0.5;
const ANGULOS = { frente: -0.42, perfil: -1.3 };

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function abrir(caminho, largura, altura, escala = 1.25) {
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: escala });
  pagina.on("pageerror", (e) => console.error("  erro na página:", e.message));
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: "networkidle", timeout: 180_000 });
  await pagina.waitForFunction(() => window.__pronto === true, null, { timeout: 180_000 });
  return pagina;
}

async function fotografar(caminho, largura, altura, saidaAvif, { qualidade = 58, png } = {}) {
  const pagina = await abrir(caminho, largura, altura);
  const buffer = await pagina.locator("#palco").screenshot({ type: "png" });
  await pagina.close();
  await mkdir(join(saidaAvif, ".."), { recursive: true });
  await sharp(buffer).avif({ quality: qualidade, effort: 6 }).toFile(saidaAvif);
  if (png) {
    await mkdir(join(png.arquivo, ".."), { recursive: true });
    await sharp(buffer)
      .resize(png.largura, png.altura, { fit: "cover" })
      .png({ compressionLevel: 9, palette: true })
      .toFile(png.arquivo);
  }
  console.log("  ✓", saidaAvif);
}

if (quer("hero")) {
  console.log("Pôster do hero");
  await fotografar(
    `/captura?cena=hero&angulo=${ANGULO_HERO}&w=960&h=1200&${CONFIG}`,
    960,
    1200,
    "public/images/hero/cadeira-poster.avif",
    {
      png: { arquivo: "src/assets/og/cadeira.png", largura: 500, altura: 625 },
    },
  );
}

if (quer("renders")) {
  console.log("Renders de frente e perfil");
  for (const modelo of MODELOS) {
    for (const [lado, angulo] of Object.entries(ANGULOS)) {
      await fotografar(
        `/captura?cena=modelo&modelo=${modelo}&angulo=${angulo}&w=960&h=1200&${CONFIG}`,
        960,
        1200,
        `public/images/renders/${modelo}-${lado}.avif`,
        lado === "frente" ? { png: { arquivo: `src/assets/og/${modelo}.png`, largura: 500, altura: 625 } } : {},
      );
    }
  }
}

if (quer("salao")) {
  console.log("Maquete do salão");
  await fotografar(
    `/captura?cena=salao&progresso=0&w=1500&h=1000&${CONFIG}`,
    1500,
    1000,
    "public/images/salao/salao-vazio.avif",
  );
  await fotografar(
    `/captura?cena=salao&progresso=1&w=1500&h=1000&${CONFIG}`,
    1500,
    1000,
    "public/images/salao/salao-montado.avif",
    {
      png: { arquivo: "src/assets/og/salao.png", largura: 500, altura: 625 },
    },
  );
}

if (quer("video")) {
  console.log("Vídeo da cadeira girando (fallback para aparelhos fracos)");
  const quadros = 120;
  const pasta = join(tmpdir(), `so-salao-quadros-${Date.now()}`);
  await mkdir(pasta, { recursive: true });
  const pagina = await abrir(`/captura?cena=hero&angulo=${ANGULO_HERO}&w=720&h=900&${CONFIG}`, 720, 900, 1);
  for (let i = 0; i < quadros; i++) {
    await pagina.evaluate((a) => window.__definirAngulo?.(a), ANGULO_HERO + (i / quadros) * Math.PI * 2);
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await writeFile(
      join(pasta, `q${String(i).padStart(3, "0")}.png`),
      await pagina.locator("#palco").screenshot({ type: "png" }),
    );
  }
  await pagina.close();
  await mkdir("public/video", { recursive: true });
  const entrada = ["-y", "-framerate", "24", "-i", join(pasta, "q%03d.png")];
  try {
    execFileSync(
      "ffmpeg",
      [
        ...entrada,
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        "38",
        "-pix_fmt",
        "yuv420p",
        "-an",
        "public/video/cadeira-giro.webm",
      ],
      { stdio: "ignore" },
    );
    execFileSync(
      "ffmpeg",
      [
        ...entrada,
        "-c:v",
        "libx264",
        "-crf",
        "27",
        "-preset",
        "slow",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        "public/video/cadeira-giro.mp4",
      ],
      { stdio: "ignore" },
    );
    console.log("  ✓ public/video/cadeira-giro.webm e .mp4");
  } catch {
    console.warn("  ! ffmpeg não encontrado: os quadros ficaram em", pasta);
  }
  if (existsSync("public/video/cadeira-giro.mp4")) await rm(pasta, { recursive: true, force: true });
}

await navegador.close();
console.log("Pronto.");
