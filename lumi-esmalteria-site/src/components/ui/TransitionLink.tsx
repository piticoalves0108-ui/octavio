"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { usePageTransition } from "@/components/motion/PageTransition";

type Props = ComponentProps<typeof Link>;

/** next/link com a cortina de transição entre páginas. */
export function TransitionLink({ href, onClick, target, ...props }: Props) {
  const { navigate } = usePageTransition();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === "_blank") return;
    const url = typeof href === "string" ? href : `${href.pathname ?? ""}${href.search ?? ""}${href.hash ?? ""}`;
    if (url.startsWith("#")) return;
    e.preventDefault();
    navigate(url);
  };
  return <Link href={href} target={target} onClick={handle} {...props} />;
}
