"use client";

import { useEffect, useState } from "react";

/** true depois que a tela de abertura terminou (ou imediatamente, se ela já foi vista nesta sessão). */
export function useSiteLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (document.documentElement.classList.contains("is-loaded")) {
      setLoaded(true);
      return;
    }
    const on = () => setLoaded(true);
    window.addEventListener("site:loaded", on);
    return () => window.removeEventListener("site:loaded", on);
  }, []);
  return loaded;
}
