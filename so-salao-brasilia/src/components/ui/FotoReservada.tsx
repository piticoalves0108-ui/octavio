import Image from "next/image";
import { cn } from "@/lib/cn";
import { IconeCamera } from "./icones";
import { Texto } from "./Texto";

type Props = {
  proporcao: string; // "4/5", "3/2"...
  fotoIdeal: string;
  marcador?: string;
  imagem?: { src: string; alt: string };
  className?: string;
  sizes?: string;
};

/**
 * Espaço de foto. Enquanto a foto real (com autorização) não chega, mostra um placeholder
 * na mesma proporção com a legenda descrevendo a foto ideal. Sem salto de layout (CLS).
 */
export function FotoReservada({
  proporcao,
  fotoIdeal,
  marcador,
  imagem,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
}: Props) {
  return (
    <figure className={cn("group", className)}>
      <div className="relative overflow-hidden rounded-[1.25rem] bg-areia" style={{ aspectRatio: proporcao }}>
        {imagem ? (
          <Image src={imagem.src} alt={imagem.alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(42,42,46,0.045) 0 1px, transparent 1px 14px), radial-gradient(120% 90% at 20% 0%, #f4e3de 0%, #ece5df 55%, #e4d8cd 100%)",
            }}
          >
            <div className="flex flex-col items-center gap-2 text-tinta-suave">
              <IconeCamera className="size-8" />
              <span className="sobretitulo text-[0.65rem]">Foto em breve</span>
            </div>
          </div>
        )}
      </div>
      {!imagem && (
        <figcaption className="mt-3 text-sm leading-relaxed text-tinta-suave">
          {fotoIdeal}
          {marcador && (
            <>
              {" "}
              <Texto>{marcador}</Texto>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
