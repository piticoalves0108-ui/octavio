/**
 * Portfólio (Portfolio): carrossel 3D curvo. Os sites ficam num arco;
 * arrastar, usar as setas ou o teclado gira o carrossel. Clicar num site
 * real abre em nova aba; clicar num site de lado traz ele para o centro.
 * As contas são as mesmas do React (largura vinda do ResizeObserver).
 */
function initPortfolio() {
  const wrap = $('[data-h="carousel"]');
  if (!wrap) return;
  const cards = $$('[data-h="carousel-card"][data-index]', wrap).sort((a, b) => a.dataset.index - b.dataset.index);
  if (!cards.length) return;
  const section = wrap.closest("section") ?? document;
  const prev = $('[data-h="carousel-prev"]', section);
  const next = $('[data-h="carousel-next"]', section);
  const parts = cards.map((card) => {
    const link = $(":scope > a", card);
    const href = link?.getAttribute("href") ?? "#";
    // Item sem URL de verdade aponta para "#portfolio" (só exemplo).
    return { card, shade: $('[data-h="carousel-shade"]', card), link, real: !href.startsWith("#") };
  });
  const last = cards.length - 1;
  const EASE = "transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.8s";

  // Estado (igual aos useState/useRef do React). O HTML vem calculado com largura 1200.
  let index = 0;
  let drag = 0;
  let width = 1200;
  let start = null; // { x, id } do ponteiro que começou o arraste
  let moved = false;

  const clamp = (i) => Math.max(0, Math.min(last, i));
  /** Largura do card e distância entre cards para a largura atual. */
  const geometry = () => {
    const cardW = Math.min(width * (width < 640 ? 0.82 : 0.52), 680);
    return { cardW, step: cardW * 0.78 };
  };

  /** Posiciona os cards. instant = sem transição (primeiro desenho). */
  function render(instant = false) {
    const { cardW, step } = geometry();
    const offset = index - drag / step;
    const current = Math.round(offset);
    parts.forEach(({ card, shade, link }, i) => {
      const d = i - offset;
      const abs = Math.abs(d);
      const s = card.style;
      s.transition = instant || drag ? "none" : EASE;
      s.width = `${cardW}px`;
      s.marginLeft = `${-cardW / 2}px`;
      s.transform = `translateX(${d * step}px) translateZ(${-abs * 160}px) rotateY(${-d * 18}deg)`;
      s.visibility = abs > 2.2 ? "hidden" : "visible";
      s.zIndex = String(10 - Math.round(abs));
      card.setAttribute("aria-hidden", current !== i ? "true" : "false");
      if (shade) {
        if (instant) shade.style.transition = "none";
        shade.style.opacity = String(Math.min(abs * 0.32, 0.85));
      }
      link?.setAttribute("tabindex", current === i ? "0" : "-1");
    });
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === last;
    if (instant) {
      // Devolve as transições no quadro seguinte, depois do primeiro desenho.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          for (const { card, shade } of parts) {
            if (!drag) card.style.transition = EASE;
            if (shade) shade.style.transition = "";
          }
        }),
      );
    }
  }

  const go = (d) => {
    index = clamp(index + d);
    render();
  };

  /* ---------- Botões e teclado ---------- */

  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  /* ---------- Arraste (mouse e toque) ---------- */

  wrap.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX, id: e.pointerId };
    moved = false;
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!start || start.id !== e.pointerId) return;
    // Mouse solto fora do carrossel (sem captura): não segue arrastando no hover.
    if (e.pointerType === "mouse" && !e.buttons) {
      start = null;
      if (drag) {
        drag = 0;
        render();
      }
      return;
    }
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 6 && !moved) {
      moved = true;
      // Só captura depois que virou arraste, para o clique no link continuar funcionando.
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {}
    }
    drag = dx;
    render();
  });
  wrap.addEventListener("pointerup", () => {
    if (!start) return;
    const n = Math.round(-drag / geometry().step);
    index = clamp(index + n);
    drag = 0;
    start = null;
    render();
  });
  wrap.addEventListener("pointercancel", () => {
    drag = 0;
    start = null;
    render();
  });

  /* ---------- Clique nos sites ---------- */

  parts.forEach(({ link, real }, i) => {
    if (!link) return;
    link.addEventListener("click", (e) => {
      // Clique de teclado (Enter) nunca conta como arraste.
      const dragged = moved && e.detail !== 0;
      if (dragged || !real) e.preventDefault();
      if (!dragged && i !== index) {
        index = i;
        render();
      }
    });
  });

  /* ---------- Largura (ResizeObserver, como no React) ---------- */

  let first = true;
  const setWidth = (w) => {
    if (!w) return;
    if (!first && w === width) return;
    width = w;
    render(first);
    first = false;
  };
  if ("ResizeObserver" in window) {
    new ResizeObserver(([e]) => setWidth(e.contentRect.width)).observe(wrap);
  } else {
    setWidth(wrap.clientWidth);
    window.addEventListener("resize", () => setWidth(wrap.clientWidth));
  }
}
