"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { movimentoReduzido } from "@/lib/gsap";
import { carregarMotion } from "@/lib/motion";
import { obterLenis, rolarPara } from "@/lib/rolagem";

/**
 * Transição entre páginas: cortina amarela (cor de destaque) que sobe, troca a rota
 * no App Router e sai por cima revelando a página nova. A animação usa o `animate`
 * do Motion, carregado só na primeira navegação.
 */
type Ctx = { navegar: (href: string, rotulo?: string) => void };

const Contexto = createContext<Ctx>({ navegar: () => {} });
const CURVA = [0.7, 0, 0.2, 1] as const;

export function TransicaoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ativa, setAtiva] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const cortina = useRef<HTMLDivElement>(null);
  const caminhoAtual = useRef(pathname);
  const aoTrocarRota = useRef<(() => void) | null>(null);
  const ocupado = useRef(false);

  const navegar = useCallback(
    async (href: string, nome = "") => {
      if (movimentoReduzido()) {
        router.push(href);
        return;
      }
      if (ocupado.current) return;
      ocupado.current = true;
      setRotulo(nome);
      setAtiva(true);
      try {
        const [{ animate }] = await Promise.all([
          carregarMotion(),
          new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        ]);
        const el = cortina.current;
        if (!el) throw new Error("sem cortina");
        await animate(el, { y: ["100%", "0%"] }, { duration: 0.55, ease: CURVA });

        const [caminho] = href.split("#");
        if ((caminho || "/") === caminhoAtual.current) {
          // mesma página: só desce até a âncora
          rolarPara(href.slice(href.indexOf("#")), true);
        } else {
          await new Promise<void>((resolve) => {
            aoTrocarRota.current = resolve;
            window.setTimeout(resolve, 4000); // rede lenta: não prende a cortina
            router.push(href);
          });
        }
        await animate(el, { y: ["0%", "-100%"] }, { duration: 0.65, ease: CURVA });
      } catch {
        router.push(href);
      } finally {
        aoTrocarRota.current = null;
        ocupado.current = false;
        setAtiva(false);
      }
    },
    [router],
  );

  // Rota nova montada: volta ao topo (ou à âncora) e libera a cortina.
  useEffect(() => {
    if (caminhoAtual.current === pathname) return;
    caminhoAtual.current = pathname;
    obterLenis()?.resize();
    const hash = window.location.hash;
    if (hash) {
      requestAnimationFrame(() => rolarPara(hash, true));
      window.setTimeout(() => rolarPara(hash, true), 450);
    } else rolarPara(0, true);
    aoTrocarRota.current?.();
  }, [pathname]);

  return (
    <Contexto.Provider value={{ navegar }}>
      {children}
      {ativa && (
        <div
          ref={cortina}
          aria-hidden="true"
          style={{ transform: "translateY(100%)" }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-sinal text-asfalto"
        >
          {/* borda de ataque com marca de banda de rodagem */}
          <svg className="absolute top-0 left-0 h-6 w-full -translate-y-full text-sinal" preserveAspectRatio="none" viewBox="0 0 100 6">
            <path d="M0 6 L0 3 L2 0 L4 3 L6 0 L8 3 L10 0 L12 3 L14 0 L16 3 L18 0 L20 3 L22 0 L24 3 L26 0 L28 3 L30 0 L32 3 L34 0 L36 3 L38 0 L40 3 L42 0 L44 3 L46 0 L48 3 L50 0 L52 3 L54 0 L56 3 L58 0 L60 3 L62 0 L64 3 L66 0 L68 3 L70 0 L72 3 L74 0 L76 3 L78 0 L80 3 L82 0 L84 3 L86 0 L88 3 L90 0 L92 3 L94 0 L96 3 L98 0 L100 3 L100 6 Z" fill="currentColor" />
          </svg>
          <span className="font-display text-[clamp(2.5rem,9vw,8rem)] leading-none font-bold tracking-tight uppercase">
            {rotulo || "Porango"}
          </span>
        </div>
      )}
    </Contexto.Provider>
  );
}

export function useTransicao() {
  return useContext(Contexto);
}

type LinkProps = React.ComponentProps<typeof Link> & { rotulo?: string };

/** Link interno com cortina. Cliques com Ctrl/Cmd/Shift seguem o padrão do navegador. */
export function LinkTransicao({ href, rotulo, onClick, ...resto }: LinkProps) {
  const { navegar } = useTransicao();
  const pathname = usePathname();
  const alvo = typeof href === "string" ? href : href.pathname ?? "/";

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const [caminho, ancora] = alvo.split("#");
        // Âncora na mesma página: rolagem suave, sem cortina.
        if (ancora !== undefined && (caminho || "/") === pathname) {
          e.preventDefault();
          rolarPara(`#${ancora}`);
          history.replaceState(null, "", `#${ancora}`);
          return;
        }
        if ((caminho || "/") === pathname) return;
        e.preventDefault();
        navegar(alvo, rotulo);
      }}
      {...resto}
    />
  );
}
