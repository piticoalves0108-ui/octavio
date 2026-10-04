#!/usr/bin/env node
/**
 * Gera a versão em HTML puro da página (pasta ol-systems/html/).
 *
 * Uso:  npm run export:html
 *   (faz o export estático do Next e depois roda este script)
 *
 * O que ele faz:
 *  - pega o HTML renderizado pelo Next (out/index.html e a política de privacidade);
 *  - tira todo o JavaScript do React/Next;
 *  - embute o CSS (Tailwind já compilado) e as fontes (subset latino em base64);
 *  - injeta o JavaScript próprio da versão HTML (html-export/js/*.js, em ordem),
 *    o CSS extra (html-export/extra.css) e o HTML extra do fim do body
 *    (html-export/body-end.html);
 *  - formata tudo com o Prettier para ficar fácil de editar.
 *
 * Variáveis de ambiente:
 *  OUT_DIR   pasta de saída (padrão: ../html, ou seja, ol-systems/html)
 *  SITE_URL  domínio final (ex.: https://olsystems.com.br). Opcional: sem ele, a página
 *            sai sem canonical/og:url e a imagem de compartilhamento usa caminho relativo.
 */
import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const SRC = path.join(ROOT, "html-export");
const DEST = path.resolve(process.env.OUT_DIR ?? path.join(ROOT, "..", "html"));
const SITE_URL = (process.env.SITE_URL ?? "").replace(/\/$/, "");

if (!existsSync(path.join(OUT, "index.html"))) {
  console.error("Não achei out/index.html. Rode antes: STATIC_EXPORT=1 npx next build");
  process.exit(1);
}

const read = (p) => readFile(p, "utf8");

/* ---------- CSS: Tailwind compilado + fontes embutidas ---------- */

async function buildCss() {
  const cssDir = path.join(OUT, "_next/static/css");
  const files = (await readdir(cssDir)).filter((f) => f.endsWith(".css"));
  let css = (await Promise.all(files.map((f) => read(path.join(cssDir, f))))).join("\n");

  // @font-face do next/font: fica só o subset latino (cobre o português),
  // embutido em base64, um bloco por arquivo (fonte variável cobre os pesos).
  const latin = new Map(); // arquivo -> { family, weights[] }
  css = css.replace(/@font-face\{[^}]*\}/g, (block) => {
    const src = /url\((\/_next\/static\/media\/[^)]+)\)/.exec(block);
    if (!src) return block; // faces "Fallback" com local(): mantém
    if (!/unicode-range:u\+00\?\?/.test(block)) return ""; // outros alfabetos: remove
    const family = /font-family:([^;]+);/.exec(block)[1];
    // font-weight pode ser um valor ("500") ou faixa de fonte variável ("100 900").
    const weights = (/font-weight:([^;}]+)/.exec(block)?.[1] ?? "400").trim().split(/\s+/).map(Number);
    const entry = latin.get(src[1]) ?? { family, weights: [] };
    entry.weights.push(...weights);
    latin.set(src[1], entry);
    return "";
  });
  const faces = [];
  for (const [url, { family, weights }] of latin) {
    const data = await readFile(path.join(OUT, url));
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    faces.push(
      `@font-face{font-family:${family};font-style:normal;font-weight:${min === max ? min : `${min} ${max}`};font-display:swap;` +
        `src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2")}`,
    );
  }
  if (/\/_next\//.test(css)) throw new Error("Sobrou referência a /_next/ no CSS");

  // CSS extra da versão HTML: html-export/css/*.css (um arquivo por módulo).
  const extra = (await readParts(path.join(SRC, "css"), ".css")).map(({ f, text }) => `/* ===== ${f} ===== */\n${text}`).join("\n");
  const pretty = await prettier.format(css + "\n" + extra, { parser: "css", printWidth: 120 });
  return { fonts: faces.join("\n"), css: pretty };
}

/* ---------- JavaScript da versão HTML ---------- */

/**
 * JS_ONLY (opcional, para testes): lista de prefixos separados por vírgula,
 * ex. "10,20". Inclui só esses módulos (00-config, 01-core e 99-main entram sempre).
 */
const ONLY = process.env.JS_ONLY ? process.env.JS_ONLY.split(",").map((x) => x.trim()) : null;
const included = (f) => !ONLY || /^(00|01|99)-/.test(f) || ONLY.some((p) => f.startsWith(p));

async function readParts(dir, ext) {
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(ext) && included(f)).sort();
  return Promise.all(files.map(async (f) => ({ f, text: await read(path.join(dir, f)) })));
}

async function buildJs() {
  const dir = path.join(SRC, "js");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js") && included(f)).sort();
  const parts = [];
  for (const f of files) parts.push(`/* ===== ${f} ===== */\n${(await read(path.join(dir, f))).trim()}\n`);
  return parts.join("\n");
}

