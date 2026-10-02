"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import { agendarRefresh, carregarMotor, type Motor } from "@/lib/motor";

type Limpeza = void | (() => void);

/**
 * Roda `montar` quando o motor de animação estiver pronto, dentro de um
 * gsap.context (tudo é revertido ao desmontar ou trocar de página).
 */
export function useMotor(montar: (motor: Motor) => Limpeza, escopo?: RefObject<HTMLElement | null>, deps: DependencyList = []) {
  useEffect(() => {
    let cancelado = false;
    let limpar: Limpeza;
    let contexto: { revert: () => void } | null = null;

    carregarMotor().then((motor) => {
      if (cancelado) return;
      contexto = motor.gsap.context(() => {
        limpar = montar(motor);
      }, escopo?.current ?? undefined);
      agendarRefresh();
    });

    return () => {
      cancelado = true;
      if (typeof limpar === "function") limpar();
      contexto?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
