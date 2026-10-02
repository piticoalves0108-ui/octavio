"use client";

/**
 * Cabeçalho fixo: some ao rolar para baixo e volta ao rolar para cima.
 * No celular, o menu abre num Dialog (foco preso, Esc fecha).
 */
import { useEffect, useState } from "react";
import { navegacao } from "@/content/textos";
import { linkWhatsappPadrao, negocio, whatsappPrincipal } from "@/content/negocio";
import { cn } from "@/lib/cn";
import { classesBotao } from "@/components/ui/botao";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { IconeInstagram, IconeMenu, IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { LinkTransicao } from "./Transicao";
import { Marca } from "./Marca";

export function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    let ultimo = window.scrollY;
    let pendente = false;
    const aoRolar = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setRolou(y > 24);
        if (y <= 320) setOculto(false);
        else if (y > ultimo + 6) setOculto(true);
        else if (y < ultimo - 6) setOculto(false);
        if (Math.abs(y - ultimo) > 6) ultimo = y;
        pendente = false;
      });
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-[var(--ease-saida)]",
        oculto && !menuAberto ? "-translate-y-full" : "translate-y-0",
        rolou ? "bg-gelo/85 shadow-[0_1px_0_rgba(42,42,46,0.08)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-grafite focus:px-5 focus:py-3 focus:text-gelo"
      >
        Pular para o conteúdo
      </a>
      <div className="conteiner flex h-[4.5rem] items-center justify-between gap-6">
        <LinkTransicao href="/" aria-label={`${negocio.nome}: página inicial`} className="rounded-md">
          <Marca />
        </LinkTransicao>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.95rem]">
            {navegacao.map((item) => (
              <li key={item.href}>
                <LinkTransicao
                  href={item.href}
                  className="relative py-2 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-grafite after:transition-transform after:duration-500 hover:after:scale-x-100"
                >
                  {item.rotulo}
                </LinkTransicao>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LinkRastreado
              href={linkWhatsappPadrao}
              evento="whatsapp_clique"
              origem="cabecalho"
              externo
              className={classesBotao("primario", undefined, "compacto")}
            >
              <IconeWhatsapp className="size-4" />
              Pedir orçamento
            </LinkRastreado>
          </div>

          <Dialog open={menuAberto} onOpenChange={setMenuAberto}>
            <DialogTrigger
              className="grid size-12 place-items-center rounded-full border border-grafite/20 lg:hidden"
              aria-label="Abrir menu"
            >
              <IconeMenu className="size-5" />
            </DialogTrigger>
            <DialogContent
              className="inset-0 flex flex-col overflow-y-auto px-6 pt-24 pb-10"
              rotuloFechar="Fechar menu"
            >
              <DialogTitle className="sr-only">Menu</DialogTitle>
              <DialogDescription className="sr-only">
                Navegação do site e contatos da Só Salão Brasília.
              </DialogDescription>
              <nav aria-label="Menu do celular">
                <ul className="flex flex-col gap-1">
                  {navegacao.map((item, i) => (
                    <li
                      key={item.href}
                      style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                      className="animate-[surge_0.6s_var(--ease-saida)_both]"
                    >
                      <DialogClose asChild>
                        <LinkTransicao href={item.href} className="block py-3 font-serif text-[2.6rem] leading-none">
                          {item.rotulo}
                        </LinkTransicao>
                      </DialogClose>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-auto space-y-4 pt-10">
                <LinkRastreado
                  href={linkWhatsappPadrao}
                  evento="whatsapp_clique"
                  origem="menu"
                  externo
                  className={classesBotao("primario", "w-full")}
                >
                  <IconeWhatsapp className="size-5" />
                  WhatsApp {whatsappPrincipal.exibicao}
                </LinkRastreado>
                <LinkRastreado
                  href={negocio.instagram.url}
                  evento="instagram_clique"
                  origem="menu"
                  externo
                  className={classesBotao("secundario", "w-full")}
                >
                  <IconeInstagram className="size-5" />
                  {negocio.instagram.usuario}
                </LinkRastreado>
                <p className="text-sm text-tinta-suave">{negocio.endereco.completo}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
