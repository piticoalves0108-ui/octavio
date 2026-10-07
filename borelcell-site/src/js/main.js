/*
 * Borel Cell: ponto de entrada do site.
 * Gera assets/js/app.js com `npm run build`.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { $ } from './utils.js';
import { initContact } from './contact.js';
import { initBag } from './bag.js';
import { initCatalog } from './catalog.js';
import { initQuiz } from './quiz.js';
import { initChecklist, initFaq, initInstaGrid } from './sections.js';
import { initCursor, initMagnetic } from './cursor.js';
import { initSmoothScroll, initAnchors, initHeader, initMenu, initReveals, initMarquee, initHow, initInstaHandle, initCta, scrollToTarget } from './motion.js';
import { initStage } from './stage.js';
import { runLoader } from './loader.js';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
window.__borelBoot = true;

// Pasta deste script, para carregar o 3D sob demanda
const scriptBase = document.currentScript && document.currentScript.src ? document.currentScript.src : '';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

async function boot() {
  initContact();
  const bag = initBag();
  initCatalog({ bag });
  initQuiz({ bag });
  initChecklist();
  initFaq();
  initInstaGrid();
  initCursor();
  initSmoothScroll();
  initAnchors();
  initHeader();
  initMenu();

  const hash = window.location.hash;
  if (!hash) window.scrollTo(0, 0);

  await runLoader();

  initStage(scriptBase);
  initReveals();
  initMarquee();
  initHow();
  initInstaHandle();
  initCta();
  initMagnetic();

  const fab = $('.fab');
  if (fab) {
    ScrollTrigger.create({
      trigger: '.catalog',
      start: 'top 75%',
      end: 'max',
      onToggle: (self) => fab.classList.toggle('is-visible', self.isActive)
    });
  }

  document.documentElement.classList.add('is-ready');
  ScrollTrigger.refresh();
  if (hash && hash.length > 1) requestAnimationFrame(() => scrollToTarget(hash, true));

  // Recalcula depois que imagens e fontes terminam de carregar
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
