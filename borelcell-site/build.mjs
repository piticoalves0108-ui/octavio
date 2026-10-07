// Gera os arquivos de assets/ a partir de src/.
// Uso: npm run build  (ou npm run dev para recompilar ao salvar)
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

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
}
