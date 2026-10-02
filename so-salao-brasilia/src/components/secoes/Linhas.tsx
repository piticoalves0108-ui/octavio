import { secaoLinhas } from "@/content/textos";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";
import { CarrosselLinhas } from "./CarrosselLinhas";

export function Linhas() {
  return (
    <section id="linhas" aria-labelledby="titulo-linhas" className="secao overflow-hidden">
      <div className="grade items-end gap-y-6">
        <div className="col-span-12 md:col-span-7">
          <p className="sobretitulo text-champanhe-texto">{secaoLinhas.sobretitulo}</p>
          <TituloAnimado id="titulo-linhas" className="titulo-secao mt-5">
            {secaoLinhas.titulo}
          </TituloAnimado>
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9">
          <p className="texto-grande text-tinta-suave">{secaoLinhas.texto}</p>
        </div>
      </div>
      <div className="mt-16 md:mt-20">
        <CarrosselLinhas />
      </div>
      <p className="conteiner mt-6 text-sm text-tinta-suave">{secaoLinhas.avisoImagens}</p>
    </section>
  );
}
