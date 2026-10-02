"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { demo } from "@/config/content";
import { Chat, Laptop, Phone, type ChatMsg } from "./Devices";
import { MiniSite, type DemoState } from "./MiniSite";
import { SvgGlobe } from "./SvgGlobe";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

type Mode = "svg" | "webgl";

/**
 * O globo começa em SVG (mesmo desenho do logo, girando) em todos os aparelhos.
 * Em telas com mouse ele vira 3D na primeira interação (mexer o mouse, rolar
 * ou usar o teclado): o three.js não pesa no carregamento e quem chega já vê
 * o globo vivo. Celular fica no SVG: a maior parte das visitas vem do
 * navegador interno do Instagram, onde cada ms de CPU pesa no LCP e na bateria.
 */
function canUpgrade(): boolean {
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 1024) return false;
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") ?? c.getContext("webgl"))) return false;
  } catch {
    return false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return !((nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2);
}

const HERO_ASK = demo.scenarios[0];

/**
 * Visual do hero: o globo do logo com um notebook mostrando um site que
 * se monta em camadas e um celular onde o pedido no WhatsApp vira mudança no site.
 */
export function HeroVisual() {
  const [mode, setMode] = useState<Mode>("svg");
  const [ready, setReady] = useState(false);
  const [lite, setLite] = useState(true);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [site, setSite] = useState<DemoState>({});

  // Troca para o 3D na primeira interação (não disputa com o carregamento).
  useEffect(() => {
    if (!canUpgrade()) return;
    const events = ["pointermove", "wheel", "scroll", "keydown"] as const;
    const go = (e: Event) => {
      if (e instanceof PointerEvent && e.pointerType !== "mouse") return;
      events.forEach((n) => window.removeEventListener(n, go));
      setLite(window.innerWidth < 1280);
      setMode("webgl");
    };
    events.forEach((n) => window.addEventListener(n, go, { passive: true }));
    return () => events.forEach((n) => window.removeEventListener(n, go));
  }, []);

  // Inclinação dos aparelhos com o mouse.
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--ry", `${x * 10}deg`);
        el.style.setProperty("--rx", `${-y * 8}deg`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Mini-história em loop: pedido no WhatsApp → "Feito!" → site muda.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done: ChatMsg[] = [
      { id: "a", from: "client", text: HERO_ASK.ask },
      { id: "b", from: "us", text: HERO_ASK.reply },
    ];
    if (reduce) {
      setMsgs(done);
      setSite({ saturday: "Sábado: 8h às 14h" });
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    let key = 0;
    const run = () => {
      timers.forEach(clearTimeout);
      setMsgs([]);
      setSite({});
      const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
      at(2200, () => setMsgs([done[0]]));
      at(3300, () => setMsgs([done[0], { id: "t", from: "us", text: "", typing: true }]));
      at(4700, () => setMsgs(done));
      at(5100, () => setSite({ saturday: "Sábado: 8h às 14h", flash: "hours", flashKey: ++key }));
      at(11000, run);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px] lg:max-w-none">
      {/* Globo */}
      <div className="absolute left-[5%] top-[-3%] aspect-square w-[90%]">
        <SvgGlobe
          className={`absolute inset-0 h-full w-full text-white transition-opacity duration-[1200ms] ${
            mode === "webgl" && ready ? "opacity-0" : "opacity-80"
          }`}
          animate={!(mode === "webgl" && ready)}
          strokeWidth={1}
        />
        {mode === "webgl" && (
          <div className={`absolute inset-0 transition-opacity duration-[1200ms] ${ready ? "opacity-100" : "opacity-0"}`}>
            <GlobeCanvas lite={lite} drawIn={false} onReady={() => setReady(true)} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-[18%] rounded-full bg-white/[0.035] blur-3xl" />
      </div>

      {/* Aparelhos */}
      <div className="absolute inset-0 [perspective:1400px]">
        <div
          ref={tiltRef}
          className="absolute inset-0 transition-transform duration-700 ease-out [transform-style:preserve-3d]"
          style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
        >
          <div className="fade-up absolute bottom-[4%] left-[-3%] w-[68%]" style={{ ["--d" as string]: "350ms" }}>
            <Laptop>
              <MiniSite theme="bakery" assemble state={site} />
            </Laptop>
            <span
              className={`absolute -top-3 left-[6%] inline-flex items-center gap-1.5 rounded-full border border-wa/40 bg-ink/90 px-3 py-1 text-xs font-semibold text-wa shadow-lg backdrop-blur transition-all duration-500 ${
                site.flash ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              aria-hidden={!site.flash}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-wa" /> atualizado agora
            </span>
          </div>
          <div
            className="fade-up absolute bottom-0 right-[4%] aspect-[9/18.5] w-[25%] [transform:translateZ(60px)]"
            style={{ ["--d" as string]: "650ms" }}
          >
            <Phone className="h-full">
              <Chat messages={msgs} compact />
            </Phone>
          </div>
        </div>
      </div>
    </div>
  );
}
