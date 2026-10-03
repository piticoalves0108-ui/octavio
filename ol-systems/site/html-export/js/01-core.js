/**
 * Funções compartilhadas pelos módulos da página.
 * Todos os arquivos js/*.js são concatenados num único <script type="module">,
 * então cada módulo declara só a sua função init (ex.: initGlobe) no topo e
 * guarda o resto dentro dela.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

/** Link único de todos os botões de contato. */
function contactHref() {
  if (CONFIG.whatsapp) {
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
  }
  return `https://ig.me/m/${CONFIG.instagramHandle}`;
}
const contactChannel = () => (CONFIG.whatsapp ? "whatsapp" : "instagram");

/**
 * Chama onEnter(animate) quando o elemento entra na tela (IntersectionObserver,
 * sem forçar layout). animate = true só se o elemento começou abaixo da tela.
 */
function observeEnter(el, onEnter, { rootMargin = "0px 0px -10% 0px", onBelowAtStart } = {}) {
  let first = true;
  let below = false;
  const io = new IntersectionObserver(
    ([e]) => {
      if (first) {
        first = false;
        below = !e.isIntersecting && e.boundingClientRect.top > 0;
        if (below) onBelowAtStart?.();
      }
      if (e.isIntersecting) {
        io.disconnect();
        onEnter(below);
      }
    },
    { rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Carrega um <script> clássico uma vez só. */
const scriptCache = new Map();
function loadScript(src) {
  if (!scriptCache.has(src)) {
    scriptCache.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.head.appendChild(s);
      }),
    );
  }
  return scriptCache.get(src);
}

/**
 * GSAP + ScrollTrigger + SplitText, carregados sob demanda pelo CDN.
 * Resolve com { gsap, ScrollTrigger, SplitText }. Se o CDN falhar, rejeita:
 * quem usa deve deixar o conteúdo visível sem animação.
 */
let gsapPromise = null;
function loadGsap() {
  if (!gsapPromise) {
    gsapPromise = loadScript(CONFIG.cdn.gsap)
      .then(() => Promise.all([loadScript(CONFIG.cdn.scrollTrigger), loadScript(CONFIG.cdn.splitText)]))
      .then(() => {
        const { gsap, ScrollTrigger, SplitText } = window;
        gsap.registerPlugin(ScrollTrigger, SplitText);
        return { gsap, ScrollTrigger, SplitText };
      });
    gsapPromise.catch(() => {});
  }
  return gsapPromise;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Texto com marcadores {{CONFIRMAR: ...}} → HTML com <mark class="pending">. */
function fillHtml(text) {
  return escapeHtml(text).replace(
    /\{\{CONFIRMAR:\s*([^}]*)\}\}/g,
    (_, what) => `<mark class="pending" title="Informação a confirmar com o dono antes de publicar">a confirmar: ${what}</mark>`,
  );
}

/** "*destaque*" e "_sublinhado_" → [{ text, strong?, underline? }]. */
function parseMarks(text) {
  const tokens = [];
  const re = /(\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) tokens.push({ text: text.slice(last, m.index) });
    const raw = m[0];
    tokens.push(raw.startsWith("*") ? { text: raw.slice(1, -1), strong: true } : { text: raw.slice(1, -1), underline: true });
    last = m.index + raw.length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}

/** Sublinhado verde que se desenha (mesma marcação do componente Underline). */
function underlineHtml(innerHtml, { delayMs, paused } = {}) {
  const style = [delayMs !== undefined ? `--draw-delay:${delayMs}ms` : "", paused ? "--draw-state:paused" : ""].filter(Boolean).join(";");
  return (
    `<span class="draw-underline"${style ? ` style="${style}"` : ""}>${innerHtml}` +
    `<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7 C 25 2, 60 2, 98 5" pathLength="1"></path></svg></span>`
  );
}

/** Reinicia uma animação CSS de classe (equivale a remontar o elemento no React). */
function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* ---------- Conversa no estilo WhatsApp (mesma marcação do componente Chat) ---------- */

