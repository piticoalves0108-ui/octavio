import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { $, $$, escapeHTML, icon, normalize, reducedMotion, finePointer } from './utils.js';
import { cfg, catalog } from './config.js';
import { phoneSVG } from './phoneSvg.js';
import { sendMessage, productMessage } from './contact.js';

const state = new Map();

export function productById(id) {
  return catalog.find((p) => p.id === id);
}

export function selection(id) {
  const p = productById(id);
  const s = state.get(id) || { color: 0, mem: 0 };
  return {
    product: p,
    color: p.cores[s.color] || p.cores[0],
    memory: p.memorias[s.mem] || ''
  };
}

function cardHTML(p) {
  const color = p.cores[0];
  return `
    <article class="card" data-id="${p.id}" data-brand="${escapeHTML(p.marca)}" style="--c:${color.hex}">
      <div class="card__visual" data-cycle data-cursor="Cor" role="button" tabindex="0" aria-label="Trocar a cor do ${escapeHTML(p.nome)}">
        ${p.selo ? `<span class="card__badge">${escapeHTML(p.selo)}</span>` : ''}
        <div class="card__phone">${phoneSVG(color.hex, p.visual, { title: `${p.nome} na cor ${color.nome}` })}</div>
        <div class="card__glare"></div>
      </div>
      <div class="card__body">
        <div>
          <span class="card__brand">${escapeHTML(p.marca)}</span>
          <h3 class="card__name">${escapeHTML(p.nome)}</h3>
        </div>
        ${p.pontos.length ? `<ul class="card__points">${p.pontos.slice(0, 3).map((t) => `<li>${escapeHTML(t)}</li>`).join('')}</ul>` : ''}
        <div class="card__row">
          <div class="card__colors" role="group" aria-label="Cores">
            ${p.cores.map((c, i) => `<button class="dot" type="button" style="--c:${c.hex}" aria-label="${escapeHTML(c.nome)}" aria-pressed="${i === 0}" data-color="${i}"></button>`).join('')}
          </div>
          <span class="card__colorname" data-colorname>${escapeHTML(color.nome)}</span>
        </div>
        ${p.memorias.length ? `<div class="card__mem" role="group" aria-label="Armazenamento">${p.memorias.map((m, i) => `<button class="mem" type="button" aria-pressed="${i === 0}" data-mem="${i}">${escapeHTML(m)}</button>`).join('')}</div>` : ''}
        <div class="card__actions">
          <button class="btn btn--accent btn--sm" type="button" data-ask>
            <span class="btn__roll"><span class="btn__label">Consultar preço</span></span>
          </button>
          <button class="icon-btn" type="button" data-add aria-label="Adicionar ${escapeHTML(p.nome)} à lista" data-cursor="Lista">${icon('i-plus')}</button>
        </div>
      </div>
    </article>`;
}

function setColor(card, index) {
  const id = card.dataset.id;
  const p = productById(id);
  const s = state.get(id) || { color: 0, mem: 0 };
  const idx = ((index % p.cores.length) + p.cores.length) % p.cores.length;
  if (idx === s.color && card.dataset.ready) return;
  s.color = idx;
  state.set(id, s);
  const c = p.cores[idx];
  card.style.setProperty('--c', c.hex);
  $$('.dot', card).forEach((d) => d.setAttribute('aria-pressed', String(Number(d.dataset.color) === idx)));
  $('[data-colorname]', card).textContent = c.nome;
  const holder = $('.card__phone', card);
  const swap = () => { holder.innerHTML = phoneSVG(c.hex, p.visual, { title: `${p.nome} na cor ${c.nome}` }); };
  if (reducedMotion) { swap(); return; }
  gsap.timeline()
    .to(holder, { rotateY: 90, scale: 0.9, duration: 0.22, ease: 'power2.in' })
    .add(swap)
    .fromTo(holder, { rotateY: -90 }, { rotateY: 0, scale: 1, duration: 0.6, ease: 'expo.out' });
}

function setMem(card, index) {
  const id = card.dataset.id;
  const s = state.get(id) || { color: 0, mem: 0 };
  s.mem = index;
  state.set(id, s);
  $$('.mem', card).forEach((m) => m.setAttribute('aria-pressed', String(Number(m.dataset.mem) === index)));
}

