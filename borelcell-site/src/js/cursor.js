import { gsap } from 'gsap';
import { $, $$, finePointer, reducedMotion } from './utils.js';

export function initCursor() {
  if (!finePointer || reducedMotion) return;
  const root = $('.cursor');
  if (!root) return;
  document.documentElement.classList.add('has-cursor');
  const dot = $('.cursor__dot', root);
  const ring = $('.cursor__ring', root);
  const label = $('.cursor__label', root);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    root.classList.remove('is-hidden');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => root.classList.add('is-hidden'));

  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest('[data-cursor], a, button, input, [role="button"]');
    const text = target && target.closest('[data-cursor]') ? target.closest('[data-cursor]').dataset.cursor : '';
    root.classList.toggle('is-label', !!text);
    root.classList.toggle('is-hover', !!target && !text);
    label.textContent = text || '';
  });
}

export function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}