const ATTACHMENT_SVG =
  '<span class="mb-[0.4em] block overflow-hidden rounded-[0.6em]"><svg viewBox="0 0 120 60" class="block w-full" aria-label="foto da nova vitrine">' +
  '<rect width="120" height="60" fill="#2c1f33"></rect>' +
  ["#e85d75", "#7cc6a4", "#f2c14e", "#b07cc6"].map((c, i) => `<rect x="${12 + i * 26}" y="26" width="18" height="16" rx="3" fill="${c}"></rect>`).join("") +
  '<rect x="8" y="44" width="104" height="2" fill="#fff" opacity="0.4"></rect></svg></span>';

function bubbleHtml(m) {
  const side = m.from === "client" ? "self-end rounded-tr-sm bg-[#005c4b]" : "self-start rounded-tl-sm bg-[#202c33]";
  const body = m.typing
    ? '<span class="flex gap-[0.3em] py-[0.3em]"><span class="sr-only">digitando</span>' +
      '<span aria-hidden="true" class="typing-dot h-[0.45em] w-[0.45em] rounded-full bg-white/80"></span>'.repeat(3) +
      "</span>"
    : `${m.attachment ? ATTACHMENT_SVG : ""}${escapeHtml(m.text)}<span class="ml-2 inline-block translate-y-0.5 text-[0.75em] text-white/50">${
        m.from === "client" ? "✓✓" : ""
      }</span>`;
  return `<div data-id="${escapeHtml(m.id)}" class="fade-up max-w-[86%] rounded-[0.9em] px-[0.8em] py-[0.55em] leading-snug text-white shadow ${side}">${body}</div>`;
}

/**
 * Atualiza os balões de um [data-h="chat"] como o React faria com keys:
 * balões que continuam ficam como estão; os novos entram com fade-up.
 * msgs: [{ id, from: "client"|"us", text, attachment?, typing? }]
 */
function renderChat(chatRoot, msgs) {
  const box = chatRoot.matches('[data-h="chat-msgs"]') ? chatRoot : $('[data-h="chat-msgs"]', chatRoot);
  if (!box) return;
  const wanted = new Set(msgs.map((m) => m.id));
  for (const el of Array.from(box.children)) if (!wanted.has(el.dataset.id)) el.remove();
  let prev = null;
  for (const m of msgs) {
    let el = $(`:scope > [data-id="${CSS.escape(m.id)}"]`, box);
    if (!el) {
      const tpl = document.createElement("template");
      tpl.innerHTML = bubbleHtml(m);
      el = tpl.content.firstElementChild;
    }
    const ref = prev ? prev.nextElementSibling : box.firstElementChild;
    if (el !== ref) box.insertBefore(el, ref);
    prev = el;
  }
}

/* ---------- Site de exemplo (mesma marcação do componente MiniSite) ---------- */

const MS_DEFAULTS = { saturday: "Sábado: 9h às 13h", cakePrice: "R$ 32", showcase: "a" };

