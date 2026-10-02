import { Suspense } from "react";
import { servicos } from "@/content/site";
import { Alinhamento } from "@/components/sections/Alinhamento";
import { Anatomia } from "@/components/sections/Anatomia";
import { ComoChegar } from "@/components/sections/ComoChegar";
import { Faq } from "@/components/sections/Faq";
import { Galeria } from "@/components/sections/Galeria";
import { Hero } from "@/components/sections/Hero";
import { Marcas } from "@/components/sections/Marcas";
import { Medida } from "@/components/sections/Medida";
import { PorQue } from "@/components/sections/PorQue";
import { Seletor } from "@/components/sections/Seletor";
import { Servicos } from "@/components/sections/Servicos";
import { Palco } from "@/components/three/Palco";
import { MODO_PREVIA } from "@/lib/pendente";

/**
 * HOME. Ordem das seções:
 * hero > medida (leitura + seletor) > por dentro do pneu > serviços > alinhamento
 * > marcas > por que a Porango > galeria > como chegar > dúvidas.
 * O <Palco> é o fundo 3D fixo; as seções sem fundo deixam o pneu aparecer.
 * Cada seção abaixo da dobra fica num <Suspense>: o React hidrata uma por vez e
 * devolve o controle ao navegador entre elas (menos tarefas longas, TBT menor).
 */
export default function Home() {
  const alinhamento = servicos.filter((s) => s.id === "alinhamento" || s.id === "balanceamento");
  const alinhamentoConfirmado = alinhamento.some((s) => s.confirmado);
  const mostrarAlinhamento = alinhamentoConfirmado || MODO_PREVIA;

  return (
    <div className="relative">
      <Palco />
      <Hero />
      <Suspense>
        <Medida />
      </Suspense>
      <Suspense>
        <Seletor />
      </Suspense>
      <Suspense>
        <Anatomia />
      </Suspense>
      <Suspense>
        <Servicos />
      </Suspense>
      {mostrarAlinhamento && (
        <Suspense>
          <Alinhamento confirmado={alinhamentoConfirmado} />
        </Suspense>
      )}
      <Suspense>
        <Marcas />
      </Suspense>
      <Suspense>
        <PorQue />
      </Suspense>
      <Suspense>
        <Galeria />
      </Suspense>
      <Suspense>
        <ComoChegar />
      </Suspense>
      <Suspense>
        <Faq />
      </Suspense>
    </div>
  );
}
