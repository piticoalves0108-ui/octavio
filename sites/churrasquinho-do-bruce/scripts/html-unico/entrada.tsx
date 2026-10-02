/**
 * Entrada do "site em um arquivo só" (npm run html).
 *
 * O HTML vem do build de produção (renderizado no servidor). Este script
 * substitui a parte React/Next no navegador: liga a MESMA cena 3D
 * (components/three) e o MESMO motor de animação (lib/motor) sobre o HTML
 * estático, e recria em JS puro o preloader, o "Pedir agora", o menu mobile,
 * o status de horário, o botão flutuante, o tilt e o efeito magnético.
 */
import { createRoot } from "react-dom/client";
import Experiencia from "@/components/three/Experiencia";
import { CAMADAS, cena, ENTRADAS, pedirFrame, PECAS, registrarAncora, type SecaoCena } from "@/lib/cena";
import { statusHorario } from "@/lib/horario";
import { linkComoChegar, linkIfood, linkTelefone, linkWhatsApp } from "@/lib/links";
import { carregarMotor } from "@/lib/motor";
import { palco } from "@/lib/palco";
import { negocio } from "@/content/negocio";

const $ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => raiz.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => Array.from(raiz.querySelectorAll<T>(s));
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- âncoras
$$("[data-ancora]").forEach((el) => registrarAncora(el.dataset.ancora!, el));
$$("[data-secao-cena]").forEach((el) => {
  const secao = el.dataset.secaoCena as SecaoCena;
  new IntersectionObserver(
    ([e]) => {
      cena.secoes[secao] = e.isIntersecting;
      pedirFrame();
    },
    { rootMargin: "10% 0px 10% 0px" },
  ).observe(el);
});

// ---------------------------------------------------------------- links internos
$$<HTMLAnchorElement>("a[href]").forEach((a) => {
  const h = a.getAttribute("href")!;
  if (h.startsWith("/#")) a.setAttribute("href", h.slice(1));
  else if (h === "/cardapio") a.setAttribute("href", "#cardapio");
  else if (h === "/") a.setAttribute("href", "#inicio");
});

// ---------------------------------------------------------------- horário
function atualizarStatus() {
  const s = statusHorario();
  $$('p[aria-live="polite"]').forEach((p) => {
    const [ponto, texto] = Array.from(p.children) as HTMLElement[];
    if (texto) texto.textContent = s.texto;
    if (ponto) {
      ponto.style.background = s.aberto ? "#FFB347" : "#8A8580";
      ponto.style.boxShadow = s.aberto ? "0 0 12px 2px rgba(255,179,71,.7)" : "none";
    }
  });
}
atualizarStatus();
setInterval(atualizarStatus, 60_000);

// ---------------------------------------------------------------- preloader
function preloader() {
  const html = document.documentElement;
  const el = $("#preloader");
  if (!el || html.dataset.preloader === "off") {
    (window as { __brasaAcesa?: boolean }).__brasaAcesa = true;
    return;
  }
  const numero = $("p.titulo span", el);
  const chama = $<SVGGElement>("svg > g", el);
  const barra = $("span > span", el);
  let atual = 0;
  const inicio = performance.now();
  const tique = () => {
    const alvo = Math.min(100, ((performance.now() - inicio) / 1400) * 100);
    atual += Math.max((alvo - atual) * 0.12, 0.4);
    atual = Math.min(atual, alvo);
    const t = atual / 100;
    if (numero) numero.textContent = String(Math.round(atual));
    chama?.setAttribute("transform", `translate(40 92) scale(${0.18 + 0.82 * t}) translate(-40 -92)`);
    if (barra) barra.style.transform = `scaleX(${t})`;
    if (atual >= 100) {
      el.dataset.saindo = "true";
      try {
        sessionStorage.setItem("brasa-acesa", "1");
      } catch {}
      setTimeout(() => window.dispatchEvent(new Event("brasa:acesa")), 260);
      setTimeout(() => {
        html.dataset.preloader = "off";
        (window as { __brasaAcesa?: boolean }).__brasaAcesa = true;
      }, 900);
      return;
    }
    requestAnimationFrame(tique);
  };
  requestAnimationFrame(tique);
}
preloader();

// ---------------------------------------------------------------- dialogs
const estiloDialog = document.createElement("style");
estiloDialog.textContent = "dialog::backdrop{background:rgba(18,18,18,.8);backdrop-filter:blur(4px)}dialog{position:fixed}";
document.head.appendChild(estiloDialog);

