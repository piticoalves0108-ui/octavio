"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { contactHref, site } from "@/config/site";
import { WhatsAppIcon } from "./icons";

/**
 * Celular: barra fixa com preço + WhatsApp depois do hero.
 * Desktop: botão flutuante do WhatsApp.
 */
export function StickyContact() {
  const [past, setPast] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);

  useEffect(() => {
    const on = () => {
      setPast(window.scrollY > window.innerHeight * 0.85);
      setNearEnd(window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 160);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  const show = past && !nearEnd;

  return (
    <>
      {/* Celular */}
      <AnimatePresence>
        {show && (
          <m.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/85 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div className="leading-tight">
                <div className="font-display text-xl font-bold">
                  {site.priceLabel}
                  <span className="text-sm font-normal text-muted">/mês</span>
                </div>
                <div className="text-xs text-muted">atualizações inclusas</div>
              </div>
              <a
                href={contactHref()}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="barra-mobile"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-wa px-5 font-semibold text-wa-ink"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Quero meu site
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Desktop */}
      <AnimatePresence>
        {show && (
          <m.a
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            href={contactHref()}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="flutuante"
            aria-label="Falar no WhatsApp"
            className="fixed bottom-6 right-6 z-50 hidden h-16 w-16 place-items-center rounded-full bg-wa text-wa-ink shadow-[0_12px_40px_-8px_rgb(37_211_102/0.7)] transition-transform hover:scale-110 lg:grid"
          >
            <WhatsAppIcon className="h-8 w-8" />
          </m.a>
        )}
      </AnimatePresence>
    </>
  );
}
