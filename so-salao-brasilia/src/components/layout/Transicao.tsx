"use client";

/**
 * Transição entre páginas com cortina rosé (Motion + App Router).
 * 1. O link é interceptado e a cortina sobe cobrindo a tela.
 * 2. A rota muda por baixo (router.push).
 * 3. Quando o novo caminho aparece, a cortina continua subindo e revela a página.
 * Links para âncoras da mesma página só rolam (sem cortina).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAnimate } from "motion/react-mini";
import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps } from "react";
import { focarSecao, rolarPara } from "@/lib/rolagem";
import { movimentoReduzidoAgora } from "@/lib/movimento";

const NavegarContext = createContext<((href: string) => void) | null>(null);

const CURVA = [0.76, 0, 0.24, 1] as const;

export function ProvedorTransicao({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const caminho = usePathname();
  const [escopo, animar] = useAnimate<HTMLDivElement>();
  const coberto = useRef(false);
  const destino = useRef<URL | null>(null);

  const revelar = useCallback(async () => {
    const url = destino.current;
    destino.current = null;
    if (url?.hash) rolarPara(url.hash, true);
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
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.href = href;
        return;
      }
      // Mesma página (mesmo caminho e mesma query): só rola até a âncora.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        if (url.hash) {
          history.replaceState(null, "", url.hash);
          rolarPara(url.hash);
          focarSecao(url.hash);
        } else rolarPara(0);
        return;
      }
      if (movimentoReduzidoAgora() || coberto.current || url.pathname === window.location.pathname) {
        router.push(href);
        return;
      }
      coberto.current = true;
      destino.current = url;
      const el = escopo.current;
      el.style.visibility = "visible";
      await animar(el, { clipPath: ["inset(100% 0 0% 0)", "inset(0% 0 0% 0)"] }, { duration: 0.55, ease: CURVA });
      router.push(href, { scroll: false });
      // Segurança: se a rota demorar, revela mesmo assim.
      window.setTimeout(() => coberto.current && revelar(), 4000);
    },
    [animar, escopo, router, revelar],
  );

  useEffect(() => {
    if (coberto.current) revelar();
  }, [caminho, revelar]);

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

type PropsLink = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** <Link> do Next com a cortina de transição. Use em toda navegação interna. */
export function LinkTransicao({ href, onClick, ...props }: PropsLink) {
  const navegar = useContext(NavegarContext);
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (
          !navegar ||
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          props.target === "_blank"
        )
          return;
        e.preventDefault();
        navegar(href);
      }}
    />
  );
}
