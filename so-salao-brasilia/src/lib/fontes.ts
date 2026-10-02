import { DM_Serif_Display, Outfit } from "next/font/google";

// Português cabe no subset "latin" (á, ã, ç, é, õ...): menos arquivos de fonte para baixar.

/** Títulos: DM Serif Display (regular e itálico). */
export const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-serif",
});

/** Texto e interface: Outfit (fonte variável). */
export const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});
