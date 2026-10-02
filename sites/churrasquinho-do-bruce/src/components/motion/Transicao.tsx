"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAnimate } from "motion/react-mini";
import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { IconeChama } from "@/components/Icones";
import { agendarRefresh, motorAtual, movimentoReduzido, rolarPara } from "@/lib/motor";

/**
 * Transição entre páginas com cortina na cor brasa (Motion + App Router).
 * O link intercepta o clique, a cortina sobe e cobre, o router troca a página,
 * e a cortina segue subindo para revelar a página nova.
 */
type Contexto = { navegar: (href: string) => void };
const TransicaoContexto = createContext<Contexto>({ navegar: () => {} });
export const useTransicao = () => useContext(TransicaoContexto);

const EASE_CORTINA = [0.76, 0, 0.24, 1] as const;

export function TransicaoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [cortina, animar] = useAnimate<HTMLDivElement>();
  const emTransicao = useRef(false);

  const navegar = useCallback(
    async (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) {
        if (url.hash) {
          history.replaceState(null, "", url.hash);
          rolarPara(url.hash);
        } else rolarPara(0);
        return;
      }
      if (emTransicao.current) return;
      emTransicao.current = true;
      if (movimentoReduzido() || !cortina.current) {
        router.push(href);
        return;
      }
      cortina.current.style.visibility = "visible";
      await animar(cortina.current, { transform: ["translateY(100%)", "translateY(0%)"] }, { duration: 0.6, ease: EASE_CORTINA });
      router.push(href);
    },
    [animar, cortina, router],
  );

  // Página nova montada: volta ao topo (se não for âncora) e revela.
  useEffect(() => {
    if (!emTransicao.current) return;
    const temHash = Boolean(window.location.hash);
    const lenis = motorAtual()?.lenis;
    if (!temHash) {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    }
    agendarRefresh();
    const el = cortina.current;
    const quadro = requestAnimationFrame(async () => {
      if (el && !movimentoReduzido()) {
        await animar(el, { transform: ["translateY(0%)", "translateY(-100%)"] }, { duration: 0.75, ease: EASE_CORTINA, delay: 0.12 });
        el.style.visibility = "hidden";
      }
      emTransicao.current = false;
    });
    return () => cancelAnimationFrame(quadro);
  }, [pathname, animar, cortina]);

  return (
    <TransicaoContexto.Provider value={{ navegar }}>
      {children}
      <div
        ref={cortina}
        aria-hidden
        className="pointer-events-none invisible fixed inset-0 z-[100] flex translate-y-full items-center justify-center bg-brasa text-carvao"
      >
        <div className="flex flex-col items-center gap-4">
          <IconeChama className="h-16 w-auto" />
          <span className="titulo text-3xl">Churrasquinho do Bruce</span>
        </div>
      </div>
    </TransicaoContexto.Provider>
  );
}

/** <Link> com a transição de cortina. Ctrl/Cmd+clique continua abrindo nova aba. */
export function LinkTransicao({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { navegar } = useTransicao();
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navegar(href);
      }}
    />
  );
}
