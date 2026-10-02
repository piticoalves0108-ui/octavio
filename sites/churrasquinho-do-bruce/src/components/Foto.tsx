import Image from "next/image";
import type { Foto as FotoTipo } from "@/content/fotos";
import { cn } from "@/lib/utils";

/**
 * Foto do cliente ou, enquanto ela não existe, um placeholder na MESMA
 * proporção com a legenda da foto ideal. Trocar a foto não muda o layout.
 */
export function Foto({
  foto,
  sizes,
  className,
  prioridade = false,
}: {
  foto: FotoTipo;
  sizes: string;
  className?: string;
  prioridade?: boolean;
}) {
  const proporcao = { aspectRatio: foto.proporcao.replace("/", " / ") };

  if (foto.src) {
    return (
      <div className={cn("relative overflow-hidden bg-carvao-2", className)} style={proporcao}>
        <Image src={foto.src} alt={foto.alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
      </div>
    );
  }

  return (
    <figure className={cn("foto-pendente flex items-end", className)} style={proporcao} role="img" aria-label={foto.alt}>
      <figcaption aria-hidden className="m-3 max-w-[32ch] rounded-xl bg-carvao/85 p-3 text-[0.8125rem] leading-snug text-osso/90 backdrop-blur">
        <span className="rotulo mb-1 block text-[0.6875rem] text-ambar">Foto pendente · {foto.proporcao.replace("/", ":")}</span>
        {foto.legenda}
      </figcaption>
    </figure>
  );
}
