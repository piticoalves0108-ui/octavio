import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { $, $$, reducedMotion, icon } from './utils.js';
import { cfg } from './config.js';

export let lenis = null;

/* ---------- Rolagem suave ---------- */
export function initSmoothScroll() {
  if (reducedMotion) return null;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function lockScroll(lock) {
  if (lenis) (lock ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}

export function scrollToTarget(target, immediate = false) {
  const el = typeof target === 'string' ? (target === '#topo' || target === '#' ? 0 : document.querySelector(target)) : target;
  if (el === null || el === undefined) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: 0, duration: immediate ? 0 : 1.5, immediate, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  } else if (el === 0) {
    window.scrollTo({ top: 0, behavior: immediate || reducedMotion ? 'auto' : 'smooth' });
  } else {
    el.scrollIntoView({ behavior: immediate || reducedMotion ? 'auto' : 'smooth' });
  }
}

export function initAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href.length < 2 && href !== '#') return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(href);
    if (href !== '#topo') history.replaceState(null, '', href);
    else history.replaceState(null, '', window.location.pathname + window.location.search);
  });
}

/* ---------- Cabeçalho, progresso e menu ---------- */
export function initHeader() {
  const header = $('[data-header]');
  const bar = $('.progress i');
  const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : () => {};
  // Posição real da página (o refresh do ScrollTrigger mede com a rolagem zerada por um instante)
  const currentY = () => (lenis ? lenis.scroll : window.scrollY);
  const sync = () => header.classList.toggle('is-scrolled', currentY() > 30);
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = currentY();
      header.classList.toggle('is-scrolled', y > 30);
      const menuOpen = document.documentElement.classList.contains('menu-open');
      if (self.direction === 1 && y > 500 && !menuOpen) header.classList.add('is-hidden');
      else if (self.direction === -1 || y < 500) header.classList.remove('is-hidden');
      setBar(self.progress);
    },
    onRefresh: sync
  });
  ScrollTrigger.addEventListener('refresh', sync);

  // link ativo no menu
  $$('.nav a[href^="#"]').forEach((a) => {
    const section = document.querySelector(a.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => a.classList.toggle('is-active', self.isActive)
    });
  });
}

function closeMenu() {
  const root = document.documentElement;
  if (!root.classList.contains('menu-open')) return;
  root.classList.remove('menu-open');
  const btn = $('[data-menu-toggle]');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Abrir menu');
  $('#menu').setAttribute('aria-hidden', 'true');
  lockScroll(false);
}

export function initMenu() {
  const btn = $('[data-menu-toggle]');
  const menu = $('#menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    if (root.classList.contains('menu-open')) { closeMenu(); return; }
    root.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Fechar menu');
    menu.setAttribute('aria-hidden', 'false');
    $('[data-header]').classList.remove('is-hidden');
    lockScroll(true);
    if (!reducedMotion) {
      gsap.fromTo($$('.menu__nav a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.2 });
      gsap.fromTo($('.menu__foot', menu), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', delay: 0.45 });
    }
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('[data-contact]')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
}

/* ---------- Revelações ---------- */
export function initReveals() {
  if (reducedMotion) return;

  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          rotate: 2,
          duration: 1.15,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
      }
    });
  });

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  $$('.eyebrow').forEach((el) => {
    if (el.closest('.hero, .bag, .menu')) return;
    gsap.from(el, { x: -20, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  $$('.check').forEach((el, i) => {
    gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', delay: (i % 2) * 0.06, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  $$('.acc').forEach((el, i) => {
    gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: i * 0.04, scrollTrigger: { trigger: el, start: 'top 94%', once: true } });
  });

  const tiles = $$('.tile');
  if (tiles.length) {
    ScrollTrigger.batch(tiles, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.from(batch, { y: 60, opacity: 0, scale: 0.94, duration: 1.1, stagger: 0.08, ease: 'expo.out' })
    });
  }

  $$('.ccard').forEach((el, i) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', delay: i * 0.07, scrollTrigger: { trigger: el, start: 'top 94%', once: true } });
  });

  gsap.from(['.footer__borel', '.footer__cell'], {
    y: 40,
    opacity: 0,
    duration: 1.4,
    stagger: 0.1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 92%', once: true }
  });
}

