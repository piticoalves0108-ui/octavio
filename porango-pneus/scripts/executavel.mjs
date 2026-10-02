#!/usr/bin/env node
/**
 * EXECUTÁVEL: gera dist/PorangoPneus.exe, um arquivo único para Windows com o site
 * inteiro dentro. Clique duplo: extrai os arquivos (só na primeira vez) e abre o
 * site no navegador padrão. Sem instalar nada e sem internet.
 *
 *   npm run exe              gera a edição HTML de novo e monta o .exe
 *   npm run exe -- --rapido  reaproveita a pasta html/ como está
 *
 * Precisa do Go (https://go.dev/dl) instalado. O ícone e os dados do arquivo
 * (nome do produto, versão) entram com o go-winres, baixado sozinho pelo Go.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const RAIZ = new URL("..", import.meta.url).pathname;
const HTML = join(RAIZ, "html");
const PASTA_GO = join(RAIZ, "executavel");
const SAIDA = join(RAIZ, "dist", "PorangoPneus.exe");
const WINRES = "github.com/tc-hib/go-winres@v0.3.3";
// o que fica de fora: só serve para o site publicado (redes sociais e buscadores)
const FORA = new Set(["LEIA-ME.txt", "opengraph-image", "servicos", "guia-do-pneu", "sitemap.xml", "robots.txt"]);

const rodar = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: PASTA_GO, stdio: "inherit", env: { ...process.env, ...env } });

try {
  execFileSync("go", ["version"], { stdio: "ignore" });
} catch {
  console.error("O Go não está instalado. Baixe em https://go.dev/dl e rode de novo.");
  process.exit(1);
}

if (!process.argv.includes("--rapido") || !existsSync(join(HTML, "index.html"))) {
  console.log("1/4 gerando a edição HTML...");
  execFileSync("node", [join(RAIZ, "scripts", "edicao-html.mjs")], { cwd: RAIZ, stdio: "inherit" });
} else console.log("1/4 usando a pasta html/ como está");

console.log("2/4 copiando o site para dentro do executável...");
const site = join(PASTA_GO, "site");
rmSync(site, { recursive: true, force: true });
cpSync(HTML, site, {
  recursive: true,
  filter: (origem) => {
    const rel = origem.slice(HTML.length + 1);
    return !rel || !FORA.has(rel.split(/[\\/]/)[0]);
  },
});

console.log("3/4 ícone e dados do arquivo...");
const icone = join(PASTA_GO, "icone.png");
await sharp(readFileSync(join(RAIZ, "src", "app", "icon.svg")), { density: 1152 }).resize(256, 256).png().toFile(icone);
const { version } = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8"));
const versao = `${version}.0`;
rmSync(join(PASTA_GO, "rsrc_windows_amd64.syso"), { force: true });
rodar("go", [
  "run", WINRES, "simply",
  "--arch", "amd64",
  "--out", "rsrc",
  "--icon", "icone.png",
  "--manifest", "gui",
  "--product-name", "Porango Pneus",
  "--file-description", "Site da Porango Pneus (edição para abrir no computador)",
  "--original-filename", "PorangoPneus.exe",
  "--product-version", versao,
  "--file-version", versao,
]);

console.log("4/4 compilando para Windows...");
rodar("go", ["build", "-trimpath", "-ldflags", "-s -w -H=windowsgui", "-o", SAIDA, "."], {
  GOOS: "windows",
  GOARCH: "amd64",
  CGO_ENABLED: "0",
});

console.log(`Pronto: dist/PorangoPneus.exe (${(statSync(SAIDA).size / 1024 / 1024).toFixed(1)} MB)`);
