import { IconeSeta } from "@/components/Icones";
import { LinkTransicao } from "@/components/motion/Transicao";

export default function NaoEncontrada() {
  return (
    <div className="relative z-[1] flex min-h-[80svh] items-center pt-[var(--altura-header)]">
      <div className="moldura">
        <p className="rotulo text-brasa">Erro 404</p>
        <h1 className="titulo titulo-xl mt-4 text-osso">
          Esse espeto
          <span className="block text-ambar">não existe.</span>
        </h1>
        <p className="mt-6 max-w-[40ch] text-lg text-osso/85">A página que você procurou não tá aqui. O cardápio tá.</p>
        <LinkTransicao href="/" className="botao botao-brasa mt-8">
          Voltar pro início <IconeSeta className="size-5" />
        </LinkTransicao>
      </div>
    </div>
  );
}
