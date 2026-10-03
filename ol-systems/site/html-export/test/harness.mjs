/**
 * Ajudante de testes (Playwright) para a versão HTML.
 *
 * - Sobe um servidor estático na pasta do HTML gerado.
 * - Intercepta os CDNs (cdn.jsdelivr.net), que estão bloqueados neste
 *   ambiente, e responde com os arquivos equivalentes de node_modules.
 *
 * Uso:
 *   import { launch, openPage } from "./html-export/test/harness.mjs";
 *   const { browser, base, close } = await launch({ dir: "/caminho/da/saida" });
 *   const page = await openPage(browser, base + "index.html", { width: 390, height: 844, mobile: true });
 *   ...; await close();
 *
 * Opções de openPage: width, height, mobile (isMobile+hasTouch+DPR 2),
 *   reducedMotion (true), blockCdn (true = CDN falha), noWebgl (true = sem WebGL),
 *   onConsole (callback para mensagens de console/pageerror).
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NM = path.join(SITE, "node_modules");
const globalRoot = execSync("npm root -g").toString().trim();
const { chromium } = await import(path.join(globalRoot, "playwright/index.mjs"));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css" };

export async function launch({ dir, gl = true } = {}) {
  const server = http.createServer(async (req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(dir, u.endsWith("/") ? u + "index.html" : u);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const args = gl ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [];
  const browser = await chromium.launch({ args });
  return { browser, base, close: async () => (await browser.close(), server.close()) };
}

const JSD = "https://cdn.jsdelivr.net/npm/";

/** Converte uma URL do jsDelivr no arquivo local equivalente (+ ajustes de import). */
async function cdnToLocal(url) {
  const p = url.slice(JSD.length).split("?")[0];
  let m;
  if ((m = /^gsap@[^/]+\/dist\/(.+)$/.exec(p))) return { file: path.join(NM, "gsap/dist", m[1]) };
  if ((m = /^lenis@[^/]+\/dist\/(.+)$/.exec(p))) return { file: path.join(NM, "lenis/dist", m[1]) };
  if ((m = /^three@([^/]+)\/\+esm$/.exec(p))) return { file: path.join(NM, "three/build/three.module.js"), rewrite: "core", ver: m[1] };
  if ((m = /^three@([^/]+)\/three\.core\.js$/.exec(p))) return { file: path.join(NM, "three/build/three.core.js") };
  if ((m = /^three@([^/]+)\/examples\/jsm\/(.+?)(?:\/\+esm)?$/.exec(p))) return { file: path.join(NM, "three/examples/jsm", m[2]), rewrite: "addon", ver: m[1], rel: m[2] };
  return null;
}

function rewriteAddon(code, ver, rel) {
  const dir = path.posix.dirname(rel);
  return code
    .replace(/from\s+['"]three['"]/g, `from '${JSD}three@${ver}/+esm'`)
    .replace(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g, (_, r) => `from '${JSD}three@${ver}/examples/jsm/${path.posix.normalize(path.posix.join(dir, r))}/+esm'`);
}

export async function openPage(browser, url, opts = {}) {
  const { width = 1440, height = 900, mobile = false, reducedMotion = false, blockCdn = false, noWebgl = false, onConsole } = opts;
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  if (noWebgl) {
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...a) {
        return /webgl/i.test(t) ? null : orig.call(this, t, ...a);
      };
    });
  }
  await ctx.route(`${JSD}**`, async (route) => {
    if (blockCdn) return route.abort("failed");
    const hit = await cdnToLocal(route.request().url());
    if (!hit) return route.fulfill({ status: 404, body: "not mapped" });
    try {
      let body = await readFile(hit.file, "utf8");
      if (hit.rewrite === "addon") body = rewriteAddon(body, hit.ver, hit.rel);
      if (hit.rewrite === "core") body = body.replace(/from\s+['"]\.\/three\.core\.js['"]/g, `from '${JSD}three@${hit.ver}/three.core.js'`);
      return route.fulfill({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body });
    } catch {
      return route.fulfill({ status: 404, body: "missing" });
    }
  });
  const page = await ctx.newPage();
  if (onConsole) {
    page.on("console", (m) => onConsole(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => onConsole(`pageerror: ${e.message}`));
  }
  await page.goto(url, { waitUntil: "load" });
  return page;
}
