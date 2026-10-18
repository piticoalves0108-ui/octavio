"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/Icons";

/** Botão flutuante de WhatsApp em todas as páginas, com um balão de convite na primeira rolagem. */
export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [bubble, setBubble] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setBubble(true), 1200);
    const h = setTimeout(() => setBubble(false), 7000);
    return () => {
      clearTimeout(t);
      clearTimeout(h);
    };
  }, [visible]);

  if (pathname === "/agendamento") return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="fixed bottom-5 right-5 z-[75] flex items-center gap-3 sm:bottom-7 sm:right-7">
          <AnimatePresence>
            {bubble && (
              <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="hidden rounded-full bg-cream px-4 py-2 text-sm shadow-lg sm:block" role="status">
                Vamos agendar o seu momento? ✨
              </motion.span>
            )}
          </AnimatePresence>
          <a
            href={whatsappLink("Olá, Lumi! Gostaria de agendar um horário.")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Agendar pelo WhatsApp"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1f9d5c] text-white shadow-[0_15px_35px_-10px_rgba(31,157,92,0.7)] transition-transform hover:scale-105"
          >
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#1f9d5c]" />
            <WhatsAppIcon className="relative h-7 w-7" />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
