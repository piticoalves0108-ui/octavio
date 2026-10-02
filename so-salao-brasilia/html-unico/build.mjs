/**
 * Gera o site inteiro num único arquivo HTML: `npm run html`
 *   → html-unico/dist/so-salao-brasilia.html
 *
 * Usa os mesmos componentes do site Next.js. As partes específicas do Next (imagem,
 * link, carregamento dinâmico, navegação) são trocadas pelos substitutos desta pasta,
 * as páginas viram rotas com "#" e tudo vai embutido: JavaScript (React, three.js,
 * GSAP...), CSS (Tailwind), fontes, imagens e vídeo. Abre direto do computador, sem
 * servidor e sem internet (só o mapa interativo do Google precisa de conexão).
 */
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const CACHE = join(AQUI, ".cache");
const DEPURAR = process.argv.includes("--depurar");
const SAIDA = join(AQUI, "dist", DEPURAR ? "depuracao.html" : "so-salao-brasilia.html");
await mkdir(CACHE, { recursive: true });
await mkdir(dirname(SAIDA), { recursive: true });

/* ---------------------------------------------------------------- */
/* 1. Imagens e vídeo de /public como data URIs                      */
/* ---------------------------------------------------------------- */
const TIPOS = {
  ".avif": "image/avif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
async function* arquivos(pasta) {
  for (const item of await readdir(pasta, { withFileTypes: true })) {
    const c = join(pasta, item.name);
    if (item.isDirectory()) yield* arquivos(c);
    else if (TIPOS[extname(item.name)]) yield c;
  }
}
const ativos = {};
for (const pasta of ["public/images", "public/video"]) {
  for await (const arq of arquivos(join(RAIZ, pasta))) {
    const chave = "/" + relative(join(RAIZ, "public"), arq).split("\\").join("/");
    ativos[chave] = `data:${TIPOS[extname(arq)]};base64,${(await readFile(arq)).toString("base64")}`;
  }
}

/* ---------------------------------------------------------------- */
/* 2. Substitutos dos módulos do Next                                */
/* ---------------------------------------------------------------- */
const S = (f) => join(AQUI, f);
function substitutos({ semIntro }) {
  return {
    name: "substitutos",
    setup(b) {
      const mapa = [
        [/^next\/image$/, S("substitutos/next-image.tsx")],
        [/^next\/link$/, S("substitutos/next-link.tsx")],
        [/^next\/dynamic$/, S("substitutos/next-dynamic.tsx")],
        [/^next\/navigation$/, S("substitutos/next-navigation.ts")],
        [/(^|\/)Transicao$/, S("spa/Transicao.tsx")],
        [/(^|\/)HidratarAoVer$/, S("substitutos/HidratarAoVer.tsx")],
        [/(^|\/)JsonLd$/, S("substitutos/vazio.tsx")],
        [/(^|\/)Medicao$/, S("substitutos/vazio.tsx")],
      ];
      if (semIntro) mapa.push([/^@\/components\/layout\/Intro$/, S("substitutos/vazio.tsx")]);
      for (const [filtro, destino] of mapa) {
        b.onResolve({ filter: filtro }, (args) => {
          // O próprio Transicao da SPA não deve ser trocado por ele mesmo.
          if (args.importer.startsWith(join(AQUI, "spa")) && /Transicao$/.test(args.path) && args.path.startsWith("./"))
            return;
          return { path: destino };
        });
      }
    },
  };
}

const comum = {
  bundle: true,
  jsx: "automatic",
  tsconfig: join(RAIZ, "tsconfig.json"),
  logLevel: "error",
  loader: { ".tsx": "tsx", ".ts": "ts" },
  define: {
    "process.env.NODE_ENV": DEPURAR ? '"development"' : '"production"',
    "process.env.NEXT_PUBLIC_SITE_URL": '""',
    "process.env.NEXT_PUBLIC_GA_ID": '""',
    "process.env.VERCEL_PROJECT_PRODUCTION_URL": '""',
    "process.env.VERCEL": '""',
  },
};

/* ---------------------------------------------------------------- */
/* 3. Pré-renderização da home (HTML pronto antes do JavaScript)     */
/* ---------------------------------------------------------------- */
const arquivoPre = join(CACHE, "prerender.cjs");
await build({
  ...comum,
  entryPoints: [S("spa/prerender.tsx")],
  platform: "node",
  format: "cjs",
  outfile: arquivoPre,
  plugins: [substitutos({ semIntro: true })],
});
globalThis.__ATIVOS__ = ativos;
const require = createRequire(import.meta.url);
const pre = require(arquivoPre).prerender();

/* ---------------------------------------------------------------- */
/* 4. JavaScript do navegador (um arquivo só, minificado)            */
/* ---------------------------------------------------------------- */
const js = await build({
  ...comum,
  entryPoints: [S("spa/main.tsx")],
  platform: "browser",
  format: "iife",
  target: ["es2020", "safari15"],
  minify: !DEPURAR,
  write: false,
  legalComments: "none",
  banner: { js: "var process=globalThis.process||{env:{}};" },
  plugins: [substitutos({ semIntro: true })],
});
const codigo = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

/* ---------------------------------------------------------------- */
/* 5. CSS: Tailwind (mesmo globals.css do site) + fontes embutidas   */
/* ---------------------------------------------------------------- */
const arquivoCss = join(RAIZ, "src/app/globals.css");
const css = await postcss([tailwind({ base: RAIZ, optimize: { minify: true } })]).process(
  await readFile(arquivoCss, "utf8"),
  {
    from: arquivoCss,
  },
);
const fonte = async (f) => `data:font/woff2;base64,${(await readFile(S(`fontes/${f}`))).toString("base64")}`;
const cssFontes = `
@font-face{font-family:"DM Serif Display";font-style:normal;font-weight:400;font-display:swap;src:url(${await fonte("dm-serif-display.woff2")}) format("woff2")}
@font-face{font-family:"DM Serif Display";font-style:italic;font-weight:400;font-display:swap;src:url(${await fonte("dm-serif-display-italico.woff2")}) format("woff2")}
@font-face{font-family:"Outfit";font-style:normal;font-weight:100 900;font-display:swap;src:url(${await fonte("outfit.woff2")}) format("woff2")}
:root{--font-dm-serif:"DM Serif Display";--font-dm-serif-italico:"DM Serif Display";--font-outfit:"Outfit"}`;

/* ---------------------------------------------------------------- */
/* 6. Monta o HTML                                                   */
/* ---------------------------------------------------------------- */
// A intro só aparece na home: aqui a home é "#/" (ou sem #).
const scriptIntro = pre.scriptIntro.replace(
  "location.pathname==='/'",
  "(location.hash===''||location.hash==='#/'||location.hash.indexOf('#/#')===0)",
);
const icone = `data:image/svg+xml,${encodeURIComponent(await readFile(join(RAIZ, "src/app/icon.svg"), "utf8"))}`;
const titulo = "Só Salão Brasília | Fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF";
const descricao =
  "Fábrica própria de móveis para salão de beleza e esmalteria em Taguatinga Norte, Brasília - DF. Produção sob encomenda com entrega em até 7 dias úteis e parcelamento em até 12x sem juros no cartão.";

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="${descricao}">
<meta name="theme-color" content="#f7f5f3">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descricao}">
<meta property="og:locale" content="pt_BR">
<link rel="icon" href="${icone}">
<style>${cssFontes}${css.css}</style>
<script>window.__SPA__=true;${scriptIntro}</script>
${pre.jsonLd.map((j) => `<script type="application/ld+json">${j}</script>`).join("\n")}
</head>
<body>
${pre.intro}
<div id="raiz">${pre.app}</div>
<script>window.__ATIVOS__=${JSON.stringify(ativos)};</script>
<script>${codigo}</script>
</body>
</html>
`;
await writeFile(SAIDA, html);
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`✓ ${relative(RAIZ, SAIDA)} (${mb} MB)`);
