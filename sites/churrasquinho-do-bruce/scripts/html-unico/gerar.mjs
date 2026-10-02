/**
 * npm run html
 *
 * Gera UM arquivo HTML autocontido com o site inteiro (CSS, fontes, imagens,
 * 3D e animações embutidos): dist/churrasquinho-do-bruce.html.
 * Abre com dois cliques, sem servidor. Útil para mostrar ao Bruce, mandar por
 * WhatsApp/e-mail ou hospedar em qualquer lugar.
 *
 * Passos: next build → next start → baixa o HTML da home → embute CSS,
 * fontes (base64), imagens (base64) e um bundle do esbuild com a cena 3D.
 */
import { spawn, execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const raiz = new URL("../..", import.meta.url).pathname;
const PORTA = 3321;
const url = `http://localhost:${PORTA}`;

if (!process.env.SEM_BUILD) execSync("npx next build", { cwd: raiz, stdio: "inherit" });
// detached: cria um grupo de processos para matar o next-server junto no fim.
const servidor = spawn("npx", ["next", "start", "-p", String(PORTA)], { cwd: raiz, stdio: "ignore", detached: true });
const encerrar = () => {
  try {
    process.kill(-servidor.pid);
  } catch {}
};
process.on("exit", encerrar);
let html = "";
for (let i = 0; i < 60 && !html; i++) {
  try {
    const r = await fetch(url);
    if (r.ok) html = await r.text();
  } catch {}
  if (!html) await new Promise((r) => setTimeout(r, 1000));
}
if (!html) throw new Error("servidor não respondeu");

const MIME = { woff2: "font/woff2", avif: "image/avif", webp: "image/webp", png: "image/png", svg: "image/svg+xml", jpg: "image/jpeg" };
const cache = new Map();
async function dataUri(caminho) {
  if (cache.has(caminho)) return cache.get(caminho);
  const r = await fetch(new URL(caminho, url));
  if (!r.ok) throw new Error(`${caminho}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ext = caminho.split("?")[0].split(".").pop();
  const uri = `data:${MIME[ext] ?? "application/octet-stream"};base64,${buf.toString("base64")}`;
  cache.set(caminho, uri);
  return uri;
}
async function substituirAsync(texto, regex, f) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(regex)) {
    partes.push(texto.slice(ultimo, m.index), await f(m));
    ultimo = m.index + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return partes.join("");
}

// CSS com fontes embutidas
let css = "";
for (const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g)) {
  const r = await fetch(new URL(m[1], url));
  if (!r.ok) throw new Error(`CSS ${m[1]}: ${r.status}`);
  css += await r.text();
}
css = await substituirAsync(css, /url\((\/_next\/static\/media\/[^)]+)\)/g, async (m) => `url(${await dataUri(m[1])})`);

// Limpa o que é do Next (scripts, preloads) e embute CSS
html = html
  .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, (s) => (/^<script>try\{var d=document\.documentElement/.test(s) ? s : ""))
  .replace(/<link rel="(?:preload|stylesheet|modulepreload)"[^>]*>/g, "")
  .replace(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g, "")
  .replace("</head>", `<style>${css}</style><link rel="icon" href="${await dataUri("/icon.svg")}"></head>`);

// Imagens: pôster (um tamanho de cada), miniaturas
html = html
  .replace(/srcSet="\/poster\/hero-mobile-720\.avif 720w, \/poster\/hero-mobile-1080\.avif 1080w"/g, 'srcSet="/poster/hero-mobile-720.avif"')
  .replace(/srcSet="\/poster\/hero-desktop-1280\.avif 1280w, \/poster\/hero-desktop-1920\.avif 1920w"/g, 'srcSet="/poster/hero-desktop-1280.avif"')
  .replace(/<source[^>]*hero-mobile-1080\.webp[^>]*>/g, "")
  .replace(/srcset=/g, "srcSet=");
html = await substituirAsync(html, /(src|srcSet)="(\/(?:poster|renders)\/[^"\s]+)"/g, async (m) => `${m[1]}="${await dataUri(m[2])}"`);
html = html.replace(/ loading="lazy"/g, "");

// Bundle da cena 3D + motion
const js = await build({
  entryPoints: [join(raiz, "scripts/html-unico/entrada.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  alias: { "@": join(raiz, "src") },
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_MOSTRAR_PENDENCIAS": "undefined" },
  legalComments: "none",
  logLevel: "warning",
});
// Em base64 via data: URI: o bundle tem strings como "<script>" que confundiriam o parser de HTML.
const codigo = Buffer.from(js.outputFiles[0].text).toString("base64");
html = html.replace("</body>", `<script src="data:text/javascript;base64,${codigo}"></script></body>`);

encerrar();
const destino = join(raiz, "dist");
if (!existsSync(destino)) mkdirSync(destino);
writeFileSync(join(destino, "churrasquinho-do-bruce.html"), html);
console.log(`dist/churrasquinho-do-bruce.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