function bakeryShowcaseSvg(variant) {
  const items =
    variant === "a"
      ? ["#c8742b", "#e3b26b", "#8a4b22", "#d99a4e", "#b5622a", "#efc98f"]
      : ["#e85d75", "#f6a5b3", "#7cc6a4", "#f2c14e", "#b07cc6", "#ff8f6b"];
  const soft = "#e9dcc8";
  let rows = "";
  for (const row of [0, 1]) {
    let g = `<rect x="10" y="${34 + row * 26}" width="100" height="2.5" fill="${soft}" opacity="0.6"></rect>`;
    items.slice(row * 3, row * 3 + 3).forEach((c, i) => {
      const inner =
        variant === "a"
          ? `<ellipse cx="0" cy="27" rx="12" ry="7" fill="${c}"></ellipse>`
          : `<rect x="-11" y="16" width="22" height="18" rx="3" fill="${c}"></rect><rect x="-11" y="16" width="22" height="5" rx="2" fill="#fff" opacity="0.7"></rect><circle cx="0" cy="14" r="2.6" fill="#e8344e"></circle>`;
      g += `<g transform="translate(${22 + i * 34} ${row * 26})">${inner}</g>`;
    });
    rows += `<g${variant === "b" ? ' transform="translate(0 3)"' : ""}>${g}</g>`;
  }
  return (
    `<svg viewBox="0 0 120 80" class="h-full w-full" aria-hidden="true">` +
    `<rect width="120" height="80" rx="6" fill="${variant === "a" ? "#3b2a1e" : "#2c1f33"}"></rect>` +
    `<rect x="8" y="8" width="104" height="64" rx="3" fill="${variant === "a" ? "#fdf3e3" : "#fff0f5"}" opacity="0.14"></rect>` +
    rows +
    `<text x="60" y="13" text-anchor="middle" font-size="5.5" fill="#fff" opacity="0.85" font-family="sans-serif">${
      variant === "a" ? "vitrine de pães" : "nova vitrine: doces de festa"
    }</text></svg>`
  );
}

/**
 * Aplica um estado ao site de exemplo [data-h="minisite"][data-theme="bakery"].
 * state: { saturday?, cakePrice?, showcase?: "a"|"b", flash?: "hours"|"price"|"showcase"|null }
 * O brilho "updated-flash" só reinicia quando flash muda ou flashKey muda.
 */
function setMiniSite(root, state = {}) {
  const s = { ...MS_DEFAULTS, ...state };
  const sat = $('[data-h="ms-saturday"]', root);
  const price = $('[data-h="ms-price"]', root);
  const show = $('[data-h="ms-showcase"]', root);
  if (sat && sat.textContent !== s.saturday) sat.textContent = s.saturday;
  if (price && price.textContent !== s.cakePrice) price.textContent = s.cakePrice;
  // O HTML já vem com a vitrine "a" desenhada.
  if (show && (show.dataset.variant ?? "a") !== s.showcase) {
    show.innerHTML = bakeryShowcaseSvg(s.showcase);
    show.dataset.variant = s.showcase;
  }
  const targets = { hours: sat, price, showcase: show };
  const key = `${state.flash ?? ""}:${state.flashKey ?? ""}`;
  if (root.dataset.flashKey === key) return;
  root.dataset.flashKey = key;
  for (const [k, el] of Object.entries(targets)) {
    if (!el) continue;
    if (state.flash === k) restartClass(el, "updated-flash");
    else el.classList.remove("updated-flash");
  }
}

/** Liga/desliga um selo "atualizado agora" (classes iguais às do React). */
function setBadge(el, on) {
  if (!el) return;
  el.classList.toggle("translate-y-0", on);
  el.classList.toggle("opacity-100", on);
  el.classList.toggle("translate-y-2", !on);
  el.classList.toggle("opacity-0", !on);
  el.setAttribute("aria-hidden", on ? "false" : "true");
}

/* ---------- Geometria do globo (igual a lib/globe.ts) ---------- */

const GLOBE = {
  TILT: 0.42,
  PARALLELS: [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75],
  MERIDIANS: Array.from({ length: 12 }, (_, i) => i * 15),
  VIEW: 1.12,
  SPIN_SPEED: 0.00009,
  spinAt: (now) => now * 0.00009,
  meridianEllipse(lon, spin = 0, tilt = 0.42) {
    const l = (lon * Math.PI) / 180 + spin;
    const rot = (Math.atan2(-Math.cos(l), -Math.sin(l) * Math.sin(tilt)) * 180) / Math.PI;
    return { rx: 1, ry: Math.abs(Math.sin(l) * Math.cos(tilt)), rot };
  },
  surfacePoints(count, seed = 7) {
    let s = seed;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    return Array.from({ length: count }, () => {
      const lat = Math.asin(rnd() * 1.6 - 0.8);
      const lon = rnd() * Math.PI * 2;
      return { lat, lon, phase: rnd() };
    });
  },
};
