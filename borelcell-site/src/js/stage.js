import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, reducedMotion, finePointer } from './utils.js';
import { cfg } from './config.js';
import { phoneSVG } from './phoneSvg.js';

const TAU = Math.PI * 2;

const POSES = {
  desktop: {
    hero: { px: 0.235, py: 0.035, s: 0.58, rx: 0.12, ry: -0.46, rz: 0.06 },
    camera: { px: 0.21, py: -0.08, s: 0.86, rx: 0.2, ry: Math.PI + 0.42, rz: -0.1 },
    display: { px: -0.21, py: 0, s: 0.74, rx: 0.04, ry: TAU - 0.34, rz: 0.05 },
    perf: { px: 0.22, py: 0.01, s: 0.7, rx: -0.34, ry: TAU + 0.52, rz: 0.2 },
    battery: { px: -0.21, py: 0, s: 0.72, rx: 0.08, ry: TAU - 0.22, rz: -0.05 }
  },
  mobile: {
    hero: { px: 0, py: -0.04, s: 0.39, rx: 0.1, ry: -0.36, rz: 0.05 },
    camera: { px: 0.02, py: 0.21, s: 0.5, rx: 0.16, ry: Math.PI + 0.36, rz: -0.08 },
    display: { px: 0, py: 0.215, s: 0.43, rx: 0.04, ry: TAU - 0.3, rz: 0.04 },
    perf: { px: 0, py: 0.215, s: 0.42, rx: -0.3, ry: TAU + 0.45, rz: 0.16 },
    battery: { px: 0, py: 0.215, s: 0.43, rx: 0.06, ry: TAU - 0.2, rz: -0.04 }
  }
};
const INTRO = { py: -0.75, ry: -2.6, rx: 0.5, s: 0.5 };
const SCREENS = { camera: 'camera', display: 'display', perf: 'perf', battery: 'battery' };

