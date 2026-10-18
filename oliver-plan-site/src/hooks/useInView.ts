"use client";

import { useEffect, useState, type RefObject } from "react";

/** true enquanto o elemento estiver (perto de estar) visível. Usado para pausar cenas 3D fora da tela. */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = "200px") {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return visible;
}
