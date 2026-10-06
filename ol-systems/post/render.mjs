// Salva cada card do carrossel.html como PNG 1080x1350.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(here, "carrossel.html"));
await page.evaluate(() => document.fonts.ready);
const problems = await page.evaluate(() =>
  [...document.querySelectorAll(".card")].flatMap((c) => {
    const box = c.getBoundingClientRect();
    return [...c.querySelectorAll("*")]
      .filter((e) => !e.closest(".dots, .tl-globe"))
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.width && (r.bottom > box.bottom - 40 || r.right > box.right - 40 || r.left < box.left + 40 || r.top < box.top + 40))
      .map(([e, r]) => `${c.id}: ${e.tagName.toLowerCase()}.${String(e.className.baseVal ?? e.className).slice(0, 30)} (${Math.round(r.left - box.left)},${Math.round(r.top - box.top)},${Math.round(r.right - box.left)},${Math.round(r.bottom - box.top)})`);
  }),
);
if (problems.length) console.log("FORA DA MARGEM:\n" + problems.slice(0, 20).join("\n"));
else console.log("Margens OK em todos os cards");
for (const el of await page.$$(".card")) {
  const file = await el.getAttribute("data-file");
  await el.screenshot({ path: path.join(here, file) });
  console.log("ok", file);
}
await browser.close();
