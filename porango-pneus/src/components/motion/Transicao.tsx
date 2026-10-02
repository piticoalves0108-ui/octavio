"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { EDICAO_HTML, hrefPagina, paginaAtual } from "@/lib/edicao";
import { movimentoReduzido } from "@/lib/gsap";
import { carregarMotion } from "@/lib/motion";
import { obterLenis, rolarPara } from "@/lib/rolagem";

/**
 * Transição entre páginas: cortina amarela (cor de destaque) que sobe, troca a rota
 * no App Router e sai por cima revelando a página nova. A animação usa o `animate`
 * do Motion, carregado só na primeira navegação.
 *
 * Na edição HTML (arquivos estáticos) cada página é um arquivo: a cortina cobre, o
 * navegador abre o arquivo novo e a página nova começa coberta e revela.
 */
const CHAVE_CORTINA = "porango-cortina";
type Ctx = { navegar: (href: string, rotulo?: string) => void };

const Contexto = createContext<Ctx>({ navegar: () => {} });
const CURVA = [0.7, 0, 0.2, 1] as const;

export function TransicaoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ativa, setAtiva] = useState(false);
  const [rotulo, setRotulo] = useState("");
  // edição HTML: a página nova nasce coberta quando veio de uma troca com cortina
  const [entrandoCoberta, setEntrandoCoberta] = useState(false);
  const cortina = useRef<HTMLDivElement>(null);
  const caminhoAtual = useRef(pathname);
  const aoTrocarRota = useRef<(() => void) | null>(null);
  const ocupado = useRef(false);

  const navegar = useCallback(
    async (href: string, nome = "") => {
      const irPara = (destino: string) => (EDICAO_HTML ? window.location.assign(destino) : router.push(destino));
      if (movimentoReduzido()) {
        irPara(href);
        return;
      }
      if (ocupado.current) return;
      ocupado.current = true;
      setRotulo(nome);
      setAtiva(true);
      // edição HTML: a página nova abre mesmo se a animação travar
      const abrirArquivo = () => {
        try {
          sessionStorage.setItem(CHAVE_CORTINA, nome);
        } catch {}
        window.location.assign(href);
      };
      const reserva = EDICAO_HTML ? window.setTimeout(abrirArquivo, 2000) : 0;
      try {
        const [{ animate }] = await Promise.all([
          carregarMotion(),
          new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        ]);
        const el = cortina.current;
        if (!el) throw new Error("sem cortina");
        await animate(el, { y: ["100%", "0%"] }, { duration: 0.55, ease: CURVA });

        if (EDICAO_HTML) {
          // a cortina fica cobrindo enquanto o arquivo novo carrega
          window.clearTimeout(reserva);
          abrirArquivo();
          return;
        }

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
        window.clearTimeout(reserva);
        irPara(href);
      } finally {
        if (EDICAO_HTML) return;
        aoTrocarRota.current = null;
        ocupado.current = false;
        setAtiva(false);
      }
    },
    [router],
  );

  // Página aberta com âncora (#medida): garante a posição. Nem sempre o navegador
  // rola sozinho quando a página vem de outra (com o preloader na frente, por exemplo).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const alvo = id ? document.getElementById(id) : null;
    if (alvo && window.scrollY < 2) rolarPara(alvo, true);
  }, []);

  // Edição HTML: chegou de uma troca com cortina? Começa coberta e revela.
  useEffect(() => {
    if (!EDICAO_HTML) return;
    // voltou pelo botão "voltar" (página restaurada da memória): sem cortina parada na tela
    const aoMostrar = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      ocupado.current = false;
      setAtiva(false);
      setEntrandoCoberta(false);
    };
    window.addEventListener("pageshow", aoMostrar);
    let nome: string | null = null;
    try {
      nome = sessionStorage.getItem(CHAVE_CORTINA);
      sessionStorage.removeItem(CHAVE_CORTINA);
    } catch {}
    let cancelado = false;
    if (nome !== null && !movimentoReduzido()) {
      setRotulo(nome);
      setEntrandoCoberta(true);
      setAtiva(true);
      Promise.all([carregarMotion(), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))]).then(
        async ([{ animate }]) => {
          const el = cortina.current;
          if (cancelado || !el) return;
          await animate(el, { y: ["0%", "-100%"] }, { duration: 0.65, ease: CURVA });
          if (!cancelado) {
            setAtiva(false);
            setEntrandoCoberta(false);
          }
        },
      );
    }
    return () => {
      cancelado = true;
      window.removeEventListener("pageshow", aoMostrar);
    };
  }, []);

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
          style={{ transform: entrandoCoberta ? "translateY(0%)" : "translateY(100%)" }}
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

  if (EDICAO_HTML) {
    const destino = hrefPagina(alvo);
    const { className, children, id, "aria-label": ariaLabel } = resto;
    return (
      <a
        href={destino}
        className={className}
        id={id}
        aria-label={ariaLabel}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          const [arquivo, ancora] = destino.split("#");
          if (arquivo === paginaAtual()) {
            if (ancora === undefined) return;
            // âncora na mesma página: rolagem suave, sem cortina
            e.preventDefault();
            rolarPara(`#${ancora}`);
            history.replaceState(null, "", `#${ancora}`);
            return;
          }
          e.preventDefault();
          navegar(destino, rotulo);
        }}
      >
        {children}
      </a>
    );
  }

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
