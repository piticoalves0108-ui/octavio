"use client";

import { useEffect, useRef, useState } from "react";
import { demo, solution } from "@/config/content";
import { prefersReducedMotion, useGsap } from "@/lib/gsap";
import { Chat, Laptop, Phone, type ChatMsg } from "../Devices";
import { MiniSite, type DemoState } from "../MiniSite";
import { SectionTitle } from "../Title";

/**
 * "Pediu, atualizou": a seção mais importante da página.
 * Três pedidos no WhatsApp (horário, preço, foto da vitrine) viram, na hora,
 * mudanças no site do cliente.
 * Desktop: controlado pelo scroll (seção fixa com pin).
 * Celular e "reduzir movimento": avança sozinho quando aparece, com abas para
 * escolher o exemplo.
 */

const S = demo.scenarios;
// Cada cena tem 3 fases: 0 = pedido enviado, 1 = digitando, 2 = feito + site atualizado.
const PHASES = 3;

function stateFor(step: number, phase: number) {
  const msgs: ChatMsg[] = [];
  const site: DemoState = {};
  for (let s = 0; s <= step; s++) {
    const p = s < step ? 2 : phase;
    msgs.push({ id: `a${s}`, from: "client", text: S[s].ask, attachment: S[s].attachment });
    if (p === 1) msgs.push({ id: `t${s}`, from: "us", text: "", typing: true });
    if (p >= 2) {
      msgs.push({ id: `b${s}`, from: "us", text: S[s].reply });
      if (s === 0) site.saturday = "Sábado: 8h às 14h";
      if (s === 1) site.cakePrice = "R$ 35";
      if (s === 2) site.showcase = "b";
    }
  }
  if (phase === 2) {
    site.flash = step === 0 ? "hours" : step === 1 ? "price" : "showcase";
    site.flashKey = step + 1;
  }
  // No celular cabem ~4 balões: mostra só os últimos.
  return { msgs: msgs.slice(-4), site };
}

export function UpdateDemo() {
  const section = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ step: 0, phase: 0 });
  const [auto, setAuto] = useState(true);
  // Quem toca numa aba assume o controle: a cena para de avançar sozinha.
  const [userPaused, setUserPaused] = useState(false);
  const lastPos = useRef("0:0");
  const pin = useRef<{ start: number; end: number } | null>(null);

  // Desktop: o scroll dirige a cena.
  useGsap(({ gsap, ScrollTrigger }) => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      setAuto(false);
      const st = ScrollTrigger.create({
        trigger: stage.current,
        start: "top top+=72",
        end: "+=1800",
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const total = S.length * PHASES;
          const i = Math.min(total - 1, Math.floor(self.progress * total));
          const step = Math.floor(i / PHASES);
          const phase = i % PHASES;
          const key = `${step}:${phase}`;
          if (key !== lastPos.current) {
            lastPos.current = key;
            setPos({ step, phase });
          }
        },
      });
      pin.current = st;
      return () => {
        st.kill();
        pin.current = null;
        setAuto(true);
      };
    });
    return () => mm.revert();
  });

  // Celular / reduzir movimento: avança sozinho enquanto a seção está na tela.
  useEffect(() => {
    if (!auto || userPaused) return;
    if (prefersReducedMotion()) {
      setPos({ step: 0, phase: 2 });
      return;
    }
    const el = section.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        clearInterval(timer);
        if (!e.isIntersecting) return;
        timer = setInterval(() => {
          setPos((p) => {
            const i = (p.step * PHASES + p.phase + 1) % (S.length * PHASES);
            return { step: Math.floor(i / PHASES), phase: i % PHASES };
          });
        }, 1500);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [auto, userPaused]);

  const { msgs, site } = stateFor(pos.step, pos.phase);

  return (
    <section ref={section} data-h="demo" className="relative mx-auto max-w-[1320px] px-4 pt-10 sm:px-6 lg:px-10" aria-label="Exemplo: pedido no WhatsApp vira mudança no site">
      <div className="grid gap-8 lg:grid-cols-12">
        <SectionTitle index="02" label={solution.label} title={solution.title} className="lg:col-span-7" />
        <p className="max-w-md self-end text-lg leading-relaxed text-muted lg:col-span-5 lg:justify-self-end">{solution.text}</p>
      </div>

      <div ref={stage} data-h="demo-stage" className="relative mt-12 lg:mt-16 lg:h-[calc(100svh-96px)] lg:min-h-[560px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-panel/70 p-4 sm:p-8 lg:flex lg:h-full lg:items-center lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_40%,rgb(255_255_255/0.06),transparent)]" />

          <div className="relative grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Lado do celular. No celular de verdade vira um cartão de conversa
                (texto legível) logo acima do site, para os dois caberem na tela. */}
            <div className="order-2 lg:order-1 lg:col-span-4 lg:flex lg:justify-center">
              <div data-h="demo-chat-desktop" className="hidden w-[min(22vw,290px)] [perspective:1200px] lg:block">
                <div className="[transform:rotateY(10deg)_rotateX(3deg)]">
                  <Phone className="aspect-[9/18.5]">
                    <Chat messages={msgs} />
                  </Phone>
                </div>
              </div>
            </div>

            {/* Lado do site */}
            <div className="order-1 lg:order-2 lg:col-span-8">
              <div role="tablist" aria-label="Exemplos de atualização" className="mb-5 flex flex-wrap gap-2">
                {S.map((s, i) => (
                  <button
                    key={s.tab}
                    role="tab"
                    data-h="demo-tab"
                    data-step={i}
                    aria-selected={pos.step === i}
                    onClick={() => {
                      if (!auto) {
                        // No desktop, rola até o ponto da cena correspondente.
                        const st = pin.current;
                        if (st) window.scrollTo({ top: st.start + ((i * PHASES + 2.5) / (S.length * PHASES)) * (st.end - st.start), behavior: "smooth" });
                        return;
                      }
                      setUserPaused(true);
                      setPos({ step: i, phase: 2 });
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      pos.step === i ? "border-white bg-white text-ink" : "border-line-strong text-muted hover:text-fg"
                    }`}
                  >
                    <span className="mr-2 font-mono text-xs opacity-60">0{i + 1}</span>
                    {s.tab}
                  </button>
                ))}
              </div>
              <div data-h="demo-chat-mobile" className="mb-4 h-[188px] overflow-hidden rounded-2xl border border-line [container-type:inline-size] lg:hidden">
                <Chat messages={msgs.slice(-2)} notch={false} />
              </div>
              <div className="relative">
                <Laptop>
                  <MiniSite theme="bakery" state={site} />
                </Laptop>
                <span
                  data-h="demo-badge"
                  className={`absolute -top-3 right-[6%] inline-flex items-center gap-1.5 rounded-full border border-wa/40 bg-ink/90 px-3 py-1 text-xs font-semibold text-wa shadow-lg transition-all duration-500 ${
                    site.flash ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-wa" /> atualizado agora
                </span>
              </div>
              <p className="mt-4 text-xs text-dim">Site de exemplo, para demonstração.</p>
            </div>
          </div>

          {/* Barra de progresso das 3 cenas */}
          <div className="absolute inset-x-12 bottom-6 hidden gap-2 lg:flex" aria-hidden="true">
            {S.map((s, i) => (
              <div key={s.tab} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  data-h="demo-progress"
                  className="h-full origin-left bg-wa transition-transform duration-500"
                  style={{ transform: `scaleX(${i < pos.step ? 1 : i > pos.step ? 0 : (pos.phase + 1) / PHASES})` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
