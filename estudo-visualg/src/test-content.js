// Confere todo o código da página: node estudo-visualg/src/test-content.js
// - exemplos rodam sem erro (com as entradas de data-test-in)
// - respostas dos exercícios passam nos próprios testes
// - códigos iniciais dos exercícios não têm erro de sintaxe e NÃO passam nos testes
// - perguntas têm data-answer válido
const fs = require('fs');
const path = require('path');
const VG = require('./visualg.js');
const html = fs.readFileSync(path.join(__dirname, 'content.html'), 'utf8');
const clean = s => s.replace(/^\s*\n/, '').replace(/\s+$/, '');
let fails = 0, count = 0;
const fail = msg => { fails++; console.log('FALHOU ' + msg); };

(async () => {
  // exemplos
  const exRe = /<script type="text\/x-visualg"(?![^>]*data-role)([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = exRe.exec(html))) {
    count++;
    const attrs = m[1], code = clean(m[2]);
    const title = (attrs.match(/data-title="([^"]*)"/) || [])[1] || '?';
    const inputs = ((attrs.match(/data-test-in="([^"]*)"/) || [])[1] || '').split('|').filter(x => x !== '');
    let out = '';
    try {
      const io = { write: s => { out += s; }, read: () => { if (!inputs.length) throw new Error('faltou data-test-in'); return inputs.shift(); } };
      await new VG.Interp(VG.parse(code), io).run();
      if (inputs.length) fail(`${title}: sobraram entradas ${inputs}`);
      console.log(`--- ${title}\n${out.trimEnd()}`);
    } catch (e) { fail(`${title}: ${e.message} (linha ${e.line})`); }
  }
  // exercícios
  const exBlock = /<div class="ex" data-id="([^"]+)">([\s\S]*?)<\/div>\s*(?=<div class="ex"|<\/section>)/g;
  let nEx = 0;
  while ((m = exBlock.exec(html))) {
    nEx++;
    const id = m[1], body = m[2];
    const get = role => { const r = new RegExp(`<script type="[^"]+" data-role="${role}">([\\s\\S]*?)<\\/script>`); const x = body.match(r); return x ? x[1] : null; };
    const starter = get('starter'), solution = get('solution'), testsTxt = get('tests');
    if (!starter || !solution || !testsTxt) { fail(`${id}: bloco incompleto`); continue; }
    let tests;
    try { tests = JSON.parse(testsTxt); } catch (e) { fail(`${id}: JSON inválido ${e.message}`); continue; }
    count++;
    const r = await VG.runTests(clean(solution), tests);
    if (r.compileError) fail(`${id}: resposta não compila: ${r.compileError.message}`);
    else r.results.forEach((x, i) => { if (!x.pass) fail(`${id} teste ${i + 1}: ${x.reason}\n${x.out}`); });
    count++;
    try { VG.parse(clean(starter)); } catch (e) { fail(`${id}: código inicial com erro: ${e.message}`); }
    const rs = await VG.runTests(clean(starter), tests);
    if (!rs.compileError && rs.results.every(x => x.pass)) fail(`${id}: código inicial já passa nos testes`);
  }
  console.log(`exercícios encontrados: ${nEx}`);
  // perguntas
  const qRe = /<div class="q" data-answer="(\d+)">([\s\S]*?)<div class="q-why">/g;
  let nQ = 0;
  while ((m = qRe.exec(html))) {
    nQ++; count++;
    const opts = (m[2].match(/<li>/g) || []).length;
    if (+m[1] >= opts) fail(`pergunta ${nQ}: resposta ${m[1]} mas só ${opts} opções`);
  }
  console.log(`perguntas encontradas: ${nQ}`);
  console.log(`${count - fails}/${count} verificações passaram`);
  process.exit(fails ? 1 : 0);
})();
