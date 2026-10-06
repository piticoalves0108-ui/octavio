// Testes do mini-interpretador: node estudo-visualg/src/test-interp.js
const VG = require('./visualg.js');
let fails = 0, count = 0;

async function run(code, inputs = []) {
  let out = '';
  const ins = inputs.map(String);
  const io = { write: s => { out += s; }, read: () => { if (!ins.length) throw new Error('sem entrada'); return ins.shift(); } };
  const it = new VG.Interp(VG.parse(code), io);
  await it.run();
  return { out, it };
}
function prog(body, vars = 'x, y, i, cont, soma: inteiro\n r: real\n s: caractere\n b: logico') {
  return `algoritmo "t"\nvar\n${vars}\ninicio\n${body}\nfimalgoritmo`;
}
async function expectOut(name, code, expected, inputs) {
  count++;
  try {
    const { out } = await run(code, inputs);
    if (out !== expected) { fails++; console.log(`FALHOU ${name}\n  esperado: ${JSON.stringify(expected)}\n  obtido:   ${JSON.stringify(out)}`); }
  } catch (e) { fails++; console.log(`FALHOU ${name}: erro ${e.message} (linha ${e.line})`); }
}
async function expectErr(name, code, fragment, inputs) {
  count++;
  try {
    await run(code, inputs);
    fails++; console.log(`FALHOU ${name}: esperava erro contendo "${fragment}"`);
  } catch (e) {
    if (!e.message.includes(fragment)) { fails++; console.log(`FALHOU ${name}: erro foi "${e.message}"`); }
  }
}

