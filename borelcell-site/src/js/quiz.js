import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, escapeHTML, icon, reducedMotion } from './utils.js';
import { catalog, channelName } from './config.js';
import { phoneSVG } from './phoneSvg.js';
import { sendMessage, productMessage } from './contact.js';

const QUESTIONS = [
  {
    key: 'uso',
    q: 'Para que você mais usa o celular?',
    opts: [
      { v: 'camera', title: 'Fotos e vídeos', desc: 'Câmera boa em qualquer luz', ic: 'i-camera' },
      { v: 'desempenho', title: 'Jogos e apps pesados', desc: 'Rápido e sem travar', ic: 'i-game' },
      { v: 'bateria', title: 'Passar o dia fora', desc: 'Bateria que aguenta o dia', ic: 'i-battery' },
      { v: 'custo', title: 'Redes sociais e o básico', desc: 'O essencial, bem feito', ic: 'i-chat' }
    ]
  },
  {
    key: 'so',
    q: 'Qual sistema você prefere?',
    opts: [
      { v: 'ios', title: 'iPhone', desc: 'iOS e o jeito Apple de usar', badge: 'iOS' },
      { v: 'android', title: 'Android', desc: 'Samsung, Xiaomi, Motorola', badge: 'AND' },
      { v: 'any', title: 'Tanto faz', desc: 'Quero o que for melhor para mim', ic: 'i-spark' }
    ]
  },
  {
    key: 'tamanho',
    q: 'Que tamanho combina com você?',
    opts: [
      { v: 'compacto', title: 'Compacto', desc: 'Cabe fácil na mão e no bolso', ic: 'i-phone' },
      { v: 'grande', title: 'Tela grande', desc: 'Mais espaço para vídeo e jogo', ic: 'i-phone-big' },
      { v: 'any', title: 'Tanto faz', desc: 'O tamanho não é prioridade', ic: 'i-spark' }
    ]
  },
  {
    key: 'linha',
    q: 'Qual linha você procura?',
    opts: [
      { v: 'top', title: 'Topo de linha', desc: 'O melhor que existe hoje', ic: 'i-crown' },
      { v: 'mid', title: 'Equilíbrio', desc: 'Ótimo, sem exagero', ic: 'i-scale' },
      { v: 'entry', title: 'Custo-benefício', desc: 'Mais celular pelo seu dinheiro', ic: 'i-tag' }
    ]
  }
];

const TIERS = ['entry', 'mid', 'top'];

function score(p, a) {
  if (a.so && a.so !== 'any' && p.so !== a.so) return -1;
  let s = ((p.notas[a.uso] || 3) - 1) / 4 * 50;
  if (!a.tamanho || a.tamanho === 'any' || p.tamanho === a.tamanho) s += 20;
  else if (p.tamanho === 'medio') s += 12;
  else s += 3;
  const d = Math.abs(TIERS.indexOf(p.linha) - TIERS.indexOf(a.linha));
  s += d === 0 ? 30 : d === 1 ? 13 : 0;
  return Math.round(s);
}