export function initCatalog({ bag }) {
  const grid = $('[data-catalog]');
  const filters = $('[data-filters]');
  const search = $('[data-search]');
  const count = $('[data-count]');
  const empty = $('[data-empty]');
  if (!grid) return;

  grid.innerHTML = catalog.map(cardHTML).join('');
  catalog.forEach((p) => state.set(p.id, { color: 0, mem: 0 }));

  // Filtros por marca
  const brands = cfg.marcas.filter((m) => catalog.some((p) => p.marca === m));
  const extra = [...new Set(catalog.map((p) => p.marca))].filter((m) => !brands.includes(m));
  const all = [...brands, ...extra];
  filters.innerHTML = [['Todos', catalog.length], ...all.map((m) => [m, catalog.filter((p) => p.marca === m).length])]
    .map(([name, n], i) => `<button class="chip" type="button" role="tab" aria-selected="${i === 0}" data-filter="${i === 0 ? '*' : escapeHTML(name)}">${escapeHTML(name)} <small>${n}</small></button>`)
    .join('');

  let brand = '*';
  let query = '';

  function apply(animate = true) {
    const cards = $$('.card', grid);
    const q = normalize(query.trim());
    const flipState = animate && !reducedMotion ? Flip.getState(cards) : null;
    let visible = 0;
    cards.forEach((card) => {
      const p = productById(card.dataset.id);
      const okBrand = brand === '*' || p.marca === brand;
      const okQuery = !q || normalize(`${p.marca} ${p.nome} ${p.pontos.join(' ')}`).includes(q);
      const show = okBrand && okQuery;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    count.textContent = `${visible} ${visible === 1 ? 'modelo' : 'modelos'}${brand !== '*' ? ` · ${brand}` : ''}`;
    empty.hidden = visible > 0;
    if (flipState) {
      Flip.from(flipState, {
        duration: 0.7,
        ease: 'power3.inOut',
        stagger: 0.02,
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.35 }),
        onComplete: () => ScrollTrigger.refresh()
      });
    } else {
      ScrollTrigger.refresh();
    }
  }

  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    brand = chip.dataset.filter;
    $$('.chip', filters).forEach((c) => c.setAttribute('aria-selected', String(c === chip)));
    apply();
  });

  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { query = search.value; apply(); }, 180);
  });

  // Ações dos cards
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const dot = e.target.closest('.dot');
    const mem = e.target.closest('.mem');
    const id = card.dataset.id;
    if (dot) { setColor(card, Number(dot.dataset.color)); return; }
    if (mem) { setMem(card, Number(mem.dataset.mem)); return; }
    if (e.target.closest('[data-cycle]')) { setColor(card, (state.get(id)?.color || 0) + 1); return; }
    if (e.target.closest('[data-ask]')) {
      const s = selection(id);
      sendMessage(productMessage(s.product, s.color.nome, s.memory));
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const s = selection(id);
      bag.add({ id: s.product.id, nome: s.product.nome, marca: s.product.marca, visual: s.product.visual, cor: s.color.nome, hex: s.color.hex, memoria: s.memory }, add);
    }
  });
  grid.addEventListener('keydown', (e) => {
    const visual = e.target.closest('[data-cycle]');
    if (visual && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const card = visual.closest('.card');
      setColor(card, (state.get(card.dataset.id)?.color || 0) + 1);
    }
  });

  // Inclinação 3D + brilho
  if (finePointer && !reducedMotion) {
    $$('.card', grid).forEach((card) => {
      const visual = $('.card__visual', card);
      const holder = $('.card__phone', card);
      const rx = gsap.quickTo(holder, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(holder, 'rotationY', { duration: 0.6, ease: 'power3' });
      const ty = gsap.quickTo(holder, 'y', { duration: 0.6, ease: 'power3' });
      visual.addEventListener('pointermove', (e) => {
        const r = visual.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        rx((0.5 - y) * 22);
        ry((x - 0.5) * 30);
        ty(-10);
        visual.style.setProperty('--gx', `${x * 100}%`);
        visual.style.setProperty('--gy', `${y * 100}%`);
      });
      visual.addEventListener('pointerleave', () => { rx(0); ry(0); ty(0); });
    });
  }

  apply(false);
  for (const card of $$('.card', grid)) card.dataset.ready = '1';

  if (!reducedMotion) {
    gsap.set('.card', { opacity: 0, y: 70 });
    ScrollTrigger.batch('.card', {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', overwrite: true })
    });
  }
}
