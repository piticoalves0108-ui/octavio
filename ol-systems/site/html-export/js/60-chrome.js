/**
 * Moldura da página (Header, StickyContact, ContactButton e Analytics):
 * - todos os links [data-cta] abrem contactHref() (WhatsApp, ou o Direct do
 *   Instagram enquanto o número não estiver no CONFIG);
 * - o cabeçalho ganha fundo de vidro depois de 24px de rolagem;
 * - barra do celular / botão flutuante do desktop aparecem depois do topo e
 *   somem perto do fim da página (animações no css/60-chrome.css);
 * - botões principais seguem o mouse, afundam ao apertar e param de pulsar
 *   no primeiro contato;
 * - GA4 e Meta Pixel só carregam se os IDs estiverem no CONFIG; todo clique
 *   em [data-cta] vira evento com as UTMs da visita.
 */
function initChrome() {
  // Cada parte roda isolada: um erro numa não derruba as outras.
  const run = (name, fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`[chrome:${name}]`, err);
    }
  };

  /* ---------- Links de contato ---------- */

  run("links", () => {
    const href = contactHref();
    for (const a of $$("a[data-cta]")) {
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  });

  /* ---------- Cabeçalho: vidro depois de 24px ---------- */

  run("header", () => {
    const header = $('[data-h="header"]');
    if (!header) return;
    let scrolled = null;
    const on = () => {
      const next = window.scrollY > 24;
      if (next === scrolled) return;
      scrolled = next;
      // Mesmas classes do Header.tsx ("border-b" fica sempre).
      for (const c of ["border-line", "bg-ink/70", "backdrop-blur-xl"]) header.classList.toggle(c, next);
      header.classList.toggle("border-transparent", !next);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
  });

  /* ---------- Contato fixo (barra do celular e botão flutuante) ---------- */

  run("sticky", () => {
    const els = [$('[data-h="sticky-bar"]'), $('[data-h="sticky-float"]')].filter(Boolean);
    if (!els.length) return;
    const price = $('[data-h="sticky-price"]');
    if (price) price.textContent = `R$ ${CONFIG.price}`;

    let shown = null;
    const on = () => {
      const past = window.scrollY > window.innerHeight * 0.85;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 160;
      const show = past && !nearEnd;
      if (show === shown) return;
      shown = show;
      for (const el of els) {
        el.dataset.state = show ? "shown" : "hidden";
        // Escondido não recebe foco nem clique (o React tirava do DOM).
        el.toggleAttribute("inert", !show);
        if (show) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", "true");
      }
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
  });

  /* ---------- Botões principais: magnético, aperto e pulso ---------- */

  run("magnetic", () => {
    for (const el of $$('a[data-h="cta-magnetic"]')) {
      // Segue o mouse (toque e caneta ficam parados, como no React).
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.4;
        el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.translate = "0px 0px";
      });

      // whileTap do Motion: afunda (scale .97) enquanto estiver apertado,
      // pelo ponteiro principal ou pela tecla Enter.
      const release = () => {
        el.removeAttribute("data-pressed");
        window.removeEventListener("pointerup", release, true);
        window.removeEventListener("pointercancel", release, true);
      };
      el.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" ? e.button > 0 : e.isPrimary === false) return;
        el.setAttribute("data-pressed", "");
        window.addEventListener("pointerup", release, true);
        window.addEventListener("pointercancel", release, true);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.repeat) el.setAttribute("data-pressed", "");
      });
      el.addEventListener("keyup", (e) => {
        if (e.key === "Enter") release();
      });
      el.addEventListener("blur", release);

      // Pulso: para de vez no primeiro contato (ponteiro em cima ou foco).
      if (el.classList.contains("cta-pulse")) {
        const stop = () => el.classList.remove("cta-pulse");
        el.addEventListener("pointerenter", stop, { once: true });
        el.addEventListener("focus", stop, { once: true });
      }
    }
  });

  /* ---------- Medição: UTMs, GA4, Meta Pixel e cliques de contato ---------- */

  run("analytics", () => {
    const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

    // Guarda as UTMs da primeira visita (bio ou anúncio) para a sessão toda.
    const utms = {};
    try {
      const params = new URLSearchParams(window.location.search);
      const saved = JSON.parse(sessionStorage.getItem("ol_utm") ?? "{}") ?? {};
      for (const k of UTM_KEYS) {
        const v = params.get(k) ?? saved[k];
        if (v) utms[k] = String(v);
      }
      sessionStorage.setItem("ol_utm", JSON.stringify(utms));
    } catch {
      // Navegação privada pode bloquear o sessionStorage: segue sem salvar.
    }

    const { ga4Id, metaPixelId } = CONFIG;

    // GA4 (gtag.js): a fila do dataLayer guarda os eventos até o script chegar.
    if (ga4Id) {
      window.dataLayer = window.dataLayer || [];
      if (typeof window.gtag !== "function") {
        window.gtag = function gtag() {
          window.dataLayer.push(arguments);
        };
      }
      window.gtag("js", new Date());
      window.gtag("config", ga4Id);
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`).catch(() => {});
    }

    // Meta Pixel: o snippet padrão do Facebook, sem eval.
    if (metaPixelId) {
      if (!window.fbq) {
        const n = function fbq() {
          if (n.callMethod) n.callMethod.apply(n, arguments);
          else n.queue.push(arguments);
        };
        window.fbq = n;
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        loadScript("https://connect.facebook.net/en_US/fbevents.js").catch(() => {});
      }
      window.fbq("init", metaPixelId);
      window.fbq("track", "PageView");
    }

    // Clique em qualquer botão de contato (captura: roda antes de abrir a aba).
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target instanceof Element ? e.target.closest("[data-cta]") : null;
        if (!el) return;
        const params = { cta: el.getAttribute("data-cta") ?? "", channel: contactChannel(), ...utms };
        window.gtag?.("event", "whatsapp_click", params);
        window.fbq?.("track", "Contact", params);
      },
      { capture: true },
    );
  });
}
