import { secaoConfigurador } from "@/content/textos";
import { Configurador } from "@/components/configurador/Configurador";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";

export function SecaoConfigurador() {
  return (
    <section id="configurador" aria-labelledby="titulo-configurador" className="tema-escuro secao bg-grafite text-gelo">
      <div className="grade items-end gap-y-6">
        <div className="col-span-12 md:col-span-7">
          <p className="sobretitulo text-champanhe">{secaoConfigurador.sobretitulo}</p>
          <TituloAnimado id="titulo-configurador" className="titulo-secao mt-5">
            {secaoConfigurador.titulo}
          </TituloAnimado>
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9">
          <p className="texto-grande text-nevoa">{secaoConfigurador.texto}</p>
        </div>
      </div>
      <div className="conteiner mt-14 md:mt-20">
        <Configurador />
      </div>
    </section>
  );
}
