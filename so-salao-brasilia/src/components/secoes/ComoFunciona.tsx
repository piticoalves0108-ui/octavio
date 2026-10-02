import { secaoComoFunciona } from "@/content/textos";
import { Contador } from "@/components/movimento/Contador";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";
import { LinhaDoTempo } from "./LinhaDoTempo";

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona">
      <div className="secao">
        <div className="grade gap-y-6">
          <div className="col-span-12 md:col-span-8">
            <p className="sobretitulo text-champanhe-texto">{secaoComoFunciona.sobretitulo}</p>
            <TituloAnimado id="titulo-como-funciona" className="titulo-secao mt-5">
              {secaoComoFunciona.titulo}
            </TituloAnimado>
          </div>
        </div>
        <div className="grade mt-16 gap-y-14 md:mt-24">
          {secaoComoFunciona.numeros.map((n, i) => (
            <div
              key={n.valor}
              className={
                i === 0
                  ? "col-span-12 md:col-span-6"
                  : "col-span-12 md:col-span-5 md:col-start-8 md:border-l md:border-grafite/15 md:pl-12"
              }
            >
              <p className="sr-only">{`${n.prefixo} ${n.valor}${n.colado} ${n.sufixo}`.trim()}</p>
              <p aria-hidden className="flex items-baseline gap-3 font-serif leading-[0.8]">
                {n.prefixo && (
                  <span className="text-[clamp(1.6rem,3vw,2.6rem)] text-tinta-suave italic">{n.prefixo}</span>
                )}
                <span className="text-[clamp(7rem,17vw,15rem)]">
                  <Contador valor={n.valor} inicio={n.inicio} />
                  {n.colado && <span className="text-[0.55em]">{n.colado}</span>}
                </span>
                <span className="text-[clamp(1.6rem,3vw,2.6rem)]">{n.sufixo}</span>
              </p>
              <p className="mt-6 max-w-md texto-grande text-tinta-suave">{n.texto}</p>
            </div>
          ))}
        </div>
      </div>
      <LinhaDoTempo />
    </section>
  );
}
