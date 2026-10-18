"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { ArrowUpRight } from "lucide-react";
import { brand, fullAddress, navigation } from "@/data/brand";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Button } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho fixo. Some ao rolar para baixo e volta ao rolar para cima.
 * Sobre seções escuras (marcadas com data-header="dark") o texto fica claro.
 */
export function Header() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const lenis = useLenis();

  // Mostrar/esconder conforme a direção da rolagem
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (Math.abs(y - lastY.current) > 6) {
        setHidden(y > lastY.current && y > 320);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tema claro/escuro conforme a seção que está sob o cabeçalho
  useEffect(() => {
    const sections = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => sections.set(e.target, e.isIntersecting));
        setDark([...sections.values()].some(Boolean));
      },
      { rootMargin: "0px 0px -94% 0px" },
    );
    const t = setTimeout(() => document.querySelectorAll("[data-header='dark']").forEach((el) => io.observe(el)), 200);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis]);

  const light = dark && !open && !scrolled;

  return (
    <>
      <a
        href="#conteudo"
        className="fixed left-4 top-4 z-[120] -translate-y-24 rounded-full bg-graphite px-5 py-3 text-sm text-linen transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <motion.header
        initial={false}
        animate={{ y: hidden && !open ? "-110%" : "0%" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transition-[background-color,color,backdrop-filter,border-color] duration-500",
          scrolled && !open ? "border-b border-graphite/10 bg-linen/80 text-graphite backdrop-blur-xl" : "border-b border-transparent",
          light ? "text-linen" : "text-graphite",
        )}
      >
        <div className="container-x flex h-[76px] items-center justify-between gap-6">
          <TransitionLink href="/" aria-label={`${brand.name}: página inicial`} className="relative z-10" data-cursor>
            <Logo />
          </TransitionLink>

          <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
            {navigation.slice(0, 5).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <TransitionLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group relative py-2 text-[0.82rem] font-medium tracking-wide"
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-500 ease-out-expo group-hover:origin-left group-hover:scale-x-100",
                      active && "origin-left scale-x-100",
                    )}
                  />
                </TransitionLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <Button href="/contato" variant={light ? "light" : "solid"} arrow>
                Solicitar orçamento
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-current/20 lg:hidden"
            >
              <span className="relative block h-3 w-5">
                <span className={cn("absolute left-0 top-0 h-px w-full bg-current transition-transform duration-500", open && "translate-y-1.5 rotate-45")} />
                <span className={cn("absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-500", open && "-translate-y-[5px] -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[70] flex flex-col bg-linen pt-[96px]"
          >
            <nav aria-label="Menu" className="container-x flex flex-1 flex-col justify-center gap-1">
              {navigation.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-b border-graphite/10"
                >
                  <TransitionLink href={item.href} className="flex items-baseline justify-between py-3">
                    <span className="font-display text-[clamp(2.4rem,9vw,4rem)] font-light leading-none">{item.label}</span>
                    <span className="font-display text-sm italic text-stone">0{i + 1}</span>
                  </TransitionLink>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="container-x flex flex-wrap items-end justify-between gap-6 pb-10 pt-6 text-sm text-stone"
            >
              <p className="max-w-[18rem]">{fullAddress}</p>
              <div className="flex gap-3">
                <a href={whatsappLink(`Olá! Vim pelo site da ${brand.name}.`)} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full bg-graphite text-linen" aria-label="WhatsApp">
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full border border-graphite/20" aria-label="Instagram">
                  <InstagramIcon className="h-5 w-5" />
                </a>
                <TransitionLink href="/contato" className="flex h-12 items-center gap-2 rounded-full bg-wood px-5 text-paper">
                  Orçamento <ArrowUpRight className="h-4 w-4" />
                </TransitionLink>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
