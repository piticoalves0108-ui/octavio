import { DM_Serif_Display, Outfit } from "next/font/google";

// Português cabe no subset "latin" (á, ã, ç, é, õ...): menos arquivos de fonte para baixar.

/** Títulos: DM Serif Display regular (pré-carregada: está no título do hero). */
export const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-dm-serif",
});

/**
 * Itálico do DM Serif Display, em instância separada e sem pré-carregamento: aparece só
 * em destaques (classe `italico`), então não disputa banda com o que pinta primeiro.
 */
export const dmSerifItalico = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-dm-serif-italico",
});

/** Texto e interface: Outfit (fonte variável). */
export const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});
