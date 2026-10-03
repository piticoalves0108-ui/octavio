"use client";

import { useEffect, useState } from "react";
import { contactHref, site } from "@/config/site";
import { SvgGlobe } from "./SvgGlobe";
import { WhatsAppIcon } from "./icons";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#incluso", label: "O que inclui" },
  { href: "#portfolio", label: "Portfólio" },
  { href: "#preco", label: "Preço" },
  { href: "#duvidas", label: "Dúvidas" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <SvgGlobe className="h-8 w-8 text-white" strokeWidth={1} />
      <span className="font-display text-[1.05rem] font-bold tracking-tight">{site.name}</span>
    </span>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      data-h="header"
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled ? "border-b border-line bg-ink/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <a href="#topo" aria-label={`${site.name}, voltar ao topo`}>
          <Logo />
        </a>
        <nav aria-label="Seções" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-sm text-muted">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="transition-colors hover:text-fg">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a
          href={contactHref()}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="header"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-wa hover:bg-wa hover:text-wa-ink"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Quero meu site
        </a>
      </div>
    </header>
  );
}
