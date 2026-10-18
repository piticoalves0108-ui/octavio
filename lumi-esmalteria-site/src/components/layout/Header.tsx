"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { CalendarHeart } from "lucide-react";
import { brand, fullAddress, navigation } from "@/data/brand";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Button } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

/** Cabeçalho fixo: some ao rolar para baixo, volta ao subir. Menu em tela cheia no celular. */
export function Header() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const lenis = useLenis();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      if (Math.abs(y - lastY.current) > 6) {
        setHidden(y > lastY.current && y > 320);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis]);

  return (
    <>
      <a href="#conteudo" className="fixed left-4 top-4 z-[120] -translate-y-24 rounded-full bg-ink px-5 py-3 text-sm text-cream transition-transform focus:translate-y-0">
        Pular para o conteúdo
      </a>
      <motion.header
        initial={false}
        animate={{ y: hidden && !open ? "-115%" : "0%" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-[80] px-3 pt-3"
      >
        <div
          className={cn(
            "container-x flex h-16 items-center justify-between gap-6 rounded-full transition-[background-color,box-shadow,backdrop-filter] duration-500",
            scrolled && !open ? "bg-cream/75 shadow-[0_10px_40px_-20px_rgba(139,41,66,0.35)] backdrop-blur-xl" : "bg-transparent",
          )}
        >
          <TransitionLink href="/" aria-label={`${brand.name}: página inicial`} className="relative z-10">
            <Logo />
          </TransitionLink>

          <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
            {navigation.slice(0, 6).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <TransitionLink key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="group relative py-2 text-[0.82rem] font-medium">
                  {item.label}
                  <span className={cn("absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-coral transition-transform duration-500", active ? "scale-100" : "scale-0 group-hover:scale-100")} />
                </TransitionLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Button href="/agendamento" variant="wine" arrow={false} icon={<CalendarHeart className="h-4 w-4" strokeWidth={1.6} />}>
                Agendar
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-cream/60 backdrop-blur lg:hidden"
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
            initial={{ clipPath: "circle(0% at 92% 4%)" }}
            animate={{ clipPath: "circle(150% at 92% 4%)" }}
            exit={{ clipPath: "circle(0% at 92% 4%)" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[70] flex flex-col bg-blush pt-24"
          >
            <nav aria-label="Menu" className="container-x flex flex-1 flex-col justify-center">
              {[...navigation, { href: "/agendamento", label: "Agendar" }].map((item, i) => (
                <motion.div key={item.href} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                  <TransitionLink href={item.href} className="flex items-baseline justify-between border-b border-wine/15 py-2.5">
                    <span className="font-display text-[clamp(2.2rem,9vw,3.6rem)] leading-none">{item.label}</span>
                    <span className="font-display text-sm italic text-muted">0{i + 1}</span>
                  </TransitionLink>
                </motion.div>
              ))}
            </nav>
            <div className="container-x flex flex-wrap items-center justify-between gap-4 pb-10 pt-6 text-sm text-muted">
              <p>{fullAddress}</p>
              <div className="flex gap-3">
                <a href={whatsappLink("Olá, Lumi! Vim pelo site.")} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full bg-wine text-cream" aria-label="WhatsApp">
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full border border-wine/20" aria-label="Instagram">
                  <InstagramIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
