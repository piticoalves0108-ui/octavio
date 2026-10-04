/**
 * Topo da página: título com teste A/B (?titulo=2 ou ?titulo=3), a
 * mini-história em loop (pedido no WhatsApp → "Feito!" → site muda) e a
 * inclinação dos aparelhos com o mouse. O globo fica em initGlobe.
 */
function initHero() {
  const reduce = prefersReducedMotion();

  /* ---------- Título (teste A/B) ---------- */

  // Mesma marcação do HeroTitle: destaque não quebra, sublinhado verde com atraso.
  const titleHtml = (text) =>
    parseMarks(text)
      .map((t) =>
        t.underline
          ? underlineHtml(`<span class="text-white">${escapeHtml(t.text)}</span>`, { delayMs: 1100 })
          : t.strong
            ? `<span class="whitespace-nowrap text-white">${escapeHtml(t.text)}</span>`
            : `<span>${escapeHtml(t.text)}</span>`,
      )
      .join("");

  const title = $('h1[data-h="hero-title"]');
  const titles = CONFIG.heroTitles ?? [];
  const n = Number(new URLSearchParams(window.location.search).get("titulo"));
  // Título 1 (ou parâmetro ausente/inválido) é o que já veio no HTML: não mexe.
  if (title && Number.isInteger(n) && n > 1 && n <= titles.length) {
    title.innerHTML = titleHtml(titles[n - 1]);
    // Equivale ao key={variant} do React: a varredura recomeça com o título novo.
    restartClass(title, "hero-wipe");
  }

  /* ---------- Mini-história em loop ---------- */

  const visual = $('[data-h="hero-visual"]');
  const phone = $('[data-h="hero-phone"]');
  const chat = phone && $('[data-h="chat"]', phone);
  const site = visual && $('[data-h="minisite"]', visual);
  const badge = $('[data-h="hero-badge"]');

  if (chat || site) {
    const ask = CONFIG.demo.scenarios[0];
    const saturday = ask.update?.saturday ?? "Sábado: 8h às 14h";
    const done = [
      { id: "a", from: "client", text: ask.ask },
      { id: "b", from: "us", text: ask.reply },
    ];
    const showMsgs = (msgs) => chat && renderChat(chat, msgs);
    // O selo "atualizado agora" acende junto com o brilho no site.
    const showSite = (state) => {
      if (site) setMiniSite(site, state);
      setBadge(badge, Boolean(state.flash));
    };

    if (reduce) {
      // Sem movimento: só o estado final, sem brilho.
      showMsgs(done);
      showSite({ saturday });
    } else {
      let timers = [];
      let key = 0;
      const stop = () => {
        timers.forEach(clearTimeout);
        timers = [];
      };
      const run = () => {
        stop();
        showMsgs([]);
        showSite({});
        const at = (ms, fn) => timers.push(setTimeout(fn, ms));
        at(2200, () => showMsgs([done[0]]));
        at(3300, () => showMsgs([done[0], { id: "t", from: "us", text: "", typing: true }]));
        at(4700, () => showMsgs(done));
        at(5100, () => showSite({ saturday, flash: "hours", flashKey: ++key }));
        at(11000, run);
      };

      // Fora da tela o loop para; ao voltar, a história recomeça do início.
      const watched = visual ?? phone ?? site;
      if (watched && "IntersectionObserver" in window) {
        let running = false;
        new IntersectionObserver(([e]) => {
          if (e.isIntersecting && !running) {
            running = true;
            run();
          } else if (!e.isIntersecting && running) {
            running = false;
            stop();
          }
        }).observe(watched);
      } else {
        run();
      }
    }
  }

  /* ---------- Inclinação dos aparelhos com o mouse ---------- */

  const tilt = $('[data-h="hero-tilt"]');
  if (tilt && !reduce) {
    let raf = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const x = e.clientX / window.innerWidth - 0.5;
          const y = e.clientY / window.innerHeight - 0.5;
          tilt.style.setProperty("--ry", `${x * 10}deg`);
          tilt.style.setProperty("--rx", `${-y * 8}deg`);
        });
      },
      { passive: true },
    );
  }
}
