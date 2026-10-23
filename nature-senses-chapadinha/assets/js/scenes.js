/* =========================================================================
   Cenários da Chapada em canvas
   Paisagens geradas por código: serras em chapada (topos planos), buritis,
   ipês, cachoeiras, Via Láctea. Cada cenário tem camadas com paralaxe
   (mouse e rolagem) e animação contínua.
   API: NSScenes.mount(canvas, opções) · NSScenes.tick(dt) · NSScenes.pointer(x, y)
   ========================================================================= */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma paisagem
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Perfil de serra por deslocamento do ponto médio (n = 2^k + 1)
  function ridge(r, rough, mesa) {
    var n = 129, a = new Float32Array(n), step = n - 1, disp = 1, i;
    a[0] = r(); a[n - 1] = r();
    while (step > 1) {
      var half = step >> 1;
      for (i = half; i < n - 1; i += step) a[i] = (a[i - half] + a[i + half]) / 2 + (r() - 0.5) * disp;
      disp *= rough; step = half;
    }
    normalize(a);
    if (mesa) { // achata os topos: o perfil típico das chapadas
      for (i = 0; i < n; i++) if (a[i] > mesa) a[i] = mesa + (a[i] - mesa) * 0.12;
      normalize(a);
    }
    return a;
  }
  function normalize(a) {
    var mn = Infinity, mx = -Infinity, i;
    for (i = 0; i < a.length; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; }
    for (i = 0; i < a.length; i++) a[i] = (a[i] - mn) / ((mx - mn) || 1);
  }
  function sample(v, u) {
    var f = clamp(u, 0, 1) * (v.length - 1), i = Math.floor(f), k = f - i;
    return v[i] * (1 - k) + v[Math.min(i + 1, v.length - 1)] * k;
  }

  // Cria uma camada pré-desenhada (offscreen) em pixels CSS
  function layer(w, h, dpr, draw) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    draw(x, w, h);
    return c;
  }
  function ridgeShape(x, v, w, h, top, amp) {
    x.beginPath(); x.moveTo(0, h);
    for (var i = 0; i < v.length; i++) x.lineTo(i / (v.length - 1) * w, top + (1 - v[i]) * amp);
    x.lineTo(w, h); x.closePath();
  }
  function vgrad(x, y0, y1, stops) {
    var g = x.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function softSprite(rgb) { // mancha suave para névoa e brilho
    return layer(128, 128, 1, function (x) {
      var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    });
  }

  // ---------- Elementos do cerrado ----------
  function buriti(x, X, base, H, t, ph, color) {
    var sway = Math.sin(t * 0.7 + ph) * 0.035;
    x.save(); x.translate(X, base);
    x.strokeStyle = color; x.fillStyle = color; x.lineCap = 'round';
    var tx = H * 0.06;
    x.lineWidth = Math.max(2, H * 0.03);
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(H * 0.015, -H * 0.5, tx, -H); x.stroke();
    x.translate(tx, -H); x.rotate(sway);
    // saia de folhas secas pendentes, típica do buriti
    x.lineWidth = Math.max(1, H * 0.012);
    for (var d = -2; d <= 2; d++) {
      x.beginPath(); x.moveTo(d * H * 0.02, H * 0.02);
      x.quadraticCurveTo(d * H * 0.06, H * 0.08, d * H * 0.05 + Math.sin(t + d) * 1.5, H * 0.17); x.stroke();
    }
    var n = 11;
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 0.92 + (i / (n - 1)) * Math.PI * 1.16 + Math.sin(t * 1.1 + ph + i) * 0.025;
      var len = H * (0.16 + 0.05 * Math.sin(i * 1.9 + ph));
      var droop = Math.abs(Math.cos(a)) * len * 0.45;
      var ex = Math.cos(a) * len, ey = Math.sin(a) * len + droop;
      x.lineWidth = Math.max(1, H * 0.01);
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(ex * 0.5, ey * 0.5 - len * 0.15, ex, ey); x.stroke();
      // leque palmado: lâmina larga e serrilhada
      var ang = Math.atan2(ey, ex) + Math.cos(a) * 0.25, R = len * 0.95;
      x.beginPath(); x.moveTo(ex, ey);
      for (var k = 0; k <= 18; k++) {
        var aa = ang - 0.8 + k * (1.6 / 18), rr = R * (k % 2 ? 0.8 : 1) * (1 - Math.abs(k - 9) / 30);
        x.lineTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr + R * 0.22);
      }
      x.closePath(); x.fill();
    }
    x.restore();
  }

  function grass(x, blades, t, color, width) {
    x.strokeStyle = color; x.lineWidth = width || 1.3; x.lineCap = 'round';
    x.beginPath();
    for (var i = 0; i < blades.length; i++) {
      var g = blades[i];
      var sw = Math.sin(t * 1.5 + g.ph + g.x * 0.008) * 3.5 + g.lean * g.len;
      x.moveTo(g.x, g.base);
      x.quadraticCurveTo(g.x + sw * 0.25, g.base - g.len * 0.6, g.x + sw, g.base - g.len);
    }
    x.stroke();
  }

  function makeBlades(r, count, W, baseFn, min, max) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var X = r() * W;
      out.push({ x: X, base: baseFn(X) + 3, len: min + r() * (max - min), ph: r() * TAU, lean: (r() - 0.5) * 0.5 });
    }
    return out;
  }

  function birds(x, list, t, dt, w, color) {
    x.strokeStyle = color; x.lineWidth = 1.4; x.lineCap = 'round';
    x.beginPath();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      b.x += b.v * dt; if (b.x > w + 60) b.x = -60;
      var y = b.y + Math.sin(t * 0.6 + b.ph) * 6, f = Math.sin(t * 8 + b.ph) * 4 * b.s, s = 7 * b.s;
      x.moveTo(b.x - s, y - f); x.quadraticCurveTo(b.x - s * 0.4, y - f * 0.2 - 2, b.x, y);
      x.quadraticCurveTo(b.x + s * 0.4, y - f * 0.2 - 2, b.x + s, y - f);
    }
    x.stroke();
  }

  function ipe(x, r, X, base, H) { // ipê-amarelo florido
    x.save(); x.translate(X, base);
    x.strokeStyle = '#2a1c12'; x.lineCap = 'round';
    x.lineWidth = Math.max(2, H * 0.05);
    var topX = (r() - 0.5) * H * 0.2;
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(H * 0.08, -H * 0.3, -H * 0.06, -H * 0.5, topX, -H * 0.62); x.stroke();
    var tips = [];
    x.lineWidth = Math.max(1, H * 0.022);
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + (i - 2) * 0.42 + (r() - 0.5) * 0.2, L = H * (0.28 + r() * 0.16);
      var ex = topX + Math.cos(a) * L, ey = -H * 0.62 + Math.sin(a) * L;
      x.beginPath(); x.moveTo(topX, -H * 0.62); x.quadraticCurveTo((topX + ex) / 2 + (r() - 0.5) * 10, (ey - H * 0.62) / 2, ex, ey); x.stroke();
      tips.push([ex, ey]);
    }
    var cols = ['#f6c945', '#e8a90f', '#ffd965', '#f2b81f'];
    for (var j = 0; j < 90; j++) {
      var tp = tips[j % tips.length], rad = H * (0.03 + r() * 0.05);
      x.fillStyle = cols[(r() * cols.length) | 0];
      x.globalAlpha = 0.75 + r() * 0.25;
      x.beginPath(); x.arc(tp[0] + (r() - 0.5) * H * 0.3, tp[1] + (r() - 0.5) * H * 0.18, rad, 0, TAU); x.fill();
    }
    x.globalAlpha = 1;
    x.restore();
    return { x: X + topX, y: base - H * 0.75, r: H * 0.3 };
  }

  // ---------- Base comum ----------
  function Scene(canvas, o) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.o = o;
    this.seed = o.seed || 1; this.isStatic = !!o.isStatic;
    this.t = o.isStatic ? 3 + (this.seed % 7) : 0;
    this.intro = o.intro ? 0 : 1;
    this.px = 0; this.py = 0; this.scroll = 0; this.dt = 0;
    this.visible = false; this.active = o.manual ? false : true;
    this.w = 0; this.h = 0; this.built = false;
  }
  Scene.prototype.size = function () {
    var w = this.c.clientWidth, h = this.c.clientHeight;
    if (!w || !h) return false;
    if (this.built && Math.abs(w - this.w) < 2 && Math.abs(h - this.h) < 2) return false;
    this.w = w; this.h = h;
    var dpr = Math.min(window.devicePixelRatio || 1, this.isStatic ? 1.5 : 2);
    if (w * h > 1.4e6) dpr = Math.min(dpr, 1.5);
    this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.r = rng(this.seed);
    this.build();
    this.built = true;
    return true;
  };
  Scene.prototype.frame = function (dt) {
    if (!this.built && !this.size()) return;
    this.dt = dt; this.t += dt;
    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 2.8);
    this.render();
  };
  Scene.prototype.renderStatic = function () {
    if (!this.built && !this.size()) return;
    this.dt = 0; this.intro = 1;
    this.render();
  };
  Scene.prototype.layerOffset = function (depth, i) {
    var ie = easeOut(clamp(this.intro * 1.7 - (i || 0) * 0.13, 0, 1));
    return {
      x: -this.pad + this.px * 34 * depth,
      y: this.py * 10 * depth - this.scroll * 0.16 * depth + (1 - ie) * (50 + 150 * depth)
    };
  };

  function inherit(C) { C.prototype = Object.create(Scene.prototype); C.prototype.constructor = C; return C; }

  // ============ AMANHECER ============
  var Dawn = inherit(function Dawn(c, o) { Scene.call(this, c, o); });
  Dawn.prototype.build = function () {
    var w = this.w, h = this.h, r = this.r, dpr = this.dpr;
    var pad = this.pad = Math.max(50, w * 0.05);
    this.sky = layer(w, h, dpr, function (x) {
      x.fillStyle = vgrad(x, 0, h * 0.86, [[0, '#121833'], [0.34, '#45325a'], [0.6, '#b25f78'], [0.8, '#ec9868'], [1, '#f8cf80']]);
      x.fillRect(0, 0, w, h);
    });
    this.stars = [];
    for (var i = 0, n = Math.round(w * h / 7000); i < n; i++) this.stars.push({ x: r() * w, y: r() * h * 0.42, s: r() * 1.3 + 0.3, p: r() * TAU });
    var defs = [
      { top: 0.5, amp: 0.15, c: ['#c58889', '#9f6b80'], d: 0.12, mesa: 0.7, rough: 0.5 },
      { top: 0.58, amp: 0.14, c: ['#8c5b79', '#6c4a6c'], d: 0.25, mesa: 0.82, rough: 0.55 },
      { top: 0.66, amp: 0.14, c: ['#523b5e', '#3a2f4c'], d: 0.45, mesa: 0, rough: 0.58 },
      { top: 0.75, amp: 0.11, c: ['#27323b', '#1d2830'], d: 0.7, mesa: 0.8, rough: 0.5 },
      { top: 0.87, amp: 0.07, c: ['#15221d', '#0e1915'], d: 1, mesa: 0, rough: 0.62 }
    ];
    var lw = w + pad * 2, lh = h * 1.15 + pad;
    this.layers = defs.map(function (d) {
      var v = ridge(r, d.rough, d.mesa);
      var img = layer(lw, lh, dpr, function (x) {
        x.fillStyle = vgrad(x, h * d.top, h, [[0, d.c[0]], [1, d.c[1]]]);
        ridgeShape(x, v, lw, lh, h * d.top, h * d.amp);
        x.fill();
      });
      return { d: d.d, top: d.top, amp: d.amp, v: v, img: img, lw: lw, lh: lh };
    });
    var near = this.layers[4], mid = this.layers[3];
    function nearY(X) { return h * near.top + (1 - sample(near.v, X / lw)) * h * near.amp; }
    function midY(X) { return h * mid.top + (1 - sample(mid.v, X / lw)) * h * mid.amp; }
    var palmSpots = [[0.1, 1], [0.17, 0.72], [0.83, 0.9], [0.9, 0.62]];
    this.palms = palmSpots.map(function (p) { var X = p[0] * lw; return { x: X, base: nearY(X) + 6, h: h * 0.27 * p[1], ph: r() * TAU }; });
    this.midPalms = [0.32, 0.36, 0.62].map(function (u) { var X = u * lw; return { x: X, base: midY(X) + 4, h: h * 0.09, ph: r() * TAU }; });
    this.blades = makeBlades(r, Math.round(lw / 6), lw, nearY, 8, h * 0.035 + 12);
    this.birds = [];
    for (i = 0; i < 5; i++) this.birds.push({ x: r() * w, y: h * (0.16 + r() * 0.2), s: 0.6 + r() * 0.6, v: 14 + r() * 16, ph: r() * TAU });
    this.mist = softSprite('255,226,214');
    this.mistBands = [{ after: 1, y: 0.64, a: 0.22, sp: 7 }, { after: 2, y: 0.72, a: 0.16, sp: -5 }, { after: 3, y: 0.83, a: 0.12, sp: 4 }];
    this.sunPos = { x: w * 0.68, y: h * 0.585 };
  };
  Dawn.prototype.render = function () {
    var x = this.ctx, w = this.w, h = this.h, t = this.t, i;
    x.drawImage(this.sky, 0, 0, w, h);
    x.fillStyle = '#fff';
    for (i = 0; i < this.stars.length; i++) {
      var s = this.stars[i], a = (0.35 + 0.35 * Math.sin(t * 1.4 + s.p)) * (1 - s.y / (h * 0.46));
      if (a < 0.03) continue;
      x.globalAlpha = a; x.fillRect(s.x, s.y, s.s, s.s);
    }
    x.globalAlpha = 1;
    // sol nascendo
    var ie = easeOut(this.intro);
    var sx = this.sunPos.x - this.px * 8, sy = lerp(h * 0.86, this.sunPos.y, ie) - this.scroll * 0.06 + this.py * 3;
    var g = x.createRadialGradient(sx, sy, 0, sx, sy, h * 0.55);
    g.addColorStop(0, 'rgba(255,220,150,.8)'); g.addColorStop(0.22, 'rgba(255,176,112,.3)'); g.addColorStop(1, 'rgba(255,150,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffe6ad'; x.beginPath(); x.arc(sx, sy, Math.max(22, h * 0.048), 0, TAU); x.fill();
    birds(x, this.birds, t, this.dt, w, 'rgba(40,24,40,.55)');
    for (i = 0; i < this.layers.length; i++) {
      var L = this.layers[i], o = this.layerOffset(L.d, i);
      x.drawImage(L.img, o.x, o.y, L.lw, L.lh);
      if (i === 3) {
        x.save(); x.translate(o.x, o.y);
        for (var m = 0; m < this.midPalms.length; m++) { var p = this.midPalms[m]; buriti(x, p.x, p.base, p.h, t, p.ph, '#1d2830'); }
        x.restore();
      }
      for (var b = 0; b < this.mistBands.length; b++) {
        var mb = this.mistBands[b];
        if (mb.after !== i) continue;
        x.globalAlpha = mb.a;
        for (var k = 0; k < 4; k++) {
          var span = w + 700, mx = (((k * span / 4) + t * mb.sp) % span + span) % span - 350;
          x.drawImage(this.mist, mx, h * mb.y + o.y * 0.3 - h * 0.05, w * 0.55, h * 0.1);
        }
        x.globalAlpha = 1;
      }
      if (i === 4) {
        x.save(); x.translate(o.x, o.y);
        grass(x, this.blades, t, '#0e1915', 1.4);
        for (var q = 0; q < this.palms.length; q++) { var P = this.palms[q]; buriti(x, P.x, P.base, P.h, t, P.ph, '#0b1512'); }
        x.restore();
      }
    }
  };

  // ============ CACHOEIRA ============
  var PALETTES = {
    turquesa: { pool: ['#7fe0ea', '#138a9e', '#0b4b5a'], fall: 'rgba(225,250,252,', sky: [[0, '#f6e7b9'], [0.35, '#a9d3c3'], [1, '#2a5c58']] },
    ambar: { pool: ['#e0b56a', '#8a5a22', '#3e2510'], fall: 'rgba(255,244,222,', sky: [[0, '#f8dca4'], [0.35, '#c9b98a'], [1, '#4a4a30']] },
    prata: { pool: ['#b6e2d6', '#3f8a80', '#1d4741'], fall: 'rgba(240,252,248,', sky: [[0, '#eef0d6'], [0.35, '#b4cfc0'], [1, '#33584f']] }
  };
  var Falls = inherit(function Falls(c, o) { Scene.call(this, c, o); this.pal = PALETTES[o.palette] || PALETTES.turquesa; });
  Falls.prototype.build = function () {
    var w = this.w, h = this.h, r = this.r, dpr = this.dpr, pal = this.pal;
    var pad = this.pad = Math.max(40, w * 0.04);
    var lw = w + pad * 2, lh = h * 1.15 + pad;
    this.lw = lw; this.lh = lh;
    this.sky = layer(w, h, dpr, function (x) { x.fillStyle = vgrad(x, 0, h * 0.7, pal.sky); x.fillRect(0, 0, w, h); });
    var far = ridge(r, 0.52, 0.75);
    this.far = layer(lw, lh, dpr, function (x) { x.fillStyle = 'rgba(70,104,92,.8)'; ridgeShape(x, far, lw, lh, h * 0.17, h * 0.12); x.fill(); });
    // paredões do cânion
    var cx = lw / 2, gap = Math.max(w * 0.12, 80), cliffTop = h * 0.3;
    this.fallX = cx; this.fallTop = h * 0.355; this.fallBot = h * 0.78;
    this.fallW0 = Math.max(w * 0.045, 28); this.fallW1 = Math.max(w * 0.085, 50);
    var edgeL = ridge(r, 0.6, 0), edgeR = ridge(r, 0.6, 0);
    this.cliffs = layer(lw, lh, dpr, function (x) {
      // parede do fundo, atrás da queda
      x.fillStyle = vgrad(x, cliffTop, h, [[0, '#2a201a'], [1, '#0f0b09']]);
      x.fillRect(cx - gap * 2, cliffTop + h * 0.02, gap * 4, lh);
      // borda de onde a água despenca
      x.fillStyle = '#3a2a21';
      x.beginPath(); x.moveTo(cx - gap * 1.2, cliffTop + h * 0.01); x.lineTo(cx + gap * 1.2, cliffTop + h * 0.01);
      x.lineTo(cx + gap * 0.7, h * 0.36); x.lineTo(cx - gap * 0.7, h * 0.36); x.closePath(); x.fill();
      function wall(side, edge) {
        x.beginPath();
        var outer = side < 0 ? 0 : lw;
        x.moveTo(outer, cliffTop);
        for (var i = 0; i <= 40; i++) {
          var u = i / 40, y = lerp(cliffTop, lh, u);
          var inner = cx + side * (gap * (0.75 + u * 0.9) + (edge[Math.floor(u * 128)] - 0.5) * gap * 0.5);
          if (i === 0) x.lineTo(inner + side * gap * 0.3, cliffTop);
          x.lineTo(inner, y);
        }
        x.lineTo(outer, lh); x.closePath();
      }
      [[-1, edgeL], [1, edgeR]].forEach(function (s) {
        x.save();
        wall(s[0], s[1]);
        x.fillStyle = vgrad(x, cliffTop, h, [[0, '#4d372b'], [0.5, '#2c211b'], [1, '#140f0c']]);
        x.fill();
        x.clip();
        // manchas minerais (ferro e musgo)
        for (var m = 0; m < 26; m++) {
          var MX = r() * lw, MY = cliffTop + r() * h * 0.7, MR = h * (0.04 + r() * 0.1);
          var mg = x.createRadialGradient(MX, MY, 0, MX, MY, MR);
          var mc = ['150,72,38', '96,110,60', '190,140,90'][(r() * 3) | 0];
          mg.addColorStop(0, 'rgba(' + mc + ',.22)'); mg.addColorStop(1, 'rgba(' + mc + ',0)');
          x.fillStyle = mg; x.fillRect(MX - MR, MY - MR, MR * 2, MR * 2);
        }
        // estratos da rocha (quartzito em camadas onduladas)
        for (var k = 0; k < 16; k++) {
          var y = cliffTop + k * h * 0.045 + (r() - 0.5) * 10, amp = 3 + r() * 6, fr = 0.004 + r() * 0.01, ph0 = r() * TAU;
          x.strokeStyle = r() > 0.55 ? 'rgba(255,220,180,.06)' : 'rgba(0,0,0,.16)';
          x.lineWidth = 1 + r() * 2;
          x.beginPath();
          for (var sx = 0; sx <= lw; sx += 24) { var sy = y + Math.sin(sx * fr + ph0) * amp + sx * 0.012; if (sx === 0) x.moveTo(sx, sy); else x.lineTo(sx, sy); }
          x.stroke();
        }
        // fendas verticais
        x.strokeStyle = 'rgba(0,0,0,.22)';
        for (var q = 0; q < 18; q++) {
          var qx = r() * lw, qy = cliffTop + r() * h * 0.4, ql = h * (0.05 + r() * 0.18);
          x.lineWidth = 1 + r() * 1.5;
          x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + (r() - 0.5) * 12, qy + ql * 0.5); x.lineTo(qx + (r() - 0.5) * 16, qy + ql); x.stroke();
        }
        var lg = x.createLinearGradient(cx + s[0] * gap * 0.7, 0, cx + s[0] * gap * 2.4, 0);
        lg.addColorStop(0, 'rgba(255,214,160,.16)'); lg.addColorStop(1, 'rgba(255,214,160,0)');
        x.fillStyle = lg; x.fillRect(0, 0, lw, lh);
        x.restore();
      });
      // mata no topo dos paredões
      for (var j = 0; j < 150; j++) {
        var X = r() * lw, Y = cliffTop + (r() - 0.6) * h * 0.04, R = 6 + r() * 22;
        if (Math.abs(X - cx) < gap * 0.55) continue;
        x.fillStyle = ['#1f3524', '#2a4630', '#16281b', '#33553a'][(r() * 4) | 0];
        x.beginPath(); x.arc(X, Y, R, 0, TAU); x.fill();
      }
    });
    // primeiro plano: folhagens
    this.front = layer(lw, lh, dpr, function (x) {
      function leaf(X, Y, L, a, col) {
        x.save(); x.translate(X, Y); x.rotate(a); x.fillStyle = col;
        x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -L * 0.22, L, 0); x.quadraticCurveTo(L * 0.5, L * 0.22, 0, 0); x.fill();
        x.restore();
      }
      for (var i = 0; i < 26; i++) {
        var left = i % 2 === 0, X = left ? r() * lw * 0.16 : lw - r() * lw * 0.16, Y = lh - r() * h * 0.22 - pad;
        leaf(X, Y, h * (0.12 + r() * 0.14), (left ? -0.9 : -2.2) + (r() - 0.5) * 1.1, ['#0c1611', '#122019', '#09110d'][i % 3]);
      }
      // pedras molhadas na beira do poço
      for (var k = 0; k < 14; k++) {
        var RX = lw * (0.04 + k / 13 * 0.92) + (r() - 0.5) * 30, RY = h * (0.87 + r() * 0.04) + pad * 0.2, RW = h * (0.05 + r() * 0.07), RH = RW * (0.45 + r() * 0.2);
        x.fillStyle = ['#15100d', '#1d1612', '#120e0b'][k % 3];
        x.beginPath(); x.ellipse(RX, RY, RW, RH, (r() - 0.5) * 0.3, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,240,220,.07)';
        x.beginPath(); x.ellipse(RX - RW * 0.2, RY - RH * 0.55, RW * 0.55, RH * 0.22, 0, 0, TAU); x.fill();
      }
      x.fillStyle = '#0a130f';
      x.beginPath(); x.moveTo(0, lh); x.lineTo(0, h * 0.93); x.quadraticCurveTo(lw * 0.25, h * 0.9, lw * 0.4, h * 0.97); x.lineTo(lw * 0.6, h * 0.97); x.quadraticCurveTo(lw * 0.78, h * 0.9, lw, h * 0.93); x.lineTo(lw, lh); x.fill();
    });
    this.streaks = [];
    for (var i = 0, n = Math.round(Math.max(60, w * 0.14)); i < n; i++) this.streaks.push({ u: r() * 2 - 1, y: r(), len: 0.04 + r() * 0.1, sp: 0.35 + r() * 0.4, a: 0.25 + r() * 0.55 });
    this.puffs = [];
    for (i = 0; i < 16; i++) this.puffs.push({ u: (r() - 0.5) * 2.6, life: r(), L: 3 + r() * 3, s: 0.6 + r() * 0.8 });
    this.ripples = [];
    for (i = 0; i < 5; i++) this.ripples.push({ p: i / 5 });
    this.mist = softSprite('235,248,246');
    this.rays = [0.18, 0.34, 0.52].map(function (u) { return { u: u, ph: r() * TAU }; });
  };
  Falls.prototype.render = function () {
    var x = this.ctx, w = this.w, h = this.h, t = this.t, dt = this.dt, pal = this.pal, i;
    x.drawImage(this.sky, 0, 0, w, h);
    var of = this.layerOffset(0.15, 0);
    x.drawImage(this.far, of.x, of.y, this.lw, this.lh);
    // raios de sol
    x.save(); x.globalCompositeOperation = 'lighter';
    for (i = 0; i < this.rays.length; i++) {
      var R = this.rays[i], a = 0.05 + 0.035 * Math.sin(t * 0.5 + R.ph), X0 = w * R.u + this.px * 10;
      x.fillStyle = 'rgba(255,236,190,' + a.toFixed(3) + ')';
      x.beginPath(); x.moveTo(X0, -10); x.lineTo(X0 + w * 0.08, -10); x.lineTo(X0 + w * 0.42, h); x.lineTo(X0 + w * 0.22, h); x.closePath(); x.fill();
    }
    x.restore();
    var oc = this.layerOffset(0.45, 1);
    x.drawImage(this.cliffs, oc.x, oc.y, this.lw, this.lh);
    // queda d'água
    var cx = this.fallX + oc.x, top = this.fallTop + oc.y, bot = this.fallBot + oc.y, w0 = this.fallW0, w1 = this.fallW1;
    var fg = x.createLinearGradient(0, top, 0, bot);
    fg.addColorStop(0, pal.fall + '.75)'); fg.addColorStop(1, pal.fall + '.45)');
    x.fillStyle = fg;
    x.beginPath(); x.moveTo(cx - w0 / 2, top); x.lineTo(cx + w0 / 2, top); x.lineTo(cx + w1 / 2, bot); x.lineTo(cx - w1 / 2, bot); x.closePath(); x.fill();
    x.strokeStyle = '#fff'; x.lineCap = 'round';
    for (i = 0; i < this.streaks.length; i++) {
      var s = this.streaks[i];
      s.y += s.sp * dt; if (s.y > 1) s.y -= 1;
      var y = lerp(top, bot, s.y), half = lerp(w0, w1, s.y) / 2;
      x.globalAlpha = s.a * (1 - Math.abs(s.u) * 0.4); x.lineWidth = 1 + (1 - Math.abs(s.u)) * 1.6;
      x.beginPath(); x.moveTo(cx + s.u * half, y); x.lineTo(cx + s.u * half * 1.02, Math.min(bot, y + s.len * h)); x.stroke();
    }
    x.globalAlpha = 1;
    // poço
    var op = this.layerOffset(0.6, 2), py = h * 0.83 + op.y, pcx = this.fallX + op.x, prx = Math.max(w * 0.3, 160), pry = h * 0.065;
    var pg = x.createRadialGradient(pcx, py, 0, pcx, py, prx);
    pg.addColorStop(0, pal.pool[0]); pg.addColorStop(0.55, pal.pool[1]); pg.addColorStop(1, pal.pool[2]);
    x.fillStyle = pg; x.beginPath(); x.ellipse(pcx, py, prx, pry, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.5)';
    for (i = 0; i < this.ripples.length; i++) {
      var rp = this.ripples[i]; rp.p += dt * 0.22; if (rp.p > 1) rp.p -= 1;
      x.globalAlpha = (1 - rp.p) * 0.55; x.lineWidth = 1.2;
      x.beginPath(); x.ellipse(pcx, py - pry * 0.3, w1 * 0.5 + rp.p * prx * 0.8, (w1 * 0.5 + rp.p * prx * 0.8) * (pry / prx) * 1.3, 0, 0, TAU); x.stroke();
    }
    x.globalAlpha = 1;
    // névoa subindo
    for (i = 0; i < this.puffs.length; i++) {
      var p = this.puffs[i]; p.life += dt / p.L; if (p.life > 1) p.life -= 1;
      var size = (50 + p.life * 130) * p.s * (h / 900 + 0.35);
      x.globalAlpha = Math.sin(Math.PI * p.life) * 0.2;
      x.drawImage(this.mist, cx + p.u * w1 - size / 2, bot - p.life * h * 0.22 - size / 2, size, size);
    }
    x.globalAlpha = 1;
    var ofr = this.layerOffset(1, 3);
    x.drawImage(this.front, ofr.x, ofr.y, this.lw, this.lh);
  };

  // ============ CÉU ESTRELADO ============
  var Night = inherit(function Night(c, o) { Scene.call(this, c, o); this.shoots = []; this.nextShoot = 1.5; });
  Night.prototype.build = function () {
    var w = this.w, h = this.h, r = this.r, dpr = this.dpr;
    var pad = this.pad = Math.max(40, w * 0.04);
    var lw = w + pad * 2, lh = h * 1.15 + pad;
    this.sky = layer(w, h, dpr, function (x) {
      x.fillStyle = vgrad(x, 0, h, [[0, '#04070e'], [0.5, '#0a1424'], [0.8, '#132638'], [1, '#1a3242']]);
      x.fillRect(0, 0, w, h);
      // Via Láctea: faixa diagonal com poeira, nebulosas e estrelas
      var ax = -0.05 * w, ay = 0.98 * h, bx = 1.05 * w, by = 0.02 * h;
      var dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, band = Math.min(w, h) * 0.17;
      var neb = ['150,120,210', '90,170,190', '235,175,160', '200,190,255'], i;
      for (i = 0; i < 60; i++) {
        var u = r(), off = (r() + r() + r() - 1.5) * band * 0.8;
        var X = ax + dx * u + nx * off, Y = ay + dy * u + ny * off, R = band * (0.4 + r() * 0.9);
        var g = x.createRadialGradient(X, Y, 0, X, Y, R);
        g.addColorStop(0, 'rgba(' + neb[i % 4] + ',.07)'); g.addColorStop(1, 'rgba(' + neb[i % 4] + ',0)');
        x.fillStyle = g; x.fillRect(X - R, Y - R, R * 2, R * 2);
      }
      var count = Math.round(w * h / 260);
      for (i = 0; i < count; i++) {
        var uu = r(), o2 = (r() + r() + r() + r() - 2) * band;
        x.globalAlpha = 0.25 + r() * 0.6;
        x.fillStyle = r() > 0.85 ? '#ffe9d0' : '#e8efff';
        var sz = r() * r() * 1.6 + 0.35;
        x.fillRect(ax + dx * uu + nx * o2, ay + dy * uu + ny * o2, sz, sz);
      }
      for (i = 0; i < 26; i++) { // faixa de poeira escura no meio
        var u3 = 0.1 + r() * 0.8, X3 = ax + dx * u3 + nx * (r() - 0.5) * band * 0.25, Y3 = ay + dy * u3 + ny * (r() - 0.5) * band * 0.25, R3 = band * (0.15 + r() * 0.25);
        var g3 = x.createRadialGradient(X3, Y3, 0, X3, Y3, R3);
        g3.addColorStop(0, 'rgba(4,7,14,.35)'); g3.addColorStop(1, 'rgba(4,7,14,0)');
        x.globalAlpha = 1; x.fillStyle = g3; x.fillRect(X3 - R3, Y3 - R3, R3 * 2, R3 * 2);
      }
      for (i = 0; i < Math.round(w * h / 2600); i++) { // estrelas espalhadas
        x.globalAlpha = 0.2 + r() * 0.6; x.fillStyle = '#dfe8ff';
        var s2 = r() * 1.1 + 0.3; x.fillRect(r() * w, r() * h * 0.85, s2, s2);
      }
      x.globalAlpha = 1;
    });
    this.bright = [];
    for (var k = 0; k < Math.round(w * h / 16000) + 20; k++) this.bright.push({ x: r() * w, y: r() * h * 0.7, s: 0.8 + r() * 1.4, p: r() * TAU, sp: 0.8 + r() * 2, flare: r() > 0.9 });
    var defs = [{ top: 0.66, amp: 0.12, c: '#0d1a26', d: 0.25, mesa: 0.75 }, { top: 0.74, amp: 0.1, c: '#09131c', d: 0.55, mesa: 0 }, { top: 0.85, amp: 0.07, c: '#050b10', d: 1, mesa: 0.85 }];
    this.layers = defs.map(function (d) {
      var v = ridge(r, 0.55, d.mesa);
      var img = layer(lw, lh, dpr, function (x) {
        ridgeShape(x, v, lw, lh, h * d.top, h * d.amp);
        x.fillStyle = d.c; x.fill();
        x.strokeStyle = 'rgba(140,175,205,.14)'; x.lineWidth = 1.2; x.stroke();
      });
      return { d: d.d, top: d.top, amp: d.amp, v: v, img: img, lw: lw, lh: lh };
    });
    var near = this.layers[2];
    function nearY(X) { return h * near.top + (1 - sample(near.v, X / lw)) * h * near.amp; }
    var cxu = (this.seed % 3 === 0) ? 0.3 : 0.7, CX = cxu * lw;
    // base plana para o chalé
    var y0 = Math.min(nearY(CX - h * 0.08), nearY(CX), nearY(CX + h * 0.12));
    this.chalet = { x: CX, y: y0 + 4, s: Math.max(0.45, h / 900) };
    this.blades = makeBlades(r, Math.round(lw / 7), lw, nearY, 6, 22);
    this.palm = { x: lw * (cxu > 0.5 ? 0.14 : 0.86), base: nearY(lw * (cxu > 0.5 ? 0.14 : 0.86)) + 5, h: h * 0.22, ph: r() * TAU };
    this.flies = [];
    for (k = 0; k < 24; k++) this.flies.push({ x: r() * w, y: h * (0.72 + r() * 0.26), p: r() * TAU, sp: 0.3 + r() * 0.6 });
    this.steam = [];
    for (k = 0; k < 10; k++) this.steam.push({ life: r(), u: (r() - 0.5) });
    this.glow = softSprite('255,190,110');
    this.puff = softSprite('230,236,245');
    this.light = softSprite('255,255,255');
  };
  Night.prototype.spawn = function (X, Y) {
    var r = Math.random, ang = 0.35 + r() * 0.5, sp = 650 + r() * 500;
    this.shoots.push({ x: X === undefined ? r() * this.w * 0.7 : X, y: Y === undefined ? r() * this.h * 0.35 : Y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.7 + r() * 0.5 });
  };
  Night.prototype.drawChalet = function (x, t) {
    var C = this.chalet, s = C.s;
    x.save(); x.translate(C.x, C.y); x.scale(s, s);
    // brilho quente da janela
    var fl = 0.85 + Math.sin(t * 3.1) * 0.05 + Math.sin(t * 7.3) * 0.03;
    x.globalAlpha = 0.55 * fl; x.drawImage(this.glow, -150, -190, 300, 260); x.globalAlpha = 1;
    x.fillStyle = '#03070a';
    x.beginPath(); x.moveTo(-70, 0); x.lineTo(0, -150); x.lineTo(70, 0); x.closePath(); x.fill();
    x.fillRect(-84, -4, 170, 8);
    var wg = x.createLinearGradient(0, -82, 0, 0);
    wg.addColorStop(0, 'rgba(255,214,140,' + (0.95 * fl).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(240,138,62,' + (0.95 * fl).toFixed(3) + ')');
    x.fillStyle = wg; x.beginPath(); x.moveTo(-34, -4); x.lineTo(0, -82); x.lineTo(34, -4); x.closePath(); x.fill();
    x.strokeStyle = '#03070a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -82); x.lineTo(0, -4); x.moveTo(-17, -40); x.lineTo(17, -40); x.stroke();
    // hidromassagem com vapor
    x.fillStyle = '#03070a'; x.fillRect(86, -18, 66, 18);
    x.fillStyle = 'rgba(120,220,210,.55)'; x.beginPath(); x.ellipse(119, -18, 31, 5, 0, 0, TAU); x.fill();
    for (var i = 0; i < this.steam.length; i++) {
      var p = this.steam[i]; p.life += this.dt / 3.2; if (p.life > 1) p.life -= 1;
      var sz = 18 + p.life * 46;
      x.globalAlpha = Math.sin(Math.PI * p.life) * 0.22;
      x.drawImage(this.puff, 119 + p.u * 40 + Math.sin(t + i) * 6 - sz / 2, -24 - p.life * 80 - sz / 2, sz, sz);
    }
    x.globalAlpha = 1;
    // varal de luzes
    x.strokeStyle = 'rgba(0,0,0,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(60, -40); x.quadraticCurveTo(110, -20, 160, -50); x.stroke();
    for (var b = 0; b < 6; b++) {
      var u = (b + 0.5) / 6, bx = lerp(lerp(60, 110, u), lerp(110, 160, u), u), by = lerp(lerp(-40, -20, u), lerp(-20, -50, u), u) + 3;
      x.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2 + b * 1.7);
      x.drawImage(this.glow, bx - 9, by - 9, 18, 18);
      x.fillStyle = '#ffdc90'; x.fillRect(bx - 1.2, by - 1.2, 2.4, 2.4);
    }
    x.globalAlpha = 1;
    x.restore();
  };
  Night.prototype.render = function () {
    var x = this.ctx, w = this.w, h = this.h, t = this.t, dt = this.dt, i;
    var os = { x: this.px * 6, y: -this.scroll * 0.03 + this.py * 3 };
    x.drawImage(this.sky, os.x - 8, os.y - 8, w + 16, h + 16);
    for (i = 0; i < this.bright.length; i++) {
      var s = this.bright[i], a = 0.45 + 0.55 * Math.sin(t * s.sp + s.p);
      x.globalAlpha = clamp(a, 0.08, 1);
      var X = s.x + os.x, Y = s.y + os.y;
      x.drawImage(this.light, X - s.s * 3, Y - s.s * 3, s.s * 6, s.s * 6);
      if (s.flare) {
        x.fillStyle = 'rgba(255,255,255,.5)';
        x.fillRect(X - s.s * 5, Y - 0.4, s.s * 10, 0.8); x.fillRect(X - 0.4, Y - s.s * 5, 0.8, s.s * 10);
      }
    }
    x.globalAlpha = 1;
    // estrelas cadentes
    if (!this.isStatic) {
      this.nextShoot -= dt;
      if (this.nextShoot <= 0) { this.spawn(); this.nextShoot = 2.5 + Math.random() * 4; }
    }
    for (i = this.shoots.length - 1; i >= 0; i--) {
      var sh = this.shoots[i]; sh.life += dt;
      if (sh.life > sh.max) { this.shoots.splice(i, 1); continue; }
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      var k = sh.life / sh.max, al = Math.sin(Math.PI * k);
      var tx = sh.x - sh.vx * 0.16, ty = sh.y - sh.vy * 0.16;
      var g = x.createLinearGradient(sh.x, sh.y, tx, ty);
      g.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.strokeStyle = g; x.lineWidth = 1.8; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sh.x, sh.y); x.lineTo(tx, ty); x.stroke();
      x.globalAlpha = al; x.drawImage(this.light, sh.x - 6, sh.y - 6, 12, 12); x.globalAlpha = 1;
    }
    for (i = 0; i < this.layers.length; i++) {
      var L = this.layers[i], o = this.layerOffset(L.d, i);
      x.drawImage(L.img, o.x, o.y, L.lw, L.lh);
      if (i === 2) {
        x.save(); x.translate(o.x, o.y);
        grass(x, this.blades, t, '#050b10', 1.3);
        buriti(x, this.palm.x, this.palm.base, this.palm.h, t, this.palm.ph, '#050b10');
        this.drawChalet(x, t);
        x.restore();
      }
    }
    // vaga-lumes
    for (i = 0; i < this.flies.length; i++) {
      var f = this.flies[i];
      var fx = f.x + Math.sin(t * f.sp + f.p) * 30 + this.px * 30, fy = f.y + Math.cos(t * f.sp * 0.8 + f.p) * 16;
      x.globalAlpha = clamp(0.5 + 0.5 * Math.sin(t * 2.2 * f.sp + f.p * 3), 0, 1);
      x.drawImage(this.glow, fx - 8, fy - 8, 16, 16);
      x.fillStyle = '#f6f0a0'; x.fillRect(fx - 1, fy - 1, 2, 2);
    }
    x.globalAlpha = 1;
  };

  // ============ ENTARDECER COM IPÊS ============
  var Golden = inherit(function Golden(c, o) { Scene.call(this, c, o); });
  Golden.prototype.build = function () {
    var w = this.w, h = this.h, r = this.r, dpr = this.dpr;
    var pad = this.pad = Math.max(50, w * 0.05);
    var lw = w + pad * 2, lh = h * 1.15 + pad;
    this.sky = layer(w, h, dpr, function (x) {
      x.fillStyle = vgrad(x, 0, h * 0.8, [[0, '#3c4c60'], [0.4, '#b9845e'], [0.7, '#edbd74'], [1, '#fbe4ad']]);
      x.fillRect(0, 0, w, h);
    });
    this.sunPos = { x: w * (0.22 + (this.seed % 5) * 0.08), y: h * 0.6 };
    var trees = [];
    var defs = [
      { top: 0.55, amp: 0.13, c: ['#d39d72', '#b9805f'], d: 0.12, mesa: 0.72 },
      { top: 0.63, amp: 0.12, c: ['#a86c52', '#8a5644'], d: 0.28, mesa: 0.8 },
      { top: 0.72, amp: 0.1, c: ['#5c4636', '#463528'], d: 0.5, mesa: 0, ipes: 3 },
      { top: 0.82, amp: 0.08, c: ['#34402a', '#28321f'], d: 0.75, mesa: 0, ipes: 2 },
      { top: 0.92, amp: 0.05, c: ['#1d2717', '#151d10'], d: 1, mesa: 0 }
    ];
    this.layers = defs.map(function (d, idx) {
      var v = ridge(r, 0.55, d.mesa);
      var img = layer(lw, lh, dpr, function (x) {
        x.fillStyle = vgrad(x, h * d.top, h, [[0, d.c[0]], [1, d.c[1]]]);
        ridgeShape(x, v, lw, lh, h * d.top, h * d.amp); x.fill();
        if (d.ipes) {
          for (var k = 0; k < d.ipes; k++) {
            var X = lw * (0.12 + r() * 0.76), base = h * d.top + (1 - sample(v, X / lw)) * h * d.amp + 6;
            var crown = ipe(x, r, X, base, h * (idx === 3 ? 0.3 : 0.17));
            crown.layer = idx; trees.push(crown);
          }
        }
      });
      return { d: d.d, top: d.top, amp: d.amp, v: v, img: img, lw: lw, lh: lh };
    });
    this.trees = trees;
    var near = this.layers[4];
    function nearY(X) { return h * near.top + (1 - sample(near.v, X / lw)) * h * near.amp; }
    this.blades = makeBlades(r, Math.round(lw / 4.5), lw, nearY, 10, h * 0.06 + 10);
    this.petals = [];
    for (var i = 0; i < 34; i++) this.petals.push({ tree: i % Math.max(1, trees.length), life: r(), L: 4 + r() * 4, dx: 40 + r() * 120, ph: r() * TAU, rot: r() * TAU });
    this.birds = [];
    for (i = 0; i < 4; i++) this.birds.push({ x: r() * w, y: h * (0.2 + r() * 0.18), s: 0.7 + r() * 0.5, v: 10 + r() * 12, ph: r() * TAU });
    this.haze = softSprite('255,230,180');
  };
  Golden.prototype.render = function () {
    var x = this.ctx, w = this.w, h = this.h, t = this.t, dt = this.dt, i;
    x.drawImage(this.sky, 0, 0, w, h);
    var sx = this.sunPos.x - this.px * 8, sy = this.sunPos.y - this.scroll * 0.05;
    var g = x.createRadialGradient(sx, sy, 0, sx, sy, h * 0.7);
    g.addColorStop(0, 'rgba(255,240,200,.95)'); g.addColorStop(0.15, 'rgba(255,214,140,.45)'); g.addColorStop(1, 'rgba(255,190,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff4d6'; x.beginPath(); x.arc(sx, sy, Math.max(24, h * 0.055), 0, TAU); x.fill();
    birds(x, this.birds, t, dt, w, 'rgba(50,34,24,.6)');
    var offs = [];
    for (i = 0; i < this.layers.length; i++) {
      var L = this.layers[i], o = this.layerOffset(L.d, i);
      offs.push(o);
      x.drawImage(L.img, o.x, o.y, L.lw, L.lh);
      if (i === 1) { x.globalAlpha = 0.35; x.drawImage(this.haze, -w * 0.2, h * 0.55 + o.y * 0.4, w * 1.4, h * 0.25); x.globalAlpha = 1; }
      if (i === 4) {
        x.save(); x.translate(o.x, o.y);
        grass(x, this.blades, t, 'rgba(201,154,69,.85)', 1.3);
        x.restore();
      }
    }
    // pétalas de ipê caindo
    if (this.trees.length) {
      for (i = 0; i < this.petals.length; i++) {
        var p = this.petals[i], tr = this.trees[p.tree], oo = offs[tr.layer];
        p.life += dt / p.L; if (p.life > 1) p.life -= 1;
        var px = tr.x + oo.x + (p.life * p.dx) + Math.sin(t * 2 + p.ph) * 10, py = tr.y + oo.y + p.life * h * 0.32;
        x.save(); x.translate(px, py); x.rotate(p.rot + t * 2);
        x.globalAlpha = Math.sin(Math.PI * p.life) * 0.9; x.fillStyle = '#f5c518';
        x.beginPath(); x.ellipse(0, 0, 3.4, 1.8, 0, 0, TAU); x.fill();
        x.restore();
      }
      x.globalAlpha = 1;
    }
  };

  var TYPES = { dawn: Dawn, falls: Falls, night: Night, golden: Golden };

  // ---------- Gerenciador ----------
  var list = [];
  var pointer = { x: 0, y: 0 };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = e.target.__scene; if (!s) return;
      s.visible = e.isIntersecting;
      if (s.visible && (s.isStatic || reduce) && !s.drawn) { s.renderStatic(); s.drawn = true; }
    });
  }, { rootMargin: '200px 0px' }) : null;

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) {
      var s = e.target.__scene; if (!s || !s.built) return;
      if (s.size() && (s.isStatic || reduce || !s.active)) { s.renderStatic(); }
    });
  }) : null;

  function mount(canvas, o) {
    var C = TYPES[o.type]; if (!C) return null;
    o.isStatic = !!o.isStatic || reduce;
    var s = new C(canvas, o);
    canvas.__scene = s; list.push(s);
    if (io) io.observe(canvas); else { s.visible = true; s.renderStatic(); s.drawn = true; }
    if (ro) ro.observe(canvas);
    if (o.interactive) {
      canvas.addEventListener('pointerdown', function (ev) {
        if (!s.spawn) return;
        var rc = canvas.getBoundingClientRect();
        s.spawn(ev.clientX - rc.left - 60, ev.clientY - rc.top - 40);
      });
    }
    return s;
  }

  function tick(dt) {
    dt = Math.min(dt, 0.05);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.isStatic || !s.visible || !s.active) continue;
      s.px += (pointer.x - s.px) * 0.05; s.py += (pointer.y - s.py) * 0.05;
      if (s.scrollFn) s.scroll = s.scrollFn();
      s.frame(dt);
    }
  }

  window.NSScenes = {
    mount: mount,
    tick: tick,
    pointer: function (x, y) { pointer.x = x; pointer.y = y; },
    list: list
  };
})();
