"use client";

import { useEffect, useRef } from "react";
import { MERIDIANS, PARALLELS, VIEW, meridianEllipse, parallelEllipse, spinAt } from "@/lib/globe";

type Props = {
  className?: string;
  /** Gira o globo com requestAnimationFrame (versão leve, sem WebGL). */
  animate?: boolean;
  strokeWidth?: number;
  title?: string;
};

/**
 * O globo do logo em SVG. Serve de logo, de pôster da cena 3D (mesmo
 * enquadramento) e de substituto do 3D em aparelhos fracos ou sem WebGL.
 */
export function SvgGlobe({ className, animate = false, strokeWidth = 1.1, title }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!animate) return;
    const svg = ref.current;
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const nodes = Array.from(svg.querySelectorAll<SVGEllipseElement>("[data-lon]"));
    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(svg);
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // 30 fps é suficiente para um giro lento e poupa bateria.
      if (!visible || t - last < 33) return;
      last = t;
      const spin = spinAt(t);
      for (const n of nodes) {
        const e = meridianEllipse(Number(n.dataset.lon), spin);
        n.setAttribute("ry", e.ry.toFixed(4));
        n.setAttribute("transform", `rotate(${e.rot.toFixed(2)})`);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [animate]);

  return (
    <svg
      ref={ref}
      viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
        {PARALLELS.map((lat) => {
          const e = parallelEllipse(lat);
          return (
            <ellipse
              key={`p${lat}`}
              cx={e.cx}
              cy={e.cy}
              rx={e.rx}
              ry={e.ry}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {MERIDIANS.map((lon) => {
          const e = meridianEllipse(lon);
          return (
            <ellipse
              key={`m${lon}`}
              data-lon={lon}
              rx={e.rx}
              ry={e.ry}
              transform={`rotate(${e.rot.toFixed(2)})`}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <circle r={1} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
