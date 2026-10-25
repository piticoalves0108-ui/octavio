// Gera um único arquivo HTML jogável (abre com dois cliques, sem servidor):
//   node scripts/build-single.mjs   →   dist-single/eclipse-arcano.html
// Todo o código, estilos e fontes ficam embutidos no HTML.
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist-single');
rmSync(outDir, { recursive: true, force: true });

await build({
  root,
  configFile: false,
  base: './',
  logLevel: 'warn',
  build: {
    outDir,
    target: 'es2022',
    // tudo num só pedaço: sem chunks separados nem pré-carregamento de módulos
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const assets = join(outDir, 'assets');
let html = readFileSync(join(outDir, 'index.html'), 'utf8');
const read = (href) => readFileSync(join(outDir, href.replace(/^\.\//, '')), 'utf8');

// <link rel="stylesheet" href="./assets/x.css"> → <style>…</style>
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => `<style>\n${read(href)}\n</style>`);
// <script type="module" src="./assets/x.js"></script> → script embutido
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const js = read(src).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('sobrou referência a arquivo externo no HTML');

const file = join(outDir, 'eclipse-arcano.html');
writeFileSync(file, html);
rmSync(join(outDir, 'index.html'));
rmSync(assets, { recursive: true, force: true });
for (const f of readdirSync(outDir)) if (f !== 'eclipse-arcano.html') rmSync(join(outDir, f), { recursive: true, force: true });
console.log(`pronto: ${file} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
