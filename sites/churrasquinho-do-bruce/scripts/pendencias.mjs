/**
 * npm run pendencias
 * Lista todos os marcadores {{CONFIRMAR: ...}} do código, com arquivo e linha.
 * Rode antes de publicar e mande a lista pro Bruce.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const MARCADOR = /\{\{CONFIRMAR:\s*([^}]*)\}\}/g;
const achados = [];

function varrer(pasta) {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (/\.(ts|tsx)$/.test(nome)) {
      readFileSync(caminho, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          for (const m of linha.matchAll(MARCADOR)) achados.push({ arquivo: relative(raiz, caminho), linha: i + 1, texto: m[1].trim() });
        });
    }
  }
}

varrer(join(raiz, "src/content"));
varrer(join(raiz, "src/lib"));

// "..." é o exemplo de sintaxe nos comentários; os marcadores genéricos dos
// componentes (preço, ano) são só a forma de exibir os itens abaixo.
const unicos = achados.filter((a, i) => a.texto !== "..." && achados.findIndex((b) => b.texto === a.texto && b.arquivo === a.arquivo) === i);
console.log(`\n${unicos.length} pendências para confirmar com o Bruce:\n`);
for (const a of unicos) console.log(`- ${a.texto}\n  ${a.arquivo}:${a.linha}`);
