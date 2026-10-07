// Gera os arquivos de assets/ a partir de src/.
// Uso: npm run build  (ou npm run dev para recompilar ao salvar)
import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  minify: true,
  target: ['es2020', 'safari15'],
  legalComments: 'none',
  logLevel: 'info'
};

const builds = [
  { ...common, entryPoints: ['src/js/main.js'], outfile: 'assets/js/app.js', format: 'iife' },
  { ...common, entryPoints: ['src/phone3d/index.js'], outfile: 'assets/js/phone3d.js', format: 'iife' },
  { ...common, entryPoints: ['src/styles/style.css'], outfile: 'assets/css/style.css', external: ['*.woff2'] }
];

const fonts = [
  ['@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2', 'unbounded-latin-wght-normal.woff2'],
  ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'manrope-latin-wght-normal.woff2'],
  ['@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'jetbrains-mono-latin-wght-normal.woff2']
];

await mkdir('assets/fonts', { recursive: true });
for (const [from, to] of fonts) await copyFile(`node_modules/${from}`, `assets/fonts/${to}`);

if (watch) {
  for (const b of builds) (await esbuild.context(b)).watch();
  console.log('Observando src/ ...');
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
  await buildSingleFile();
}

// Gera borelcell.html: o site inteiro num arquivo só (abre direto no navegador, sem servidor)
async function buildSingleFile() {
  const read = (p) => readFile(p, 'utf8');
  const safe = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const b64 = async (p) => (await readFile(p)).toString('base64');

  let css = await read('assets/css/style.css');
  for (const [, file] of fonts) {
    css = css.split(`../fonts/${file}`).join(`data:font/woff2;base64,${await b64(`assets/fonts/${file}`)}`);
  }
  const favicon = `data:image/svg+xml;base64,${await b64('assets/img/favicon.svg')}`;

  let html = await read('index.html');
  const swap = (from, to) => {
    if (!html.includes(from)) throw new Error(`Trecho não encontrado no index.html: ${from}`);
    html = html.replace(from, () => to);
  };
  html = html.replace(/\s*<link rel="preload"[^>]+>/g, '');
  html = html.replace(/\s*<meta property="og:image"[^>]+>/g, '');
  swap('<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">', `<link rel="icon" href="${favicon}" type="image/svg+xml">`);
  swap('<link rel="stylesheet" href="assets/css/style.css">', `<style>\n${css}\n</style>`);
  swap('<script src="assets/js/config.js"></script>', `<script>\n${safe(await read('assets/js/config.js'))}\n</script>`);
  swap('<script src="assets/js/catalogo.js"></script>', `<script>\n${safe(await read('assets/js/catalogo.js'))}\n</script>`);
  swap('<script src="assets/js/app.js" defer></script>', [
    `<script type="text/plain" id="phone3d-src">${safe(await read('assets/js/phone3d.js'))}</script>`,
    `<script>\n${safe(await read('assets/js/app.js'))}\n</script>`
  ].join('\n  '));

  await writeFile('borelcell.html', html);
  console.log(`\n  borelcell.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)}kb (arquivo único)`);
}
