(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('vg4h:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('vg4h:' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  };
  const clean = s => s.replace(/^\s*\n/, '').replace(/\s+$/, '');
  const ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/></svg>',
    step: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.8v10.4L10 8z" fill="currentColor"/><rect x="11" y="2.8" width="2.2" height="10.4" rx=".6" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6l3.2 3.1L13 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function btn(label, cls, onClick, icon) {
    const b = h('button', { type: 'button', class: 'btn ' + (cls || '') });
    if (icon) b.insertAdjacentHTML('beforeend', ICON[icon]);
    b.append(h('span', null, label));
    b.addEventListener('click', onClick);
    return b;
  }
  function flash(b, text, ms = 1600) {
    const s = b.querySelector('span');
    if (!b.dataset.label) b.dataset.label = s.textContent;
    s.textContent = text;
    clearTimeout(b._t);
    b._t = setTimeout(() => { s.textContent = b.dataset.label; }, ms);
  }
  function ensureVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 16) el.scrollIntoView({ block: 'center' });
  }

  /* ---------- Editor com destaque de sintaxe ---------- */
  let uid = 0;
  class Editor {
    constructor(code, opts = {}) {
      this.gutter = h('pre', { class: 'ed-gutter', 'aria-hidden': 'true' });
      this.hl = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
      this.ta = h('textarea', {
        class: 'ed-ta', id: opts.id || 'ed-' + (++uid), spellcheck: 'false', autocapitalize: 'off',
        autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': opts.label || 'Código VisuAlg'
      });
      this.marks = h('div', { class: 'ed-marks', 'aria-hidden': 'true' });
      this.layer = h('div', { class: 'ed-layer' }, this.marks, this.hl, this.ta);
      this.el = h('div', { class: 'ed-body' }, this.gutter, h('div', { class: 'ed-scroll' }, this.layer));
      this.ta.value = code;
      this.ta.addEventListener('input', () => { this.refresh(); this.clearMarks(); if (opts.onChange) opts.onChange(this.ta.value); });
      this.ta.addEventListener('scroll', () => { this.ta.scrollTop = 0; this.ta.scrollLeft = 0; });
      this.ta.addEventListener('keydown', e => this.key(e));
      this.refresh();
    }
    get value() { return this.ta.value; }
    set value(v) { this.ta.value = v; this.refresh(); }
    refresh() {
      const code = this.ta.value;
      this.hl.innerHTML = VG.highlight(code) + '\n';
      const n = code.split('\n').length;
      let g = '';
      for (let i = 1; i <= n; i++) g += i + '\n';
      this.gutter.textContent = g;
      this.ta.scrollTop = 0; this.ta.scrollLeft = 0;
    }
    key(e) {
      if (this.ta.readOnly) return;
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.insert('   '); }
      else if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) {
        const ta = this.ta, pos = ta.selectionStart;
        const start = ta.value.lastIndexOf('\n', pos - 1) + 1;
        const indent = (ta.value.slice(start, pos).match(/^[ \t]*/) || [''])[0];
        if (indent) { e.preventDefault(); this.insert('\n' + indent); }
      }
    }
    insert(text) {
      const ta = this.ta;
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (err) { ok = false; }
      if (!ok) {
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + text + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + text.length;
        ta.dispatchEvent(new Event('input'));
      }
    }
    metrics() {
      const cs = getComputedStyle(this.ta);
      return { lh: parseFloat(cs.lineHeight) || 22, top: parseFloat(cs.paddingTop) || 12 };
    }
    mark(line, kind) {
      const { lh, top } = this.metrics();
      const m = h('div', { class: 'ed-mark ' + kind });
      m.style.top = (top + (line - 1) * lh) + 'px';
      m.style.height = lh + 'px';
      this.marks.append(m);
      return m;
    }
    clearMarks(kind) { for (const m of Array.from(this.marks.children)) if (!kind || m.classList.contains(kind)) m.remove(); }
    lock(b) { this.ta.readOnly = b; this.el.classList.toggle('locked', b); }
  }

  /* ---------- Executor: editor + console + memória + teste de mesa ---------- */
  class Runner {
    constructor(code, opts = {}) {
      this.opts = opts;
      this.original = opts.original != null ? opts.original : code;
      this.state = 'idle';
      this.editor = new Editor(code, {
        id: opts.id, label: opts.label,
        onChange: v => { if (opts.saveKey) store.set(opts.saveKey, v); this.dirty(); }
      });
      this.bRun = btn('Executar', 'btn-run', () => this.start(false), 'play');
      this.bStep = btn('Passo a passo', '', () => this.start(true), 'step');
      this.bNext = btn('Próximo passo', 'btn-run', () => this.next(), 'step');
      this.bCont = btn('Rodar até o fim', '', () => this.cont(), 'play');
      this.bStop = btn('Parar', 'btn-stop', () => this.stop(), 'stop');
      this.extra = h('span', { class: 'ed-extra' });
      this.bCopy = btn('Copiar', 'btn-ghost', () => this.copy());
      this.bReset = btn('Restaurar', 'btn-ghost', () => this.reset());
      this.bar = h('div', { class: 'ed-bar' },
        h('span', { class: 'ed-name' }, opts.title || 'programa.alg'),
        h('span', { class: 'ed-actions' }, this.bRun, this.bStep, this.bNext, this.bCont, this.bStop, this.extra, this.bCopy, this.bReset));
      this.stepInfo = h('div', { class: 'ed-stepinfo', hidden: true, 'aria-live': 'polite' });
      this.conBody = h('div', { class: 'con-body', role: 'log' });
      this.con = h('div', { class: 'con', hidden: true },
        h('div', { class: 'con-title' }, h('span', { class: 'con-dots', 'aria-hidden': 'true' }), 'Console simulando o modo texto do MS-DOS'),
        this.conBody);
      this.mem = h('div', { class: 'mem', hidden: true });
      this.tbl = h('div', { class: 'trace', hidden: true });
      this.root = h('div', { class: 'ed' }, this.bar, this.editor.el);
      if (opts.hint) this.root.append(h('p', { class: 'ed-hint' }, opts.hint));
      this.root.append(this.stepInfo, this.con, this.mem, this.tbl);
      this.setState('idle');
    }
    dirty() { if (this.state === 'idle') this.bReset.hidden = this.editor.value === this.original; }
    setState(st) {
      this.state = st;
      const idle = st === 'idle', step = st === 'step';
      this.bRun.hidden = this.bStep.hidden = this.extra.hidden = this.bCopy.hidden = !idle;
      this.bNext.hidden = this.bCont.hidden = !step;
      this.bStop.hidden = idle;
      this.stepInfo.hidden = !step;
      this.editor.lock(!idle);
      this.root.classList.toggle('is-running', !idle);
      if (idle) this.dirty(); else this.bReset.hidden = true;
    }
    out(text, cls) {
      if (!text) return;
      const last = this.conBody.lastChild;
      if (!cls && last && last.nodeType === 1 && last.classList.contains('con-out')) last.textContent += text;
      else this.conBody.append(h('span', { class: cls ? 'con-' + cls : 'con-out' }, text));
      this.conBody.scrollTop = this.conBody.scrollHeight;
    }
    endLine(text, cls) {
      const t = this.conBody.textContent;
      this.out((t && !t.endsWith('\n') ? '\n' : '') + text, cls);
    }
    read(info) {
      return new Promise(resolve => {
        const inp = h('input', {
          class: 'con-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
          enterkeyhint: 'send', 'aria-label': `Digite o valor de ${info.name} e aperte Enter`
        });
        const send = h('button', { type: 'button', class: 'con-send' }, 'Enter');
        const row = h('span', { class: 'con-inrow' }, inp, send);
        this.conBody.append(row);
        const finish = v => { row.remove(); this.cancelRead = null; this.bNext.disabled = false; resolve(v); };
        const submit = () => { const v = inp.value; this.out(v + '\n', 'in'); finish(v); };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        send.addEventListener('click', submit);
        this.cancelRead = () => finish(VG.STOP);
        this.bNext.disabled = true;
        this.showMem(false);
        this.conBody.scrollTop = this.conBody.scrollHeight;
        try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
        ensureVisible(row);
      });
    }
    async start(stepMode) {
      if (this.state !== 'idle') return;
      this.conBody.textContent = '';
      this.con.hidden = false;
      this.mem.hidden = true;
      this.tbl.hidden = true;
      this.editor.clearMarks();
      this.it = null;
      let prog;
      try { prog = VG.parse(this.editor.value); } catch (e) { this.fail(e); return; }
      const io = {
        write: t => this.out(t),
        read: info => this.read(info),
        invalid: msg => this.out(msg + '\n', 'warn'),
        clear: () => { this.conBody.textContent = ''; },
        step: line => this.pause(line)
      };
      const it = this.it = new VG.Interp(prog, io, { stepMode });
      this.setState(stepMode ? 'step' : 'run');
      try {
        await it.run();
        this.endLine('>>> Fim da execução do programa !', 'end');
      } catch (e) {
        if (e === VG.STOP) this.endLine('>>> Execução interrompida.', 'end');
        else this.fail(e);
      } finally {
        this.setState('idle');
        this.editor.clearMarks('step');
        this.showMem(true);
        if (this.opts.onRun) this.opts.onRun();
      }
    }
    fail(e) {
      this.con.hidden = false;
      if (e && e.isVG) {
        this.endLine(`Erro na linha ${e.line}: ${e.message}`, 'err');
        this.editor.mark(e.line, 'err');
      } else {
        this.endLine('Erro inesperado no simulador: ' + ((e && e.message) || e), 'err');
        if (window.console) console.error(e);
      }
    }
    pause(line) {
      this.editor.clearMarks('step');
      const m = this.editor.mark(line, 'step');
      this.stepInfo.textContent = `A linha ${line} (em amarelo) é a próxima a ser executada. Olhe a memória embaixo.`;
      this.showMem(false);
      ensureVisible(m);
      return new Promise(res => { this.resume = res; });
    }
    next() { const r = this.resume; this.resume = null; if (r) r(); }
    cont() { if (this.it) this.it.stepMode = false; this.editor.clearMarks('step'); this.setState('run'); this.next(); }
    stop() { if (this.it) this.it.stop(); this.next(); if (this.cancelRead) this.cancelRead(); }
    showMem(final) {
      const it = this.it;
      if (!it || !it.vars.size) { this.mem.hidden = true; return; }
      const tb = h('tbody');
      for (const r of it.snapshot()) {
        tb.append(h('tr', { class: r.name === it.lastChanged ? 'chg' : null },
          h('td', { class: 'mono' }, r.name), h('td', null, r.type), h('td', { class: 'mono val' }, r.text)));
      }
      const parts = [
        h('div', { class: 'mem-title' }, final ? 'Memória no fim' : 'Memória agora',
          h('span', { class: 'muted' }, final ? '' : ' · a linha destacada foi a última a mudar')),
        h('div', { class: 'tbl-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', null, 'Variável'), h('th', null, 'Tipo'), h('th', null, 'Valor'))), tb))
      ];
      if (final && it.trace.length) {
        const b = btn('Ver teste de mesa', 'btn-ghost btn-sm', () => { this.renderTrace(); b.remove(); });
        parts.push(h('div', { class: 'mem-foot' }, b, h('span', { class: 'muted' }, 'cada mudança de variável vira uma linha da tabela')));
      }
      this.mem.replaceChildren(...parts);
      this.mem.hidden = false;
    }
    renderTrace() {
      const it = this.it;
      const names = it.prog.decls.map(d => d.raw);
      const cur = {};
      const tb = h('tbody');
      for (const ev of it.trace) {
        if (ev.name) cur[ev.name] = ev.value;
        const tr = h('tr', null, h('td', { class: 'num' }, String(ev.line)));
        for (const n of names) {
          const chg = ev.name === n;
          tr.append(h('td', { class: 'mono ' + (chg ? 'chg' : 'old') }, cur[n] !== undefined ? cur[n] : ''));
        }
        tr.append(h('td', { class: 'mono out' }, ev.out ? ev.out : (ev.how === 'read' ? h('span', { class: 'muted' }, '(valor digitado)') : '')));
        tb.append(tr);
      }
      const parts = [
        h('div', { class: 'mem-title' }, 'Teste de mesa', h('span', { class: 'muted' }, ' · valor novo em destaque, valores antigos apagadinhos')),
        h('div', { class: 'tbl-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', null, 'Linha'), ...names.map(n => h('th', { class: 'mono' }, n)), h('th', null, 'Saída na tela'))), tb))
      ];
      if (it.traceOverflow) parts.push(h('p', { class: 'muted small' }, `... e mais ${it.traceOverflow} passos (a tabela mostra só os primeiros ${it.trace.length}).`));
      this.tbl.replaceChildren(...parts);
      this.tbl.hidden = false;
    }
    copy() {
      const code = this.editor.value;
      const fallback = () => { this.editor.ta.focus(); this.editor.ta.select(); flash(this.bCopy, 'Selecionado: Ctrl+C'); };
      try { navigator.clipboard.writeText(code).then(() => flash(this.bCopy, 'Copiado!'), fallback); } catch (e) { fallback(); }
    }
    reset() {
      if (!this.armed) {
        this.armed = true;
        flash(this.bReset, 'Clique de novo');
        setTimeout(() => { this.armed = false; }, 1600);
        return;
      }
      this.armed = false;
      this.editor.value = this.original;
      if (this.opts.saveKey) store.set(this.opts.saveKey, null);
      this.editor.clearMarks();
      this.dirty();
    }
  }

  /* ---------- Exemplos ---------- */
  function initExamples() {
    for (const s of $$('script[type="text/x-visualg"]:not([data-role])')) {
      const r = new Runner(clean(s.textContent), { title: s.dataset.title, hint: s.dataset.hint, label: 'Exemplo ' + (s.dataset.title || '') });
      if (s.dataset.compact !== undefined) r.root.classList.add('ed-compact');
      s.replaceWith(r.root);
    }
  }

  /* ---------- Exercícios com correção ---------- */
  function initExercise(el) {
    const id = el.dataset.id;
    const get = role => { const s = $(`script[data-role="${role}"]`, el); return s ? s.textContent : ''; };
    const starter = clean(get('starter')), solution = clean(get('solution'));
    let tests = [];
    try { tests = JSON.parse(get('tests') || '[]'); } catch (e) { if (window.console) console.error('testes inválidos', id, e); }
    const saved = store.get('code:' + id, null);
    const slug = id.replace(/\W/g, '_');
    const runner = new Runner(saved || starter, { original: starter, saveKey: 'code:' + id, title: `exercicio_${slug}.alg`, label: `Seu código do exercício ${id}`, id: 'ex-' + slug });
    const results = h('div', { class: 'ex-results', 'aria-live': 'polite' });
    const bTest = btn('Testar', 'btn-test', () => doTest(), 'check');
    const bSol = btn('Ver resposta', 'btn-ghost', () => toggleSol());
    runner.extra.append(bTest, bSol);
    const solWrap = h('div', { class: 'ex-sol', hidden: true });
    const badge = h('span', { class: 'ex-badge', hidden: true }, 'Resolvido');
    const head = $('.ex-head', el);
    if (head) head.append(badge);
    el.append(runner.root, results, solWrap);
    let solRunner = null;
    if (store.get('done:' + id, false)) markDone(false);

    async function doTest() {
      runner.editor.clearMarks('err');
      results.replaceChildren(h('p', { class: 'muted' }, 'Testando...'));
      const r = await VG.runTests(runner.editor.value, tests);
      if (r.compileError) {
        const e = r.compileError;
        results.replaceChildren(h('div', { class: 'res res-fail' }, h('b', null, 'O código tem um erro e nem chegou a rodar. '), `Linha ${e.line}: ${e.message}`));
        if (e.line) runner.editor.mark(e.line, 'err');
        return;
      }
      const passed = r.results.filter(x => x.pass).length;
      const list = h('ol', { class: 'res-list' });
      r.results.forEach((x, i) => {
        const ins = x.inputs.length ? `digitando ${x.inputs.join(', ')}` : 'sem digitar nada';
        const li = h('li', { class: x.pass ? 'ok' : 'bad' },
          h('span', { class: 'res-ico', 'aria-hidden': 'true' }, x.pass ? '✓' : '✗'),
          h('span', null, h('b', null, `Teste ${i + 1}`), ` ${ins}`, x.expect.length ? h('span', { class: 'muted' }, ` · deve aparecer ${x.expect.join(', ')}`) : ''));
        if (!x.pass) {
          li.append(h('div', { class: 'res-why' }, x.reason));
          li.append(h('pre', { class: 'res-out' }, x.out.trim() ? x.out.replace(/\n$/, '') : '(o programa não mostrou nada)'));
        }
        list.append(li);
      });
      const all = passed === r.results.length;
      results.replaceChildren(h('div', { class: 'res ' + (all ? 'res-ok' : 'res-fail') },
        all ? 'Todos os testes passaram. Exercício resolvido!' : `Passou em ${passed} de ${r.results.length} testes. Veja o que faltou:`), list);
      if (all) markDone(true);
    }
    function toggleSol() {
      if (!solRunner) {
        solRunner = new Runner(solution, { title: 'resposta.alg', label: `Resposta do exercício ${id}`, id: 'sol-' + slug });
        solWrap.append(h('p', { class: 'ex-sol-note' }, 'Uma resposta possível (existem outras certas). Digite você mesmo em vez de copiar: é digitando que fixa.'), solRunner.root);
      }
      solWrap.hidden = !solWrap.hidden;
      bSol.querySelector('span').textContent = solWrap.hidden ? 'Ver resposta' : 'Esconder resposta';
    }
    function markDone(save) {
      el.classList.add('done');
      badge.hidden = false;
      if (save) store.set('done:' + id, true);
      progress();
    }
  }

  /* ---------- Perguntas ---------- */
  function initQuiz(quiz) {
    const qs = $$('.q', quiz);
    const sim = quiz.hasAttribute('data-sim');
    const score = h('div', { class: 'quiz-score', 'aria-live': 'polite' });
    const again = btn('Refazer', 'btn-ghost btn-sm', reset);
    let answered = 0, right = 0;
    qs.forEach((q, qi) => {
      const ans = parseInt(q.dataset.answer, 10);
      const why = $('.q-why', q);
      if (why) why.hidden = true;
      const opts = $$('.q-opts > li', q);
      q.prepend(h('span', { class: 'q-num' }, (sim ? 'Questão ' : 'Pergunta ') + (qi + 1)));
      opts.forEach((li, i) => {
        const b = h('button', { type: 'button', class: 'q-opt' }, h('span', { class: 'q-letter', 'aria-hidden': 'true' }, 'abcde'[i] + ')'));
        const t = h('span', { class: 'q-txt' });
        t.innerHTML = li.innerHTML;
        b.append(t);
        li.replaceChildren(b);
        b.addEventListener('click', () => {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          answered++;
          if (i === ans) right++;
          li.classList.add(i === ans ? 'right' : 'wrong');
          opts[ans].classList.add('right');
          opts.forEach(o => { o.firstChild.disabled = true; });
          if (why) { why.prepend(h('b', { class: 'verdict' }, i === ans ? 'Certo! ' : 'Errou, mas agora você sabe: ')); why.hidden = false; }
          update();
        });
      });
    });
    function update() {
      const n = qs.length;
      let msg;
      if (answered < n) msg = `${answered} de ${n} respondidas · ${right} certas`;
      else if (!sim) msg = `Resultado: ${right} de ${n}. ${right === n ? 'Perfeito!' : 'Releia a explicação das que errou.'}`;
      else if (right >= 13) msg = `Você acertou ${right} de ${n}. Pronto para a prova: revise a cola e descanse.`;
      else if (right >= 9) msg = `Você acertou ${right} de ${n}. Quase lá: releia as explicações das erradas e refaça os exercícios desses blocos.`;
      else msg = `Você acertou ${right} de ${n}. Volte aos blocos das questões erradas, rode os exemplos com Passo a passo e tente de novo.`;
      score.replaceChildren(h('span', null, msg));
      if (answered) score.append(again);
      score.classList.toggle('final', answered === n);
    }
    function reset() {
      answered = right = 0;
      for (const q of qs) {
        q.classList.remove('answered');
        for (const li of $$('.q-opts > li', q)) { li.classList.remove('right', 'wrong'); li.firstChild.disabled = false; }
        const why = $('.q-why', q);
        if (why) { why.hidden = true; const v = $('.verdict', why); if (v) v.remove(); }
      }
      update();
    }
    quiz.append(score);
    update();
  }

  /* ---------- Expressão passo a passo ---------- */
  function initXP(el) {
    const presets = JSON.parse(el.dataset.presets || '[]');
    const exprIn = h('input', { type: 'text', class: 'xp-in mono', id: el.id + '-expr', value: el.dataset.expr || '', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    const varsIn = h('input', { type: 'text', class: 'xp-in mono', id: el.id + '-vars', value: el.dataset.vars || '', placeholder: 'opcional, ex.: a = 5, b = 3', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    const steps = h('ol', { class: 'xp-steps', 'aria-live': 'polite' });
    const go = () => {
      try {
        steps.replaceChildren(...VG.explain(exprIn.value, varsIn.value).map(s => {
          const ex = h('div', { class: 'xp-expr mono' });
          ex.innerHTML = s.html + (s.result ? ` <span class="xp-arrow">→</span> <b>${s.result}</b>` : '');
          return h('li', { class: s.final ? 'final' : null }, ex, h('div', { class: 'xp-note' }, s.note));
        }));
      } catch (e) {
        steps.replaceChildren(h('li', { class: 'xp-err' }, e.message));
      }
    };
    for (const inp of [exprIn, varsIn]) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const chips = h('div', { class: 'xp-chips' }, h('span', { class: 'muted small' }, 'Exemplos:'),
      presets.map(p => h('button', { type: 'button', class: 'chip mono', onclick: () => { exprIn.value = p.e; varsIn.value = p.v || ''; go(); } }, p.e)));
    el.append(
      h('div', { class: 'xp-form' },
        h('label', { for: exprIn.id }, 'Expressão'), exprIn,
        h('label', { for: varsIn.id }, 'Variáveis'), varsIn,
        h('span'), btn('Resolver passo a passo', 'btn-run', go)),
      chips, steps);
    go();
  }

  /* ---------- Tabela-verdade interativa ---------- */
  function initTT(el) {
    const st = { A: true, B: false };
    const sw = $$('.tt-sw', el);
    const word = v => v ? 'VERDADEIRO' : 'FALSO';
    function draw() {
      for (const b of sw) {
        const k = b.dataset.var;
        b.setAttribute('aria-pressed', String(st[k]));
        b.querySelector('b').textContent = word(st[k]);
      }
      const r = { and: st.A && st.B, or: st.A || st.B, notA: !st.A, xor: st.A !== st.B };
      for (const o of $$('[data-out]', el)) {
        const v = r[o.dataset.out];
        o.textContent = word(v);
        o.className = 'pill ' + (v ? 'pill-v' : 'pill-f');
      }
    }
    sw.forEach(b => b.addEventListener('click', () => { st[b.dataset.var] = !st[b.dataset.var]; draw(); }));
    draw();
  }

  /* ---------- Trechos de código só para leitura ---------- */
  function initSnips() {
    for (const p of $$('pre.snip')) p.innerHTML = VG.highlight(clean(p.textContent));
  }

  /* ---------- Plano, cronômetro e progresso ---------- */
  const PLAN = [
    { id: 'b1', name: 'Variáveis, escreva e leia', start: 0, dur: 25 },
    { id: 'b2', name: 'Contas e precedência', start: 25, dur: 25 },
    { id: null, name: 'Pausa: levante e beba água', start: 50, dur: 10 },
    { id: 'b3', name: 'se, senao e escolha', start: 60, dur: 40 },
    { id: 'b4', name: 'e, ou, nao', start: 100, dur: 25 },
    { id: null, name: 'Pausa: levante e beba água', start: 125, dur: 10 },
    { id: 'b5', name: 'Repetição', start: 135, dur: 50 },
    { id: null, name: 'Pausa curta', start: 185, dur: 5 },
    { id: 'b6', name: 'Lista de revisão N1', start: 190, dur: 35 },
    { id: 'b7', name: 'Simulado e cola', start: 225, dur: 15 }
  ];
  const fmtClock = min => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
  let timer = store.get('timer', null);
  function elapsedMin() {
    if (!timer) return null;
    const end = timer.pausedAt || Date.now();
    return Math.max(0, (end - timer.start - (timer.pausedTotal || 0)) / 60000);
  }
  function currentSlot(min) { let cur = PLAN[0]; for (const p of PLAN) if (min >= p.start) cur = p; return cur; }
  function initTimer() {
    const main = $('#timer-btn'), label = $('#timer-label'), zero = $('#timer-reset');
    if (!main) return;
    main.addEventListener('click', () => {
      if (!timer) timer = { start: Date.now(), pausedTotal: 0, pausedAt: null };
      else if (timer.pausedAt) { timer.pausedTotal += Date.now() - timer.pausedAt; timer.pausedAt = null; }
      else timer.pausedAt = Date.now();
      store.set('timer', timer);
      tick();
    });
    zero.addEventListener('click', () => {
      if (!zero.dataset.armed) { zero.dataset.armed = '1'; flash(zero, 'Zerar?'); setTimeout(() => { delete zero.dataset.armed; }, 1600); return; }
      delete zero.dataset.armed;
      timer = null; store.set('timer', null); tick();
    });
    function tick() {
      const min = elapsedMin();
      const rows = $$('#plano-tabela tbody tr');
      rows.forEach(r => r.classList.remove('now'));
      if (min === null) {
        main.querySelector('span').textContent = 'Iniciar 4h';
        label.textContent = '';
        zero.hidden = true;
        return;
      }
      zero.hidden = false;
      const slot = currentSlot(min);
      const idx = PLAN.indexOf(slot);
      if (rows[idx]) rows[idx].classList.add('now');
      main.querySelector('span').textContent = timer.pausedAt ? 'Continuar' : 'Pausar';
      label.textContent = min >= 240 ? `${fmtClock(min)} · tempo esgotado: revise a cola` : `${fmtClock(min)} de 4:00 · agora: ${slot.name}`;
    }
    tick();
    setInterval(tick, 15000);
  }
  function progress() {
    const all = $$('.ex'), done = all.filter(e => e.classList.contains('done'));
    const c = $('#prog-count');
    if (c) c.textContent = `${done.length}/${all.length}`;
    for (const chip of $$('.nav-chip')) {
      const sec = document.getElementById(chip.dataset.sec);
      if (!sec) continue;
      const ex = $$('.ex', sec);
      chip.classList.toggle('complete', ex.length > 0 && ex.every(e => e.classList.contains('done')));
    }
  }
  function initNav() {
    const chips = $$('.nav-chip');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        chips.forEach(c => {
          const on = c.dataset.sec === en.target.id;
          c.classList.toggle('active', on);
          if (on) {
            const row = c.parentElement;
            const left = c.offsetLeft - row.clientWidth / 2 + c.clientWidth / 2;
            row.scrollTo({ left: Math.max(0, left) });
          }
        });
      }
    }, { rootMargin: '-35% 0px -60% 0px' });
    chips.forEach(c => { const s = document.getElementById(c.dataset.sec); if (s) io.observe(s); });
  }

  function boot() {
    initSnips();
    initExamples();
    $$('.ex').forEach(initExercise);
    $$('.quiz').forEach(initQuiz);
    $$('.xp').forEach(initXP);
    $$('.tt').forEach(initTT);
    initTimer();
    initNav();
    progress();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
