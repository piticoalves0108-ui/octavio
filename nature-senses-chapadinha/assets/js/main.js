/* =========================================================================
   Nature Senses Chapadinha: interações e motion
   Princípios: calmo, discreto, só transform/opacity, IntersectionObserver
   para revelar, rAF para parallax, tudo desligado em prefers-reduced-motion.
   ========================================================================= */
(function () {
  'use strict';

  // ---------- Configuração (edite aqui) ----------
  var CONFIG = {
    instagram: 'naturesenseschapadinha',
    // WhatsApp da pousada com DDI e DDD, só números. Ex.: '5562999999999'.
    // Vazio = botão fixo e formulário usam o Direct do Instagram.
    whatsapp: '',
    booking: 'https://www.booking.com/searchresults.pt-br.html?ss=Nature%20Senses%20Chapadinha',
    airbnb: 'https://www.airbnb.com.br/s/Cavalcante--GO/homes?query=Nature%20Senses%20Chapadinha',
    heroInterval: 7000 // tempo de cada foto do topo (ms)
  };

  var root = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMQ = window.matchMedia('(max-width: 767px)');
  var motion = root.classList.contains('js-motion');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var vh = window.innerHeight;

  // ---------- Links ----------
  var waUrl = CONFIG.whatsapp ? 'https://wa.me/' + CONFIG.whatsapp.replace(/\D/g, '') : '';
  var dmUrl = 'https://ig.me/m/' + CONFIG.instagram;
  $$('.js-instagram').forEach(function (a) { a.href = 'https://www.instagram.com/' + CONFIG.instagram + '/'; });
  $$('.js-booking').forEach(function (a) { a.href = CONFIG.booking; });
  $$('.js-airbnb').forEach(function (a) { a.href = CONFIG.airbnb; });
  $$('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var fab = $('.js-contact');
  if (waUrl) {
    fab.href = waUrl; fab.classList.add('is-wa');
    fab.setAttribute('aria-label', 'Falar com a pousada pelo WhatsApp');
  } else {
    fab.href = dmUrl;
  }

  // ---------- Imagens: fade-in quando carregam (blur-up) ----------
  $$('.media img, .hero__slide img, .banner__bg img').forEach(function (img) {
    var done = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });

  // ---------- Revelação ao rolar (uma vez só) ----------
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', Math.min(i, 6)); });
  });
  if (motion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target); // não repete ao rolar para cima e para baixo
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  // ---------- Topo: fundo e altura ao rolar ----------
  var topbar = $('.topbar'), hero = $('.hero');
  function updateHeader(y) {
    topbar.classList.toggle('is-scrolled', y > 24);
    hero.classList.toggle('is-scrolled', y > 60);
    fab.classList.toggle('is-visible', y > vh * 0.6);
  }

  // ---------- Parallax só em imagens de fundo ----------
  // 8% no computador, 4% no celular, desligado em movimento reduzido.
  var layers = $$('[data-parallax-bg]').map(function (el) { return { el: el, f: parseFloat(el.dataset.parallaxBg) || 0.08, on: false }; });
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { layers.forEach(function (l) { if (l.el.parentElement === e.target) l.on = e.isIntersecting; }); });
    }, { rootMargin: '10% 0px' });
    layers.forEach(function (l) { pio.observe(l.el.parentElement); });
  }
  function updateParallax() {
    if (!motion || reduceMQ.matches) return;
    var k = mobileMQ.matches ? 0.5 : 1;
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i]; if (!l.on) continue;
      var r = l.el.parentElement.getBoundingClientRect();
      // deslocamento proporcional à distância do centro da tela
      var y = (r.top + r.height / 2 - vh / 2) * -l.f * k;
      l.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }
  }

  var ticking = false, lastY = -1;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      updateHeader(y);
      updateParallax();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; lastY = -1; onScroll(); });
  updateHeader(window.scrollY); updateParallax();

  // ---------- Hero: crossfade lento entre fotos ----------
  var slides = $$('.hero__slide'), dots = $$('.hero__dot'), pauseBtn = $('.hero__pause');
  var cur = 0, timer = null, userPaused = false, heroVisible = true;
  var autoplay = motion && slides.length > 1;
  if (!autoplay) hero.classList.add('no-autoplay');
  function show(n) {
    n = (n + slides.length) % slides.length;
    if (n === cur) return;
    var next = slides[n], img = $('img', next);
    if (img.loading === 'lazy') img.loading = 'eager';
    slides[cur].classList.remove('is-active'); slides[cur].setAttribute('aria-hidden', 'true');
    next.classList.add('is-active'); next.removeAttribute('aria-hidden');
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === n); if (i === n) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    cur = n;
  }
  function stop() { clearInterval(timer); timer = null; }
  function play() { stop(); if (autoplay && !userPaused && heroVisible && !document.hidden) timer = setInterval(function () { show(cur + 1); }, CONFIG.heroInterval); }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); play(); }); });
  pauseBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Retomar troca de fotos' : 'Pausar troca de fotos');
    play();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; play(); }, { threshold: 0.25 }).observe(hero);
  }
  document.addEventListener('visibilitychange', play);
  // pré-carrega as próximas fotos depois da primeira
  window.addEventListener('load', function () { slides.forEach(function (s) { var i = $('img', s); if (i.loading === 'lazy') i.loading = 'eager'; }); });
  play();

  // ---------- Menu mobile ----------
  var burger = $('.burger'), menu = $('#menu'), menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    topbar.classList.toggle('is-menu', open);
    document.body.classList.toggle('no-scroll', open);
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
  window.matchMedia('(min-width: 1061px)').addEventListener('change', function (e) { if (e.matches && menuOpen) setMenu(false); });

  // ---------- Seção atual no menu ----------
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) sio.observe(s); });
  }

  // ---------- Dúvidas (accordion) ----------
  $$('.faq__item').forEach(function (item) {
    var btn = $('button', item), panel = $('.faq__panel', item);
    panel.setAttribute('inert', '');
    btn.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
    });
  });

  // ---------- Foto ampliada (lightbox) ----------
  var lb = $('#lightbox'), lbImg = $('.lightbox__img', lb), lbLabel = $('.lightbox__label', lb), lbCount = $('.lightbox__count', lb);
  var lbClose = $('.lightbox__close', lb), lbNav = $$('.lightbox__nav', lb);
  var tiles = $$('.gallery .tile'), lbIndex = 0, lbFrom = null, lbToken = 0;
  function lbLoad(i, swap) {
    lbIndex = (i + tiles.length) % tiles.length;
    var t = tiles[lbIndex], thumb = $('img', t), token = ++lbToken;
    lbLabel.textContent = $('.tile__label', t).textContent;
    lbCount.textContent = (lbIndex + 1) + ' / ' + tiles.length;
    var apply = function () {
      if (token !== lbToken) return;
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        if (token !== lbToken) return;
        lbImg.src = t.dataset.full; lbImg.alt = thumb.alt;
        lbImg.classList.remove('is-swapping'); // crossfade de volta
      };
      pre.src = t.dataset.full;
    };
    if (swap && motion) { lbImg.classList.add('is-swapping'); setTimeout(apply, 150); } else apply();
  }
  function lbOpen(i, from) {
    lbFrom = from;
    lbImg.removeAttribute('src');
    lbLoad(i, false);
    lb.removeAttribute('inert'); lb.setAttribute('aria-hidden', 'false');
    lb.classList.add('is-open');
    document.body.classList.add('no-scroll');
    lbClose.focus({ preventScroll: true });
  }
  function lbHide() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true'); lb.setAttribute('inert', '');
    document.body.classList.remove('no-scroll');
    if (lbFrom) lbFrom.focus({ preventScroll: true });
  }
  tiles.forEach(function (t, i) { t.addEventListener('click', function () { lbOpen(i, t); }); });
  lbClose.addEventListener('click', lbHide);
  lbNav.forEach(function (b) { b.addEventListener('click', function () { lbLoad(lbIndex + (+b.dataset.dir), true); }); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__fig')) lbHide(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') lbHide();
    else if (e.key === 'ArrowRight') lbLoad(lbIndex + 1, true);
    else if (e.key === 'ArrowLeft') lbLoad(lbIndex - 1, true);
    else if (e.key === 'Tab') { // foco preso dentro da foto ampliada
      var f = [lbClose].concat(lbNav), k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  var lbX = null;
  lb.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') lbX = e.clientX; });
  lb.addEventListener('pointerup', function (e) {
    if (lbX === null) return;
    var dx = e.clientX - lbX; lbX = null;
    if (Math.abs(dx) > 50) lbLoad(lbIndex + (dx < 0 ? 1 : -1), true);
  });

  // ---------- Formulário de reserva ----------
  var form = $('#form-reserva');
  var fNome = $('#f-nome'), fIn = $('#f-in'), fOut = $('#f-out'), fH = $('#f-hosp'), fMsg = $('#f-msg');
  var fErr = $('#form-erro'), fRes = $('#form-resultado'), fPrev = $('#form-preview'), fSend = $('#form-enviar');
  var fCopy = $('#form-copiar'), fStatus = $('#form-status'), fSubmit = $('#form-submit');
  function isoDate(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseDate(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function longDate(v) { return parseDate(v).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); }
  var today = new Date(); today.setHours(12, 0, 0, 0);
  var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  fIn.min = isoDate(today); fOut.min = isoDate(tomorrow);
  fIn.addEventListener('change', function () {
    if (!fIn.value) return;
    var d = parseDate(fIn.value); d.setDate(d.getDate() + 1);
    fOut.min = isoDate(d);
    if (!fOut.value || fOut.value <= fIn.value) fOut.value = isoDate(d);
  });
  function showMsg(el, on) { el.classList.toggle('is-visible', on); }
  function setLoading(btn, on) { btn.classList.toggle('is-loading', on); btn.setAttribute('aria-busy', String(on)); }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }
  function selectPreview() {
    var range = document.createRange(); range.selectNodeContents(fPrev);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  var lastMsg = '';
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    [fNome, fIn, fOut].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    var err = '', bad = null;
    if (!fNome.value.trim()) { err = 'Escreva seu nome para a pousada saber quem está pedindo.'; bad = fNome; }
    else if (!fIn.value || !fOut.value) { err = 'Escolha as datas de check-in e check-out.'; bad = !fIn.value ? fIn : fOut; }
    else if (fOut.value <= fIn.value) { err = 'O check-out precisa ser depois do check-in.'; bad = fOut; }
    if (bad) {
      fErr.textContent = err; showMsg(fErr, true); showMsg(fRes, false);
      bad.setAttribute('aria-invalid', 'true'); bad.focus();
      return;
    }
    showMsg(fErr, false);
    var nights = Math.round((parseDate(fOut.value) - parseDate(fIn.value)) / 86400000);
    var hosp = clamp(parseInt(fH.value, 10) || 1, 1, 12);
    lastMsg = 'Olá! Quero consultar disponibilidade no Nature Senses Chapadinha.\n\n' +
      'Nome: ' + fNome.value.trim() + '\n' +
      'Check-in: ' + longDate(fIn.value) + '\n' +
      'Check-out: ' + longDate(fOut.value) + ' (' + nights + (nights === 1 ? ' noite' : ' noites') + ')\n' +
      'Hóspedes: ' + hosp + (fMsg.value.trim() ? '\n\n' + fMsg.value.trim() : '');
    fPrev.textContent = lastMsg;
    if (waUrl) { fSend.href = waUrl + '?text=' + encodeURIComponent(lastMsg); $('.btn__label', fSend).textContent = 'Enviar pelo WhatsApp'; }
    else { fSend.href = dmUrl; $('.btn__label', fSend).textContent = 'Abrir Direct do Instagram'; }
    fStatus.textContent = '';
    setLoading(fSubmit, true); // estado de carregamento enquanto copia
    copy(lastMsg).then(function (ok) {
      setLoading(fSubmit, false);
      showMsg(fRes, true);
      fStatus.textContent = ok
        ? (waUrl ? 'Mensagem copiada e pronta no WhatsApp.' : 'Mensagem copiada. Abra o Direct do Instagram e cole para enviar.')
        : 'Selecione o texto acima e copie para enviar.';
      if (!ok) selectPreview();
    });
  });
  fCopy.addEventListener('click', function () {
    setLoading(fCopy, true);
    copy(lastMsg).then(function (ok) {
      setLoading(fCopy, false);
      fStatus.textContent = ok ? 'Mensagem copiada.' : 'Não deu para copiar automaticamente. O texto ficou selecionado: copie manualmente.';
      if (!ok) selectPreview();
    });
  });

  // ---------- Transição entre páginas (fade de 250ms) ----------
  var page = $('.page');
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (!motion) return;
    e.preventDefault();
    page.classList.add('is-leaving');
    setTimeout(function () { location.href = url.href; }, 250);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) page.classList.remove('is-leaving'); });
})();
