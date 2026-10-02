"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ativo } from "@/lib/edicao";
import { movimentoReduzido } from "@/lib/gsap";
import { avisar, palco } from "@/lib/palco";

/**
 * PALCO (DOM): decide como o 3D aparece e liga a rolagem à cena.
 *
 *  - Pôster AVIF com o mesmo enquadramento da cena: vem no HTML, é o LCP.
 *  - Desktop: carrega o Canvas (next/dynamic, ssr:false) quando o hero está visível
 *    e o navegador fica ocioso.
 *  - Toque: carrega no primeiro gesto (rolar/tocar). Até lá, fica o pôster.
 *  - Aparelho muito fraco: vídeo curto em loop gravado da própria cena.
 *  - Sem WebGL ou movimento reduzido: pôster + ilustrações SVG. Conteúdo segue legível.
 */
const Cena = dynamic(() => import("./Cena"), { ssr: false });

type Modo = "poster" | "canvas" | "video";

function suportaWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function aparelhoMuitoFraco() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const nucleos = nav.hardwareConcurrency ?? 8;
  const memoria = nav.deviceMemory ?? 8;
  return nucleos <= 2 || memoria <= 2 || !!nav.connection?.saveData;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function Palco() {
  const [modo, setModo] = useState<Modo>("poster");
  const [layout, setLayout] = useState<"desktop" | "mobile">("desktop");
  const [pularIntro, setPularIntro] = useState(false);
  const [posterCarregado, setPosterCarregado] = useState(false);
  const [pedirPoster, setPedirPoster] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // O pôster é pedido logo depois da hidratação, e não no HTML: ele não é candidato
  // a LCP (o Chrome ignora imagens do tamanho da tela) e assim não disputa banda com
  // o texto e as fontes da primeira pintura. No desktop o preloader cobre essa espera.
  useEffect(() => setPedirPoster(true), []);

  // ---------- escolhe o modo ----------
  useEffect(() => {
    const html = document.documentElement;
    const captura = new URLSearchParams(location.search).has("captura");
    palco.captura = captura;
    if (captura) Object.assign(window, { __palco: palco, __avisar: avisar });
    const mobile = window.innerWidth / window.innerHeight < 1 || window.innerWidth < 768;
    setLayout(mobile ? "mobile" : "desktop");
    palco.layout = mobile ? "mobile" : "desktop";

    if (!captura && (movimentoReduzido() || !suportaWebGL2())) {
      html.dataset.cena = "indisponivel";
      return;
    }
    if (!captura && aparelhoMuitoFraco()) {
      setModo("video");
      return;
    }

    let feito = false;
    const iniciar = () => {
      if (feito) return;
      feito = true;
      remover();
      // se o preloader já acabou, o pneu já está parado no lugar do pôster
      setPularIntro(palco.introLiberada || captura);
      html.dataset.cena = "carregando";
      setModo("canvas");
    };
    const eventos = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;
    const remover = () => eventos.forEach((ev) => window.removeEventListener(ev, iniciar));

    const toque = window.matchMedia("(pointer: coarse)").matches;
    if (captura) iniciar();
    else if (toque) {
      eventos.forEach((ev) => window.addEventListener(ev, iniciar, { passive: true, once: true }));
    } else {
      // desktop: avisa já que a cena vem (o preloader espera por ela, até ~3 s)
      html.dataset.cena = "carregando";
      // e carrega assim que o hero estiver visível e o navegador ocioso
      const hero = document.querySelector("[data-ato='hero']");
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(iniciar, { timeout: 600 });
        else setTimeout(iniciar, 200);
      });
      if (hero) io.observe(hero);
      else iniciar();
      return () => {
        io.disconnect();
        remover();
      };
    }
    return remover;
  }, []);

  // ---------- rolagem -> progresso dos atos ----------
  useEffect(() => {
    const q = (n: string) => document.querySelector<HTMLElement>(`[data-ato='${n}']`);
    let raf = 0;
    const medir = () => {
      raf = 0;
      const vh = window.innerHeight;
      const hero = q("hero");
      const medida = q("medida");
      const seletor = q("seletor");
      const anatomia = q("anatomia");
      const alinhamento = q("alinhamento");
      if (hero) palco.heroP = clamp01(-hero.getBoundingClientRect().top / hero.offsetHeight);
      if (medida) {
        const r = medida.getBoundingClientRect();
        palco.medidaP = clamp01(-r.top / Math.max(1, r.height - vh));
      }
      if (seletor) palco.seletorP = clamp01((vh - seletor.getBoundingClientRect().top) / (vh * 0.8));
      if (anatomia) {
        const r = anatomia.getBoundingClientRect();
        palco.anatomiaEntradaP = clamp01((vh - r.top) / vh);
        palco.anatomiaP = clamp01(-r.top / Math.max(1, r.height - vh));
        palco.principalVisivel = r.bottom > 0;
      }
      if (alinhamento) {
        const r = alinhamento.getBoundingClientRect();
        palco.alinhamentoVisivel = r.top < vh && r.bottom > 0;
      } else palco.alinhamentoVisivel = false;

      const visivel = palco.principalVisivel || palco.alinhamentoVisivel;
      if (caixa.current) caixa.current.style.opacity = visivel ? "1" : "0";
      avisar();
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    // seções sticky mudam de altura quando as fontes chegam
    const ro = new ResizeObserver(agendar);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // ---------- mouse inclina o pneu e move a luz ----------
  useEffect(() => {
    if (modo !== "canvas") return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          palco.ponteiro.x = x;
          palco.ponteiro.y = y;
          avisar();
        });
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(raf);
    };
  }, [modo]);

  return (
    <>
      {/* Pôster / vídeo: mesmo enquadramento do hero 3D. Some quando a cena fica pronta. */}
      <div className="so-sem-cena pointer-events-none absolute inset-x-0 top-0 z-0 h-[100svh] overflow-hidden" aria-hidden={modo === "video"}>
        {modo === "video" ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={layout === "mobile" ? ativo("/images/hero/poster-mobile.jpg") : ativo("/images/hero/poster-desktop.jpg")}
          >
            <source src={layout === "mobile" ? ativo("/video/hero-mobile.webm") : ativo("/video/hero-desktop.webm")} type="video/webm" />
            <source src={layout === "mobile" ? ativo("/video/hero-mobile.mp4") : ativo("/video/hero-desktop.mp4")} type="video/mp4" />
          </video>
        ) : pedirPoster ? (
          <picture>
            <source media="(max-aspect-ratio: 1/1)" srcSet={ativo("/images/hero/poster-mobile.avif")} type="image/avif" />
            <source media="(max-aspect-ratio: 1/1)" srcSet={ativo("/images/hero/poster-mobile.jpg")} type="image/jpeg" />
            <source srcSet={ativo("/images/hero/poster-desktop.avif")} type="image/avif" />
            <img
              src={ativo("/images/hero/poster-desktop.jpg")}
              alt="Pneu montado em roda de liga leve sobre o asfalto, em luz de estúdio"
              className={`h-full w-full object-cover transition-opacity duration-700 ${posterCarregado ? "opacity-100" : "opacity-0"}`}
              decoding="async"
              width={1920}
              height={1080}
              onLoad={() => setPosterCarregado(true)}
              ref={(img) => {
                if (img?.complete && img.naturalWidth) setPosterCarregado(true);
              }}
            />
          </picture>
        ) : (
          <noscript>
            <picture>
              <source media="(max-aspect-ratio: 1/1)" srcSet={ativo("/images/hero/poster-mobile.avif")} type="image/avif" />
              <source srcSet={ativo("/images/hero/poster-desktop.avif")} type="image/avif" />
              <img
                src={ativo("/images/hero/poster-desktop.jpg")}
                alt="Pneu montado em roda de liga leve sobre o asfalto, em luz de estúdio"
                className="h-full w-full object-cover"
                width={1920}
                height={1080}
              />
            </picture>
          </noscript>
        )}
      </div>

      {modo === "canvas" && (
        <div
          ref={caixa}
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
          aria-hidden="true"
        >
          <Cena
            layout={layout}
            pularIntro={pularIntro}
            aoFalhar={() => {
              document.documentElement.dataset.cena = "indisponivel";
              setModo("video");
            }}
          />
        </div>
      )}
    </>
  );
}
