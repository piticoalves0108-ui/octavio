"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { LinkTransicao } from "@/components/motion/Transicao";
import { IconeWhatsApp } from "@/components/ui/Icones";
import { linkWhatsApp } from "@/lib/contato";
import { medir } from "@/lib/track";
import { cn } from "@/lib/cn";

const links = [
  { href: "/#medida", rotulo: "Medida" },
  { href: "/servicos", rotulo: "Serviços" },
  { href: "/guia-do-pneu", rotulo: "Guia do pneu" },
  { href: "/#como-chegar", rotulo: "Como chegar" },
];

export function Header() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const whats = linkWhatsApp();

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500",
        rolou || aberto
          ? "border-b border-linha/80 bg-asfalto/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="grade h-16 items-center md:h-20">
        <LinkTransicao href="/" rotulo="Início" className="col-span-2 md:col-span-3">
          <Logo />
          <span className="sr-only">, página inicial</span>
        </LinkTransicao>

        <nav aria-label="Principal" className="hidden md:col-span-6 md:col-start-4 md:flex md:justify-center">
          <ul className="flex items-center gap-8">
            {links.map((l) => (
              <li key={l.href}>
                <LinkTransicao
                  href={l.href}
                  rotulo={l.rotulo}
                  className="font-display text-[0.8125rem] font-semibold tracking-[0.16em] text-faixa/80 uppercase transition-colors hover:text-sinal"
                >
                  {l.rotulo}
                </LinkTransicao>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-2 flex items-center justify-end gap-3 md:col-span-3">
          <a
            href={whats.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => medir("cotar_pneu", { origem: "cabecalho" })}
            className="botao botao-sinal hidden !min-h-11 !px-5 !text-[0.8125rem] sm:inline-flex"
          >
            <IconeWhatsApp className="h-4 w-4" />
            Cotar meu pneu
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-faixa/25 md:hidden"
            aria-expanded={aberto}
            aria-controls="menu-celular"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            onClick={() => setAberto((v) => !v)}
          >
            <span className="relative block h-3 w-5" aria-hidden="true">
              <span className={cn("absolute left-0 h-0.5 w-5 bg-faixa transition-transform", aberto ? "top-1.5 rotate-45" : "top-0")} />
              <span className={cn("absolute left-0 h-0.5 w-5 bg-faixa transition-transform", aberto ? "top-1.5 -rotate-45" : "top-3")} />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="menu-celular"
        aria-label="Menu"
        hidden={!aberto}
        className="border-t border-linha bg-asfalto md:hidden"
      >
        <ul className="grade gap-y-1 py-6">
          {links.map((l) => (
            <li key={l.href} className="col-span-4">
              <LinkTransicao
                href={l.href}
                rotulo={l.rotulo}
                onClick={() => setAberto(false)}
                className="block py-3 font-display text-3xl font-bold tracking-tight uppercase"
              >
                {l.rotulo}
              </LinkTransicao>
            </li>
          ))}
          <li className="col-span-4 pt-4">
            <a
              href={whats.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => medir("cotar_pneu", { origem: "menu" })}
              className="botao botao-sinal w-full"
            >
              <IconeWhatsApp className="h-5 w-5" />
              Cotar meu pneu
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