/* ---------- HTML ---------- */

function cleanHtml(html, { title }) {
  let h = html;
  // Todo <script> do Next/React sai (fica só o JSON-LD do Google).
  h = h.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
  h = h.replace(/<link[^>]*rel="(?:preload|stylesheet|modulepreload)"[^>]*\/?>/g, "");
  h = h.replace(/<meta name="next-size-adjust"[^>]*\/?>/g, "");
  h = h.replace(/<div hidden="">\s*(?:<!--\$-->)?\s*(?:<!--\/\$-->)?\s*<\/div>/g, "");
  h = h.replace(/<!--\/?\$-->/g, "").replace(/<!-- -->/g, "").replace(/<!--[A-Za-z0-9_-]{15,}-->/g, "");
  // Ícone e imagem de compartilhamento.
  h = h.replace(/<link rel="icon"[^>]*\/?>/g, "<!--ICON-->");
  h = h.replace(/http:\/\/localhost:3000\/opengraph-image\?[a-z0-9]+/g, SITE_URL ? `${SITE_URL}/og-image.png` : "og-image.png");
  if (SITE_URL) {
    h = h.replace(/http:\/\/localhost:3000/g, SITE_URL);
  } else {
    // Sem domínio definido: nada de endereço inventado na página.
    h = h.replace(/<link rel="canonical"[^>]*\/?>/g, "").replace(/<meta property="og:url"[^>]*\/?>/g, "");
    h = h.replace(/"url":"http:\/\/localhost:3000\/?",?/g, "");
    if (/localhost:3000/.test(h)) throw new Error(`Sobrou localhost em ${title}`);
  }
  // Links entre as páginas.
  h = h.replace(/href="\/politica-de-privacidade\/"/g, 'href="politica-de-privacidade.html"');
  h = h.replace(/href="\/"/g, 'href="index.html"');
  if (/\/_next\//.test(h)) throw new Error(`Sobrou referência a /_next/ em ${title}`);
  return h;
}

async function buildPage(srcFile, destName, { css, fonts, js, bodyEnd, icon }) {
  let html = cleanHtml(await read(srcFile), { title: destName });
  const head = [
    `<!--\n  ${destName} — versão em HTML puro, gerada a partir do projeto Next.js (ol-systems/site).\n` +
      `  Para trocar WhatsApp, IDs de medição e textos da conversa de exemplo, edite o objeto CONFIG\n` +
      `  no começo do <script> no fim da página.\n` +
      (SITE_URL
        ? `  Domínio: ${SITE_URL}.\n-->`
        : `  Quando tiver domínio, gere de novo com SITE_URL=https://seudominio.com.br npm run export:html\n` +
          `  (ou adicione <link rel="canonical"> e use o endereço completo em og:image).\n-->`),
    `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}" />`,
    `<style>\n/* Fontes (subset latino embutido) */\n${fonts}\n</style>`,
    `<style>\n${css}\n</style>`,
  ].join("\n");
  // Replacer em função: o texto do JS tem "$$", "$&" etc., que num replace com
  // string virariam padrões especiais.
  html = html.replace("<!--ICON-->", "").replace("</head>", () => `${head}\n</head>`);
  if (js) html = html.replace("</body>", () => `${bodyEnd}\n<script type="module">\n${js}\n</script>\n</body>`);
  const pretty = await prettier.format(html, {
    parser: "html",
    printWidth: 140,
    htmlWhitespaceSensitivity: "css",
    embeddedLanguageFormatting: "off",
  });
  await writeFile(path.join(DEST, destName), pretty);
  return pretty.length;
}

await mkdir(DEST, { recursive: true });
const { css, fonts } = await buildCss();
const js = await buildJs();
// HTML extra no fim do <body>: html-export/partials/*.html (ex.: barra fixa do celular).
const bodyEnd = (await readParts(path.join(SRC, "partials"), ".html")).map(({ text }) => text).join("\n");
const icon = await read(path.join(OUT, "icon.svg"));

const a = await buildPage(path.join(OUT, "index.html"), "index.html", { css, fonts, js, bodyEnd, icon });
// A política não precisa das animações: só o CSS (e o JS mínimo de contato, se houver).
const b = await buildPage(path.join(OUT, "politica-de-privacidade/index.html"), "politica-de-privacidade.html", {
  css,
  fonts,
  js: "",
  bodyEnd: "",
  icon,
});
await copyFile(path.join(OUT, "opengraph-image"), path.join(DEST, "og-image.png"));

console.log(`HTML gerado em ${path.relative(process.cwd(), DEST) || "."}:`);
console.log(`  index.html                     ${(a / 1024).toFixed(0)} kB`);
console.log(`  politica-de-privacidade.html   ${(b / 1024).toFixed(0)} kB`);
console.log(`  og-image.png`);
