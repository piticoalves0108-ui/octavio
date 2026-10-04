/**
 * "Pediu, atualizou" (UpdateDemo): três pedidos no WhatsApp (horário, preço,
 * foto da vitrine) viram, na hora, mudanças no site de exemplo.
 * - Desktop: o scroll dirige a cena (seção fixa com pin do ScrollTrigger).
 * - Celular, "reduzir movimento" ou sem GSAP: avança sozinha enquanto a seção
 *   está na tela, com abas para escolher o exemplo.
 */
function initDemo() {
  const section = $('section[data-h="demo"]');
  const S = CONFIG.demo?.scenarios ?? [];
  if (!section || !S.length) return;

  // Cada cena tem 3 fases: 0 = pedido enviado, 1 = digitando, 2 = feito + site atualizado.
  const PHASES = 3;
  const TOTAL = S.length * PHASES;

  const stage = $('[data-h="demo-stage"]', section);
  const chatDesk = $('[data-h="demo-chat-desktop"] [data-h="chat"]', section);
  const chatMob = $('[data-h="demo-chat-mobile"] [data-h="chat"]', section);
  const site = $('[data-h="minisite"]', section);
  const badge = $('[data-h="demo-badge"]', section);
  const tabs = $$('button[data-h="demo-tab"][data-step]', section);
  const bars = $$('[data-h="demo-progress"]', section);

  // Mesmas classes do React para a aba escolhida e as outras.
  const TAB_ON = ["border-white", "bg-white", "text-ink"];
  const TAB_OFF = ["border-line-strong", "text-muted", "hover:text-fg"];

  // Qual parte do site brilha em cada tipo de mudança (pela chave de "update").
  const FLASH_OF = { saturday: "hours", cakePrice: "price", showcase: "showcase" };
  const flashFor = (s) => FLASH_OF[Object.keys(S[s].update ?? {})[0]] ?? ["hours", "price", "showcase"][s] ?? null;

  /** Conversa e site para uma cena/fase (igual ao stateFor do React). */
  function stateFor(step, phase) {
    const msgs = [];
    const state = {};
    for (let s = 0; s <= step; s++) {
      const p = s < step ? 2 : phase;
      msgs.push({ id: `a${s}`, from: "client", text: S[s].ask, attachment: S[s].attachment });
      if (p === 1) msgs.push({ id: `t${s}`, from: "us", text: "", typing: true });
      if (p >= 2) {
        msgs.push({ id: `b${s}`, from: "us", text: S[s].reply });
        Object.assign(state, S[s].update);
      }
    }
    if (phase === 2) {
      state.flash = flashFor(step);
      state.flashKey = step + 1;
    }
    // No celular cabem ~4 balões: mostra só os últimos.
    return { msgs: msgs.slice(-4), site: state };
  }

  /* ---------- Estado e desenho ---------- */

  // O HTML já vem no estado { step: 0, phase: 0 }.
  let pos = { step: 0, phase: 0 };

  function render() {
    const { msgs, site: state } = stateFor(pos.step, pos.phase);
    if (chatDesk) renderChat(chatDesk, msgs);
    if (chatMob) renderChat(chatMob, msgs.slice(-2));
    if (site) setMiniSite(site, state);
    setBadge(badge, Boolean(state.flash));
    for (const tab of tabs) {
      const on = Number(tab.dataset.step) === pos.step;
      tab.setAttribute("aria-selected", String(on));
      tab.classList.remove(...(on ? TAB_OFF : TAB_ON));
      tab.classList.add(...(on ? TAB_ON : TAB_OFF));
    }
    bars.forEach((bar, i) => {
      const x = i < pos.step ? 1 : i > pos.step ? 0 : (pos.phase + 1) / PHASES;
      bar.style.transform = `scaleX(${x})`;
    });
  }

  // Só redesenha quando a cena ou a fase muda.
  function setPos(step, phase) {
    if (pos.step === step && pos.phase === phase) return;
    pos = { step, phase };
    render();
  }

  /* ---------- HTML pronto × CONFIG ---------- */

  const norm = (s) => s.replace(/\s+/g, " ").trim();

  // Marca os balões que vieram no HTML para o renderChat reaproveitá-los (como
  // a hidratação do React: sem repetir a entrada). Se o texto do CONFIG mudou,
  // troca os balões já.
  function adoptChat(chat, msgs) {
    const box = $('[data-h="chat-msgs"]', chat);
    if (!box) return;
    const kids = Array.from(box.children);
    const tpl = document.createElement("template");
    const same =
      kids.length === msgs.length &&
      msgs.every((m, i) => {
        tpl.innerHTML = bubbleHtml(m);
        return norm(tpl.content.textContent) === norm(kids[i].textContent);
      });
    if (same) msgs.forEach((m, i) => (kids[i].dataset.id = m.id));
    else {
      kids.forEach((k) => k.remove());
      renderChat(chat, msgs);
    }
  }

  const initial = stateFor(0, 0).msgs;
  if (chatDesk) adoptChat(chatDesk, initial);
  if (chatMob) adoptChat(chatMob, initial.slice(-2));

  // Rótulos das abas vêm do CONFIG; abas/barras sem cena somem.
  for (const tab of tabs) {
    const sc = S[Number(tab.dataset.step)];
    if (!sc) {
      tab.hidden = true;
      continue;
    }
    const label = Array.from(tab.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
    if (norm(label.map((n) => n.textContent).join("")) !== norm(sc.tab)) {
      label.forEach((n) => n.remove());
      tab.append(sc.tab);
    }
  }
  bars.forEach((bar, i) => {
    if (i >= S.length && bar.parentElement) bar.parentElement.hidden = true;
  });

  /* ---------- Modo automático (celular / reduzir movimento / sem GSAP) ---------- */

  let auto = true;
  // Quem toca numa aba assume o controle: a cena para de avançar sozinha.
  let userPaused = false;
  let stopAuto = null;
  // Pin do desktop ({ start, end } do ScrollTrigger) enquanto existir.
  let pin = null;

  // Equivale ao useEffect([auto, userPaused]) do React.
  function syncAuto() {
    stopAuto?.();
    stopAuto = null;
    if (!auto || userPaused) return;
    if (prefersReducedMotion()) {
      setPos(0, 2);
      return;
    }
    let timer;
    // Avança sozinha enquanto a seção está na tela.
    const io = new IntersectionObserver(
      ([e]) => {
        clearInterval(timer);
        if (!e.isIntersecting) return;
        timer = setInterval(() => {
          const i = (pos.step * PHASES + pos.phase + 1) % TOTAL;
          setPos(Math.floor(i / PHASES), i % PHASES);
        }, 1500);
      },
      { threshold: 0.35 },
    );
    io.observe(section);
    stopAuto = () => {
      io.disconnect();
      clearInterval(timer);
    };
  }

  function setAuto(on) {
    if (auto === on) return;
    auto = on;
    syncAuto();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const i = Number(tab.dataset.step);
      if (!auto) {
        // No desktop, rola até o ponto da cena correspondente.
        if (pin) window.scrollTo({ top: pin.start + ((i * PHASES + 2.5) / TOTAL) * (pin.end - pin.start), behavior: "smooth" });
        return;
      }
      if (!userPaused) {
        userPaused = true;
        syncAuto();
      }
      setPos(i, 2);
    });
  }

  syncAuto();

  /* ---------- Desktop: o scroll dirige a cena ---------- */

  if (prefersReducedMotion() || !stage) return;
  loadGsap().then(
    ({ gsap, ScrollTrigger }) => {
      const fromProgress = (p) => {
        const i = Math.min(TOTAL - 1, Math.floor(p * TOTAL));
        setPos(Math.floor(i / PHASES), i % PHASES);
      };
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        setAuto(false);
        const st = ScrollTrigger.create({
          trigger: stage,
          start: "top top+=72",
          end: "+=1800",
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => fromProgress(self.progress),
        });
        pin = st;
        // Ao voltar de uma tela estreita, a cena acompanha o scroll de cara.
        fromProgress(st.progress);
        return () => {
          st.kill();
          pin = null;
          setAuto(true);
        };
      });
      // O pin acrescenta espaço na página: recalcula as posições dos outros
      // ScrollTriggers no quadro seguinte (o SmoothScroll fazia isso no React).
      if (pin) requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    // Sem GSAP (CDN fora): fica no modo automático, que já está rodando.
    () => {},
  );
}
