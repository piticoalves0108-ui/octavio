import { Foto } from "@/components/Foto";
import { IconeInstagram } from "@/components/Icones";
import { LinkRastreado } from "@/components/conversao/LinkRastreado";
import { Revelar } from "@/components/motion/Revelar";
import { TituloCalor } from "@/components/motion/TituloCalor";
import { negocio } from "@/content/negocio";
import { fotosDaGaleria } from "@/lib/instagram";
import { linkInstagram } from "@/lib/links";

/** Seção 4: galeria masonry (CSS columns) com as fotos do Instagram. */
export async function Galeria() {
  const { fotos } = await fotosDaGaleria();

  return (
    <section id="galeria" aria-labelledby="titulo-galeria" className="relative z-[1] bg-carvao pb-28 md:pb-44">
      <div className="moldura">
        <div className="grade items-end gap-y-6">
          <p className="rotulo col-span-12 text-brasa">Galeria</p>
          <TituloCalor id="titulo-galeria" className="titulo-lg col-span-12 text-osso md:col-span-8">
            Direto do <span className="text-ambar">Instagram</span>
          </TituloCalor>
          <div className="col-span-12 md:col-span-4 md:justify-self-end">
            <LinkRastreado href={linkInstagram} evento="instagram" origem="galeria-topo" className="botao botao-linha">
              <IconeInstagram className="size-5" />@{negocio.instagram.usuario}
            </LinkRastreado>
          </div>
        </div>

        <Revelar className="mt-14 md:mt-20">
          <ul className="columns-2 gap-3 md:columns-3 md:gap-5">
            {fotos.map((foto, i) => (
              <li key={`${foto.alt}-${i}`} className="mb-3 break-inside-avoid md:mb-5">
                <LinkRastreado
                  href={foto.link ?? linkInstagram}
                  evento="instagram"
                  origem="galeria-foto"
                  className="group block overflow-hidden rounded-2xl"
                  aria-label={`${foto.alt} (abre o Instagram)`}
                >
                  <div className="transition-transform duration-700 ease-[var(--ease-brasa)] group-hover:scale-[1.03]">
                    <Foto foto={foto} sizes="(min-width: 768px) 32vw, 48vw" />
                  </div>
                </LinkRastreado>
              </li>
            ))}
          </ul>
        </Revelar>
      </div>
    </section>
  );
}
