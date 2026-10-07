import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, escapeHTML, icon, store, reducedMotion } from './utils.js';
import { cfg, igUrl, channelName, addressText } from './config.js';
import { hoursText } from './contact.js';
import { phoneSVG } from './phoneSvg.js';

/* ---------- Compra segura ---------- */
const CHECKS = [
  { t: 'Confira o IMEI', d: 'Disque *#06# e compare o número com o da caixa e o da nota fiscal. Os três precisam ser iguais.' },
  { t: 'Veja se o aparelho tem bloqueio', d: 'Consulte o IMEI no site Consulta Aparelho Impedido, da ABR Telecom. Ele mostra se há registro de roubo, furto ou perda.' },
  { t: 'Olhe a saúde da bateria', d: 'No iPhone fica em Ajustes > Bateria. No Android, procure por Bateria nas configurações ou no app de diagnóstico da marca.' },
  { t: 'Teste câmeras, som e microfone', d: 'Tire uma foto com cada lente, grave um vídeo curto e faça uma ligação no viva-voz.' },
  { t: 'Biometria e tela', d: 'Teste Face ID ou digital, o toque em toda a tela e o brilho no máximo para achar manchas.' },
  { t: 'Conta do dono anterior removida', d: 'Em seminovos: no iPhone, o Buscar iPhone precisa estar desligado. No Android, a conta Google anterior tem que ter sido removida.' },
  { t: 'Chip, Wi-Fi e carregamento', d: 'Coloque o seu chip, conecte no Wi-Fi e teste o carregador e o cabo.' },
  { t: 'Nota fiscal e garantia', d: 'Peça a nota fiscal e confirme por escrito o prazo de garantia do aparelho.' }
];
const CHECK_KEY = 'borelcell:checklist';