export function initQuiz({ bag }) {
  const root = $('[data-quiz]');
  const bar = $('[data-quiz-bar]');
  if (!root) return;
  const answers = {};
  let step = 0;

  function setBar(v) { if (bar) bar.style.transform = `scaleX(${v})`; }

  function questionHTML(i) {
    const q = QUESTIONS[i];
    return `
      <div class="quiz__step">
        <div class="quiz__meta">
          <span>Pergunta ${i + 1} de ${QUESTIONS.length}</span>
          ${i > 0 ? `<button class="quiz__back" type="button" data-back>${icon('i-arrow')} Voltar</button>` : ''}
        </div>
        <h3 class="quiz__q">${escapeHTML(q.q)}</h3>
        <div class="quiz__opts">
          ${q.opts.map((o) => `
            <button class="opt" type="button" data-v="${o.v}" aria-pressed="${answers[q.key] === o.v}">
              <span class="opt__icon">${o.badge ? `<b>${o.badge}</b>` : icon(o.ic)}</span>
              <span class="opt__text"><span class="opt__title">${escapeHTML(o.title)}</span><span class="opt__desc">${escapeHTML(o.desc)}</span></span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function resultHTML() {
    const ranked = catalog
      .map((p) => ({ p, s: score(p, answers) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
    if (!ranked.length) {
      return `
        <div class="quiz__result">
          <div class="quiz__meta"><span>Resultado</span></div>
          <h3>Fale com a Borel Cell</h3>
          <p>Não encontramos um modelo com esse perfil no catálogo do site, mas a equipe pode indicar outras opções.</p>
          <button class="btn btn--accent" type="button" data-contact>Chamar no ${channelName}</button>
          <div class="quiz__again"><button class="quiz__back" type="button" data-restart>${icon('i-rotate')} Refazer o match</button></div>
        </div>`;
    }
    const top = ranked[0].p;
    return `
      <div class="quiz__result">
        <div class="quiz__meta"><span>Seu resultado</span><button class="quiz__back" type="button" data-restart>${icon('i-rotate')} Refazer</button></div>
        <h3>Seu match é o <em style="font-style:normal;font-weight:300;color:var(--silver)">${escapeHTML(top.nome)}</em></h3>
        <p>Com base nas suas respostas, estes são os modelos que mais combinam com você. Preço e disponibilidade a Borel Cell confirma no atendimento.</p>
        <ul class="recs">
          ${ranked.map(({ p, s }) => `
            <li class="rec" style="--c:${p.cores[0].hex}" data-id="${p.id}">
              <div class="rec__visual">${phoneSVG(p.cores[0].hex, p.visual)}</div>
              <div>
                <div class="rec__top"><span class="rec__name">${escapeHTML(p.nome)}</span><span class="rec__pct">${s}%</span></div>
                <div class="rec__bar"><i style="--w:${s / 100}"></i></div>
                <div class="rec__actions">
                  <button class="btn btn--accent" type="button" data-rec-ask>Consultar preço</button>
                  <button class="btn btn--ghost" type="button" data-rec-add>${icon('i-plus')} Lista</button>
                </div>
              </div>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  function show(html, dir = 1) {
    const prev = root.firstElementChild;
    const enter = () => {
      root.innerHTML = html;
      const el = root.firstElementChild;
      if (!reducedMotion) {
        gsap.fromTo(el, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
        gsap.fromTo($$('.opt, .rec', el), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out', delay: 0.08 });
      }
      $$('.rec__bar i', el).forEach((b) => {
        const w = parseFloat(b.style.getPropertyValue('--w')) || 0;
        if (reducedMotion) b.style.transform = `scaleX(${w})`;
        else gsap.to(b, { scaleX: w, duration: 1.4, ease: 'expo.out', delay: 0.3 });
      });
      ScrollTrigger.refresh();
    };
    if (prev && !reducedMotion) gsap.to(prev, { x: -40 * dir, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: enter });
    else enter();
  }

  function render(dir = 1) {
    if (step < QUESTIONS.length) {
      setBar(step / QUESTIONS.length);
      show(questionHTML(step), dir);
    } else {
      setBar(1);
      show(resultHTML(), dir);
    }
  }

  root.addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if (opt) {
      const q = QUESTIONS[step];
      answers[q.key] = opt.dataset.v;
      $$('.opt', root).forEach((o) => o.setAttribute('aria-pressed', String(o === opt)));
      if (!reducedMotion) gsap.fromTo(opt, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .5)' });
      step++;
      setTimeout(() => render(1), reducedMotion ? 0 : 260);
      return;
    }
    if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); render(-1); return; }
    if (e.target.closest('[data-restart]')) { step = 0; Object.keys(answers).forEach((k) => delete answers[k]); render(-1); return; }
    const rec = e.target.closest('.rec');
    if (!rec) return;
    const p = catalog.find((x) => x.id === rec.dataset.id);
    if (!p) return;
    if (e.target.closest('[data-rec-ask]')) sendMessage(productMessage(p, p.cores[0].nome, p.memorias[0]));
    const addBtn = e.target.closest('[data-rec-add]');
    if (addBtn) bag.add({ id: p.id, nome: p.nome, marca: p.marca, visual: p.visual, cor: p.cores[0].nome, hex: p.cores[0].hex, memoria: p.memorias[0] || '' }, addBtn);
  });

  root.innerHTML = questionHTML(0);
  setBar(0);
}
