"use client";

/**
 * Hidratação sob demanda (padrão "ilhas").
 *
 * O HTML da seção vem completo do servidor (SEO, leitura sem JS, links funcionando).
 * Na hidratação inicial, o React NÃO percorre o conteúdo: deixa o HTML do servidor
 * intacto (dangerouslySetInnerHTML vazio + suppressHydrationWarning). Quando a seção
 * chega a uma tela de distância, o conteúdo é renderizado de verdade e fica interativo.
 * Resultado: o carregamento só hidrata o que está na primeira dobra (menos TBT).
 *
 * Em navegações do lado do cliente (sem HTML do servidor), renderiza direto.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

let hidratacaoInicialConcluida = false;

const FOCAVEIS = "a[href], button, input, select, textarea, [tabindex]";

export function HidratarAoVer({ children, margem = "0px 0px 100% 0px" }: { children: ReactNode; margem?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(() => typeof window === "undefined" || hidratacaoInicialConcluida);
  const focoPendente = useRef<number | null>(null);

  useEffect(() => {
    hidratacaoInicialConcluida = true;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (ativo || !el) return;
    const ativar = () => {
      // Guarda qual elemento estava em foco (teclado) para devolvê-lo depois da troca.
      const focado = document.activeElement;
      if (focado && el.contains(focado)) {
        focoPendente.current = Array.from(el.querySelectorAll(FOCAVEIS)).indexOf(focado);
      }
      setAtivo(true);
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && ativar(), { rootMargin: margem });
    io.observe(el);
    el.addEventListener("focusin", ativar);
    el.addEventListener("pointerdown", ativar);
    return () => {
      io.disconnect();
      el.removeEventListener("focusin", ativar);
      el.removeEventListener("pointerdown", ativar);
    };
  }, [ativo, margem]);

  useLayoutEffect(() => {
    if (!ativo || focoPendente.current === null || !ref.current) return;
    const alvo = ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)[focoPendente.current];
    focoPendente.current = null;
    alvo?.focus({ preventScroll: true });
  }, [ativo]);

  if (!ativo) {
    return <div ref={ref} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
  }
  return <div ref={ref}>{children}</div>;
}
