/* =========================================================================
   Nature Senses Chapadinha: interações e movimento
   ========================================================================= */
(function () {
  'use strict';

  // ---------- Configuração (edite aqui) ----------
  var CONFIG = {
    instagram: 'naturesenseschapadinha',
    // WhatsApp da pousada com DDI e DDD, só números. Ex.: '5562999999999'.
    // Vazio = o formulário de reserva envia pelo Direct do Instagram.
    whatsapp: '',
    booking: 'https://www.booking.com/searchresults.pt-br.html?ss=Nature%20Senses%20Chapadinha',
    airbnb: 'https://www.airbnb.com.br/s/Cavalcante--GO/homes?query=Nature%20Senses%20Chapadinha',
    autoplay: 7000 // tempo de cada banner (ms)
  };

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = root.classList.contains('has-motion');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var vh = window.innerHeight, vw = window.innerWidth;

  // ---------- Links ----------
  $$('.js-instagram').forEach(function (a) { a.href = 'https://www.instagram.com/' + CONFIG.instagram + '/'; });
  $$('.js-booking').forEach(function (a) { a.href = CONFIG.booking; });
  $$('.js-airbnb').forEach(function (a) { a.href = CONFIG.airbnb; });
  $$('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- Texto dividido em palavras ----------
  function splitWords(el, cls, nested) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span');
            outer.className = cls;
            if (nested) {
              var inner = document.createElement('span');
              inner.className = cls + '__i';
              inner.style.setProperty('--i', i);
              inner.textContent = part;
              outer.appendChild(inner);
            } else {
              outer.textContent = part;
            }
            i++;
            frag.appendChild(outer);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);
    return i;
  }
  if (motion) {
    $$('[data-split]').forEach(function (el) { splitWords(el, 'w', true); });
  }
  var scrubs = [];
  if (motion) {
    $$('[data-scrub]').forEach(function (el) {
      splitWords(el, 'sw', false);
      scrubs.push({ el: el, words: $$('.sw', el), on: 0 });
    });
  }

  // ---------- Índices para entrada em cascata ----------
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', i); });
  });
  $$('.ring[data-ring]').forEach(function (el) { el.style.setProperty('--v', el.dataset.ring); });

  // ---------- Contadores ----------
  function fmt(v, d) { return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function count(el) {
    if (el.__counted) return; el.__counted = true;
    var target = parseFloat(el.dataset.count), d = +el.dataset.decimals || 0, t0 = performance.now(), D = 1800;
    (function step(now) {
      var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(2, -10 * p);
      el.textContent = p < 1 ? fmt(target * e, d) : fmt(target, d);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- Entradas ao rolar ----------
  if (motion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('is-in');
        $$('[data-count]', el).forEach(count);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal], [data-split], .route__map').forEach(function (el) {
      if (el.closest('.slide')) return;
      io.observe(el);
    });
  }

  // ---------- Cenários em canvas ----------
  var Scenes = window.NSScenes;
  var heroEl = $('.hero');
  if (Scenes) {
    $$('canvas.scene').forEach(function (c, idx) {
      var host = c.closest('[data-scene]');
      var type = c.dataset.scene || (host && host.dataset.scene);
      var palette = c.dataset.palette || (host && host.dataset.palette);
      var slide = c.closest('.slide');
      var s = Scenes.mount(c, {
        type: type, palette: palette,
        seed: +c.dataset.seed || 7 + idx * 13,
        isStatic: c.hasAttribute('data-static'),
        intro: c.hasAttribute('data-intro') && motion,
        manual: !!slide,
        interactive: c.hasAttribute('data-interactive')
      });
      if (!s) return;
      if (slide) {
        s.active = slide.classList.contains('is-active');
        s.scrollFn = function () { return Math.min(window.scrollY, vh) * 0.6; };
      } else if (!s.isStatic) {
        var sec = c.parentElement;
        s.scrollFn = function () { var r = sec.getBoundingClientRect(); return -(r.top + r.height / 2 - vh / 2) * 0.5; };
      }
    });
  }

  // ---------- Banners do topo ----------
  var slides = $$('.slide', heroEl), dots = $$('.dot', heroEl);
  var cur = 0, busy = false;
  heroEl.style.setProperty('--dur', CONFIG.autoplay + 'ms');
  function sceneOf(slide) { var c = $('canvas', slide); return c && c.__scene; }
  function show(slide, on) {
    slide.classList.toggle('is-shown', on);
    var t = $('[data-split]', slide); if (t) t.classList.toggle('is-in', on);
    $$('a, button', slide).forEach(function (a) { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); });
    if (on) slide.removeAttribute('aria-hidden'); else slide.setAttribute('aria-hidden', 'true');
  }
  function go(n, origin) {
    n = (n + slides.length) % slides.length;
    if (n === cur || busy) return;
    busy = true;
    var prev = slides[cur], next = slides[n];
    if (origin) {
      var r = origin.getBoundingClientRect(), hr = heroEl.getBoundingClientRect();
      next.style.setProperty('--cx', ((r.left + r.width / 2 - hr.left) / hr.width * 100).toFixed(1) + '%');
      next.style.setProperty('--cy', ((r.top + r.height / 2 - hr.top) / hr.height * 100).toFixed(1) + '%');
    }
    var sn = sceneOf(next), sp = sceneOf(prev);
    if (sn) sn.active = true;
    prev.classList.remove('is-active'); prev.classList.add('is-leaving'); show(prev, false);
    next.classList.add('is-active'); if (motion) next.classList.add('is-entering');
    requestAnimationFrame(function () { show(next, true); });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === n);
      if (i === n) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    $('.hero__current', heroEl).textContent = ('0' + (n + 1)).slice(-2);
    cur = n;
    setTimeout(function () {
      prev.classList.remove('is-leaving'); next.classList.remove('is-entering');
      if (sp) sp.active = false;
      busy = false;
    }, motion ? 1350 : 0);
  }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i, d); }); });
  $$('.arrow', heroEl).forEach(function (b) { b.addEventListener('click', function () { go(cur + (+b.dataset.dir), b); }); });
  $$('.dot__bar i', heroEl).forEach(function (bar) {
    bar.addEventListener('animationend', function () {
      if (bar.closest('.dot').classList.contains('is-active')) go(cur + 1);
    });
  });
  heroEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  });
  var sx = null;
  heroEl.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') sx = e.clientX; });
  heroEl.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroEl.classList.toggle('is-paused', !en[0].isIntersecting); }, { threshold: 0.2 }).observe(heroEl);
  }
  document.addEventListener('visibilitychange', function () { heroEl.classList.toggle('is-paused', document.hidden); });
  // entrada inicial
  setTimeout(function () { show(slides[0], true); }, motion ? 350 : 0);

  // ---------- Menu ----------
  var topbar = $('.topbar'), burger = $('.burger'), menu = $('#menu'), menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    heroEl.classList.toggle('is-paused', open);
    if (open) topbar.classList.remove('is-hidden');
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  // ---------- Seção atual no menu ----------
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) secIO.observe(s); });
  }

  // ---------- Cinco sentidos ----------
  var senses = $$('.sense');
  function openSense(s) { senses.forEach(function (o) { o.classList.toggle('is-open', o === s); }); }
  senses.forEach(function (s) {
    s.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') openSense(s); });
    s.addEventListener('click', function () { openSense(s); });
    s.addEventListener('focus', function () { openSense(s); });
  });

  // ---------- Região: rolagem horizontal fixada ----------
  var region = $('.region'), track = $('.region__track'), rViewport = $('.region__viewport');
  var rBar = $('.region__bar i'), rBg = $('.region__bg');
  var pinned = false, trackDist = 0;
  function setupRegion() {
    var can = motion && vw >= 900 && vh >= 640;
    region.classList.toggle('is-pinned', can);
    pinned = can;
    track.style.transform = '';
    if (can) {
      trackDist = Math.max(0, track.offsetWidth - rViewport.clientWidth);
      region.style.height = (vh + trackDist) + 'px';
    } else {
      region.style.height = '';
    }
  }
  function updateRegion() {
    var r = region.getBoundingClientRect(), p;
    if (r.bottom < -50 || r.top > vh + 50) return;
    if (pinned) {
      p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      track.style.transform = 'translate3d(' + (-p * trackDist).toFixed(1) + 'px,0,0)';
      rBg.style.setProperty('--bgx', (-p * vw * 0.5).toFixed(1));
    } else {
      var max = rViewport.scrollWidth - rViewport.clientWidth;
      p = max > 0 ? rViewport.scrollLeft / max : 0;
      rBg.style.setProperty('--bgx', (r.top * 0.4).toFixed(1));
    }
    rBar.style.setProperty('--p', (0.12 + p * 0.88).toFixed(3));
  }
  rViewport.addEventListener('scroll', updateRegion, { passive: true });

  // ---------- Paralaxe de elementos ----------
  var plx = $$('[data-parallax]').map(function (el) { return { el: el, f: parseFloat(el.dataset.parallax) || 0.1 }; });
  function updateParallax() {
    for (var i = 0; i < plx.length; i++) {
      var p = plx[i], r = p.el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      p.el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * p.f).toFixed(1) + 'px,0)';
    }
  }

  // ---------- Palavras que acendem ----------
  function updateScrub() {
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i], r = s.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3), 0, 1);
      var n = Math.round(p * s.words.length);
      if (n === s.on) continue;
      for (var k = 0; k < s.words.length; k++) s.words[k].classList.toggle('on', k < n);
      s.on = n;
    }
  }

  // ---------- Faixa (ticker) ----------
  var ticker = $('.ticker'), tTrack = $('.ticker__track'), tX = 0, tVel = 0, tDir = 1, tVisible = true, tHalf = 0;
  function measureTicker() { tHalf = (tTrack.scrollWidth + (parseFloat(getComputedStyle(tTrack).columnGap) || 0)) / 2; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { tVisible = en[0].isIntersecting; }).observe(ticker);

  // ---------- Topo, progresso, botão flutuante ----------
  var progress = $('.progress span'), fab = $('.fab'), booking = $('#reserva');
  var lastY = -1, prevY = window.scrollY;
  function updateChrome(y) {
    topbar.classList.toggle('is-solid', y > 40);
    if (!menuOpen) {
      if (y > lastY + 6 && y > vh * 0.8) topbar.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 200) topbar.classList.remove('is-hidden');
    }
    var max = document.documentElement.scrollHeight - vh;
    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0).toFixed(4) + ')';
    var br = booking.getBoundingClientRect();
    fab.classList.toggle('is-visible', y > vh * 0.9 && (br.top > vh || br.bottom < 0));
    lastY = y;
  }

  // ---------- Cursor ----------
  var cursor = $('.cursor'), cDot = $('.cursor__dot'), cRing = $('.cursor__ring'), cLabel = $('.cursor__label');
  var mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (Scenes) Scenes.pointer(mx / vw * 2 - 1, my / vh * 2 - 1);
  }, { passive: true });
  if (fine && motion) {
    document.addEventListener('pointerover', function (e) {
      var labeled = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button, .sense, input, textarea, label');
      cursor.classList.toggle('has-label', !!labeled);
      cursor.classList.toggle('is-link', !labeled && !!link);
      if (labeled) cLabel.textContent = labeled.dataset.cursor;
    });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.documentElement.addEventListener('mouseenter', function () { cursor.classList.remove('is-hidden'); });
  }

  // ---------- Botões magnéticos ----------
  if (fine && motion) {
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.22).toFixed(1) + 'px,' + (y * 0.32).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // ---------- Chalé em 3D ----------
  var tilt = $('[data-tilt]');
  if (tilt && fine && motion) {
    tilt.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--rx', (x * 10).toFixed(2));
      tilt.style.setProperty('--ry', (-y * 8).toFixed(2));
      tilt.style.setProperty('--px', (-x * 2).toFixed(3));
      tilt.style.setProperty('--py', (-y * 2).toFixed(3));
    });
    tilt.addEventListener('pointerleave', function () {
      ['--rx', '--ry', '--px', '--py'].forEach(function (p) { tilt.style.setProperty(p, 0); });
    });
  }

  // ---------- Formulário de reserva ----------
  var form = $('#form-reserva');
  var fNome = $('#f-nome'), fIn = $('#f-in'), fOut = $('#f-out'), fH = $('#f-hosp'), fMsg = $('#f-msg');
  var fErr = $('#form-erro'), fRes = $('#form-resultado'), fPrev = $('#form-preview'), fSend = $('#form-enviar'), fCopy = $('#form-copiar'), fStatus = $('#form-status');
  function isoDate(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseDate(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function longDate(v) { return parseDate(v).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); }
  var today = new Date(); today.setHours(12, 0, 0, 0);
  fIn.min = isoDate(today);
  var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  fOut.min = isoDate(tomorrow);
  fIn.addEventListener('change', function () {
    if (!fIn.value) return;
    var d = parseDate(fIn.value); d.setDate(d.getDate() + 1);
    fOut.min = isoDate(d);
    if (!fOut.value || fOut.value <= fIn.value) fOut.value = isoDate(d);
  });
  $$('.stepper button', form).forEach(function (b) {
    b.addEventListener('click', function () { fH.value = clamp((parseInt(fH.value, 10) || 1) + (+b.dataset.step), 1, 12); });
  });
  var lastMsg = '';
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    [fNome, fIn, fOut].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    var err = '', bad = null;
    if (!fNome.value.trim()) { err = 'Escreva seu nome para a pousada saber quem está pedindo.'; bad = fNome; }
    else if (!fIn.value || !fOut.value) { err = 'Escolha as datas de check-in e check-out.'; bad = !fIn.value ? fIn : fOut; }
    else if (fOut.value <= fIn.value) { err = 'O check-out precisa ser depois do check-in.'; bad = fOut; }
    fErr.textContent = err;
    if (bad) { bad.setAttribute('aria-invalid', 'true'); bad.focus(); fRes.hidden = true; return; }
    var nights = Math.round((parseDate(fOut.value) - parseDate(fIn.value)) / 86400000);
    var hosp = clamp(parseInt(fH.value, 10) || 1, 1, 12);
    lastMsg = 'Olá! Quero consultar disponibilidade no Nature Senses Chapadinha.\n\n' +
      'Nome: ' + fNome.value.trim() + '\n' +
      'Check-in: ' + longDate(fIn.value) + '\n' +
      'Check-out: ' + longDate(fOut.value) + ' (' + nights + (nights === 1 ? ' noite' : ' noites') + ')\n' +
      'Hóspedes: ' + hosp + (fMsg.value.trim() ? '\n\n' + fMsg.value.trim() : '');
    fPrev.textContent = lastMsg;
    if (CONFIG.whatsapp) {
      fSend.href = 'https://wa.me/' + CONFIG.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(lastMsg);
      $('span', fSend).textContent = 'Enviar pelo WhatsApp';
    } else {
      fSend.href = 'https://ig.me/m/' + CONFIG.instagram;
      $('span', fSend).textContent = 'Abrir Direct do Instagram';
    }
    fRes.hidden = false;
    fStatus.textContent = '';
    copy(lastMsg).then(function (ok) {
      fStatus.textContent = ok
        ? (CONFIG.whatsapp ? 'Mensagem copiada e pronta no WhatsApp.' : 'Mensagem copiada. Abra o Direct do Instagram e cole para enviar.')
        : 'Selecione o texto acima e copie para enviar.';
      if (!ok) selectPreview();
    });
  });
  fCopy.addEventListener('click', function () {
    copy(lastMsg).then(function (ok) {
      fStatus.textContent = ok ? 'Mensagem copiada.' : 'Não deu para copiar automaticamente. O texto ficou selecionado: copie manualmente.';
      if (!ok) selectPreview();
    });
  });

  // ---------- Redimensionamento ----------
  var rT;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { vh = window.innerHeight; vw = window.innerWidth; setupRegion(); updateRegion(); measureTicker(); }, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setupRegion(); updateRegion(); measureTicker(); });
  window.addEventListener('load', function () { setupRegion(); updateRegion(); });
  setupRegion();

  // ---------- Laço principal ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var y = window.scrollY;
    if (y !== lastY) {
      updateChrome(y);
      updateRegion();
      if (motion) { updateParallax(); updateScrub(); }
    }
    if (motion) {
      // faixa reage à velocidade da rolagem
      var v = dt > 0 ? (y - prevY) / dt : 0;
      tVel += (v - tVel) * 0.1;
      if (Math.abs(tVel) > 30) tDir = tVel > 0 ? 1 : -1;
      if (tVisible) {
        if (!tHalf) measureTicker();
        tX -= (55 + Math.min(Math.abs(tVel) * 0.25, 900)) * dt * tDir;
        if (tX <= -tHalf) tX += tHalf;
        if (tX > 0) tX -= tHalf;
        tTrack.style.transform = 'translate3d(' + tX.toFixed(1) + 'px,0,0) skewX(' + clamp(-tVel * 0.004, -10, 10).toFixed(2) + 'deg)';
      }
      // cursor
      if (fine) {
        rx += (mx - rx) * 0.17; ry += (my - ry) * 0.17;
        cDot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
        cRing.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      }
    }
    prevY = y;
    if (Scenes) Scenes.tick(dt);
    requestAnimationFrame(loop);
  }
  updateChrome(window.scrollY);
  updateScrub();
  requestAnimationFrame(loop);
})();