function criarDialog(conteudo: string, tela = false) {
  const d = document.createElement("dialog");
  d.setAttribute("aria-label", tela ? "Menu" : "Como você quer pedir?");
  d.style.cssText = tela
    ? "inset:0;width:100%;max-width:none;height:100dvh;max-height:none;margin:0;border:0;padding:0;background:#121212;color:#F2EDE4"
    : "margin:auto;width:min(calc(100vw - 2rem),34rem);border:1px solid #24211f;border-radius:1.5rem;padding:2rem;background:#191817;color:#F2EDE4;box-shadow:0 40px 120px -20px rgba(255,90,31,.35)";
  d.innerHTML = `${conteudo}<button type="button" data-fechar aria-label="Fechar" style="position:absolute;right:1rem;top:1rem;width:2.75rem;height:2.75rem;border-radius:999px;color:#8A8580;font-size:1.5rem;line-height:1">×</button>`;
  d.addEventListener("click", (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo === d && !tela) d.close();
    if (alvo.closest("[data-fechar]") || alvo.closest("a[href^='#']")) d.close();
  });
  document.body.appendChild(d);
  return d;
}

const opcao = (href: string, titulo: string, texto: string, destaque = false, externo = true) =>
  `<li><a href="${href}" ${externo ? 'target="_blank" rel="noopener noreferrer"' : ""} style="display:flex;align-items:center;gap:1rem;min-height:4rem;border-radius:1rem;padding:.75rem 1rem;border:1px solid ${destaque ? "#FF5A1F" : "#24211f"};background:${destaque ? "#FF5A1F" : "transparent"};color:${destaque ? "#121212" : "#F2EDE4"}"><span style="display:flex;flex-direction:column"><b style="font-size:1.125rem">${titulo}</b><span style="font-size:.875rem;opacity:.8">${texto}</span></span><span style="margin-left:auto">→</span></a></li>`;

const dialogPedido = criarDialog(`
  <p class="titulo titulo-md" style="padding-right:2.5rem">Como você quer pedir?</p>
  <p style="color:#8A8580;margin-top:.5rem">Escolhe o jeito mais fácil. A brasa já tá acesa.</p>
  <ul style="display:flex;flex-direction:column;gap:.75rem;margin-top:1.5rem">
    ${opcao(linkWhatsApp, "WhatsApp", "Mensagem pronta, é só mandar.", true)}
    ${opcao(linkIfood, "iFood", "Delivery pelo iFood.")}
    ${opcao(linkTelefone, "Ligar", negocio.whatsapp.exibicao, false, false)}
  </ul>
  <p style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #24211f;color:#8A8580;font-size:.875rem">
    Ou vem comer aqui: ${negocio.endereco.linha}, ${negocio.endereco.referencia.replace(/^E/, "e")}.
    <a href="${linkComoChegar}" target="_blank" rel="noopener noreferrer" style="color:#FFB347;font-weight:600;text-decoration:underline">Como chegar</a>
  </p>`);

const dialogMenu = criarDialog(
  `<nav aria-label="Menu mobile" class="moldura" style="padding-top:6rem"><ul>${$$<HTMLAnchorElement>('header nav[aria-label="Principal"] a')
    .map((a, i) => `<li style="border-bottom:1px solid #24211f"><a href="${a.getAttribute("href")}" class="titulo" style="display:flex;gap:1rem;align-items:baseline;padding:1rem 0;font-size:3.25rem;line-height:1"><span style="font:600 .875rem var(--font-barlow);color:#FF5A1F">0${i + 1}</span>${a.textContent}</a></li>`)
    .join("")}</ul>
    <a href="${linkWhatsApp}" target="_blank" rel="noopener noreferrer" class="botao botao-brasa" style="margin-top:2rem;width:100%">Pedir no WhatsApp</a></nav>`,
  true,
);

$$<HTMLButtonElement>("button").forEach((b) => {
  if (b.textContent?.trim() === "Pedir agora") b.addEventListener("click", () => dialogPedido.showModal());
  if (b.getAttribute("aria-label") === "Abrir menu") b.addEventListener("click", () => dialogMenu.showModal());
});

