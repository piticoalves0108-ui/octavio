"use client";

import { useSyncExternalStore } from "react";
import { assinar } from "@/lib/palco";

/** Lê um valor derivado do palco e re-renderiza só quando ele muda. */
export function usePalco<T>(seletor: () => T): T {
  return useSyncExternalStore(assinar, seletor, seletor);
}
