/* Mini-interpretador de VisuAlg para estudo.
   Cobre o conteúdo da N1: tipos simples, escreva/escreval/leia, operadores,
   se/senao, escolha, e/ou/nao/xou, enquanto, repita/ate, para, interrompa. */
const VG = (() => {
  'use strict';

  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  class VError extends Error {
    constructor(msg, line) { super(msg); this.line = line; this.isVG = true; }
  }

  const KEYWORDS = new Set(('algoritmo var inicio fimalgoritmo inteiro real caractere caracter literal logico ' +
    'verdadeiro falso se entao senao fimse escolha caso outrocaso fimescolha enquanto faca fimenquanto ' +
    'repita ate para de passo fimpara e ou nao xou mod div escreva escreval leia interrompa limpatela ' +
    'vetor procedimento funcao fimprocedimento fimfuncao retorne const pausa aleatorio').split(' '));
  const ENDERS = new Set(['senao', 'fimse', 'caso', 'outrocaso', 'fimescolha', 'fimenquanto', 'ate', 'fimpara', 'fimalgoritmo', 'inicio', 'var']);
  const OPENER = { senao: 'se', fimse: 'se', caso: 'escolha', outrocaso: 'escolha', fimescolha: 'escolha', fimenquanto: 'enquanto', ate: 'repita', fimpara: 'para', fimalgoritmo: 'algoritmo' };
  const REL = new Set(['=', '<>', '<', '>', '<=', '>=']);
  const ID_START = /[\p{L}_]/u, ID_PART = /[\p{L}\p{N}_]/u, DIGIT = /[0-9]/;
  const TAG = { inteiro: 'i', real: 'r', caractere: 's', logico: 'b' };
  const DEFAULT = { inteiro: 0, real: 0, caractere: '', logico: false };
  const TNAME = { i: 'inteiro', r: 'real', s: 'caractere (texto)', b: 'logico' };
  const BREAK = { brk: 1 }, STOP = { stop: 1 };

  /* ---------------- Léxico ---------------- */
  function lex(src) {
    const toks = [];
    let i = 0, line = 1;
    const n = src.length;
    const push = (t, v, extra) => toks.push(Object.assign({ t, v, line }, extra));
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === ' ') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '{') {
        const start = line; i++;
        while (i < n && src[i] !== '}') { if (src[i] === '\n') line++; i++; }
        if (i >= n) throw new VError('Comentário aberto com { e nunca fechado com }.', start);
        i++; continue;
      }
      if (c === '"' || c === '“' || c === '”') {
        let j = i + 1, s = '';
        while (j < n && src[j] !== '"' && src[j] !== '“' && src[j] !== '”' && src[j] !== '\n') { s += src[j]; j++; }
        if (j >= n || src[j] === '\n') throw new VError('Texto sem aspas de fechamento. Todo texto abre e fecha aspas: "assim".', line);
        push('str', s); i = j + 1; continue;
      }
      if (c === "'" || c === '‘' || c === '’') throw new VError('Use aspas duplas (") nos textos, não aspas simples.', line);
      if (DIGIT.test(c)) {
        let j = i;
        while (j < n && DIGIT.test(src[j])) j++;
        let real = false;
        if (src[j] === '.' && DIGIT.test(src[j + 1] || '')) {
          real = true; j++;
          while (j < n && DIGIT.test(src[j])) j++;
        }
        if (j < n && ID_START.test(src[j])) {
          let k = j; while (k < n && ID_PART.test(src[k])) k++;
          throw new VError(`"${src.slice(i, k)}" não pode ser nome: nomes de variáveis começam com letra.`, line);
        }
        const text = src.slice(i, j);
        push('num', real ? parseFloat(text) : parseInt(text, 10), { real });
        i = j; continue;
      }
      if (ID_START.test(c)) {
        let j = i;
        while (j < n && ID_PART.test(src[j])) j++;
        const raw = src.slice(i, j);
        push('id', norm(raw), { raw });
        i = j; continue;
      }
      const two = src.substr(i, 2);
      if (two === '<-' || two === ':=') { push('op', '<-'); i += 2; continue; }
      if (two === '<=' || two === '>=' || two === '<>') { push('op', two); i += 2; continue; }
      if (two === '==') throw new VError('No VisuAlg a comparação usa um sinal de igual só: se x = 5 entao', line);
      if (two === '!=') throw new VError('No VisuAlg "diferente" se escreve <>. Exemplo: se x <> 0 entao', line);
      if (two === '&&') throw new VError('No VisuAlg se escreve a palavra e no lugar de &&.', line);
      if (two === '||') throw new VError('No VisuAlg se escreve a palavra ou no lugar de ||.', line);
      if (two === '=>' || two === '=<') throw new VError(`Escreva ${two === '=>' ? '>=' : '<='}, com o sinal de ${two === '=>' ? 'maior' : 'menor'} primeiro.`, line);
      if (two === '..') { push('op', '..'); i += 2; continue; }
      if (c === '←') { push('op', '<-'); i++; continue; }
      if (c === '≤') { push('op', '<='); i++; continue; }
      if (c === '≥') { push('op', '>='); i++; continue; }
      if (c === '≠') { push('op', '<>'); i++; continue; }
      if ('+-*/\\%^()=<>,:;[]'.includes(c)) { push('op', c); i++; continue; }
      if (c === '!') throw new VError('No VisuAlg a negação é a palavra nao. Exemplo: se nao (x > 5) entao', line);
      throw new VError(`Símbolo desconhecido: "${c}"`, line);
    }
    toks.push({ t: 'eof', v: '', line });
    return toks;
  }

  /* ---------------- Sintaxe ---------------- */
  function makeParser(tokens) {
    let p = 0;
    const peek = (k = 0) => tokens[Math.min(p + k, tokens.length - 1)];
    const next = () => tokens[p++];
    const isKw = (v, k = 0) => peek(k).t === 'id' && peek(k).v === v;
    const isOp = (v, k = 0) => peek(k).t === 'op' && peek(k).v === v;
    const show = t => t.t === 'eof' ? 'o fim do programa' : `"${t.raw || t.v}"`;
    const prevLine = () => tokens[Math.max(0, p - 1)].line;
    function expectOp(v, msg) {
      if (!isOp(v)) throw new VError(msg, peek().t === 'eof' ? tokens[Math.max(0, p - 1)].line : peek().line);
      return next();
    }
    function missing(ctx) {
      let msg = ctx.kw === 'repita'
        ? `Faltou "ate condição" para fechar o repita da linha ${ctx.line}.`
        : `Faltou ${ctx.closer} para fechar o ${ctx.kw} da linha ${ctx.line}.`;
      if (ctx.kw === 'se') msg += ' Lembre: cada se tem o seu próprio fimse.';
      return new VError(msg, Math.max(ctx.line, tokens[Math.max(0, p - 1)].line));
    }
    function unexpected(t, ctx) {
      if (ctx.kw === 'algoritmo') {
        if (t.v === 'inicio' || t.v === 'var') return new VError(`"${t.raw}" apareceu de novo. O programa tem um var e um inicio só.`, t.line);
        return new VError(`"${t.raw}" apareceu sem um ${OPENER[t.v]} aberto antes dele.`, t.line);
      }
      if (t.v === 'fimalgoritmo') return missing(ctx);
      return new VError(`O ${ctx.kw} da linha ${ctx.line} ainda não foi fechado: faltou ${ctx.closer} antes de "${t.raw}".`, t.line);
    }

    function parseProgram() {
      if (!isKw('algoritmo')) throw new VError('Todo programa começa com: algoritmo "nome"', peek().line);
      next();
      let name = '';
      if (peek().t === 'str') name = next().v;
      const decls = [];
      if (isKw('var')) {
        next();
        while (peek().t === 'id' && !isKw('inicio')) {
          const t = peek();
          if (t.v === 'procedimento' || t.v === 'funcao') throw new VError('Procedimentos e funções não fazem parte deste simulador (não caem na N1).', t.line);
          if ((['escreva', 'escreval', 'leia', 'se', 'para', 'enquanto', 'repita', 'escolha'].includes(t.v) && !isOp(':', 1) && !isOp(',', 1)) || isOp('<-', 1))
            throw new VError('Faltou a palavra inicio antes dos comandos.', t.line);
          const line = t.line;
          const names = [declName()];
          while (isOp(',')) { next(); names.push(declName()); }
          if (!isOp(':')) throw new VError('Na declaração falta ":" e o tipo. Exemplo: idade: inteiro', prevLine());
          next();
          const tt = peek();
          let type;
          switch (tt.t === 'id' ? tt.v : '') {
            case 'inteiro': type = 'inteiro'; break;
            case 'real': case 'numerico': type = 'real'; break;
            case 'caractere': case 'caracter': case 'literal': type = 'caractere'; break;
            case 'logico': type = 'logico'; break;
            case 'vetor': throw new VError('Vetores não fazem parte deste simulador (ainda não caem na N1).', tt.line);
            default: throw new VError(`Tipo desconhecido ${show(tt)}. Os tipos são: inteiro, real, caractere e logico.`, tt.line);
          }
          next();
          for (const nm of names) decls.push({ name: nm.v, raw: nm.raw, type, line });
        }
      }
      if (isKw('procedimento') || isKw('funcao')) throw new VError('Procedimentos e funções não fazem parte deste simulador (não caem na N1).', peek().line);
      if (!isKw('inicio')) throw new VError(peek().t === 'eof' ? 'Faltou a palavra inicio.' : `Faltou a palavra inicio antes de ${show(peek())}.`, peek().line);
      next();
      const ctx = { kw: 'algoritmo', line: 1, closer: 'fimalgoritmo' };
      const body = parseBlock(['fimalgoritmo'], ctx);
      if (!isKw('fimalgoritmo')) throw new VError('Faltou fimalgoritmo no final do programa.', peek().line);
      return { name, decls, body };
    }
    function declName() {
      const t = peek();
      if (t.t !== 'id') throw new VError(`Esperava o nome de uma variável, mas apareceu ${show(t)}.`, t.line);
      if (KEYWORDS.has(t.v)) throw new VError(`"${t.raw}" é palavra reservada do VisuAlg e não pode ser nome de variável.`, t.line);
      next();
      return t;
    }
    function parseBlock(terms, ctx) {
      const out = [];
      for (;;) {
        const t = peek();
        if (t.t === 'eof') return out;
        if (t.t === 'id' && terms.includes(t.v)) return out;
        if (t.t === 'id' && ENDERS.has(t.v)) throw unexpected(t, ctx);
        if (isOp(';')) { next(); continue; }
        out.push(parseStmt());
      }
    }
    function argList() {
      const args = [];
      if (!isOp(')')) {
        args.push(parseExpr());
        while (isOp(',')) { next(); args.push(parseExpr()); }
      }
      return args;
    }
    function parseStmt() {
      const t = peek();
      const line = t.line;
      if (t.t !== 'id') {
        if (t.t === 'str') throw new VError('Texto solto no meio do código. Para mostrar na tela use: escreval("texto")', line);
        throw new VError(`Comando inválido começando com "${t.v}".`, line);
      }
      switch (t.v) {
        case 'escreva': case 'escreval': {
          next();
          const args = [];
          if (isOp('(')) {
            next();
            if (!isOp(')')) {
              for (;;) {
                const e = parseExpr();
                let w = null, d = null;
                if (isOp(':')) { next(); w = parseExpr(); if (isOp(':')) { next(); d = parseExpr(); } }
                args.push({ e, w, d });
                if (!isOp(',')) break;
                next();
              }
            }
            expectOp(')', `Faltou fechar o parêntese do ${t.raw}. Separe as partes com vírgula: escreval("Total: ", x)`);
          } else if ((peek().t === 'str' || peek().t === 'num' || peek().t === 'id' && !KEYWORDS.has(peek().v)) && peek().line === line) {
            throw new VError(`O ${t.raw} precisa de parênteses: ${t.raw}("texto")`, line);
          }
          return { k: 'write', nl: t.v === 'escreval', args, line };
        }
        case 'leia': {
          next();
          expectOp('(', 'Use leia com parênteses: leia(variavel)');
          const vars = [];
          for (;;) {
            const v = peek();
            if (v.t !== 'id' || KEYWORDS.has(v.v)) throw new VError(`Dentro do leia vai o nome de uma variável, mas apareceu ${show(v)}.`, v.line);
            next();
            vars.push({ name: v.v, raw: v.raw, line: v.line });
            if (!isOp(',')) break;
            next();
          }
          expectOp(')', 'Faltou fechar o parêntese do leia.');
          return { k: 'read', vars, line };
        }
        case 'se': {
          next();
          const cond = parseExpr();
          if (!isKw('entao')) throw new VError(isKw('faca') ? 'No se a palavra é entao (faca é do enquanto e do para).' : 'Faltou o entao depois da condição. Formato: se condição entao', isKw('faca') ? peek().line : prevLine());
          next();
          const ctx = { kw: 'se', line, closer: 'fimse' };
          const thenB = parseBlock(['senao', 'fimse'], ctx);
          let elseB = null, elseLine = 0;
          if (isKw('senao')) {
            elseLine = next().line;
            elseB = parseBlock(['fimse', 'senao'], ctx);
            if (isKw('senao')) throw new VError(`Esse se (linha ${line}) já tem um senao. Para outra condição, abra um novo se dentro do senao, com o fimse dele.`, peek().line);
          }
          if (!isKw('fimse')) throw missing(ctx);
          next();
          return { k: 'if', cond, thenB, elseB, line, elseLine };
        }
        case 'escolha': {
          next();
          const subject = parseExpr();
          const ctx = { kw: 'escolha', line, closer: 'fimescolha' };
          const cases = [];
          let other = null;
          if (!isKw('caso') && !isKw('outrocaso')) {
            if (peek().t === 'eof') throw missing(ctx);
            throw new VError('Depois de "escolha variavel" vem o primeiro caso. Exemplo: caso 1', peek().line);
          }
          while (isKw('caso')) {
            const cl = next().line;
            const vals = [];
            for (;;) {
              const a = parseExpr();
              if (isKw('ate') || isOp('..')) { next(); vals.push({ a, b: parseExpr() }); } else vals.push({ a });
              if (!isOp(',')) break;
              next();
            }
            cases.push({ vals, body: parseBlock(['caso', 'outrocaso', 'fimescolha'], ctx), line: cl });
          }
          let otherLine = 0;
          if (isKw('outrocaso')) { otherLine = next().line; other = parseBlock(['fimescolha'], ctx); }
          if (isKw('caso')) throw new VError('O outrocaso tem que ser o último, logo antes do fimescolha.', peek().line);
          if (!isKw('fimescolha')) throw missing(ctx);
          next();
          return { k: 'switch', subject, cases, other, otherLine, line };
        }
        case 'enquanto': {
          next();
          const cond = parseExpr();
          if (!isKw('faca')) throw new VError(isKw('entao') ? 'No enquanto a palavra é faca (entao é do se).' : 'Faltou o faca depois da condição. Formato: enquanto condição faca', isKw('entao') ? peek().line : prevLine());
          next();
          const ctx = { kw: 'enquanto', line, closer: 'fimenquanto' };
          const body = parseBlock(['fimenquanto'], ctx);
          if (!isKw('fimenquanto')) throw missing(ctx);
          next();
          return { k: 'while', cond, body, line };
        }
        case 'repita': {
          next();
          const ctx = { kw: 'repita', line, closer: 'ate' };
          const body = parseBlock(['ate'], ctx);
          if (!isKw('ate')) throw missing(ctx);
          const condLine = next().line;
          if (peek().t === 'eof' || isKw('fimalgoritmo')) throw new VError('Depois do ate vem a condição de parada. Exemplo: ate cont > 10', condLine);
          const cond = parseExpr();
          return { k: 'repeat', body, cond, line, condLine };
        }
        case 'para': {
          next();
          const v = peek();
          if (v.t !== 'id' || KEYWORDS.has(v.v)) throw new VError('Depois de para vem a variável contadora. Formato: para i de 1 ate 10 faca', v.line);
          next();
          if (!isKw('de')) {
            if (isOp('<-')) throw new VError('No para não se usa <-. Formato: para i de 1 ate 10 faca', peek().line);
            throw new VError('Faltou o "de". Formato: para i de 1 ate 10 faca', prevLine());
          }
          next();
          const from = parseExpr();
          if (!isKw('ate')) throw new VError('Faltou o "ate". Formato: para i de 1 ate 10 faca', prevLine());
          next();
          const to = parseExpr();
          let step = null;
          if (isKw('passo')) { next(); step = parseExpr(); }
          if (!isKw('faca')) throw new VError('Faltou o faca no fim da linha do para. Formato: para i de 1 ate 10 faca', prevLine());
          next();
          const ctx = { kw: 'para', line, closer: 'fimpara' };
          const body = parseBlock(['fimpara'], ctx);
          if (!isKw('fimpara')) throw missing(ctx);
          next();
          return { k: 'for', v: v.v, vraw: v.raw, from, to, step, body, line };
        }
        case 'interrompa': next(); return { k: 'break', line };
        case 'limpatela': next(); return { k: 'cls', line };
        case 'pausa': next(); return { k: 'nop', line };
        case 'entao': throw new VError('O entao fica no fim da linha do se: se condição entao', line);
        case 'faca': throw new VError('O faca fica no fim da linha do enquanto ou do para.', line);
        case 'aleatorio': throw new VError('O comando aleatorio não existe neste simulador. Digite os valores você mesmo.', line);
        default: {
          if (KEYWORDS.has(t.v)) throw new VError(`"${t.raw}" não pode começar um comando aqui.`, line);
          next();
          if (isOp('<-')) { next(); return { k: 'assign', name: t.v, raw: t.raw, e: parseExpr(), line }; }
          if (isOp('=')) throw new VError(`Para guardar um valor use <- (lê-se "recebe"): ${t.raw} <- ...  O sinal = serve só para comparar.`, line);
          if (isOp('(')) throw new VError(`Comando desconhecido "${t.raw}". Confira a escrita (escreva, escreval, leia...).`, line);
          throw new VError(`Não entendi o comando "${t.raw}". Para guardar um valor: ${t.raw} <- valor`, line);
        }
      }
    }

    function parseExpr() { return parseOr(); }
    function logicGuard() {
      const t = peek();
      if (t.t === 'op' && REL.has(t.v)) throw new VError('Depois de e/ou tem que repetir a variável: (idade >= 18) e (idade <= 65), e não idade >= 18 e <= 65.', t.line);
    }
    function parseOr() {
      let l = parseAnd();
      while (isKw('ou') || isKw('xou')) {
        const op = next(); logicGuard();
        l = { k: 'bin', op: op.v, l, r: parseAnd(), line: op.line };
      }
      return l;
    }
    function parseAnd() {
      let l = parseNot();
      while (isKw('e')) {
        const op = next(); logicGuard();
        l = { k: 'bin', op: 'e', l, r: parseNot(), line: op.line };
      }
      return l;
    }
    function parseNot() {
      if (isKw('nao')) { const op = next(); return { k: 'un', op: 'nao', e: parseNot(), line: op.line }; }
      return parseRel();
    }
    function parseRel() {
      let l = parseAdd();
      while (peek().t === 'op' && REL.has(peek().v)) {
        const op = next();
        l = { k: 'bin', op: op.v, l, r: parseAdd(), line: op.line };
      }
      return l;
    }
    function parseAdd() {
      let l = parseMul();
      while (isOp('+') || isOp('-')) {
        const op = next();
        l = { k: 'bin', op: op.v, l, r: parseMul(), line: op.line };
      }
      return l;
    }
    function parseMul() {
      let l = parsePow();
      while (isOp('*') || isOp('/') || isOp('\\') || isOp('%') || isKw('mod') || isKw('div')) {
        const op = next();
        let o = op.v;
        if (o === '%') o = 'mod';
        if (o === 'div') o = '\\';
        l = { k: 'bin', op: o, l, r: parsePow(), line: op.line };
      }
      return l;
    }
    function parsePow() {
      let l = parseUnary();
      while (isOp('^')) {
        const op = next();
        l = { k: 'bin', op: '^', l, r: parseUnary(), line: op.line };
      }
      return l;
    }
    function parseUnary() {
      if (isOp('-') || isOp('+')) { const op = next(); return { k: 'un', op: op.v, e: parseUnary(), line: op.line }; }
      return parsePrimary();
    }
    function parsePrimary() {
      const t = peek();
      if (t.t === 'num') { next(); return { k: 'lit', v: { t: t.real ? 'r' : 'i', v: t.v }, line: t.line }; }
      if (t.t === 'str') { next(); return { k: 'lit', v: { t: 's', v: t.v }, line: t.line }; }
      if (isOp('(')) {
        next();
        const e = parseExpr();
        expectOp(')', 'Faltou fechar um parêntese.');
        e.paren = (e.paren || 0) + 1;
        return e;
      }
      if (t.t === 'id') {
        if (t.v === 'verdadeiro' || t.v === 'falso') { next(); return { k: 'lit', v: { t: 'b', v: t.v === 'verdadeiro' }, line: t.line }; }
        if (KEYWORDS.has(t.v)) {
          const prev = tokens[p - 1];
          const after = prev && (prev.raw || prev.v) ? ` depois de "${prev.raw || prev.v}"` : '';
          throw new VError(`Esperava um valor ou variável${after}, mas apareceu "${t.raw}".`, t.line);
        }
        next();
        if (isOp('(')) {
          next();
          const args = argList();
          expectOp(')', `Faltou fechar o parêntese de ${t.raw}(...).`);
          return { k: 'call', name: t.v, raw: t.raw, args, line: t.line };
        }
        return { k: 'var', name: t.v, raw: t.raw, line: t.line };
      }
      if (t.t === 'eof') throw new VError('O código terminou no meio de uma conta ou condição.', tokens[Math.max(0, p - 1)].line);
      const prev = tokens[p - 1];
      throw new VError(`Esperava um valor ou variável${prev ? ` depois de "${prev.raw || prev.v}"` : ''}, mas apareceu "${t.v}".`, t.line);
    }
    return { parseProgram, parseExpr, peek };
  }

  function parse(src) { return makeParser(lex(src)).parseProgram(); }

  /* ---------------- Valores e formatação ---------------- */
  function fmtReal(x) {
    if (!isFinite(x)) return String(x);
    if (Number.isInteger(x)) return String(x);
    let s = String(parseFloat(x.toPrecision(15)));
    if (s.includes('e')) s = x.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function plain(v) {
    switch (v.t) {
      case 'i': return String(v.v);
      case 'r': return fmtReal(v.v);
      case 'b': return v.v ? 'VERDADEIRO' : 'FALSO';
      default: return v.v;
    }
  }
  function showValue(v) { return v.t === 's' ? `"${v.v}"` : plain(v); }
  const isNum = x => x.t === 'i' || x.t === 'r';

  function parseInput(txt, type) {
    const s = String(txt).trim();
    switch (type) {
      case 'inteiro': return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : null;
      case 'real': {
        const t = s.replace(',', '.');
        return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? parseFloat(t) : null;
      }
      case 'logico': {
        const x = norm(s);
        if (['verdadeiro', 'v', 'sim', 's', 'true'].includes(x)) return true;
        if (['falso', 'f', 'nao', 'n', 'false'].includes(x)) return false;
        return null;
      }
      default: return String(txt).replace(/[\r\n]+$/, '');
    }
  }
  const INPUT_HINT = {
    inteiro: 'Digite um número inteiro, sem vírgula (ex.: 7).',
    real: 'Digite um número (ex.: 7.5).',
    logico: 'Digite VERDADEIRO ou FALSO.',
    caractere: ''
  };

  function needNum(v, line, what) {
    if (!isNum(v)) throw new VError(`${what} só funciona com números, mas recebeu ${TNAME[v.t]}${v.t === 's' ? ` ("${v.v}")` : ''}.`, line);
  }
  function needWhole(v, line, what) {
    needNum(v, line, what);
    if (!Number.isInteger(v.v)) throw new VError(`${what} só funciona com números inteiros, e ${fmtReal(v.v)} tem vírgula. Use variáveis do tipo inteiro.`, line);
  }
  const num = (x, int) => ({ t: int ? 'i' : 'r', v: x });

  const FUNCS = {
    abs: [1, ([a], l) => { needNum(a, l, 'abs'); return { t: a.t, v: Math.abs(a.v) }; }],
    int: [1, ([a], l) => { needNum(a, l, 'int'); return { t: 'i', v: Math.trunc(a.v) }; }],
    raizq: [1, ([a], l) => {
      needNum(a, l, 'raizq');
      if (a.v < 0) throw new VError('Não existe raiz quadrada de número negativo.', l);
      return { t: 'r', v: Math.sqrt(a.v) };
    }],
    quad: [1, ([a], l) => { needNum(a, l, 'quad'); return num(a.v * a.v, a.t === 'i'); }],
    exp: [2, ([b, e], l) => { needNum(b, l, 'exp'); needNum(e, l, 'exp'); return { t: 'r', v: Math.pow(b.v, e.v) }; }],
    log: [1, ([a], l) => { needNum(a, l, 'log'); return { t: 'r', v: Math.log10(a.v) }; }],
    logn: [1, ([a], l) => { needNum(a, l, 'logn'); return { t: 'r', v: Math.log(a.v) }; }],
    sen: [1, ([a], l) => { needNum(a, l, 'sen'); return { t: 'r', v: Math.sin(a.v) }; }],
    cos: [1, ([a], l) => { needNum(a, l, 'cos'); return { t: 'r', v: Math.cos(a.v) }; }],
    tan: [1, ([a], l) => { needNum(a, l, 'tan'); return { t: 'r', v: Math.tan(a.v) }; }],
    pi: [0, () => ({ t: 'r', v: Math.PI })],
    rand: [0, () => ({ t: 'r', v: Math.random() })],
    randi: [1, ([a], l) => { needWhole(a, l, 'randi'); return { t: 'i', v: Math.floor(Math.random() * a.v) }; }],
    compr: [1, ([s], l) => { if (s.t !== 's') throw new VError('compr mede o tamanho de um texto.', l); return { t: 'i', v: s.v.length }; }],
    copia: [3, ([s, a, b], l) => {
      if (s.t !== 's') throw new VError('copia trabalha com texto: copia(texto, posição, quantidade).', l);
      needWhole(a, l, 'copia'); needWhole(b, l, 'copia');
      return { t: 's', v: s.v.substr(Math.max(0, a.v - 1), Math.max(0, b.v)) };
    }],
    maiusc: [1, ([s], l) => { if (s.t !== 's') throw new VError('maiusc trabalha com texto.', l); return { t: 's', v: s.v.toUpperCase() }; }],
    minusc: [1, ([s], l) => { if (s.t !== 's') throw new VError('minusc trabalha com texto.', l); return { t: 's', v: s.v.toLowerCase() }; }],
    pos: [2, ([a, s], l) => {
      if (a.t !== 's' || s.t !== 's') throw new VError('pos trabalha com texto: pos(pedaço, texto).', l);
      return { t: 'i', v: s.v.toLowerCase().indexOf(a.v.toLowerCase()) + 1 };
    }],
    asc: [1, ([s], l) => { if (s.t !== 's') throw new VError('asc recebe um texto.', l); return { t: 'i', v: s.v.length ? s.v.charCodeAt(0) : 0 }; }],
    carac: [1, ([a], l) => { needWhole(a, l, 'carac'); return { t: 's', v: String.fromCharCode(a.v) }; }],
    numpcarac: [1, ([a], l) => { needNum(a, l, 'numpcarac'); return { t: 's', v: plain(a) }; }],
    caracpnum: [1, ([s], l) => {
      if (s.t !== 's') throw new VError('caracpnum recebe um texto.', l);
      const v = parseInput(s.v, 'real');
      if (v === null) throw new VError(`"${s.v}" não é um número.`, l);
      return num(v, Number.isInteger(v) && !s.v.includes('.'));
    }]
  };

  /* ---------------- Execução ---------------- */
  class Interp {
    constructor(prog, io, opts = {}) {
      this.prog = prog;
      this.io = io || {};
      this.vars = new Map();
      this.steps = 0;
      this.maxSteps = opts.maxSteps || 500000;
      this.stepMode = !!opts.stepMode;
      this.trace = [];
      this.traceLimit = opts.traceLimit || 400;
      this.traceOverflow = 0;
      this.stopFlag = false;
      this.lastLine = 1;
      this.lastChanged = null;
    }
    stop() { this.stopFlag = true; }
    record(ev) {
      if (this.trace.length < this.traceLimit) this.trace.push(ev);
      else this.traceOverflow++;
    }
    snapshot() {
      return [...this.vars.values()].map(v => ({ name: v.raw, type: v.type, text: showValue({ t: TAG[v.type], v: v.v }) }));
    }
    async run() {
      if (this.prog) {
        for (const d of this.prog.decls) {
          if (this.vars.has(d.name)) throw new VError(`A variável "${d.raw}" foi declarada duas vezes.`, d.line);
          this.vars.set(d.name, { raw: d.raw, type: d.type, v: DEFAULT[d.type] });
        }
      }
      try { await this.block(this.prog.body); }
      catch (e) {
        if (e === BREAK) throw new VError('O interrompa só funciona dentro de um laço (enquanto, repita ou para).', this.lastLine);
        throw e;
      }
    }
    async tick(line) {
      this.lastLine = line;
      if (this.stopFlag) throw STOP;
      if (++this.steps > this.maxSteps) {
        throw new VError(`O programa passou de ${this.maxSteps.toLocaleString('pt-BR')} passos e foi parado. Parece um loop infinito: confira se a condição do laço muda lá dentro (por exemplo, cont <- cont + 1).`, line);
      }
      if (this.stepMode && this.io.step) await this.io.step(line, this);
      else if (this.steps % 2000 === 0) await new Promise(r => setTimeout(r, 0));
      if (this.stopFlag) throw STOP;
    }
    async block(list) { for (const s of list) await this.stmt(s); }
    async loopBody(list) {
      try { await this.block(list); return false; }
      catch (e) { if (e === BREAK) return true; throw e; }
    }
    lookup(name, raw, line) {
      const vr = this.vars.get(name);
      if (!vr) throw new VError(`A variável "${raw}" não foi declarada. Crie ela na seção var, por exemplo: ${raw}: inteiro`, line);
      return vr;
    }
    setVar(vr, val, line, how) {
      const tag = TAG[vr.type];
      if (!(tag === val.t || (tag === 'r' && val.t === 'i'))) throw this.typeErr(vr, val, line);
      vr.v = val.v;
      this.lastChanged = vr.raw;
      this.record({ line, name: vr.raw, value: showValue({ t: tag, v: val.v }), how });
    }
    typeErr(vr, val, line) {
      let msg = `Tipos incompatíveis: "${vr.raw}" é ${vr.type}, mas recebeu um valor ${TNAME[val.t]}.`;
      if (vr.type === 'inteiro' && val.t === 'r') msg += ' A divisão com / sempre dá real. Declare a variável como real, ou use \\ para divisão inteira.';
      else if (vr.type === 'caractere' && isNum(val)) msg += ' Texto vai entre aspas.';
      else if ((vr.type === 'inteiro' || vr.type === 'real') && val.t === 's') msg += ' Número não leva aspas.';
      return new VError(msg, line);
    }
    cond(e, what) {
      const v = this.evalE(e);
      if (v.t !== 'b') throw new VError(`A condição do ${what} precisa dar VERDADEIRO ou FALSO. Use uma comparação, como: x > 5`, e.line);
      return v.v;
    }
    fmtArg(a) {
      const v = this.evalE(a.e);
      if (a.w) {
        const w = this.evalE(a.w), d = a.d ? this.evalE(a.d) : null;
        needWhole(w, a.e.line, 'A largura da formatação');
        if (d) needWhole(d, a.e.line, 'O número de casas decimais');
        let s;
        if (isNum(v) && d) s = v.v.toFixed(Math.max(0, Math.min(20, d.v)));
        else s = plain(v);
        return s.padStart(w.v, ' ');
      }
      if (v.t === 's') return v.v;
      return ' ' + plain(v);
    }
    async stmt(s) {
      await this.tick(s.line);
      switch (s.k) {
        case 'assign': this.setVar(this.lookup(s.name, s.raw, s.line), this.evalE(s.e), s.line, 'assign'); break;
        case 'write': {
          let out = '';
          for (const a of s.args) out += this.fmtArg(a);
          if (s.nl) out += '\n';
          if (this.io.write) this.io.write(out);
          if (out.trim()) this.record({ line: s.line, out: out.replace(/\n$/, '') });
          break;
        }
        case 'read':
          for (const r of s.vars) {
            const vr = this.lookup(r.name, r.raw, s.line);
            let value;
            for (;;) {
              const txt = await this.io.read({ name: vr.raw, type: vr.type }, this);
              if (txt === STOP) throw STOP;
              value = parseInput(txt, vr.type);
              if (value !== null) break;
              const msg = `"${txt}" não é um valor ${vr.type} válido para ${vr.raw}. ${INPUT_HINT[vr.type]}`;
              if (this.io.invalid) this.io.invalid(msg);
              else throw new VError(msg, s.line);
            }
            vr.v = value;
            this.lastChanged = vr.raw;
            this.record({ line: s.line, name: vr.raw, value: showValue({ t: TAG[vr.type], v: value }), how: 'read' });
          }
          break;
        case 'if':
          if (this.cond(s.cond, 'se')) await this.block(s.thenB);
          else if (s.elseB) {
            if (this.stepMode) await this.tick(s.elseLine);
            await this.block(s.elseB);
          }
          break;
        case 'switch': {
          const sv = this.evalE(s.subject);
          let hit = null;
          for (const c of s.cases) {
            for (const val of c.vals) {
              const a = this.evalE(val.a);
              const ok = val.b
                ? this.compare('>=', sv, a, c.line).v && this.compare('<=', sv, this.evalE(val.b), c.line).v
                : this.compare('=', sv, a, c.line, true).v;
              if (ok) { hit = c; break; }
            }
            if (hit) break;
          }
          if (hit) {
            if (this.stepMode) await this.tick(hit.line);
            await this.block(hit.body);
          } else if (s.other) {
            if (this.stepMode) await this.tick(s.otherLine);
            await this.block(s.other);
          }
          break;
        }
        case 'while':
          while (this.cond(s.cond, 'enquanto')) {
            if (await this.loopBody(s.body)) break;
            await this.tick(s.line);
          }
          break;
        case 'repeat':
          for (;;) {
            if (await this.loopBody(s.body)) break;
            await this.tick(s.condLine);
            if (this.cond(s.cond, 'repita (no ate)')) break;
          }
          break;
        case 'for': {
          const vr = this.lookup(s.v, s.vraw, s.line);
          if (vr.type !== 'inteiro') throw new VError(`A variável do para ("${vr.raw}") precisa ser do tipo inteiro.`, s.line);
          const from = this.evalE(s.from), to = this.evalE(s.to);
          const step = s.step ? this.evalE(s.step) : { t: 'i', v: 1 };
          for (const [x, what] of [[from, 'O valor inicial do para'], [to, 'O valor final do para'], [step, 'O passo do para']]) {
            needWhole(x, s.line, what);
          }
          if (step.v === 0) throw new VError('passo 0 faz o para nunca terminar. Use passo 1, passo -1, passo 2...', s.line);
          this.setVar(vr, { t: 'i', v: from.v }, s.line, 'for');
          while (step.v > 0 ? vr.v <= to.v : vr.v >= to.v) {
            if (await this.loopBody(s.body)) break;
            await this.tick(s.line);
            this.setVar(vr, { t: 'i', v: vr.v + step.v }, s.line, 'for');
          }
          break;
        }
        case 'break': throw BREAK;
        case 'cls': if (this.io.clear) this.io.clear(); break;
        default: break;
      }
    }
    compare(op, a, b, line, inCase) {
      let x, y;
      if (isNum(a) && isNum(b)) { x = a.v; y = b.v; }
      else if (a.t === 's' && b.t === 's') { x = a.v.toLowerCase(); y = b.v.toLowerCase(); }
      else if (a.t === 'b' && b.t === 'b') { x = +a.v; y = +b.v; }
      else {
        let msg = `${inCase ? 'No escolha, o caso compara' : 'Comparação entre'} tipos diferentes: ${TNAME[a.t]} com ${TNAME[b.t]}.`;
        if ((a.t === 's' && isNum(b)) || (b.t === 's' && isNum(a))) msg += ' Se a variável é caractere, o valor também vai entre aspas: "1".';
        throw new VError(msg, line);
      }
      let r;
      switch (op) {
        case '=': r = x === y; break;
        case '<>': r = x !== y; break;
        case '<': r = x < y; break;
        case '>': r = x > y; break;
        case '<=': r = x <= y; break;
        default: r = x >= y;
      }
      return { t: 'b', v: r };
    }
    evalE(n) {
      switch (n.k) {
        case 'lit': return n.v;
        case 'var': {
          const vr = this.vars.get(n.name);
          if (!vr) {
            if (FUNCS[n.name] && FUNCS[n.name][0] === 0) return FUNCS[n.name][1]([], n.line);
            throw new VError(`A variável "${n.raw}" não foi declarada. Crie ela na seção var, por exemplo: ${n.raw}: inteiro`, n.line);
          }
          return { t: TAG[vr.type], v: vr.v };
        }
        case 'un': {
          const a = this.evalE(n.e);
          if (n.op === 'nao') {
            if (a.t !== 'b') throw new VError('O nao só funciona com condições (VERDADEIRO/FALSO). Exemplo: nao (x > 5)', n.line);
            return { t: 'b', v: !a.v };
          }
          needNum(a, n.line, `O sinal ${n.op}`);
          return { t: a.t, v: n.op === '-' ? -a.v : a.v };
        }
        case 'bin': {
          const a = this.evalE(n.l), b = this.evalE(n.r), line = n.line;
          switch (n.op) {
            case '+':
              if (isNum(a) && isNum(b)) return num(a.v + b.v, a.t === 'i' && b.t === 'i');
              if (a.t === 's' && b.t === 's') return { t: 's', v: a.v + b.v };
              throw new VError('O + soma dois números ou junta dois textos. Aqui tem texto misturado com número. Para mostrar os dois, use vírgula no escreval: escreval("Total: ", x)', line);
            case '-': needNum(a, line, 'A subtração (-)'); needNum(b, line, 'A subtração (-)'); return num(a.v - b.v, a.t === 'i' && b.t === 'i');
            case '*': needNum(a, line, 'A multiplicação (*)'); needNum(b, line, 'A multiplicação (*)'); return num(a.v * b.v, a.t === 'i' && b.t === 'i');
            case '/':
              needNum(a, line, 'A divisão (/)'); needNum(b, line, 'A divisão (/)');
              if (b.v === 0) throw new VError('Divisão por zero! Não dá para dividir por 0.', line);
              return { t: 'r', v: a.v / b.v };
            case '\\':
              needWhole(a, line, 'A divisão inteira (\\)'); needWhole(b, line, 'A divisão inteira (\\)');
              if (b.v === 0) throw new VError('Divisão por zero! Não dá para dividir por 0.', line);
              return { t: 'i', v: Math.trunc(a.v / b.v) };
            case 'mod':
              needWhole(a, line, 'O resto (mod)'); needWhole(b, line, 'O resto (mod)');
              if (b.v === 0) throw new VError('Resto da divisão por zero! Não dá para dividir por 0.', line);
              return { t: 'i', v: (a.v % b.v) + 0 };
            case '^': {
              needNum(a, line, 'A potência (^)'); needNum(b, line, 'A potência (^)');
              const r = Math.pow(a.v, b.v);
              return (a.t === 'i' && b.t === 'i' && b.v >= 0 && Number.isSafeInteger(r)) ? { t: 'i', v: r } : { t: 'r', v: r };
            }
            case 'e': case 'ou': case 'xou':
              if (a.t !== 'b' || b.t !== 'b') throw new VError(`O ${n.op} junta duas condições (VERDADEIRO/FALSO). Exemplo: (x > 0) ${n.op} (y > 0)`, line);
              return { t: 'b', v: n.op === 'e' ? a.v && b.v : n.op === 'ou' ? a.v || b.v : a.v !== b.v };
            default: return this.compare(n.op, a, b, line);
          }
        }
        case 'call': {
          const f = FUNCS[n.name];
          if (!f) {
            if (this.vars.has(n.name)) throw new VError(`"${n.raw}" é uma variável, não uma função. Depois de variável não vai parêntese.`, n.line);
            throw new VError(`Função desconhecida: ${n.raw}(...)`, n.line);
          }
          const args = n.args.map(a => this.evalE(a));
          if (args.length !== f[0]) throw new VError(`A função ${n.raw} precisa de ${f[0]} valor${f[0] === 1 ? '' : 'es'} entre parênteses.`, n.line);
          return f[1](args, n.line);
        }
      }
      throw new VError('Expressão inválida.', n.line);
    }
  }

  /* ---------------- Passo a passo de expressões ---------------- */
  const LEVEL = { '^': 6, '*': 5, '/': 5, '\\': 5, 'mod': 5, '+': 4, '-': 4, '=': 3, '<>': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, 'e': 1, 'ou': 0, 'xou': 0 };
  const OPTXT = { '\\': '\\', 'mod': 'mod', 'e': 'e', 'ou': 'ou', 'xou': 'xou' };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function render(n, mark) {
    let s;
    if (n.k === 'lit') s = esc(showValue(n.v));
    else if (n.k === 'var') s = esc(n.raw);
    else if (n.k === 'un') s = n.op === 'nao' ? 'nao ' + render(n.e, mark) : esc(n.op) + render(n.e, mark);
    else if (n.k === 'call') s = esc(n.raw) + '(' + n.args.map(a => render(a, mark)).join(', ') + ')';
    else s = render(n.l, mark) + ' ' + esc(OPTXT[n.op] || n.op) + ' ' + render(n.r, mark);
    if (n.k !== 'lit' && n.paren) s = '('.repeat(n.paren) + s + ')'.repeat(n.paren);
    return n === mark ? `<mark>${s}</mark>` : s;
  }
  function reason(node, parent) {
    if (node.paren) return 'O que está entre parênteses vai primeiro.';
    if (node.k === 'call') return 'Funções são calculadas antes das contas em volta.';
    if (node.k === 'un') return node.op === 'nao' ? 'nao inverte: VERDADEIRO vira FALSO e FALSO vira VERDADEIRO.' : 'O sinal de menos troca o sinal do valor.';
    if (parent && parent.k === 'bin' && LEVEL[parent.op] === LEVEL[node.op] && parent.l === node) return 'Mesma prioridade: resolve da esquerda para a direita.';
    switch (node.op) {
      case '^': return 'Potência tem a maior prioridade entre as contas.';
      case '*': case '/': case '\\': case 'mod': return 'Multiplicação, divisão e resto vêm antes de soma e subtração.';
      case '+': case '-': return 'Soma e subtração vêm depois de *, /, \\ e mod.';
      case 'e': return 'e: só dá VERDADEIRO se os dois lados forem VERDADEIRO. (e vem antes do ou)';
      case 'ou': return 'ou: dá VERDADEIRO se pelo menos um lado for VERDADEIRO.';
      case 'xou': return 'xou: dá VERDADEIRO quando os lados são diferentes.';
      default: return 'Comparação: as contas já foram feitas, agora o resultado vira VERDADEIRO ou FALSO.';
    }
  }
  function explain(exprText, varsText) {
    const env = new Interp(null, {});
    const values = new Map();
    if (varsText && varsText.trim()) {
      const toks = lex(varsText);
      const isSep = x => x.t === 'op' && (x.v === ',' || x.v === ';');
      const isSet = x => x.t === 'op' && (x.v === '=' || x.v === '<-');
      let i = 0;
      while (toks[i].t !== 'eof') {
        const t = toks[i];
        if (isSep(t)) { i++; continue; }
        if (t.t !== 'id') throw new VError('Escreva as variáveis assim: a = 5, b = 3', 1);
        if (!isSet(toks[i + 1])) throw new VError(`Depois de ${t.raw} coloque = e o valor. Exemplo: ${t.raw} = 5`, 1);
        let j = i + 2, depth = 0;
        const part = [];
        while (toks[j].t !== 'eof' && !(depth === 0 && isSep(toks[j]))) {
          if (depth === 0 && part.length && toks[j].t === 'id' && isSet(toks[j + 1])) break;
          if (toks[j].t === 'op' && toks[j].v === '(') depth++;
          if (toks[j].t === 'op' && toks[j].v === ')') depth--;
          part.push(toks[j]); j++;
        }
        if (!part.length) throw new VError(`Falta o valor de ${t.raw}.`, 1);
        part.push({ t: 'eof', v: '', line: 1 });
        const P2 = makeParser(part);
        const e = P2.parseExpr();
        if (P2.peek().t !== 'eof') throw new VError(`Não entendi o valor de ${t.raw}.`, 1);
        values.set(t.v, { raw: t.raw, val: evalWith(e, values) });
        i = j;
      }
    }
    function evalWith(e, vals) {
      const it = new Interp(null, {});
      for (const [k, v] of vals) it.vars.set(k, { raw: v.raw, type: { i: 'inteiro', r: 'real', s: 'caractere', b: 'logico' }[v.val.t], v: v.val.v });
      return it.evalE(e);
    }
    const P = makeParser(lex(exprText));
    const ast = P.parseExpr();
    if (P.peek().t !== 'eof') throw new VError(`Sobrou "${P.peek().raw || P.peek().v}" no fim da expressão.`, 1);
    const steps = [{ html: render(ast), note: 'Expressão' }];
    let usedVars = false;
    function subst(n) {
      if (n.k === 'var') {
        if (!values.has(n.name)) {
          if (FUNCS[n.name] && FUNCS[n.name][0] === 0) return { k: 'lit', v: FUNCS[n.name][1]([], 1), paren: n.paren };
          throw new VError(`A variável ${n.raw} não tem valor. Informe no campo de variáveis, por exemplo: ${n.raw} = 5`, 1);
        }
        usedVars = true;
        return { k: 'lit', v: values.get(n.name).val, paren: n.paren };
      }
      if (n.k === 'bin') return Object.assign({}, n, { l: subst(n.l), r: subst(n.r) });
      if (n.k === 'un') return Object.assign({}, n, { e: subst(n.e) });
      if (n.k === 'call') return Object.assign({}, n, { args: n.args.map(subst) });
      return n;
    }
    let cur = subst(ast);
    if (usedVars) steps.push({ html: render(cur), note: 'Troque cada variável pelo valor dela.' });
    function find(n, parent) {
      if (n.k === 'lit') return null;
      if (n.k === 'bin') return find(n.l, n) || find(n.r, n) || { node: n, parent };
      if (n.k === 'un') return find(n.e, n) || { node: n, parent };
      if (n.k === 'call') { for (const a of n.args) { const r = find(a, n); if (r) return r; } return { node: n, parent }; }
      return null;
    }
    let guard = 0;
    while (cur.k !== 'lit' && guard++ < 200) {
      const { node, parent } = find(cur, null);
      const val = env.evalE(node);
      const trivial = node.k === 'un' && node.op !== 'nao' && node.e.k === 'lit';
      if (!trivial) steps.push({ html: render(cur, node), note: reason(node, parent), result: esc(showValue(val)) });
      for (const key of Object.keys(node)) delete node[key];
      Object.assign(node, { k: 'lit', v: val, paren: 0 });
    }
    steps.push({ html: render(cur), note: 'Resultado final', final: true });
    return steps;
  }

  /* ---------------- Correção automática ---------------- */
  const normText = s => norm(String(s)).replace(/\s+/g, ' ');
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function hasWord(text, w) {
    const re = new RegExp('(^|[^a-z0-9])' + escRe(normText(w)) + '([^a-z0-9]|$)');
    return re.test(normText(text));
  }
  function hasNumber(text, target) {
    const re = /-?\d+(?:\.\d+)?/g;
    let m;
    while ((m = re.exec(text))) {
      const tok = m[0], dec = (tok.split('.')[1] || '').length, val = parseFloat(tok);
      if (!Number.isInteger(target) && dec === 0) continue;
      const f = Math.pow(10, dec);
      if (Math.abs(val - Math.round(target * f) / f) < 1e-9 || Math.abs(val - Math.trunc(target * f) / f) < 1e-9) return true;
    }
    return false;
  }
  function describeExpect(x) { return typeof x === 'number' ? fmtReal(x) : `"${x}"`; }
  async function runTests(code, tests) {
    let prog;
    try { prog = parse(code); } catch (e) { return { compileError: e, results: [] }; }
    const results = [];
    for (const t of tests) {
      const inputs = (t.in || []).map(String);
      let idx = 0, out = '', mark = 0, interp = null;
      const io = {
        write: s => { out += s; },
        read: () => {
          if (idx >= inputs.length) {
            throw new VError(`Seu programa pediu mais valores do que o teste digita (o teste tem ${inputs.length || 'nenhum'}${inputs.length ? ': ' + inputs.join(', ') : ''}).`, interp.lastLine);
          }
          mark = out.length;
          return inputs[idx++];
        }
      };
      interp = new Interp(prog, io, { maxSteps: 200000 });
      let err = null;
      try { await interp.run(); } catch (e) { err = e; }
      const res = { inputs, out, pass: false, reason: '' };
      if (err) {
        res.reason = err.isVG ? `Erro na linha ${err.line}: ${err.message}` : String(err.message || err);
      } else if (idx < inputs.length) {
        res.reason = `Seu programa terminou sem ler todos os valores: leu ${idx} de ${inputs.length}.`;
      } else {
        const scope = (t.scope === 'all' || !inputs.length) ? out : out.slice(mark);
        const miss = (t.has || []).find(x => typeof x === 'number' ? !hasNumber(scope, x) : !hasWord(scope, x));
        const extra = (t.not || []).find(x => typeof x === 'number' ? hasNumber(scope, x) : hasWord(scope, x));
        if (miss !== undefined) res.reason = `Esperava aparecer ${describeExpect(miss)} na saída${inputs.length && t.scope !== 'all' ? ' (depois do último valor lido)' : ''}.`;
        else if (extra !== undefined) res.reason = `Apareceu ${describeExpect(extra)}, mas não deveria.`;
        else res.pass = true;
      }
      res.expect = (t.has || []).map(describeExpect);
      results.push(res);
    }
    return { results };
  }

  /* ---------------- Destaque de sintaxe ---------------- */
  const HL = {};
  'algoritmo var inicio fimalgoritmo se entao senao fimse escolha caso outrocaso fimescolha enquanto faca fimenquanto repita ate para de passo fimpara interrompa'
    .split(' ').forEach(w => { HL[w] = 'k'; });
  'escreva escreval leia limpatela'.split(' ').forEach(w => { HL[w] = 'f'; });
  Object.keys(FUNCS).forEach(w => { HL[w] = 'f'; });
  'inteiro real caractere caracter literal logico'.split(' ').forEach(w => { HL[w] = 't'; });
  'e ou nao xou mod div'.split(' ').forEach(w => { HL[w] = 'w'; });
  HL.verdadeiro = 'b'; HL.falso = 'b';
  function highlight(code) {
    let out = '', i = 0;
    const n = code.length;
    const span = (c, t) => `<span class="hl-${c}">${esc(t)}</span>`;
    while (i < n) {
      const c = code[i];
      if (c === '/' && code[i + 1] === '/') {
        let j = code.indexOf('\n', i); if (j < 0) j = n;
        out += span('c', code.slice(i, j)); i = j; continue;
      }
      if (c === '"' || c === '“' || c === '”') {
        let j = i + 1;
        while (j < n && !'"“”\n'.includes(code[j])) j++;
        if (j < n && code[j] !== '\n') j++;
        out += span('s', code.slice(i, j)); i = j; continue;
      }
      if (DIGIT.test(c)) {
        let j = i; while (j < n && /[0-9.]/.test(code[j])) j++;
        out += span('n', code.slice(i, j)); i = j; continue;
      }
      if (ID_START.test(c)) {
        let j = i; while (j < n && ID_PART.test(code[j])) j++;
        const w = code.slice(i, j), cls = HL[norm(w)];
        out += cls ? span(cls, w) : esc(w); i = j; continue;
      }
      if (c === '<' && code[i + 1] === '-') { out += span('o', '<-'); i += 2; continue; }
      out += esc(c); i++;
    }
    return out;
  }

  return { lex, parse, Interp, VError, STOP, explain, runTests, highlight, fmtReal, showValue, norm, hasWord, hasNumber };
})();
if (typeof module !== 'undefined') module.exports = VG;