export function initChecklist() {
  const list = $('[data-checklist]');
  if (!list) return;
  const section = list.closest('.safe');
  const ring = $('[data-ring]');
  const doneEl = $('[data-safe-done]');
  const totalEl = $('[data-safe-total]');
  const msg = $('[data-safe-msg]');
  const len = 2 * Math.PI * 52;
  let done = store.get(CHECK_KEY, []);
  if (!Array.isArray(done)) done = [];

  list.innerHTML = CHECKS.map((c, i) => `
    <li>
      <button class="check" type="button" role="checkbox" aria-checked="${done.includes(i)}" data-i="${i}">
        <span class="check__box">${icon('i-check')}</span>
        <span><span class="check__title">${escapeHTML(c.t)}</span><span class="check__text">${escapeHTML(c.d)}</span></span>
      </button>
    </li>`).join('');
  totalEl.textContent = CHECKS.length;

  function update() {
    const n = done.length;
    doneEl.textContent = n;
    ring.style.strokeDashoffset = String(len * (1 - n / CHECKS.length));
    const complete = n === CHECKS.length;
    section.classList.toggle('is-complete', complete);
    section.classList.toggle('has-progress', n > 0);
    msg.textContent = complete ? 'Tudo conferido. Bom proveito!' : 'itens conferidos';
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.check');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    const on = !done.includes(i);
    done = on ? [...done, i] : done.filter((x) => x !== i);
    btn.setAttribute('aria-checked', String(on));
    store.set(CHECK_KEY, done);
    if (on && !reducedMotion) gsap.fromTo(btn.querySelector('.check__box'), { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .45)' });
    update();
    if (on && done.length === CHECKS.length && !reducedMotion) {
      gsap.fromTo('.safe__meter', { scale: 0.92 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, .4)' });
    }
  });
  update();
}

/* ---------- Perguntas frequentes ---------- */
export function initFaq() {
  const root = $('[data-faq]');
  if (!root) return;
  const addr = addressText();
  const hours = hoursText();
  const items = [
    {
      q: 'Como faço para saber o preço e a disponibilidade?',
      a: 'Toque em "Consultar preço" no modelo que você quer. A mensagem vai pronta com modelo, cor e memória, e a Borel Cell confirma o valor e o estoque com você.'
    },
    {
      q: 'Posso pedir orçamento de mais de um celular?',
      a: 'Pode. Toque no + de cada modelo para montar a sua lista e envie tudo de uma vez pelo ícone da sacola, no topo do site.'
    },
    {
      q: 'Quais são as formas de pagamento?',
      a: cfg.pagamento || `As condições mudam conforme o modelo. Pergunte pelo ${channelName} e a equipe passa todas as opções do dia.`
    },
    {
      q: 'Onde fica a loja?',
      a: addr ? `${addr}.${hours.length ? ` Horário: ${hours.join('; ')}.` : ''}` : `Fale com a Borel Cell pelo ${channelName} para combinar a compra e tirar suas dúvidas.`
    },
    {
      q: 'Como saber se um celular é seguro de comprar?',
      a: 'Use o guia Compra segura aqui do site. Ele mostra como conferir IMEI, bloqueio, bateria, câmeras e se a conta do dono anterior foi removida.'
    },
    {
      q: 'O site guarda meus dados?',
      a: 'Não. A sua lista fica salva só no seu navegador, e nada é enviado até você tocar em Enviar.'
    }
  ];

  root.innerHTML = items.map((it, i) => `
    <div class="acc">
      <button class="acc__q" type="button" aria-expanded="false" aria-controls="faq-${i}" id="faq-q-${i}">
        <span>${escapeHTML(it.q)}</span><span class="acc__icon" aria-hidden="true"></span>
      </button>
      <div class="acc__a" id="faq-${i}" role="region" aria-labelledby="faq-q-${i}"><p>${escapeHTML(it.a)}</p></div>
    </div>`).join('');

  root.addEventListener('click', (e) => {
    const q = e.target.closest('.acc__q');
    if (!q) return;
    const acc = q.parentElement;
    const panel = acc.querySelector('.acc__a');
    const open = !acc.classList.contains('is-open');
    $$('.acc.is-open', root).forEach((other) => {
      if (other === acc) return;
      other.classList.remove('is-open');
      other.querySelector('.acc__q').setAttribute('aria-expanded', 'false');
      gsap.to(other.querySelector('.acc__a'), { height: 0, duration: reducedMotion ? 0 : 0.5, ease: 'power3.inOut' });
    });
    acc.classList.toggle('is-open', open);
    q.setAttribute('aria-expanded', String(open));
    gsap.to(panel, {
      height: open ? 'auto' : 0,
      duration: reducedMotion ? 0 : 0.6,
      ease: 'power3.inOut',
      onComplete: () => ScrollTrigger.refresh()
    });
  });
}

/* ---------- Grade do Instagram ---------- */
const ART = [
  { hex: '#d9dadd', style: 'plateau3', view: 'back', r: -10, t1: '#22242a', t2: '#0b0b0e', cap: 'Lançamentos' },
  { hex: '#2d3b58', style: 'float5', view: 'front', r: 8, t1: '#141c30', t2: '#08090f', cap: 'Vitrine' },
  { hex: '#f0682a', style: 'pill2', view: 'back', r: -6, t1: '#2a140b', t2: '#100806', cap: 'Cores' },
  { hex: '#c9cbd0', style: 'square3', view: 'back', r: 10, t1: '#1d1e22', t2: '#0b0b0d', cap: 'Novidades' },
  { hex: '#e3cba8', style: 'bar1', view: 'front', r: -8, t1: '#2a2219', t2: '#0e0b08', cap: 'Bastidores' },
  { hex: '#2e3036', style: 'float3', view: 'back', r: 6, t1: '#202128', t2: '#0a0a0d', cap: 'Chegou' }
];

export function initInstaGrid() {
  const grid = $('[data-insta-grid]');
  if (!grid) return;
  const photos = cfg.instagramFotos.filter((f) => f && f.src);
  if (photos.length) {
    grid.innerHTML = photos.slice(0, 6).map((f) => `
      <a class="tile" href="${escapeHTML(f.link || igUrl)}" target="_blank" rel="noopener" data-cursor="Ver">
        <img src="${escapeHTML(f.src)}" alt="${escapeHTML(f.alt || `Post da ${cfg.nome} no Instagram`)}" loading="lazy" decoding="async">
        <span class="tile__over">${icon('i-instagram')}</span>
      </a>`).join('');
    return;
  }
  grid.innerHTML = ART.map((a) => `
    <a class="tile" href="${igUrl}" target="_blank" rel="noopener" data-cursor="Ver" aria-label="Ver a ${cfg.nome} no Instagram">
      <span class="tile__art" style="--c:${a.hex};--t1:${a.t1};--t2:${a.t2};--r:${a.r}deg">${phoneSVG(a.hex, a.style, { view: a.view, logo: true })}</span>
      <span class="tile__cap">${escapeHTML(a.cap)}</span>
      <span class="tile__over">${icon('i-instagram')}</span>
    </a>`).join('');
}