function loadScript(src) {
  // Versão em arquivo único: o código do 3D vem embutido na própria página
  const inline = document.getElementById('phone3d-src');
  if (inline) {
    return new Promise((resolve, reject) => {
      try {
        const s = document.createElement('script');
        s.text = inline.textContent;
        document.head.appendChild(s);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function initStage(scriptBase) {
  const canvas = $('[data-phone-canvas]');
  const fallback = $('[data-phone-fallback]');
  const colors = cfg.coresDestaque;
  let current = colors[0].hex;
  let phone = null;

  document.documentElement.style.setProperty('--phone-glow', current);

  // Cores
  const list = $('[data-swatches]');
  if (list) {
    list.innerHTML = colors.map((c, i) => `<button class="swatch" type="button" role="radio" aria-checked="${i === 0}" aria-label="${c.nome}" style="--c:${c.hex}" data-hex="${c.hex}"></button>`).join('');
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch');
      if (!btn) return;
      $$('.swatch', list).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      current = btn.dataset.hex;
      document.documentElement.style.setProperty('--phone-glow', current);
      if (phone) phone.setColor(current);
      else if (fallback) fallback.innerHTML = phoneSVG(current, 'plateau3', { logo: true });
      if (!reducedMotion) gsap.fromTo(btn, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .45)' });
    });
  }

  // Intro do texto do topo
  heroIntro();

  const useFallback = () => {
    document.documentElement.classList.add('no-webgl');
    if (fallback) fallback.innerHTML = phoneSVG(current, 'plateau3', { logo: true });
  };

  if (!canvas) return;
  const src = new URL('phone3d.js', scriptBase || window.location.href.replace(/[^/]*$/, 'assets/js/')).href;
  loadScript(src)
    .then(() => {
      phone = window.BorelPhone3D && window.BorelPhone3D.create(canvas, { color: current, reducedMotion });
      if (!phone) { useFallback(); return; }
      setupPhone(phone, canvas);
    })
    .catch(useFallback);
}

function heroIntro() {
  const title = $('[data-hero-title]');
  const fades = $$('[data-hero-fade]');
  $$('.hero__line', title).forEach((line) => {
    line.innerHTML = `<span class="hero__line-in">${line.innerHTML}</span>`;
  });
  gsap.set([title, ...fades], { visibility: 'visible' });
  if (reducedMotion) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__line-in', { yPercent: 118, rotate: 5, duration: 1.4, stagger: 0.11 })
    .from(fades, { y: 34, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.35)
    .from('.bands .band', { yPercent: 160, duration: 1.4, stagger: 0.1 }, 0.4)
    .from('.hero__scroll', { opacity: 0, y: -10, duration: 0.8 }, 1);
}

function setupPhone(phone, canvas) {
  const pose = { ...POSES.desktop.hero };
  const apply = () => phone.setPose(pose);

  // Liga e desliga o render quando o palco sai da tela
  const stage = $('.stage');
  let inView = true;
  const updateActive = () => phone.setActive(inView && !document.hidden);
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; updateActive(); }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', updateActive);

  let introPlayed = false;
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
    const P = ctx.conditions.desktop ? POSES.desktop : POSES.mobile;
    const startedAtTop = window.scrollY < 40;
    Object.assign(pose, P.hero);

    if (startedAtTop && !reducedMotion && !introPlayed) {
      introPlayed = true;
      Object.assign(pose, P.hero, INTRO);
      apply();
      gsap.to(pose, { ...P.hero, duration: 2.2, ease: 'expo.out', delay: 0.15, onUpdate: apply });
    } else {
      apply();
    }

    if (ctx.conditions.desktop) {
      let prev = P.hero;
      $$('.step').forEach((step, i) => {
        const key = step.dataset.step;
        const to = P[key];
        if (!to) return;
        gsap.fromTo(pose, { ...prev }, {
          ...to,
          ease: 'power2.inOut',
          immediateRender: false,
          onUpdate: apply,
          scrollTrigger: { trigger: step, start: 'top 80%', end: 'top 20%', scrub: 1.1 }
        });
        ScrollTrigger.create({
          trigger: step,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => {
            if (self.isActive) {
              phone.setScreen(SCREENS[key] || 'home');
              $$('[data-rail] li').forEach((li, j) => li.classList.toggle('is-current', j === i));
            }
          },
          onLeaveBack: () => { if (i === 0) phone.setScreen('home'); }
        });
        if (!reducedMotion) {
          const card = $('.step__card', step);
          gsap.from(card.children, {
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.08,
            ease: 'expo.out',
            scrollTrigger: { trigger: card, start: 'top 78%', toggleActions: 'play none none reverse' }
          });
        }
        prev = to;
      });
      return;
    }

    // Celular: a cena fica presa, o 3D gira no alto e os cartões trocam embaixo
    const wrap = $('.showcase__steps');
    const steps = $$('.step', wrap);
    const keys = steps.map((s) => s.dataset.step).filter((k) => P[k]);
    const cards = steps.map((s) => $('.step__card', s));
    if (!keys.length) return;

    gsap.fromTo(pose, { ...P.hero }, {
      ...P[keys[0]],
      ease: 'power2.inOut',
      immediateRender: false,
      onUpdate: apply,
      scrollTrigger: { trigger: wrap, start: 'top 85%', end: 'top top', scrub: 1 }
    });
    gsap.set(cards.slice(1), { autoAlpha: 0, y: 40 });
    gsap.fromTo(cards[0], { autoAlpha: 0, y: 60 }, {
      autoAlpha: 1,
      y: 0,
      ease: 'power2.out',
      scrollTrigger: { trigger: wrap, start: 'top 75%', end: 'top 15%', scrub: 1 }
    });
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top 60%',
      onEnter: () => phone.setScreen(SCREENS[keys[0]]),
      onLeaveBack: () => phone.setScreen('home')
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: () => `+=${window.innerHeight * (keys.length - 1) * 1.15}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.min(keys.length - 1, Math.round(self.progress * (keys.length - 1)));
          phone.setScreen(SCREENS[keys[i]] || 'home');
        }
      }
    });
    for (let i = 1; i < keys.length; i++) {
      const at = i - 1;
      tl.to(cards[i - 1], { autoAlpha: 0, y: -40, duration: 0.35, ease: 'power2.in' }, at + 0.3)
        .fromTo(pose, { ...P[keys[i - 1]] }, { ...P[keys[i]], duration: 0.8, ease: 'power2.inOut', immediateRender: false, onUpdate: apply }, at + 0.2)
        .fromTo(cards[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at + 0.62);
    }
    tl.to({}, { duration: 0.3 });
  });

  // Barra lateral de progresso dos destaques
  const rail = $('[data-rail]');
  const fill = $('[data-rail-fill]');
  if (rail && fill) {
    ScrollTrigger.create({
      trigger: '.showcase__steps',
      start: 'top 55%',
      end: 'bottom 45%',
      toggleClass: { targets: rail, className: 'is-active' },
      onUpdate: (self) => gsap.set(fill, { scaleY: self.progress })
    });
  }

  // Inclinação pelo mouse + luz que segue o cursor
  const spot = $('.stage__bg');
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      phone.setPointer(nx, ny);
      if (spot) {
        spot.style.setProperty('--mx', `${e.clientX}px`);
        spot.style.setProperty('--my', `${e.clientY}px`);
      }
    }, { passive: true });
  } else if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      phone.setPointer(clamp(e.gamma / 35), clamp((e.beta - 50) / 40));
    }, { passive: true });
  }

  // Arrastar para girar
  const drag = $('[data-phone-drag]');
  const hint = $('[data-drag-hint]');
  if (drag) {
    let down = false;
    let lastX = 0;
    let hinted = false;
    drag.addEventListener('pointerdown', (e) => {
      down = true;
      lastX = e.clientX;
      phone.setDragging(true);
      drag.setPointerCapture(e.pointerId);
    });
    drag.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      phone.addSpin(dx * 0.012);
      if (!hinted && Math.abs(dx) > 2 && hint) {
        hinted = true;
        gsap.to(hint, { opacity: 0, y: 10, duration: 0.5 });
      }
    });
    const up = () => { down = false; phone.setDragging(false); };
    drag.addEventListener('pointerup', up);
    drag.addEventListener('pointercancel', up);
    drag.addEventListener('lostpointercapture', up);
  }

  canvas.classList.add('is-ready');
  updateActive();
  ScrollTrigger.refresh();
}
