/**
 * Rolagem e entradas (SmoothScroll, Reveal, SectionTitle, Comparison,
 * Pricing e HowItWorks):
 * - Lenis (rolagem suave) sincronizado com o ScrollTrigger e a posição do
 *   cursor em --mx/--my para a grade de pontos do fundo;
 * - blocos que sobem e aparecem, títulos que entram palavra por palavra,
 *   linhas do comparativo, contador do preço e a linha do tempo dos passos.
 * Com "reduzir movimento" nada se mexe. Se o CDN falhar, a rolagem é a
 * nativa e tudo aparece sem animação (nada fica escondido).
 */
function initScrollFx() {
  const reduce = prefersReducedMotion();
  const root = document.documentElement;

  /* ---------- Grade de pontos: o brilho segue o cursor ---------- */

  window.addEventListener(
    "pointermove",
    (e) => {
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    },
    { passive: true },
  );

  /* ---------- Lenis (rolagem suave) ---------- */

  // Links "#secao" ficam com o Lenis (desliza, descontando o cabeçalho);
  // sem ele, o navegador rola sozinho (scroll-behavior: smooth do CSS e
  // scroll-margin-top em css/50-scrollfx.css).
  // Quem abre a página com #secao (ex.: index.html#preco) precisa cair na
  // seção mesmo depois que o pin da demo e o Lenis mudam as posições. Só vale
  // até a pessoa mexer na página por conta própria.
  let lenis = null;
  let userMoved = false;
  for (const n of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    window.addEventListener(n, () => (userMoved = true), { once: true, passive: true });
  }
  const goToHash = () => {
    if (userMoved || location.hash.length < 2) return;
    let el = null;
    try {
      el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {}
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: "instant" });
  };

  if (!reduce) {
    // Lenis e GSAP baixam em paralelo; sem Lenis, a rolagem segue nativa.
    const lenisReady = loadScript(CONFIG.cdn.lenis).then(
      () => window.Lenis,
      () => null,
    );
    loadGsap().then(
      async ({ gsap, ScrollTrigger }) => {
        const Lenis = await lenisReady;
        if (typeof Lenis === "function") {
          lenis = new Lenis({ duration: 1.1, anchors: { offset: -72 } });
          lenis.on("scroll", ScrollTrigger.update);
          gsap.ticker.add((time) => lenis.raf(time * 1000));
          gsap.ticker.lagSmoothing(0);
        }
        // As seções criam seus ScrollTriggers antes; um refresh no quadro
        // seguinte recalcula as posições já com o espaço do pin.
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          goToHash();
        });
      },
      // Sem CDN: rolagem nativa (o navegador já cuida do #secao).
      () => {},
    );
  }

  // A página pode mudar de altura quando tudo termina de carregar (imagens,
  // fontes): recalcula os ScrollTriggers, se o GSAP já estiver na página.
  const refresh = () => {
    if (window.ScrollTrigger)
      loadGsap().then(({ ScrollTrigger }) => {
        ScrollTrigger.refresh();
        goToHash();
      }, () => {});
  };
  if (document.readyState !== "complete") window.addEventListener("load", refresh, { once: true });
  document.fonts?.ready.then(refresh, () => {});

  /* ---------- Reveal: sobe e aparece ao entrar na tela (só CSS) ---------- */

  if (!reduce) {
    for (const el of $$('[data-h="reveal"]')) {
      observeEnter(el, () => el.setAttribute("data-reveal", "in"), {
        onBelowAtStart: () => el.setAttribute("data-reveal", "hidden"),
      });
    }
  }

  /* ---------- Títulos de seção: palavra por palavra (SplitText) ---------- */

  // Cada título só é dividido quando chega na tela (o trabalho fica
  // espalhado pela rolagem em vez de pesar no carregamento).
  for (const el of $$('h2[data-h="section-title"]')) {
    const underline = $(".draw-underline", el);
    const drawUnderline = () => underline?.style.setProperty("--draw-state", "running");
    if (reduce) {
      drawUnderline();
      continue;
    }
    const show = () => el.removeAttribute("data-title");
    observeEnter(
      el,
      (animate) => {
        if (!animate) return drawUnderline();
        let shown = false;
        // Plano B: GSAP demorou ou falhou → o título aparece parado.
        const fallback = () => {
          clearTimeout(timer);
          if (shown) return;
          shown = true;
          show();
          drawUnderline();
        };
        const timer = setTimeout(fallback, 2000);
        loadGsap()
          .then(({ gsap, SplitText }) => {
            clearTimeout(timer);
            // Já apareceu pelo plano B: não esconde de novo para animar.
            if (shown) return;
            const split = SplitText.create(el, {
              type: "words",
              mask: "words",
              wordsClass: "sw",
              // O sublinhado fica inteiro (não quebra a palavra destacada).
              ignore: ".draw-underline svg",
            });
            gsap.from(split.words, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.035, onStart: show });
            shown = true;
            drawUnderline();
          })
          .catch(fallback);
      },
      { rootMargin: "0px 0px -12% 0px", onBelowAtStart: () => el.setAttribute("data-title", "hidden") },
    );
  }

  /* ---------- Comparativo: linhas entram em sequência ---------- */

  const table = $('[data-h="comparison"]');
  if (table && !reduce) {
    const rows = $$("[data-row]", table);
    const showRows = () =>
      rows.forEach((r) => {
        r.style.opacity = "";
        r.style.visibility = "";
        r.style.transform = "";
      });
    observeEnter(
      table,
      (animate) => {
        if (!animate) return;
        let done = false;
        // Plano B: sem GSAP as linhas aparecem paradas.
        const fallback = () => {
          clearTimeout(timer);
          if (done) return;
          done = true;
          showRows();
        };
        const timer = setTimeout(fallback, 2500);
        loadGsap()
          .then(({ gsap }) => {
            clearTimeout(timer);
            if (done) return;
            gsap
              .timeline()
              .fromTo(rows, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.09 })
              .from($$("[data-mark]", table), { scale: 0, duration: 0.6, ease: "back.out(3)", stagger: 0.05 }, 0.25);
            done = true;
          })
          .catch(fallback);
      },
      { rootMargin: "0px 0px -20% 0px", onBelowAtStart: () => rows.forEach((r) => (r.style.opacity = "0")) },
    );
  }

  /* ---------- Preço: contador R$ 0 → R$ 250, depois entra o "/mês" ---------- */

  const num = $('[data-h="price-num"]');
  const per = $('[data-h="price-per"]');
  if (num) {
    // O valor é o que está escrito na página (troque o preço direto no HTML).
    const final = num.textContent.trim();
    const target = Number(final.replace(/\D/g, "")) || 0;
    if (!reduce) {
      const restore = () => {
        num.textContent = final;
        if (per) for (const p of ["opacity", "visibility", "transform"]) per.style[p] = "";
      };
      observeEnter(
        num,
        (animate) => {
          if (!animate) return;
          loadGsap()
            .then(({ gsap }) => {
              const o = { v: 0 };
              num.textContent = "0";
              const tl = gsap.timeline();
              tl.to(o, {
                v: target,
                duration: 1.6,
                ease: "expo.out",
                onUpdate: () => {
                  num.textContent = String(Math.round(o.v));
                },
                onComplete: () => {
                  num.textContent = final;
                },
              });
              if (per) tl.from(per, { x: -12, autoAlpha: 0, duration: 0.6, ease: "expo.out" }, "-=0.7");
            })
            .catch(restore);
        },
        { rootMargin: "0px 0px -20% 0px" },
      );
    }
  }

  /* ---------- Como funciona: a linha se desenha e acende cada passo ---------- */

  const list = $('ol[data-h="steps"]');
  if (list) {
    const steps = $$(":scope > li[data-step]", list);
    const line = $(":scope > [data-line]", list);
    const allOn = () => {
      steps.forEach((s) => s.classList.add("is-on"));
      if (line) line.style.transform = "";
    };
    if (reduce) allOn();
    else {
      loadGsap()
        .then(({ gsap, ScrollTrigger }) => {
          if (line) {
            gsap.fromTo(
              line,
              { scaleY: 0 },
              { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 70%", end: "bottom 60%", scrub: 0.6 } },
            );
          }
          for (const step of steps) {
            ScrollTrigger.create({ trigger: step, start: "top 68%", toggleClass: { targets: step, className: "is-on" } });
          }
        })
        // Sem GSAP: todos os passos acesos e a linha inteira.
        .catch(allOn);
    }
  }
}