// ---------------------------------------------------------------- header + whatsapp flutuante
const header = $("header");
const flutuante = $<HTMLAnchorElement>('a[aria-label="Pedir no WhatsApp"]');
function aoRolar() {
  const y = scrollY;
  if (header) {
    header.style.background = y > 24 ? "rgba(18,18,18,.8)" : "";
    header.style.backdropFilter = y > 24 ? "blur(12px)" : "";
  }
  if (flutuante) {
    const vis = y > innerHeight * 0.7;
    flutuante.style.opacity = vis ? "1" : "0";
    flutuante.style.transform = vis ? "none" : "translateY(1.5rem)";
    flutuante.style.pointerEvents = vis ? "auto" : "none";
    flutuante.tabIndex = vis ? 0 : -1;
    flutuante.setAttribute("aria-hidden", String(!vis));
  }
}
addEventListener("scroll", aoRolar, { passive: true });
aoRolar();

// ---------------------------------------------------------------- magnético + tilt (só mouse)
if (!reduzido) {
  $$(".botao").forEach((b) => {
    b.style.transition += ", transform .35s cubic-bezier(.22,1,.36,1)";
    b.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });
  $$(".cartao-item").forEach((c) => {
    c.style.transition = "transform .4s cubic-bezier(.22,1,.36,1)";
    c.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 11}deg) rotateY(${(px - 0.5) * 14}deg)`;
      c.style.setProperty("--brilho-x", `${px * 100}%`);
      c.style.setProperty("--brilho-y", `${py * 100}%`);
    });
    c.addEventListener("pointerleave", () => (c.style.transform = ""));
  });
}

// ---------------------------------------------------------------- 3D
const hero = $("#inicio");
hero?.addEventListener("pointerdown", (e) => {
  if ((e.target as HTMLElement).closest("a, button")) return;
  cena.ponteiro.x = (e.clientX / innerWidth) * 2 - 1;
  cena.ponteiro.y = -((e.clientY / innerHeight) * 2 - 1);
  cena.abanar = 1;
  pedirFrame();
});
addEventListener(
  "pointermove",
  (e) => {
    if (e.pointerType !== "mouse") return;
    cena.ponteiro.x = (e.clientX / innerWidth) * 2 - 1;
    cena.ponteiro.y = -((e.clientY / innerHeight) * 2 - 1);
    cena.ponteiro.ativo = true;
  },
  { passive: true },
);

function temWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

let iniciado = false;
const EVENTOS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"];
function iniciar3D() {
  if (iniciado || !Object.values(cena.secoes).some(Boolean)) return;
  iniciado = true;
  EVENTOS.forEach((ev) => removeEventListener(ev, iniciar3D));
  if (!temWebGL()) return;
  const mobile = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;
  const raiz = document.createElement("div");
  raiz.setAttribute("aria-hidden", "true");
  raiz.style.cssText = "position:fixed;inset:0 0 auto 0;height:100lvh;z-index:0;pointer-events:none";
  document.body.prepend(raiz);
  cena.intro = 0;
  palco.set("carregando");
  createRoot(raiz).render(<Experiencia mobile={mobile} onPronto={() => palco.set("3d")} onFallback={() => palco.set("poster")} />);
}
if (!reduzido) EVENTOS.forEach((ev) => addEventListener(ev, iniciar3D, { passive: true }));

// ---------------------------------------------------------------- GSAP: scroll + títulos
carregarMotor().then(({ gsap, SplitText, ScrollTrigger }) => {
  const st = (trigger: Element, extra: object = {}) => ({ trigger, start: "top bottom", end: "bottom bottom", scrub: true, ...extra });

  if (!reduzido) {
    // Hero: o espeto sai da grelha.
    if (hero) gsap.fromTo(cena, { saida: 0 }, { saida: 1, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

    // Espetinhos: em pé, vista explodida, cards entram.
    const esp = $("#espetinhos");
    if (esp) {
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: st(esp) });
      tl.fromTo(cena, { vertical: 0 }, { vertical: 1, duration: 0.26, ease: "power2.inOut" }, 0.06);
      tl.fromTo(cena, { vareta: 0 }, { vareta: 1, duration: 0.18, ease: "power2.in" }, 0.32);
      PECAS.forEach((p, i) => tl.fromTo(cena.pecas, { [p]: 0 }, { [p]: 1, duration: 0.2, ease: "power3.inOut" }, 0.34 + i * 0.05));
      $$(".linha-espetinho", esp).forEach((linha, i) => {
        tl.from($(".cartao-item", linha), { opacity: 0, x: 48, duration: 0.14, ease: "power2.out" }, 0.42 + i * 0.05);
        tl.from($(".miniatura", linha), { opacity: 0, scale: 0.4, rotate: -40, duration: 0.14, ease: "back.out(1.6)" }, 0.38 + i * 0.05);
      });
      tl.to({}, { duration: 0.001 }, 1);
    }

    // Hambúrguer montado pela timeline.
    const hamb = $('[data-secao-cena="hamburguer"]');
    if (hamb) {
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: st(hamb) });
      tl.fromTo(cena, { fusao: 0 }, { fusao: 1, duration: 0.22, ease: "power2.inOut" }, 0.02);
      CAMADAS.forEach((c) => {
        const { de, giro, em } = ENTRADAS[c];
        tl.fromTo(cena.camadas[c], { escala: 0 }, { escala: 1, duration: 0.03 }, em);
        tl.fromTo(cena.camadas[c], { y: de, giro }, { y: 0, giro: 0, duration: c === "paoTopo" ? 0.13 : 0.1, ease: c === "carne" ? "back.out(1.4)" : "power3.out" }, em);
      });
      tl.fromTo(cena, { amassar: 0 }, { amassar: 1, duration: 0.04, ease: "power2.out" }, 0.8);
      tl.to(cena, { amassar: 0, duration: 0.1, ease: "elastic.out(1, 0.35)" }, 0.84);
      const tempos = CAMADAS.map((c) => ENTRADAS[c].em).sort((a, b) => a - b);
      $$("[data-marcadores] li").forEach((p, i) => tl.fromTo(p, { opacity: 0.25, scaleX: 0.5 }, { opacity: 1, scaleX: 1, duration: 0.04 }, tempos[i] + 0.06));
      tl.to({}, { duration: 0.001 }, 1);
    }

    // Rodapé: brasa apagando.
    const rod = $('[data-secao-cena="rodape"]');
    if (rod) {
      gsap.fromTo(cena, { apagar: 0 }, { apagar: 1, ease: "none", scrollTrigger: st(rod) });
      const brilho = $("[data-brilho-rodape]");
      if (brilho) gsap.fromTo(brilho, { opacity: 1, scale: 1 }, { opacity: 0.45, scale: 0.85, ease: "none", scrollTrigger: st(rod) });
    }
  }

  // Títulos: letra por letra com tremor de calor.
  $$("h2.titulo").forEach((h) => {
    if (reduzido) return void gsap.from(h, { opacity: 0, duration: 0.35, scrollTrigger: { trigger: h, start: "top 92%", once: true } });
    const filtro = h.previousElementSibling?.querySelector("filter");
    const desloc = filtro?.querySelector("feDisplacementMap");
    SplitText.create(h, {
      type: "words,chars",
      mask: "chars",
      charsClass: "letra",
      aria: "auto",
      autoSplit: true,
      onSplit(self) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: h, start: "top 86%", once: true },
          onStart: () => void (filtro && (h.style.filter = `url(#${filtro.id})`)),
          onComplete: () => void (h.style.filter = ""),
        });
        tl.from(self.chars, { yPercent: 108, duration: 1, ease: "expo.out", stagger: 0.022 }, 0);
        if (desloc) tl.fromTo(desloc, { attr: { scale: 26 } }, { attr: { scale: 0 }, duration: 1.5, ease: "power2.out" }, 0);
        return tl;
      },
    });
  });

  // Título do hero: onda de calor quando a brasa acende.
  const h1 = $("#titulo-hero");
  const f1 = h1?.previousElementSibling?.querySelector("filter");
  if (h1 && f1 && !reduzido) {
    const tocar = () => {
      h1.style.filter = `url(#${f1.id})`;
      gsap.fromTo(f1.querySelector("feDisplacementMap"), { attr: { scale: 26 } }, { attr: { scale: 0 }, duration: 1.5, ease: "power2.out", onComplete: () => void (h1.style.filter = "") });
    };
    if ((window as { __brasaAcesa?: boolean }).__brasaAcesa) tocar();
    else addEventListener("brasa:acesa", tocar, { once: true });
  }

  // Parallax nas fotos da história e entrada dos blocos.
  if (!reduzido) {
    $$("#historia ol > li > div:first-child > div").forEach((el, i) =>
      gsap.fromTo(el, { yPercent: [12, -8, 10][i % 3] }, { yPercent: -[12, -8, 10][i % 3], ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }),
    );
  }
  ScrollTrigger.refresh();
});
