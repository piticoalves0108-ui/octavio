import { Cabecalho } from "./Cabecalho";
import { Rodape } from "./Rodape";
import { WhatsappFlutuante } from "./WhatsappFlutuante";
import { ProvedorTransicao } from "./Transicao";
import { RolagemSuave } from "./RolagemSuave";
import { ProvedorMovimento } from "./ProvedorMovimento";
import { Medicao } from "./Medicao";

/** Moldura do site: cabeçalho, conteúdo, rodapé, WhatsApp flutuante, rolagem e medição. */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProvedorMovimento>
        <ProvedorTransicao>
          <Cabecalho />
          <main id="conteudo" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Rodape />
          <WhatsappFlutuante />
        </ProvedorTransicao>
      </ProvedorMovimento>
      <RolagemSuave />
      <Medicao />
    </>
  );
}
