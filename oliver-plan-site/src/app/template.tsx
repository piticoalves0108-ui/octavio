"use client";

import { motion } from "motion/react";

/** Entrada suave de cada página (só opacidade: transform aqui quebraria os pins do GSAP e os elementos fixos). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
      {children}
    </motion.div>
  );
}
