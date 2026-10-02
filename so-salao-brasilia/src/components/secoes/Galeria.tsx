import { galeria, marcadorGaleria, secaoGaleria } from "@/content/textos";
import { negocio } from "@/content/negocio";
import { cn } from "@/lib/cn";
import { FotoReservada } from "@/components/ui/FotoReservada";
import { IconeInstagram } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Texto } from "@/components/ui/Texto";
import { classesBotao } from "@/components/ui/botao";
import { TituloAnimado } from "@/components/movimento/TituloAnimado";

// Posição de cada foto na grade editorial de 12 colunas.
const posicoes = [
  "md:col-span-5",
  "md:col-span-4 md:col-start-8 md:mt-40",
  "md:col-span-6 md:col-start-2",
  "md:col-span-4 md:col-start-9 md:-mt-24",
  "md:col-span-6 md:col-start-1",
  "md:col-span-4 md:col-start-8 md:mt-24",
];

export function Galeria() {
  return (
    <section id="saloes" aria-labelledby="titulo-galeria" className="secao">
      <div className="grade items-end gap-y-6">
        <div className="col-span-12 md:col-span-7">
          <p className="sobretitulo text-champanhe-texto">{secaoGaleria.sobretitulo}</p>
          <TituloAnimado id="titulo-galeria" className="titulo-secao mt-5">
            {secaoGaleria.titulo}
          </TituloAnimado>
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9">
          <p className="texto-grande text-tinta-suave">{secaoGaleria.texto}</p>
          <p className="mt-4 text-sm text-tinta-suave">
            {secaoGaleria.aviso} <Texto>{marcadorGaleria}</Texto>
          </p>
        </div>
      </div>

      <ul className="grade mt-16 gap-y-12 md:mt-24 md:gap-y-16">
        {galeria.map((item, i) => (
          <li key={item.id} className={cn("col-span-12", posicoes[i % posicoes.length])}>
            <FotoReservada
              proporcao={item.proporcao}
              fotoIdeal={item.fotoIdeal}
              imagem={item.imagem}
              sizes="(min-width: 768px) 45vw, 100vw"
            />
          </li>
        ))}
      </ul>

      <div className="conteiner mt-16 flex justify-center">
        <LinkRastreado
          href={negocio.instagram.url}
          evento="instagram_clique"
          origem="galeria"
          externo
          className={classesBotao("secundario")}
        >
          <IconeInstagram className="size-5" />
          {secaoGaleria.ctaInstagram} {negocio.instagram.usuario}
        </LinkRastreado>
      </div>
    </section>
  );
}
