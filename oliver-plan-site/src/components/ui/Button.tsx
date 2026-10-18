"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { TransitionLink } from "./TransitionLink";
import { Magnetic } from "./Magnetic";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "light" | "ghost" | "wood";

interface Common {
  children: ReactNode;
  variant?: Variant;
  size?: "md" | "lg";
  arrow?: boolean;
  icon?: ReactNode;
  magnetic?: boolean;
  className?: string;
}

type LinkProps = Common & { href: string; external?: boolean; "aria-label"?: string };
type BtnProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

const variants: Record<Variant, string> = {
  solid: "bg-graphite text-linen hover:bg-ink",
  wood: "bg-wood text-paper hover:bg-wood-deep",
  outline: "border border-graphite/25 text-graphite hover:border-graphite",
  light: "bg-linen text-graphite hover:bg-paper",
  ghost: "text-graphite hover:text-wood-deep",
};

/** Botão com texto que "rola" no hover, seta animada e efeito magnético. */
export function Button(props: LinkProps | BtnProps) {
  const { children, variant = "solid", size = "md", arrow = true, icon, magnetic = true, className } = props;

  const classes = cn(
    "group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-medium tracking-wide transition-colors duration-500 ease-out-expo disabled:pointer-events-none disabled:opacity-40",
    size === "lg" ? "h-14 px-8 text-[0.95rem]" : "h-12 px-6 text-sm",
    variant === "ghost" && "h-auto px-0",
    variants[variant],
    className,
  );

  const inner = (
    <>
      {icon && <span className="relative z-10 -ml-1 flex">{icon}</span>}
      <span className="relative z-10 block overflow-hidden">
        <span className="block transition-transform duration-500 ease-out-expo group-hover/btn:-translate-y-full">{children}</span>
        <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-out-expo group-hover/btn:translate-y-0">
          {children}
        </span>
      </span>
      {arrow && (
        <span className="relative z-10 flex h-5 w-5 overflow-hidden">
          <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-500 ease-out-expo group-hover/btn:-translate-y-full group-hover/btn:translate-x-full" strokeWidth={1.5} />
          <ArrowUpRight className="absolute h-5 w-5 -translate-x-full translate-y-full transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-0 group-hover/btn:translate-y-0" strokeWidth={1.5} />
        </span>
      )}
    </>
  );

  let el: ReactNode;
  if ("href" in props && props.href) {
    const { href, external } = props;
    el = external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} aria-label={props["aria-label"]}>
        {inner}
      </a>
    ) : (
      <TransitionLink href={href} className={classes} aria-label={props["aria-label"]}>
        {inner}
      </TransitionLink>
    );
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children: _c, variant: _v, size: _s, arrow: _a, icon: _i, magnetic: _m, className: _cl, ...rest } = props as BtnProps;
    el = (
      <button type="button" {...rest} className={classes}>
        {inner}
      </button>
    );
  }

  return magnetic && variant !== "ghost" ? <Magnetic>{el}</Magnetic> : el;
}
