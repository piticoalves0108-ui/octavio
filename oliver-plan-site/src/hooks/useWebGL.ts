"use client";

import { useEffect, useState } from "react";

/** null enquanto não sabemos; false se o navegador não tiver WebGL (mostra-se o fallback). */
export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
