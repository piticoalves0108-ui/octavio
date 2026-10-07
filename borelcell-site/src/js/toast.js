import { gsap } from 'gsap';
import { $, icon, escapeHTML } from './utils.js';

let root;

export function toast(message, { action, onAction, iconId = 'i-check', duration = 3400 } = {}) {
  root = root || $('[data-toasts]');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(iconId)}<span>${escapeHTML(message)}</span>${action ? `<button type="button">${escapeHTML(action)}</button>` : ''}`;
  root.appendChild(el);

  if (action && onAction) {
    el.querySelector('button').addEventListener('click', () => { onAction(); dismiss(); });
  }

  gsap.fromTo(el, { y: 30, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  const timer = setTimeout(dismiss, duration);

  function dismiss() {
    clearTimeout(timer);
    gsap.to(el, { y: 16, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => el.remove() });
  }
  while (root.children.length > 3) root.firstElementChild.remove();
}
