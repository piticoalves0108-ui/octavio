/* ==========================================================================
   Pousada Alto da Chapada — interações do site
   ========================================================================== */

/* ---------- Configuração ---------- */
const CONFIG = {
  // Número do WhatsApp com DDI + DDD, só dígitos
  whatsapp: '5562981867142',
  // ID do Google Analytics 4 (ex.: 'G-XXXXXXXXXX'). Vazio = Analytics desligado.
  gaMeasurementId: '',
};

(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Utilidades ---------- */
  const waUrl = (text) =>
    `https://wa.me/${CONFIG.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

  const pad = (n) => String(n).padStart(2, '0');

  const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const addDays = (iso, days) => {
    const [y, m, d] = iso.split('-').map(Number);
    return toISO(new Date(y, m - 1, d + days));
  };

  const formatBR = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const nightsBetween = (a, b) => {
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  };

  const guestsLabel = (value) => (value === '1' ? '1 hóspede' : `${value} hóspedes`);

  const track = (event, params) => {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
  };

  const openWhatsApp = (text, source) => {
    track('whatsapp_click', { origem: source });
    const url = waUrl(text);
    const win = window.open(url, '_blank');
    if (win) {
      win.opener = null;
    } else {
      window.location.href = url;
    }
  };

  /* ---------- Ano no rodapé ---------- */
  $$('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Links de WhatsApp com mensagem pronta ---------- */
  $$('a[data-wa]').forEach((link) => {
    link.href = waUrl(link.dataset.wa);
    link.addEventListener('click', () => track('whatsapp_click', { origem: link.dataset.waSource || 'link' }));
  });

  /* ---------- Cabeçalho: transparente sobre o hero, sólido no resto ---------- */
  const header = $('.site-header');
  const hero = $('.hero');
  if (header) {
    if (hero && 'IntersectionObserver' in window) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:120px;pointer-events:none';
      hero.prepend(sentinel);
      new IntersectionObserver(([entry]) => {
        header.classList.toggle('is-solid', !entry.isIntersecting);
      }).observe(sentinel);
    } else {
      header.classList.add('is-solid');
    }
  }

  /* ---------- Menu mobile ---------- */
  const navToggle = $('.nav-toggle');
  const nav = $('#menu-principal');
  if (navToggle && nav) {
    const setMenu = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.documentElement.classList.toggle('nav-open', open);
    };
    navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        navToggle.focus();
      }
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Destaque do item do menu conforme a rolagem ---------- */
  const navLinks = $$('.nav__list a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => a.classList.remove('is-active'));
          const link = byId.get(entry.target.id);
          if (link) link.classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    $$('main section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------- Datas: mínimo hoje, check-out sempre depois do check-in ---------- */
  const today = toISO(new Date());

  const linkDates = (checkin, checkout) => {
    if (!checkin || !checkout) return;
    checkin.min = today;
    checkout.min = addDays(today, 1);
    checkin.addEventListener('change', () => {
      if (!checkin.value) return;
      checkout.min = addDays(checkin.value, 1);
      if (!checkout.value || checkout.value <= checkin.value) {
        checkout.value = addDays(checkin.value, 1);
      }
    });
  };

  const validateDates = (checkin, checkout) => {
    if (!checkin.value) return { field: checkin, msg: 'Escolha a data de check-in.' };
    if (checkin.value < today) return { field: checkin, msg: 'O check-in não pode ser uma data que já passou.' };
    if (!checkout.value) return { field: checkout, msg: 'Escolha a data de check-out.' };
    if (checkout.value <= checkin.value) return { field: checkout, msg: 'O check-out precisa ser depois do check-in.' };
    return null;
  };

  const stayText = (checkin, checkout) => {
    const n = nightsBetween(checkin, checkout);
    return `${formatBR(checkin)} a ${formatBR(checkout)} (${n} ${n === 1 ? 'noite' : 'noites'})`;
  };

  /* ---------- Barra de reserva do hero ---------- */
  const booking = $('#booking-form');
  if (booking) {
    const bIn = $('#bk-checkin', booking);
    const bOut = $('#bk-checkout', booking);
    const bGuests = $('#bk-hospedes', booking);
    const bMsg = $('.booking__msg', booking);
    linkDates(bIn, bOut);

    [bIn, bOut].forEach((input) =>
      input.addEventListener('input', () => {
        input.closest('.booking__field').classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        bMsg.textContent = '';
      })
    );

    booking.addEventListener('submit', (e) => {
      e.preventDefault();
      const error = validateDates(bIn, bOut);
      if (error) {
        bMsg.textContent = error.msg;
        error.field.closest('.booking__field').classList.add('is-invalid');
        error.field.setAttribute('aria-invalid', 'true');
        error.field.focus();
        return;
      }

      // Leva as datas para o formulário de contato, caso a pessoa queira detalhar
      const cIn = $('#ct-checkin');
      const cOut = $('#ct-checkout');
      const cGuests = $('#ct-hospedes');
      if (cIn && cOut && cGuests) {
        cIn.value = bIn.value;
        cOut.value = bOut.value;
        cGuests.value = bGuests.value;
      }

      const text = [
        'Olá, Pousada Alto da Chapada! Gostaria de verificar a disponibilidade:',
        '',
        `*Datas:* ${stayText(bIn.value, bOut.value)}`,
        `*Hóspedes:* ${guestsLabel(bGuests.value)}`,
        '',
        'Pode me passar os valores? Obrigado(a)!',
      ].join('\n');
      openWhatsApp(text, 'barra-reserva');
    });
  }

  /* ---------- Formulário de contato ---------- */
  const form = $('#contact-form');
  if (form) {
    const fields = {
      nome: $('#ct-nome', form),
      email: $('#ct-email', form),
      telefone: $('#ct-telefone', form),
      checkin: $('#ct-checkin', form),
      checkout: $('#ct-checkout', form),
      hospedes: $('#ct-hospedes', form),
      mensagem: $('#ct-mensagem', form),
    };
    linkDates(fields.checkin, fields.checkout);

    // Máscara simples de telefone brasileiro: (62) 98186-7142
    fields.telefone.addEventListener('input', () => {
      let d = fields.telefone.value.replace(/\D/g, '');
      if (d.startsWith('55') && d.length > 11) d = d.slice(2);
      d = d.slice(0, 11);
      let out = d;
      if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 6) {
        const split = d.length === 11 ? 7 : 6;
        out = `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
      }
      fields.telefone.value = out;
    });

    const setError = (input, msg) => {
      const wrap = input.closest('.field');
      const slot = document.getElementById(input.getAttribute('aria-describedby'));
      wrap.classList.toggle('is-invalid', Boolean(msg));
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (slot) slot.textContent = msg || '';
    };

    Object.values(fields).forEach((input) => {
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid')) setError(input, '');
      });
    });

    const validate = () => {
      const errors = [];
      const nome = fields.nome.value.trim();
      const email = fields.email.value.trim();
      const tel = fields.telefone.value.replace(/\D/g, '');

      if (nome.length < 2) errors.push([fields.nome, 'Conte pra gente o seu nome.']);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errors.push([fields.email, 'Confira o e-mail: parece que falta algo.']);
      }
      if (tel.length < 10) errors.push([fields.telefone, 'Informe um telefone com DDD.']);
      const dateError = validateDates(fields.checkin, fields.checkout);
      if (dateError) errors.push([dateError.field, dateError.msg]);

      Object.values(fields).forEach((input) => setError(input, ''));
      errors.forEach(([input, msg]) => setError(input, msg));
      return errors;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errors = validate();
      if (errors.length) {
        errors[0][0].focus();
        return;
      }

      const lines = [
        'Olá, Pousada Alto da Chapada! Gostaria de solicitar uma reserva.',
        '',
        `*Nome:* ${fields.nome.value.trim()}`,
        `*Telefone:* ${fields.telefone.value.trim()}`,
      ];
      if (fields.email.value.trim()) lines.push(`*E-mail:* ${fields.email.value.trim()}`);
      lines.push(
        `*Datas:* ${stayText(fields.checkin.value, fields.checkout.value)}`,
        `*Hóspedes:* ${guestsLabel(fields.hospedes.value)}`
      );
      if (fields.mensagem.value.trim()) lines.push('', `*Mensagem:* ${fields.mensagem.value.trim()}`);

      openWhatsApp(lines.join('\n'), 'formulario');
    });
  }

  /* ---------- Galeria com lightbox ---------- */
  const lightbox = $('#lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const img = $('.lightbox__img', lightbox);
    const caption = $('.lightbox__caption', lightbox);
    const counter = $('.lightbox__counter', lightbox);
    const prevBtn = $('.lightbox__prev', lightbox);
    const nextBtn = $('.lightbox__next', lightbox);
    let items = [];
    let index = 0;
    let lastFocus = null;

    const galleryItems = (name) => {
      const seen = new Set();
      return $$(`a[data-gallery="${name}"]`)
        .filter((a) => !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href')))
        .map((a) => ({
          src: a.getAttribute('href'),
          caption: a.dataset.caption || '',
          alt: a.querySelector('img')?.alt || a.dataset.caption || '',
        }));
    };

    const show = (i) => {
      index = (i + items.length) % items.length;
      const item = items[index];
      img.src = item.src;
      img.alt = item.alt;
      caption.textContent = item.caption;
      counter.textContent = `${index + 1} de ${items.length}`;
      const multiple = items.length > 1;
      prevBtn.hidden = !multiple;
      nextBtn.hidden = !multiple;
      // Pré-carrega as vizinhas
      [index + 1, index - 1].forEach((n) => {
        const next = items[(n + items.length) % items.length];
        if (next) new Image().src = next.src;
      });
    };

    const open = (name, startSrc) => {
      items = galleryItems(name);
      if (!items.length) return;
      lastFocus = document.activeElement;
      const start = Math.max(0, items.findIndex((it) => it.src === startSrc));
      show(start);
      lightbox.showModal();
      track('galeria_aberta', { galeria: name });
    };

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-gallery]');
      const button = e.target.closest('[data-open-gallery]');
      if (link) {
        e.preventDefault();
        open(link.dataset.gallery, link.getAttribute('href'));
      } else if (button) {
        open(button.dataset.openGallery);
      }
    });

    prevBtn.addEventListener('click', () => show(index - 1));
    nextBtn.addEventListener('click', () => show(index + 1));
    $('.lightbox__close', lightbox).addEventListener('click', () => lightbox.close());

    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // Clique fora da foto fecha (mas não logo depois de arrastar)
    let swiped = false;
    lightbox.addEventListener('click', (e) => {
      if (swiped) {
        swiped = false;
        return;
      }
      if (e.target === lightbox || e.target.classList.contains('lightbox__stage')) lightbox.close();
    });

    lightbox.addEventListener('close', () => {
      if (lastFocus) lastFocus.focus();
    });

    // Arrastar para os lados no celular
    let startX = null;
    const stage = $('.lightbox__stage', lightbox);
    stage.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
    });
    stage.addEventListener('pointerup', (e) => {
      if (startX === null || items.length < 2) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) {
        swiped = true;
        show(index + (dx < 0 ? 1 : -1));
      }
      startX = null;
    });
  }

  /* ---------- Carrossel de avaliações ---------- */
  $$('[data-carousel]').forEach((carousel) => {
    const trackEl = $('.reviews__track', carousel);
    const slides = $$('.review', trackEl);
    const controls = $('.reviews__controls', carousel);
    if (slides.length < 2 || !controls) return;

    controls.hidden = false;
    const dotsWrap = $('.reviews__dots', controls);
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ir para a avaliação ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.append(dot);
      return dot;
    });

    const current = () => {
      const left = trackEl.scrollLeft;
      const dist = (s) => Math.abs(s.offsetLeft - trackEl.offsetLeft - left);
      let best = 0;
      slides.forEach((s, i) => {
        if (dist(s) < dist(slides[best])) best = i;
      });
      return best;
    };

    const goTo = (i) => {
      const target = slides[(i + slides.length) % slides.length];
      trackEl.scrollTo({ left: target.offsetLeft - trackEl.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    const update = () => {
      const c = current();
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === c)));
    };

    $$('.reviews__btn', controls).forEach((btn) =>
      btn.addEventListener('click', () => goTo(current() + Number(btn.dataset.dir)))
    );
    trackEl.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
    update();
  });

  /* ---------- Revelar seções ao rolar ---------- */
  const reveal = $$('[data-reveal]');
  if (reveal.length && 'IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Hero: paralaxe leve e pausa das animações fora da tela ---------- */
  const heroBg = $('.hero__bg');
  if (hero && heroBg) {
    let heroVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        hero.classList.toggle('is-paused', !heroVisible);
      }).observe(hero);
    }
    if (!reduceMotion) {
      let ticking = false;
      window.addEventListener(
        'scroll',
        () => {
          if (ticking || !heroVisible) return;
          ticking = true;
          window.requestAnimationFrame(() => {
            heroBg.style.transform = `translate3d(0, ${window.scrollY * 0.3}px, 0)`;
            ticking = false;
          });
        },
        { passive: true }
      );
    }
  }

  /* ---------- Google Analytics (só carrega com consentimento) ---------- */
  const GA_ID = CONFIG.gaMeasurementId;
  const CONSENT_KEY = 'pac-consentimento';

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* armazenamento indisponível: segue sem lembrar a escolha */
      }
    },
  };

  const loadAnalytics = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  };

  if (GA_ID) {
    const choice = storage.get(CONSENT_KEY);
    if (choice === 'aceito') {
      loadAnalytics();
    } else if (choice !== 'recusado') {
      const banner = document.createElement('div');
      banner.className = 'consent';
      banner.setAttribute('role', 'region');
      banner.setAttribute('aria-label', 'Aviso de cookies');
      banner.innerHTML = `
        <p>Usamos cookies de estatística para entender como o site é usado e melhorar a sua experiência. Veja a <a href="privacidade.html">Política de Privacidade</a>.</p>
        <div class="consent__actions">
          <button type="button" class="btn btn--gold" data-consent="aceito">Aceitar</button>
          <button type="button" class="btn btn--outline-light" data-consent="recusado">Recusar</button>
        </div>`;
      banner.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-consent]');
        if (!btn) return;
        storage.set(CONSENT_KEY, btn.dataset.consent);
        if (btn.dataset.consent === 'aceito') loadAnalytics();
        banner.remove();
      });
      document.body.append(banner);
    }
  }
})();
