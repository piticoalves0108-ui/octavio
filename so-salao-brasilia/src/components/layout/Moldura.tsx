import { Cabecalho } from "./Cabecalho";
import { Rodape } from "./Rodape";
import { WhatsappFlutuante } from "./WhatsappFlutuante";
import { ProvedorTransicao } from "./Transicao";
import { RolagemSuave } from "./RolagemSuave";
import { Medicao } from "./Medicao";
import { HidratarAoVer } from "./HidratarAoVer";

/** Moldura do site: cabeçalho, conteúdo, rodapé, WhatsApp flutuante, rolagem e medição. */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProvedorTransicao>
        <Cabecalho />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <HidratarAoVer>
          <Rodape />
        </HidratarAoVer>
        <WhatsappFlutuante />
      </ProvedorTransicao>
      <RolagemSuave />
      <Medicao />
    </>
  );
}
