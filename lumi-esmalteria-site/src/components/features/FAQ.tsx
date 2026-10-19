"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Perguntas frequentes em acordeão acessível. */
export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="border-t border-wine/15">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className="border-b border-wine/15">
            <h3>
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-xl font-light md:text-2xl"
              >
                {it.q}
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-wine/20 transition-transform duration-500", isOpen && "rotate-45 bg-wine text-cream")}>
                  <Plus className="h-4 w-4" aria-hidden />
                </span>
              </button>
            </h3>
            <Panel id={`${base}-a${i}`} labelledBy={`${base}-q${i}`} open={isOpen}>
              <p className="max-w-2xl pb-8 leading-relaxed text-muted">{it.a}</p>
            </Panel>
          </div>
        );
      })}
    </div>
  );
}

/** Painel sempre no DOM (o aria-controls aponta para ele); fica `hidden` depois de recolher. */
function Panel({ id, labelledBy, open, children }: { id: string; labelledBy: string; open: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(!open);
  return (
    <motion.div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      hidden={!open && collapsed}
      initial={false}
      animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => setCollapsed(!open)}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
