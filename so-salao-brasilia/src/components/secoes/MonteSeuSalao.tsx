"use client";

/**
 * "Monte seu salão": a seção fica presa na tela (sticky) enquanto a rolagem avança;
 * o ScrollTrigger (scrub) transforma a rolagem em progresso de 0 a 1 e a maquete 3D
 * recebe as peças uma a uma. Com movimento reduzido, mostra o salão já montado.
 * Sem WebGL, mostra o render estático do salão completo e a lista de etapas.
 */
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { secaoMonteSeuSalao } from "@/content/textos";
import { useConfiguracao } from "@/lib/configuracao";
import { carregarGsap } from "@/lib/gsap";
import { useMovimentoReduzido } from "@/lib/movimento";
import { linkWhatsapp, mensagemDoSalaoCompleto } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { useNaTela } from "@/components/cena3d/giro";
import { useCarregar3D } from "@/components/cena3d/carregar";
import type { ControleProgresso } from "@/components/cena3d/CenaSalao";
import { classesBotao } from "@/components/ui/botao";
import { IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { SeletorCor } from "@/components/configurador/Seletores";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";

const CenaSalao = dynamic(() => import("@/components/cena3d/CenaSalao"), { ssr: false });

const PASSOS = secaoMonteSeuSalao.passos.length;

export function MonteSeuSalao() {
  const reduzido = useMovimentoReduzido();
  const secao = useRef<HTMLElement>(null);
  const progresso = useRef<ControleProgresso>({ valor: 0 });
  const [passo, setPasso] = useState(-1);
  const { ref: refVisor, visivel } = useNaTela<HTMLDivElement>("200px");
  const { carregar, nivel } = useCarregar3D(visivel);
  const [pronto, setPronto] = useState(false);
  const tecido = useConfiguracao((s) => s.tecido);
  const cor = useConfiguracao((s) => s.cor);
  const acabamento = useConfiguracao((s) => s.acabamento);
  const definir = useConfiguracao((s) => s.definir);

  useEffect(() => {
    if (reduzido) {
      progresso.current.valor = 1;
      progresso.current.invalidar?.();
      setPasso(PASSOS - 1);
      return;
    }
    let cancelado = false;
    let desfazer = () => {};
    carregarGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelado || !secao.current) return;
      const ctx = gsap.context(() => {
        const aplicar = (bruto: number) => {
          // Uma pequena folga no fim, para o salão ficar montado antes de soltar a tela.
          const p = Math.min(1, bruto * 1.12);
          progresso.current.valor = p;
          progresso.current.invalidar?.();
          setPasso(p <= 0.001 ? -1 : Math.min(PASSOS - 1, Math.floor(p * PASSOS)));
        };
        const gatilho = ScrollTrigger.create({
          trigger: secao.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => aplicar(self.progress),
          onRefresh: (self) => aplicar(self.progress),
        });
        // Sincroniza já na criação (a página pode ter sido aberta no meio da seção).
        aplicar(gatilho.progress);
      }, secao);
      desfazer = () => ctx.revert();
    });
    return () => {
      cancelado = true;
      desfazer();
    };
  }, [reduzido]);

  const semTresD = nivel === "video" || nivel === "sem-webgl";

  return (
    <section
      ref={secao}
      id="monte-seu-salao"
      aria-labelledby="titulo-salao"
      className={cn("relative bg-[#e9e1d9]", reduzido ? "secao" : "h-[340svh]")}
    >
      <div className={cn(reduzido ? "" : "sticky top-0 flex h-[100svh] items-center overflow-hidden")}>
        <div className="grade w-full items-center gap-y-6 pt-20 pb-6 lg:pt-16">
          <div className="col-span-12 lg:col-span-4">
            <p className="sobretitulo text-champanhe-texto">{secaoMonteSeuSalao.sobretitulo}</p>
            <TituloAnimado id="titulo-salao" className="mt-4 text-[clamp(2.1rem,3.8vw,3.75rem)] leading-none">
              {secaoMonteSeuSalao.titulo}
            </TituloAnimado>
            <p className="mt-5 hidden text-tinta-suave md:block">{secaoMonteSeuSalao.texto}</p>

            <ol className="mt-6 space-y-1 lg:mt-8">
              {secaoMonteSeuSalao.passos.map((p, i) => {
                const feito = i <= passo;
                return (
                  <li
                    key={p.titulo}
                    className={cn(
                      "flex gap-4 border-t border-grafite/10 py-3 transition-colors duration-500",
                      feito ? "text-tinta" : "text-tinta-suave",
                      // No celular, só a etapa atual aparece (a maquete precisa de espaço).
                      i !== Math.max(0, passo) && "max-lg:hidden",
                    )}
                    aria-current={i === passo ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "mt-1 grid size-7 flex-none place-items-center rounded-full border text-xs font-medium transition-colors duration-500",
                        feito ? "border-grafite bg-grafite text-gelo" : "border-grafite/30",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-medium">{p.titulo}</span>
                      <span className="block text-sm text-tinta-suave">{p.texto}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 hidden lg:block">
              <SeletorCor
                nome="salao-cor"
                valor={cor}
                aoMudar={(v) => definir({ cor: v })}
                legenda={secaoMonteSeuSalao.rotuloCor}
              />
            </div>
            <LinkRastreado
              href={linkWhatsapp(mensagemDoSalaoCompleto({ tecido, cor, acabamento }))}
              evento="orcamento_salao_completo"
              origem="monte-seu-salao"
              externo
              className={classesBotao("primario", "mt-7 w-full sm:w-auto")}
            >
              <IconeWhatsapp className="size-4" />
              {secaoMonteSeuSalao.cta}
            </LinkRastreado>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div
              ref={refVisor}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-[#e9e1d9] max-lg:max-h-[44svh] lg:aspect-[3/2]"
            >
              <Image
                src={semTresD || reduzido ? "/images/salao/salao-montado.avif" : "/images/salao/salao-vazio.avif"}
                alt={
                  semTresD || reduzido
                    ? "Maquete ilustrativa de um salão montado: cadeiras de frente para os espelhos, lavatórios, bancada de manicure e recepção."
                    : "Maquete ilustrativa de um salão vazio, pronto para receber os móveis."
                }
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className={cn(
                  "object-contain transition-opacity duration-700",
                  carregar && pronto ? "opacity-0" : "opacity-100",
                )}
              />
              {carregar && (
                <div
                  className={cn(
                    "absolute inset-0 transition-opacity duration-700",
                    pronto ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                >
                  <CenaSalao
                    visivel={visivel}
                    progresso={progresso}
                    tecido={tecido}
                    cor={cor}
                    acabamento={acabamento}
                    aoPrimeiroQuadro={() => setPronto(true)}
                  />
                </div>
              )}
              {semTresD && (
                <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-gelo/90 px-4 py-3 text-sm backdrop-blur">
                  Maquete ilustrativa do salão completo.
                </p>
              )}
            </div>
            {!reduzido && (
              <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-grafite/10" aria-hidden>
                <div
                  className="h-full origin-left rounded-full bg-grafite transition-transform duration-300"
                  style={{ transform: `scaleX(${Math.max(0, (passo + 1) / PASSOS)})` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
