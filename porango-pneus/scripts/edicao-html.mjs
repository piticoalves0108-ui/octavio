#!/usr/bin/env node
/**
 * EDIÇÃO HTML: gera o site como arquivos .html estáticos na pasta html/.
 *
 *   npm run html
 *
 * Abre com dois cliques no html/index.html (sem servidor) e funciona em qualquer pasta:
 * - export estático do Next (output: "export") com um prefixo provisório;
 * - todos os caminhos viram relativos (_next/..., images/..., servicos.html);
 * - as fontes do alfabeto latino vão embutidas no CSS (navegadores bloqueiam fonte
 *   carregada de arquivo local);
 * - cada página é um arquivo: index.html, servicos.html, guia-do-pneu.html, 404.html.
 *
 * Segue o modo prévia (marcadores {{CONFIRMAR}} visíveis), a menos que
 * NEXT_PUBLIC_MODO_PREVIA=false seja definido.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const BUILD = join(RAIZ, ".next-html");
const SAIDA = join(RAIZ, "html");
const PREFIXO = "/__porango__";

console.log("1/3 export estático do Next...");
// mesma trava do npm run build: no modo publicação, não gera com {{CONFIRMAR}} pendente
execFileSync("node", ["scripts/confirmar.mjs", "--antes-do-build"], { cwd: RAIZ, stdio: "inherit" });
rmSync(BUILD, { recursive: true, force: true });
execFileSync("npx", ["next", "build"], {
  cwd: RAIZ,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_EDICAO_HTML: "1", NEXT_DIST_DIR: ".next-html" },
});
if (!existsSync(join(BUILD, "index.html"))) throw new Error("Export não encontrado em .next-html/");

console.log("2/3 copiando os arquivos publicáveis...");
rmSync(SAIDA, { recursive: true, force: true });
// o export fica junto com o cache do build: copia só o que é do site
const DO_SITE = (nome) =>
  nome.endsWith(".html") ||
  nome.endsWith(".txt") ||
  ["_next", "images", "video", "icon.svg", "sitemap.xml", "opengraph-image", "servicos", "guia-do-pneu"].includes(nome);
for (const nome of readdirSync(BUILD)) {
  if (!DO_SITE(nome)) continue;
  const origem = join(BUILD, nome);
  if (nome === "_next") {
    // do _next só interessa o static (o resto é cache e metadados do build)
    cpSync(join(origem, "static"), join(SAIDA, "_next", "static"), { recursive: true });
  } else cpSync(origem, join(SAIDA, nome), { recursive: true });
}

console.log("3/3 caminhos relativos e fontes embutidas...");
const MEDIA = join(SAIDA, "_next", "static", "media");
function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const c = join(dir, n);
    return statSync(c).isDirectory() ? arquivos(c) : [c];
  });
}

let trocas = 0;
for (const arq of arquivos(SAIDA)) {
  const ext = arq.split(".").pop();
  if (!["html", "txt", "js", "css"].includes(ext)) continue;
  const antes = readFileSync(arq, "utf8");
  let s = antes;

  if (ext === "css") {
    // fontes latinas (as pré-carregadas, ".p.woff2") embutidas; as outras, relativas
    s = s.replace(new RegExp(`url\\(${PREFIXO}/_next/static/media/([^)]+)\\)`, "g"), (_, nome) => {
      if (nome.endsWith(".p.woff2")) {
        const b64 = readFileSync(join(MEDIA, nome)).toString("base64");
        return `url(data:font/woff2;base64,${b64})`;
      }
      return `url(../media/${nome})`;
    });
  }

  // assets do Next: relativos à página (todas as páginas ficam na raiz da pasta)
  s = s.split(`${PREFIXO}/_next/`).join("_next/");
  // prefixo que sobrou (usado pelo cliente para montar URLs): diretório atual
  s = s.split(`"${PREFIXO}"`).join('"."');
  s = s.split(`\\"${PREFIXO}\\"`).join('\\".\\"');

  if (ext === "html") {
    // fontes já estão no CSS: sem preload (que falharia ao abrir o arquivo local)
    s = s.replace(/<link rel="preload" href="[^"]*\.woff2"[^>]*\/?>/g, "");
    // ...nem a dica de preload que o React recoloca a partir do payload
    s = s.replace(/\\n:HL\[\\"_next\/static\/media\/[^\\]+\.woff2\\",\\"font\\",\{[^}]*\}\]/g, "");
    s = s.split('href="/icon.svg').join('href="icon.svg');
    s = s.split('\\"/icon.svg').join('\\"icon.svg');
  }
  if (ext === "txt") {
    s = s.replace(/\n:HL\["_next\/static\/media\/[^"]+\.woff2","font",\{[^}]*\}\]/g, "");
    s = s.split('"/icon.svg').join('"icon.svg');
  }

  if (s !== antes) {
    writeFileSync(arq, s);
    trocas++;
  }
}

// sobrou algum caminho absoluto do prefixo?
const restos = arquivos(SAIDA).filter((a) => /\.(html|txt|js|css)$/.test(a) && readFileSync(a, "utf8").includes(PREFIXO));
if (restos.length) {
  console.error("Ainda há caminhos com o prefixo provisório em:", restos.map((r) => relative(SAIDA, r)));
  process.exit(1);
}

writeFileSync(
  join(SAIDA, "LEIA-ME.txt"),
  `Porango Pneus: edição HTML do site

Abra o arquivo index.html (dois cliques). Não precisa de servidor nem de internet,
a não ser para os links externos (WhatsApp, Instagram e Google Maps).

Páginas:
  index.html          início
  servicos.html       serviços
  guia-do-pneu.html   guia do pneu
  404.html            página não encontrada

Os textos marcados com {{CONFIRMAR: ...}} ainda dependem da loja.
Para gerar de novo depois de mudar o site: npm run html (na pasta porango-pneus).
`,
);

const total = arquivos(SAIDA).reduce((t, a) => t + statSync(a).size, 0);
console.log(`Pronto: html/ (${arquivos(SAIDA).length} arquivos, ${(total / 1024 / 1024).toFixed(1)} MB, ${trocas} ajustados).`);
console.log(`Abra ${relative(process.cwd(), join(SAIDA, "index.html")) || basename(SAIDA)}`);