(async () => {
  await expectOut('ola', prog('escreval("Olá, mundo!")'), 'Olá, mundo!\n');
  await expectOut('espaco numero', prog('x <- 10\nescreval("Valor:", x)'), 'Valor: 10\n');
  await expectOut('precedencia', prog('escreval(2 + 3 * 4)'), ' 14\n');
  await expectOut('parenteses', prog('escreval((2 + 3) * 4)'), ' 20\n');
  await expectOut('divisao real', prog('escreval(7 / 2)'), ' 3.5\n');
  await expectOut('divisao inteira', prog('escreval(17 \\ 5, 17 mod 5, 17 % 5)'), ' 3 2 2\n');
  await expectOut('potencia', prog('escreval(2 ^ 3 * 2)'), ' 16\n');
  await expectOut('esq-dir', prog('escreval(10 / 4 * 2)'), ' 5\n');
  await expectOut('formatacao', prog('r <- 7.456\nescreval("Média:", r:6:2)'), 'Média:  7.46\n');
  await expectOut('logico', prog('b <- 5 + 3 > 2 * 4\nescreval(b)'), ' FALSO\n');
  await expectOut('e/ou precedencia', prog('b <- verdadeiro ou falso e falso\nescreval(b)'), ' VERDADEIRO\n');
  await expectOut('nao', prog('b <- nao (5 > 3)\nescreval(b)'), ' FALSO\n');
  await expectOut('texto concat', prog('s <- "Rio " + "de Janeiro"\nescreval(s)'), 'Rio de Janeiro\n');
  await expectOut('comparacao texto ignora maiusc', prog('se "ABC" = "abc" entao\nescreval("igual")\nfimse'), 'igual\n');
  await expectOut('se senao', prog('x <- 6\nse x > 6 entao\nescreval("A")\nsenao\nescreval("B")\nfimse'), 'B\n');
  await expectOut('se aninhado', prog('r <- 5\nse r >= 7 entao\nescreval("Aprovado")\nsenao\nse r >= 4 entao\nescreval("Recuperação")\nsenao\nescreval("Reprovado")\nfimse\nfimse'), 'Recuperação\n');
  await expectOut('escolha', prog('x <- 3\nescolha x\ncaso 1\nescreval("um")\ncaso 2, 3\nescreval("dois ou três")\noutrocaso\nescreval("outro")\nfimescolha'), 'dois ou três\n');
  await expectOut('escolha outrocaso', prog('s <- "x"\nescolha s\ncaso "+"\nescreval("soma")\noutrocaso\nescreval("inválido")\nfimescolha'), 'inválido\n');
  await expectOut('enquanto', prog('cont <- 1\nenquanto cont <= 3 faca\nescreval(cont)\ncont <- cont + 1\nfimenquanto'), ' 1\n 2\n 3\n');
  await expectOut('repita', prog('cont <- 1\nrepita\nescreval(cont)\ncont <- cont + 1\nate cont > 3'), ' 1\n 2\n 3\n');
  await expectOut('repita roda 1 vez', prog('cont <- 10\nrepita\nescreval(cont)\nate cont > 3'), ' 10\n');
  await expectOut('para', prog('para i de 1 ate 3 faca\nescreva(i)\nfimpara\nescreval()\nescreval(i)'), ' 1 2 3\n 4\n');
  await expectOut('para passo -3', prog('para i de 10 ate 1 passo -3 faca\nescreva(i)\nfimpara'), ' 10 7 4 1');
  await expectOut('para nao executa', prog('para i de 5 ate 1 faca\nescreva(i)\nfimpara\nescreval("fim")'), 'fim\n');
  await expectOut('interrompa', prog('para i de 1 ate 10 faca\nse i = 4 entao\ninterrompa\nfimse\nescreva(i)\nfimpara'), ' 1 2 3');
  await expectOut('leia', prog('leia(x, y)\nescreval("Soma:", x + y)'), 'Soma: 42\n', ['17', '25']);
  await expectOut('leia real virgula', prog('leia(r)\nescreval(r * 2)'), ' 7\n', ['3,5']);
  await expectOut('leia texto', prog('leia(s)\nescreval("Olá, ", s, "!")'), 'Olá, Ana Maria!\n', ['Ana Maria']);
  await expectOut('maiusculas', prog('ESCREVAL("ok")\nSe 1 = 1 Entao\nEscreval("sim")\nFimSe'), 'ok\nsim\n');
  await expectOut('acentos', prog('se 1 = 1 então\nescreval("sim")\nsenão\nescreval("não")\nfimse'), 'sim\n');
  await expectOut('real inteiro', prog('r <- 10 / 2\nescreval(r)'), ' 5\n');
  await expectOut('negativo', prog('x <- -5\nescreval(x, abs(x))'), ' -5 5\n');
  await expectOut('raizq', prog('escreval(raizq(16))'), ' 4\n');
  await expectOut('int', prog('escreval(int(7.9))'), ' 7\n');
  await expectOut('1/3', prog('escreval(10 / 3)'), ' 3.33333333333333\n');

  await expectErr('==', prog('se x == 5 entao\nfimse'), 'um sinal de igual');
  await expectErr('= atribuicao', prog('x = 5'), 'use <-');
  await expectErr('sem entao', prog('se x > 5\nescreval("a")\nfimse'), 'Faltou o entao');
  count++;
  try { VG.parse(prog('se x > 5\nescreval("a")\nfimse')); } catch (e) { if (e.line !== 8) { fails++; console.log('FALHOU linha do entao', e.line); } }
  await expectErr('sem fimse', prog('se x > 5 entao\nescreval("a")'), 'Faltou fimse');
  await expectErr('sem fimpara', prog('para i de 1 ate 3 faca\nescreval(i)'), 'Faltou fimpara');
  await expectErr('fechou errado', prog('para i de 1 ate 3 faca\nse i > 1 entao\nescreval(i)\nfimpara'), 'faltou fimse');
  await expectErr('nao declarada', prog('z <- 5'), 'não foi declarada');
  await expectErr('real em inteiro', prog('x <- 7 / 2'), 'Tipos incompatíveis');
  await expectErr('e sem repetir', prog('se x >= 18 e <= 65 entao\nfimse'), 'repetir a variável');
  await expectErr('texto + numero', prog('s <- "a" + 1'), 'texto misturado');
  await expectErr('loop infinito', prog('x <- 3\nenquanto x > 0 faca\nescreva("")\nfimenquanto'), 'loop infinito');
  await expectErr('div zero', prog('x <- 0\nescreval(5 / x)'), 'Divisão por zero');
  await expectErr('palavra reservada', prog('', 'se: inteiro'), 'palavra reservada');
  await expectErr('sem inicio', 'algoritmo "a"\nvar\nx: inteiro\nescreval("a")\nfimalgoritmo', 'Faltou a palavra inicio');
  await expectErr('texto sem aspas', prog('escreval("oi)'), 'aspas de fechamento');
  await expectErr('caractere vs numero', prog('s <- "1"\nse s = 1 entao\nfimse'), 'entre aspas');
  await expectErr('escreval sem parenteses', prog('escreval "oi"'), 'parênteses');
  await expectErr('senao duplo', prog('se x > 1 entao\nescreval(1)\nsenao\nescreval(2)\nsenao\nescreval(3)\nfimse'), 'já tem um senao');

  // passo a passo de expressões
  count++;
  const st = VG.explain('2 + 3 * 4');
  if (st.length !== 4 || !st[1].html.includes('<mark>3 * 4</mark>') || st[3].html !== '14') { fails++; console.log('FALHOU explain', st); }
  count++;
  const st2 = VG.explain('(a > b) e (c < a)', 'a = 5, b = 3, c = 8');
  if (st2[st2.length - 1].html !== 'FALSO') { fails++; console.log('FALHOU explain vars', st2); }
  count++;
  const st3 = VG.explain('(ano mod 4 = 0) e (ano mod 100 <> 0) ou (ano mod 400 = 0)', 'ano = 1900');
  if (st3[st3.length - 1].html !== 'FALSO') { fails++; console.log('FALHOU explain bissexto', st3); }
  count++;
  const st4 = VG.explain('verdadeiro ou falso e falso');
  if (st4[st4.length - 1].html !== 'VERDADEIRO') { fails++; console.log('FALHOU explain e/ou', st4); }

  // correção automática
  count++;
  const t = await VG.runTests(prog('leia(x)\nse x mod 2 = 0 entao\nescreval("par")\nsenao\nescreval("ímpar")\nfimse'),
    [{ in: [8], has: ['par'], not: ['impar'] }, { in: [7], has: ['impar'], not: ['par'] }]);
  if (!t.results.every(r => r.pass)) { fails++; console.log('FALHOU runTests', t.results); }
  count++;
  const t2 = await VG.runTests(prog('leia(r)\nescreval("Média:", r / 3:5:2)'), [{ in: [20], has: [6.666666666] }]);
  if (!t2.results[0].pass) { fails++; console.log('FALHOU runTests numero', t2.results); }

  console.log(`${count - fails}/${count} testes passaram`);
  process.exit(fails ? 1 : 0);
})();