/* ---------- Faixas animadas (reagem à velocidade da rolagem) ---------- */
export function initMarquee() {
  const words = [...cfg.marcas.map((m) => (m === 'Apple' ? 'iPhone' : m)), 'Compra segura', `@${cfg.instagram}`, 'Atendimento direto'];
  const tracks = $$('[data-marquee]');
  if (!tracks.length) return;

  const states = tracks.map((track, i) => {
    const list = i % 2 ? [...words].reverse() : words;
    const unit = list.map((w) => `<span class="band__item">${w}${icon('i-spark')}</span>`).join('');
    track.innerHTML = `<div style="display:flex">${unit.repeat(3)}</div><div style="display:flex" aria-hidden="true">${unit.repeat(3)}</div>`;
    return { track, dir: Number(track.dataset.marquee) || -1, x: 0, half: 0, set: gsap.quickSetter(track, 'x', 'px') };
  });

  const measure = () => states.forEach((s) => { s.half = s.track.scrollWidth / 2; });
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);

  let boost = 0;
  let scrollDir = 1;
  let visible = true;
  ScrollTrigger.create({
    trigger: '.bands',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { visible = self.isActive; },
    onUpdate: (self) => {
      boost = Math.min(Math.abs(self.getVelocity()) / 90, 18);
      scrollDir = self.direction;
    }
  });

  const base = reducedMotion ? 0 : 50;
  gsap.ticker.add((time, delta) => {
    if (!visible || reducedMotion) return;
    const dt = delta / 1000;
    boost *= 0.92;
    states.forEach((s) => {
      s.x += s.dir * scrollDir * (base + boost * 40) * dt;
      if (s.half) {
        if (s.x <= -s.half) s.x += s.half;
        if (s.x > 0) s.x -= s.half;
      }
      s.set(s.x);
    });
  });
}

/* ---------- Como funciona (rolagem horizontal no desktop) ---------- */
export function initHow() {
  const section = $('.how');
  const track = $('.how__track');
  if (!section || !track) return;
  const bar = $('[data-how-bar]');
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${dist() + window.innerHeight * 0.3}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (bar) gsap.set(bar, { scaleX: self.progress }); }
      }
    });
    if (!reducedMotion) {
      $$('.how__panel', track).forEach((panel) => {
        gsap.from(panel.querySelectorAll('.how__icon, h3, p'), {
          y: 40,
          opacity: 0,
          stagger: 0.08,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 88%', toggleActions: 'play none none reverse' }
        });
        gsap.from(panel.querySelector('.how__num'), {
          xPercent: 40,
          ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
      });
    }
  });

  mm.add('(max-width: 900px)', () => {
    if (reducedMotion) return;
    $$('.how__panel', track).forEach((panel) => {
      gsap.from(panel, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: panel, start: 'top 90%', once: true } });
    });
  });
}

/* ---------- Instagram: @ que preenche com a rolagem ---------- */
export function initInstaHandle() {
  const handle = $('.insta__handle');
  if (!handle) return;
  gsap.fromTo(handle, { '--p': '0%', x: 0 }, {
    '--p': '100%',
    x: () => -Math.max(0, handle.scrollWidth - document.documentElement.clientWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.insta', start: 'top bottom', end: 'center 40%', scrub: 1, invalidateOnRefresh: true }
  });
}

/* ---------- Chamada final ---------- */
export function initCta() {
  const title = $('[data-cta-title]');
  if (!title) return;
  SplitText.create(title, {
    type: 'words,chars',
    charsClass: 'char',
    autoSplit: true,
    onSplit(self) {
      if (reducedMotion) return undefined;
      return gsap.from(self.chars, {
        yPercent: 100,
        rotate: 12,
        opacity: 0,
        duration: 1.1,
        stagger: 0.025,
        ease: 'expo.out',
        scrollTrigger: { trigger: title, start: 'top 85%', once: true }
      });
    }
  });
  if (!reducedMotion) {
    gsap.from('.cta__circle', { scale: 0.6, rotate: -40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.cta__row', start: 'top 85%', once: true } });
  }
}
