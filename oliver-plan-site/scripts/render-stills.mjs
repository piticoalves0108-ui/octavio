/**
 * Gera os renders estáticos de /public/renders a partir das cenas 3D procedurais.
 * Uso: com `npm run dev` rodando, execute `node scripts/render-stills.mjs [http://localhost:3000]`.
 * Requer Playwright com Chromium (npx playwright install chromium).
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const ids = ["cozinha-jacaranda", "cozinha-oliva", "cozinha-vazia", "closet-ambar", "closet-linho", "living-ripado", "living-grafite"];

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
for (const id of ids) {
  await page.goto(`${base}/render-3d?id=${id}`, { waitUntil: "load" });
  await page.waitForSelector('#render-still[data-ready="1"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  // Esconde o indicador de desenvolvimento do Next.js antes da captura
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((el) => el.remove()));
  await page.locator("#render-still").screenshot({ path: `public/renders/${id}.jpg`, type: "jpeg", quality: 84 });
  console.log("✓", id);
}
await browser.close();
