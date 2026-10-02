"use client";

import { useEffect, useState } from "react";
import { IconeChama, IconeInstagram, IconeMenu, IconeWhatsApp } from "@/components/Icones";
import { LinkRastreado } from "@/components/conversao/LinkRastreado";
import { PedirAgora } from "@/components/conversao/PedirAgora";
import { StatusHorario } from "@/components/conversao/StatusHorario";
import { LinkTransicao } from "@/components/motion/Transicao";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { negocio } from "@/content/negocio";
import { linkInstagram, linkWhatsApp } from "@/lib/links";
import { cn } from "@/lib/utils";
import { LINKS_NAV } from "./navegacao";

export function Header() {
  const [rolou, setRolou] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const checar = () => setRolou(window.scrollY > 24);
    checar();
    window.addEventListener("scroll", checar, { passive: true });
    return () => window.removeEventListener("scroll", checar);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500",
        rolou ? "border-b border-carvao-3/80 bg-carvao/80 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="moldura flex h-[var(--altura-header)] items-center gap-4">
        <LinkTransicao href="/" className="group flex items-center gap-2.5" aria-label={`${negocio.nome}, início`}>
          <IconeChama className="h-7 w-auto text-brasa transition-transform duration-500 group-hover:scale-110" />
          <span className="titulo text-[1.35rem] leading-[0.85] tracking-wide">
            Churrasquinho
            <span className="block text-ambar">do Bruce</span>
          </span>
        </LinkTransicao>

        <nav aria-label="Principal" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {LINKS_NAV.map((link) => (
              <li key={link.href}>
                <LinkTransicao
                  href={link.href}
                  className="rounded-full px-4 py-2.5 text-[0.9375rem] font-medium text-osso/85 transition-colors hover:bg-carvao-3/70 hover:text-osso"
                >
                  {link.rotulo}
                </LinkTransicao>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <PedirAgora origem="header" compacto />

          <Dialog open={menuAberto} onOpenChange={setMenuAberto}>
            <DialogTrigger className="grid size-11 place-items-center rounded-full border border-carvao-3 text-osso lg:hidden" aria-label="Abrir menu">
              <IconeMenu className="size-5" />
            </DialogTrigger>
            <DialogContent
              rotuloFechar="Fechar menu"
              className="inset-0 left-0 top-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-carvao p-0 data-[state=closed]:scale-100 starting:scale-100"
            >
              <div className="moldura flex h-full flex-col pb-[max(2rem,env(safe-area-inset-bottom))] pt-24">
                <DialogTitle className="sr-only">Menu</DialogTitle>
                <DialogDescription className="sr-only">Navegação do site do {negocio.nome}</DialogDescription>
                <nav aria-label="Menu mobile">
                  <ul className="flex flex-col">
                    {LINKS_NAV.map((link, i) => (
                      <li key={link.href} className="border-b border-carvao-3">
                        <DialogClose asChild>
                          <LinkTransicao href={link.href} className="titulo flex items-baseline gap-4 py-4 text-[3.25rem] leading-none">
                            <span className="font-texto text-sm font-semibold text-brasa">0{i + 1}</span>
                            {link.rotulo}
                          </LinkTransicao>
                        </DialogClose>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-auto flex flex-col gap-4">
                  <StatusHorario />
                  <div className="flex gap-3">
                    <LinkRastreado href={linkWhatsApp} evento="pedir_whatsapp" origem="menu-mobile" className="botao botao-brasa flex-1">
                      <IconeWhatsApp className="size-5" /> WhatsApp
                    </LinkRastreado>
                    <LinkRastreado href={linkInstagram} evento="instagram" origem="menu-mobile" className="botao botao-linha" aria-label="Instagram @churrasquinhodobruce">
                      <IconeInstagram className="size-5" />
                    </LinkRastreado>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
