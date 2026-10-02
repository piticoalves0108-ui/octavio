import { negocio } from "@/content/site";
import { Titulo } from "@/components/motion/Titulo";
import { IconeInstagram } from "@/components/ui/Icones";
import { fotosGaleria } from "@/lib/instagram";
import { GaleriaGrade } from "./GaleriaGrade";

/** 6. GALERIA: fotos da loja e dos serviços, puxadas do Instagram. */
export async function Galeria() {
  const fotos = await fotosGaleria();
  return (
    <section id="galeria" aria-labelledby="titulo-galeria" className="secao-solida z-10 py-28 md:py-40">
      <div className="grade gap-y-14">
        <div className="col-span-4 md:col-span-7">
          <p className="rotulo mb-4">
            <b>06</b> Galeria
          </p>
          <Titulo id="titulo-galeria" className="text-[clamp(2.6rem,6vw,5.6rem)]">
            Direto do box
          </Titulo>
        </div>
        <div className="col-span-4 self-end md:col-span-4 md:col-start-9 md:text-right">
          <a
            href={negocio.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="botao botao-fantasma"
          >
            <IconeInstagram className="h-5 w-5" />
            Ver mais no Instagram
          </a>
        </div>
        <GaleriaGrade fotos={fotos} />
      </div>
    </section>
  );
}
