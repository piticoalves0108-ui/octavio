"use client";

/**
 * Versão em arquivo único da transição com cortina rosé (mesmo visual do site):
 * a cortina sobe, a rota "#/..." muda por baixo e a cortina revela a nova página.
 */
import { useAnimate } from "motion/react-mini";
import { createContext, useCallback, useContext, useEffect, useRef, type AnchorHTMLAttributes } from "react";
import { focarSecao, rolarPara } from "@/lib/rolagem";
import { movimentoReduzidoAgora } from "@/lib/movimento";
import { irPara, paraHash, rotaAtual, useRota } from "./rotas";

const NavegarContext = createContext<((href: string) => void) | null>(null);
const CURVA = [0.76, 0, 0.24, 1] as const;

export function ProvedorTransicao({ children }: { children: React.ReactNode }) {
  const rota = useRota();
  const [escopo, animar] = useAnimate<HTMLDivElement>();
  const coberto = useRef(false);
  const primeira = useRef(true);

  const revelar = useCallback(async () => {
    const { ancora } = rotaAtual();
    if (ancora) rolarPara(ancora, true);
    else rolarPara(0, true);
    await animar(
      escopo.current,
      { clipPath: ["inset(0% 0 0% 0)", "inset(0% 0 100% 0)"] },
      { duration: 0.65, ease: CURVA, delay: 0.08 },
    );
    escopo.current.style.visibility = "hidden";
    coberto.current = false;
  }, [animar, escopo]);

  const navegar = useCallback(
    async (href: string) => {
      if (/^https?:/.test(href)) {
        window.location.href = href;
        return;
      }
      const u = new URL(href, "http://site/");
      const r = rotaAtual();
      if (u.pathname === r.caminho && u.search === r.busca) {
        if (u.hash) {
          history.replaceState(null, "", paraHash(href));
          rolarPara(u.hash);
          focarSecao(u.hash);
        } else rolarPara(0);
        return;
      }
      if (movimentoReduzidoAgora() || coberto.current) {
        irPara(href);
        return;
      }
      coberto.current = true;
      const el = escopo.current;
      el.style.visibility = "visible";
      await animar(el, { clipPath: ["inset(100% 0 0% 0)", "inset(0% 0 0% 0)"] }, { duration: 0.55, ease: CURVA });
      irPara(href);
      window.setTimeout(() => coberto.current && revelar(), 4000);
    },
    [animar, escopo, revelar],
  );

  // Mudança de rota (link, voltar/avançar do navegador).
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      if (rota.ancora) window.setTimeout(() => rolarPara(rota.ancora, true), 60);
      return;
    }
    if (coberto.current) revelar();
    else if (rota.ancora) rolarPara(rota.ancora, true);
    else rolarPara(0, true);
  }, [rota, revelar]);

  return (
    <NavegarContext.Provider value={navegar}>
      {children}
      <div
        ref={escopo}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[95] grid place-items-center bg-rose"
        style={{ clipPath: "inset(100% 0 0% 0)", visibility: "hidden" }}
      >
        <span className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] text-grafite">Só Salão</span>
      </div>
    </NavegarContext.Provider>
  );
}

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean };

export function LinkTransicao({ href, onClick, prefetch, ...props }: PropsLink) {
  void prefetch;
  const navegar = useContext(NavegarContext);
  return (
    <a
      href={paraHash(href)}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!navegar || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        navegar(href);
      }}
    />
  );
}
