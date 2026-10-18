"use client";

import { motion, type Variants } from "motion/react";
import { Fragment, type ElementType } from "react";
import { useSiteLoaded } from "@/hooks/useSiteLoaded";
import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

interface Props {
  /** Use *asteriscos* para o itálico editorial e \n para quebrar linha */
  text: string;
  as?: Tag;
  className?: string;
  mode?: "words" | "chars";
  delay?: number;
  stagger?: number;
  /** "view": anima ao entrar na tela · "loaded": anima quando a abertura do site termina */
  trigger?: "view" | "loaded";
}

const letter: Variants = {
  hidden: { y: "112%", rotate: 3 },
  show: { y: "0%", rotate: 0, transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] } },
};

function parse(text: string) {
  return text.split("\n").map((line) =>
    line
      .split(/(\*[^*]+\*)/g)
      .filter(Boolean)
      .map((seg) => ({ italic: seg.startsWith("*") && seg.endsWith("*"), text: seg.replace(/^\*|\*$/g, "") })),
  );
}

/** Título que surge palavra por palavra (ou letra por letra) de dentro de uma máscara. */
export function RevealText({ text, as = "h2", className, mode = "words", delay = 0, stagger, trigger = "view" }: Props) {
  const loaded = useSiteLoaded();
  const MotionTag = motion[as] as ElementType;
  const lines = parse(text);
  const plain = text.replace(/\*/g, "").replace(/\n/g, " ");
  const step = stagger ?? (mode === "chars" ? 0.025 : 0.07);

  const animateProps =
    trigger === "loaded"
      ? { initial: "hidden", animate: loaded ? "show" : "hidden" }
      : { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.35 } };

  return (
    <MotionTag
      className={className}
      aria-label={plain}
      {...animateProps}
      variants={{ show: { transition: { staggerChildren: step, delayChildren: delay } } }}
    >
      {lines.map((segments, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {segments.map((seg, si) => {
            const words = seg.text.split(/(\s+)/);
            return (
              <span key={si} className={cn(seg.italic && "serif-accent")}>
                {words.map((w, wi) =>
                  /^\s+$/.test(w) ? (
                    <Fragment key={wi}> </Fragment>
                  ) : mode === "chars" ? (
                    <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
                      {w.split("").map((ch, ci) => (
                        <span key={ci} className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
                          <motion.span variants={letter} className="inline-block origin-bottom-left will-change-transform">
                            {ch}
                          </motion.span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span key={wi} aria-hidden className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                      <motion.span variants={letter} className="inline-block origin-bottom-left will-change-transform">
                        {w}
                      </motion.span>
                    </span>
                  ),
                )}
              </span>
            );
          })}
        </Fragment>
      ))}
    </MotionTag>
  );
}
