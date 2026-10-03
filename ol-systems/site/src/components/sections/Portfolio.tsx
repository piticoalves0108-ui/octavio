"use client";

import { useEffect, useRef, useState } from "react";
import { portfolio } from "@/config/content";
import { BrowserFrame } from "../Devices";
import { MiniSite } from "../MiniSite";
import { SectionTitle } from "../Title";

/**
 * Carrossel 3D curvo: os sites ficam num arco; arrastar, usar as setas ou o
 * teclado gira o carrossel. Clicar num site real abre em nova aba.
 */
export function Portfolio() {
  const items = portfolio.items;
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; id: number } | null>(null);
  const moved = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (d: number) => setIndex((i) => Math.max(0, Math.min(items.length - 1, i + d)));
  const cardW = Math.min(width * (width < 640 ? 0.82 : 0.52), 680);
  const step = cardW * 0.78;
  const offset = index - drag / step;

  return (
    <section id="portfolio" className="relative py-24 lg:py-36">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle index="07" label={portfolio.label} title={portfolio.title} className="max-w-2xl" />
          <div className="flex gap-2">
            <button
              onClick={() => go(-1)}
              data-h="carousel-prev"
              disabled={index === 0}
              aria-label="Site anterior"
              className="grid h-12 w-12 place-items-center rounded-full border border-line-strong transition-colors hover:bg-white hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg"
            >
              ←
            </button>
            <button
              onClick={() => go(1)}
              data-h="carousel-next"
              disabled={index === items.length - 1}
              aria-label="Próximo site"
              className="grid h-12 w-12 place-items-center rounded-full border border-line-strong transition-colors hover:bg-white hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg"
            >
              →
            </button>
          </div>
        </div>
        <p className="mt-6 text-sm text-dim">{portfolio.note}</p>
      </div>

      <div
        ref={wrap}
        data-h="carousel"
        className="relative mt-12 h-[min(64vw,480px)] cursor-grab touch-pan-y select-none overflow-hidden [perspective:1600px] active:cursor-grabbing sm:h-[min(42vw,520px)]"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Sites de exemplo"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, id: e.pointerId };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!start.current || start.current.id !== e.pointerId) return;
          const dx = e.clientX - start.current.x;
          if (Math.abs(dx) > 6 && !moved.current) {
            moved.current = true;
            // Só captura depois que virou arraste, para o clique no link continuar funcionando.
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setDrag(dx);
        }}
        onPointerUp={() => {
          if (!start.current) return;
          const n = Math.round(-drag / step);
          setIndex((i) => Math.max(0, Math.min(items.length - 1, i + n)));
          setDrag(0);
          start.current = null;
        }}
        onPointerCancel={() => {
          setDrag(0);
          start.current = null;
        }}
      >
        <div className="absolute left-1/2 top-0 h-full [transform-style:preserve-3d]">
          {items.map((it, i) => {
            const d = i - offset;
            const abs = Math.abs(d);
            return (
              <div
                key={it.name}
                data-h="carousel-card"
                data-index={i}
                className="absolute top-0"
                style={{
                  width: cardW,
                  marginLeft: -cardW / 2,
                  transform: `translateX(${d * step}px) translateZ(${-abs * 160}px) rotateY(${-d * 18}deg)`,
                  visibility: abs > 2.2 ? "hidden" : "visible",
                  zIndex: 10 - Math.round(abs),
                  transition: drag ? "none" : "transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.8s",
                }}
                aria-hidden={Math.round(offset) !== i}
              >
                <span
                  aria-hidden="true"
                  data-h="carousel-shade"
                  className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-ink transition-opacity duration-700"
                  style={{ opacity: Math.min(abs * 0.32, 0.85) }}
                />
                <a
                  href={it.url ?? "#portfolio"}
                  target={it.url ? "_blank" : undefined}
                  rel={it.url ? "noopener noreferrer" : undefined}
                  tabIndex={Math.round(offset) === i ? 0 : -1}
                  onClick={(e) => {
                    if (moved.current || !it.url) e.preventDefault();
                    if (!moved.current && i !== index) setIndex(i);
                  }}
                  className="block"
                  draggable={false}
                >
                  <BrowserFrame url={it.url ? it.url.replace(/^https?:\/\//, "") : `exemplo · ${it.segment.toLowerCase()}`}>
                    <MiniSite theme={it.theme} />
                  </BrowserFrame>
                  <div className="mt-4 flex items-center justify-between px-1">
                    <span className="font-display text-lg font-bold">{it.name}</span>
                    {it.example ? (
                      <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs uppercase tracking-wider text-dim">exemplo</span>
                    ) : (
                      <span className="text-sm text-muted">Ver site ↗</span>
                    )}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
