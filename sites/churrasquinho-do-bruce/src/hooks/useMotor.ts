"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import { carregarMotor, enfileirar, type Motor } from "@/lib/motor";

type Limpeza = void | (() => void);

/**
 * Roda `montar` quando o motor de animação estiver pronto, dentro de um
 * gsap.context (tudo é revertido ao desmontar ou trocar de página).
 */
export function useMotor(montar: (motor: Motor) => Limpeza, escopo?: RefObject<Element | null>, deps: DependencyList = []) {
  useEffect(() => {
    let cancelado = false;
    let limpar: Limpeza;
    let contexto: { revert: () => void } | null = null;

    carregarMotor().then((motor) =>
      enfileirar(() => {
        if (cancelado) return;
        contexto = motor.gsap.context(() => {
          limpar = montar(motor);
        }, escopo?.current ?? undefined);
      }),
    );

    return () => {
      cancelado = true;
      if (typeof limpar === "function") limpar();
      contexto?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
