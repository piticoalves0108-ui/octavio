import { Revelar } from "@/components/motion/Revelar";
import { categoria } from "@/content/cardapio";
import { AvisoPreco, CategoriaCartoes } from "./CategoriaCartoes";

const blocos = [categoria("almoco"), categoria("bebidas")];

/** Almoço e bebidas: seção opaca (a cena 3D pausa por baixo). */
export function AlmocoBebidas() {
  return (
    <div className="relative z-[1] bg-carvao pb-32 pt-24 md:pb-44 md:pt-32">
      <div className="moldura grade gap-y-20">
        {blocos.map((cat, i) => (
          <div key={cat.id} id={cat.id} className="col-span-12 lg:col-span-6" aria-labelledby={`titulo-${cat.id}`}>
            <Revelar>
              <p className="rotulo text-brasa">0{i + 3} · Cardápio</p>
              <h3 id={`titulo-${cat.id}`} className="titulo titulo-md mt-3 text-osso">
                {cat.titulo}
              </h3>
              <p className="mt-3 text-lg text-osso/85">{cat.chamada}</p>
              <AvisoPreco categoria={cat} className="mt-2" />
            </Revelar>
            <Revelar className="mt-8">
              <CategoriaCartoes categoria={cat} colunas="sm:grid-cols-2" origem={`cardapio-${cat.id}`} />
            </Revelar>
          </div>
        ))}
      </div>
    </div>
  );
}
