import { classesBotao } from "@/components/ui/botao";
import { LinkTransicao } from "@/components/layout/Transicao";
import { Moldura } from "@/components/layout/Moldura";

export default function NaoEncontrada() {
  return (
    <Moldura>
      <section className="grid min-h-[80svh] place-items-center px-6 pt-28 text-center">
        <div>
          <p className="sobretitulo text-champanhe-texto">Página não encontrada</p>
          <h1 className="mt-5 text-[clamp(2.6rem,6vw,5rem)] leading-none">Essa peça não está no showroom.</h1>
          <p className="mx-auto mt-6 max-w-md text-tinta-suave">
            O endereço pode ter mudado. Volte para o início ou monte a sua peça no configurador.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <LinkTransicao href="/" className={classesBotao("primario")}>
              Voltar ao início
            </LinkTransicao>
            <LinkTransicao href="/configurador" className={classesBotao("secundario")}>
              Abrir o configurador
            </LinkTransicao>
          </div>
        </div>
      </section>
    </Moldura>
  );
}
