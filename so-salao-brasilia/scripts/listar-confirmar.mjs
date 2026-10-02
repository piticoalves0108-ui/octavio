/**
 * Lista todos os marcadores {{CONFIRMAR: ...}} do projeto (código e .env.example).
 * Uso: npm run confirmar            → lista
 *      npm run confirmar -- --falhar → sai com erro se houver algum (para CI antes de publicar)
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const RAIZ = process.cwd();
const PASTAS = ["src", "scripts"];
const ARQUIVOS = [".env.example"];
const REGEX = /\{\{CONFIRMAR:\s*([^}]*)\}\}/g;

async function* percorrer(pasta) {
  for (const item of await readdir(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) yield* percorrer(caminho);
    else if (/\.(tsx?|mjs|css|md)$/.test(item.name)) yield caminho;
  }
}

const achados = [];
const caminhos = [];
for (const pasta of PASTAS) for await (const c of percorrer(join(RAIZ, pasta))) caminhos.push(c);
caminhos.push(...ARQUIVOS.map((a) => join(RAIZ, a)));

for (const caminho of caminhos) {
  if (caminho.endsWith("listar-confirmar.mjs")) continue;
  const linhas = (await readFile(caminho, "utf8")).split("\n");
  linhas.forEach((linha, i) => {
    for (const m of linha.matchAll(REGEX)) {
      const texto = m[1].trim();
      // Ignora os exemplos da própria documentação do marcador.
      if (texto === "..." || texto === "descrição") continue;
      achados.push({ arquivo: relative(RAIZ, caminho), linha: i + 1, texto });
    }
  });
}

const unicos = [...new Map(achados.map((a) => [a.texto, a])).values()];
console.log(`${achados.length} marcadores {{CONFIRMAR}} (${unicos.length} pendências diferentes):\n`);
for (const a of achados) console.log(`  ${a.arquivo}:${a.linha}  →  ${a.texto}`);

if (process.argv.includes("--falhar") && achados.length) {
  console.error("\nAinda há informações a confirmar com o dono. Preencha antes de publicar.");
  process.exit(1);
}
