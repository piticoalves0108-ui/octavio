import { gsap } from 'gsap';
import { $, reducedMotion } from './utils.js';

export function runLoader() {
  return new Promise((resolve) => {
    const el = $('.loader');
    if (!el || getComputedStyle(el).display === 'none') { resolve(); return; }
    const num = $('.loader__num', el);
    const bar = $('.loader__bar i', el);
    const counter = { v: 0 };
    const paint = () => {
      num.textContent = Math.round(counter.v);
      bar.style.transform = `scaleX(${counter.v / 100})`;
    };

    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const fontsOrTimeout = Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]);
    const minTime = new Promise((r) => setTimeout(r, reducedMotion ? 0 : 1150));

    if (!reducedMotion) {
      gsap.timeline()
        .to('.loader__path', { strokeDashoffset: 0, duration: 1.1, stagger: 0.25, ease: 'power2.inOut' }, 0)
        .to('.loader__path', { fillOpacity: 1, duration: 0.5, stagger: 0.12, ease: 'power1.out' }, 0.75);
      gsap.to(counter, { v: 88, duration: 1.1, ease: 'power2.out', onUpdate: paint });
    } else {
      gsap.set('.loader__path', { strokeDashoffset: 0, fillOpacity: 1 });
    }

    Promise.all([fontsOrTimeout, minTime]).then(() => {
      gsap.to(counter, {
        v: 100,
        duration: reducedMotion ? 0 : 0.35,
        ease: 'power1.out',
        onUpdate: paint,
        onComplete: () => {
          gsap.to(el, {
            clipPath: 'inset(0 0 100% 0)',
            duration: reducedMotion ? 0 : 1,
            ease: 'expo.inOut',
            onComplete: () => el.remove()
          });
          setTimeout(resolve, reducedMotion ? 0 : 380);
        }
      });
    });
  });
}
