"use client";

import { m, useMotionValue, useSpring } from "motion/react";
import { useState, type ReactNode } from "react";
import { contactHref } from "@/config/site";
import { WhatsAppIcon } from "./icons";

type Props = {
  children: ReactNode;
  /** Onde o botão está (vai junto no evento de analytics). */
  source: string;
  size?: "md" | "lg";
  pulse?: boolean;
  className?: string;
};

/**
 * Botão principal "Quero meu site": magnético no desktop, abre o WhatsApp
 * com a mensagem pronta. Todos os CTAs da página usam o mesmo link.
 */
export function ContactButton({ children, source, size = "md", pulse = false, className = "" }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  const [touched, setTouched] = useState(false);

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.4);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const sizes = size === "lg" ? "h-16 px-8 text-lg gap-3" : "h-13 px-6 text-base gap-2.5";

  return (
    <m.a
      href={contactHref()}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={source}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerEnter={() => setTouched(true)}
      onFocus={() => setTouched(true)}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className={`group relative inline-flex select-none items-center justify-center rounded-full bg-wa font-semibold text-wa-ink shadow-[0_10px_40px_-10px_rgb(37_211_102/0.6)] transition-[background-color,box-shadow] hover:bg-[#2fe371] hover:shadow-[0_16px_50px_-10px_rgb(37_211_102/0.8)] ${sizes} ${
        pulse && !touched ? "cta-pulse" : ""
      } ${className}`}
    >
      <WhatsAppIcon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
      <span>{children}</span>
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </m.a>
  );
}
