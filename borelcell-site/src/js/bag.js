import { gsap } from 'gsap';
import { $, $$, escapeHTML, icon, store, reducedMotion } from './utils.js';
import { hasWhatsApp, channelName } from './config.js';
import { phoneSVG } from './phoneSvg.js';
import { sendMessage } from './contact.js';
import { toast } from './toast.js';
import { lockScroll } from './motion.js';

const KEY = 'borelcell:lista';

export function initBag() {
  const drawer = $('.bag');
  const overlay = $('[data-bag-overlay]');
  const list = $('[data-bag-items]');
  const emptyEl = $('[data-bag-empty]');
  const foot = $('[data-bag-foot]');
  const nameInput = $('[data-bag-name]');
  const noteInput = $('[data-bag-note]');
  const hint = $('[data-bag-hint]');
  const counters = $$('[data-bag-count]');
  let items = store.get(KEY, []);
  if (!Array.isArray(items)) items = [];
  let lastFocus = null;

  hint.textContent = hasWhatsApp
    ? 'Abre o WhatsApp com a lista pronta para enviar.'
    : 'Abre o Direct do Instagram e copia a lista para você colar.';

  function save() { store.set(KEY, items); }

  function render() {
    list.innerHTML = items.map((it, i) => `
      <li class="bag-item" style="--c:${it.hex}">
        <div class="bag-item__visual">${phoneSVG(it.hex, it.visual)}</div>
        <div>
          <div class="bag-item__name">${escapeHTML(it.nome)}</div>
          <div class="bag-item__meta">${escapeHTML([it.cor, it.memoria].filter(Boolean).join(' · '))}</div>
        </div>
        <button class="icon-btn" type="button" data-remove="${i}" aria-label="Remover ${escapeHTML(it.nome)} da lista">${icon('i-close')}</button>
      </li>`).join('');
    const has = items.length > 0;
    emptyEl.hidden = has;
    foot.hidden = !has;
    counters.forEach((c) => {
      c.textContent = items.length;
      c.closest('.bag-btn')?.classList.toggle('has-items', has);
    });
  }

  function bump() {
    if (reducedMotion) return;
    counters.forEach((c) => gsap.fromTo(c, { scale: 1.6 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, .4)', clearProps: 'scale' }));
    const btn = $('.bag-btn');
    if (btn) gsap.fromTo(btn, { rotate: -12 }, { rotate: 0, duration: 0.8, ease: 'elastic.out(1, .35)' });
  }

  function flyFrom(source) {
    if (reducedMotion || !source) return;
    const target = $('.bag-btn');
    if (!target) return;
    const a = source.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dotEl = document.createElement('div');
    dotEl.style.cssText = `position:fixed;z-index:160;left:${a.left + a.width / 2 - 9}px;top:${a.top + a.height / 2 - 9}px;width:18px;height:18px;border-radius:50%;background:var(--accent);pointer-events:none;box-shadow:0 0 24px rgba(200,255,46,.8)`;
    document.body.appendChild(dotEl);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    gsap.timeline({ onComplete: () => { dotEl.remove(); bump(); } })
      .to(dotEl, { x: dx, duration: 0.75, ease: 'power2.in' }, 0)
      .to(dotEl, { y: dy, duration: 0.75, ease: 'back.in(1.6)' }, 0)
      .to(dotEl, { scale: 0.4, duration: 0.75, ease: 'power2.in' }, 0);
  }

  function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => $('[data-bag-close]', drawer)?.focus(), 350);
    if (!reducedMotion) gsap.fromTo($$('.bag-item', list), { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out', delay: 0.25 });
  }

  function close() {
    if (!drawer.classList.contains('is-open')) return;
    overlay.classList.remove('is-visible');
    setTimeout(() => { overlay.hidden = true; }, 500);
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function add(item, source) {
    const exists = items.some((it) => it.id === item.id && it.cor === item.cor && it.memoria === item.memoria);
    if (exists) {
      toast(`${item.nome} já está na sua lista.`, { action: 'Ver lista', onAction: open, iconId: 'i-bag' });
      return;
    }
    items.push(item);
    save();
    render();
    flyFrom(source);
    if (source) source.classList.add('is-added');
    toast(`${item.nome} entrou na sua lista.`, { action: 'Ver lista', onAction: open, iconId: 'i-bag' });
  }

  function message() {
    const lines = items.map((it, i) => `${i + 1}. ${it.nome}${it.cor ? ` · ${it.cor}` : ''}${it.memoria ? ` · ${it.memoria}` : ''}`);
    const name = nameInput.value.trim();
    const note = noteInput.value.trim();
    return [
      'Olá, Borel Cell! Vim pelo site e montei esta lista:',
      ...lines,
      name ? `Meu nome: ${name}` : '',
      note ? `Observação: ${note}` : '',
      'Pode me passar preço e disponibilidade?'
    ].filter(Boolean).join('\n');
  }

  list.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    const idx = Number(rm.dataset.remove);
    const li = rm.closest('.bag-item');
    const removeNow = () => { items.splice(idx, 1); save(); render(); };
    if (reducedMotion) removeNow();
    else gsap.to(li, { x: 60, opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, duration: 0.45, ease: 'power3.in', onComplete: removeNow });
  });

  $('[data-bag-send]').addEventListener('click', () => {
    if (!items.length) return;
    sendMessage(message());
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-bag-open]')) { e.preventDefault(); open(); }
    else if (e.target.closest('[data-bag-close]')) close();
  });
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab' && drawer.classList.contains('is-open')) {
      const focusables = $$('button, a[href], input', drawer).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  render();
  return { add, open, close, get items() { return items; }, channelName };
}
