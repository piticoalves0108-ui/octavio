#!/usr/bin/env node
/**
 * Lista todos os marcadores {{CONFIRMAR: ...}} do projeto (código + conteúdo).
 *
 *   npm run confirmar                 # lista e sai com sucesso
 *   node scripts/confirmar.mjs --estrito   # falha se houver marcador
 *
 * Roda também antes de todo `npm run build` (--antes-do-build): no modo prévia
 * (padrão) só avisa; com NEXT_PUBLIC_MODO_PREVIA=false o build falha enquanto
 * houver marcador, para nunca publicar informação não confirmada.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const PASTAS = ["src"];
const EXT = /\.(ts|tsx|js|mjs|css)$/;
const REGEX = /\{\{CONFIRMAR:[^}]*\}\}/g;

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return EXT.test(nome) ? [caminho] : [];
  });
}

const achados = [];
for (const pasta of PASTAS) {
  for (const arq of arquivos(join(RAIZ, pasta))) {
    const linhas = readFileSync(arq, "utf8").split("\n");
    linhas.forEach((linha, i) => {
      for (const m of linha.matchAll(REGEX)) achados.push({ arq: relative(RAIZ, arq), linha: i + 1, marcador: m[0] });
    });
  }
}

const estrito =
  process.argv.includes("--estrito") ||
  (process.argv.includes("--antes-do-build") && process.env.NEXT_PUBLIC_MODO_PREVIA === "false");

// Os exemplos de uso deste próprio mecanismo não contam.
const reais = achados.filter(
  (a) => a.marcador !== "{{CONFIRMAR: ...}}" && !a.arq.endsWith("lib/pendente.ts") && !a.arq.endsWith("ui/Pendente.tsx"),
);

if (!reais.length) {
  console.log("✓ Nenhum marcador {{CONFIRMAR}} pendente.");
  process.exit(0);
}

const unicos = [...new Set(reais.map((a) => a.marcador))];
console.log(`\n${reais.length} marcadores {{CONFIRMAR}} (${unicos.length} diferentes):\n`);
for (const a of reais) console.log(`  ${a.arq}:${a.linha}  ${a.marcador}`);
console.log("");

if (estrito) {
  console.error("✗ Publicação bloqueada: confirme ou remova os marcadores acima (src/content/site.ts e textos.ts).");
  process.exit(1);
}
if (process.argv.includes("--antes-do-build")) {
  console.log("Modo prévia: o build segue, a página sai com noindex e os marcadores aparecem destacados.\n");
}
