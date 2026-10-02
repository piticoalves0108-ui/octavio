"use client";

/**
 * Renderiza uma cena com parâmetros fixos vindos da URL:
 *   /captura?cena=hero&angulo=0.6&w=960&h=1200
 *   /captura?cena=modelo&modelo=lavatorio&angulo=-0.5&tecido=veludo&cor=rose&acabamento=dourado
 *   /captura?cena=salao&progresso=1
 * Quando a cena termina de desenhar, define window.__pronto = true.
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useGiro } from "@/components/cena3d/giro";
import { useConfiguracao, configuracaoDosParams } from "@/lib/configuracao";
import { useQualidade } from "@/lib/qualidade";
import type { ModeloId } from "@/content/catalogo";

const CenaHero = dynamic(() => import("@/components/cena3d/CenaHero"), { ssr: false });
const CenaConfigurador = dynamic(() => import("@/components/cena3d/CenaConfigurador"), { ssr: false });
const CenaSalao = dynamic(() => import("@/components/cena3d/CenaSalao"), { ssr: false });

declare global {
  interface Window {
    __pronto?: boolean;
    __definirAngulo?: (a: number) => void;
    __definirProgresso?: (p: number) => void;
  }
}

export function Captura() {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    useConfiguracao.getState().definir(configuracaoDosParams(p));
    useQualidade.setState({ nivel: (p.get("qualidade") as "alto") || "alto", fator: 1 });
    setParams(p);
  }, []);
  if (!params) return null;
  return <Palco params={params} />;
}

function Palco({ params }: { params: URLSearchParams }) {
  const cena = params.get("cena") ?? "hero";
  const largura = Number(params.get("w") ?? 960);
  const altura = Number(params.get("h") ?? 1200);
  const angulo = Number(params.get("angulo") ?? 0);
  const { controle } = useGiro(angulo);
  const progresso = useMemo(() => ({ current: { valor: Number(params.get("progresso") ?? 1) } }), [params]);
  const config = useConfiguracao();

  useEffect(() => {
    window.__definirAngulo = (a: number) => {
      controle.current.alvo = a;
      controle.current.atual = a;
      controle.current.invalidar?.();
    };
    window.__definirProgresso = (p: number) => {
      progresso.current.valor = p;
      (progresso.current as { invalidar?: () => void }).invalidar?.();
    };
  }, [controle, progresso]);

  const pronto = () => {
    // Dá tempo para as sombras acumuladas assentarem.
    window.setTimeout(() => (window.__pronto = true), cena === "modelo" ? 2500 : 600);
  };

  return (
    <div id="palco" style={{ width: largura, height: altura, position: "relative" }}>
      {cena === "hero" && <CenaHero visivel controle={controle} autoGiro={false} aoPrimeiroQuadro={pronto} captura />}
      {cena === "modelo" && (
        <CenaConfigurador
          visivel
          controle={controle}
          modelo={(params.get("modelo") as ModeloId) ?? "cadeira"}
          tecido={config.tecido}
          cor={config.cor}
          acabamento={config.acabamento}
          aoPrimeiroQuadro={pronto}
          fundo={params.get("fundo") ?? undefined}
          captura
        />
      )}
      {cena === "salao" && (
        <CenaSalao
          visivel
          progresso={progresso}
          tecido={config.tecido}
          cor={config.cor}
          acabamento={config.acabamento}
          aoPrimeiroQuadro={pronto}
          captura
        />
      )}
    </div>
  );
}
