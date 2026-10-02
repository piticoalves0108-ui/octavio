"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import type { FotoGaleria } from "@/content/site";
import { Revelar } from "@/components/motion/Revelar";
import { MODO_PREVIA } from "@/lib/pendente";
import { cn } from "@/lib/cn";

const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });

/** Grade editorial em colunas (masonry): fotos 4:5 e 1:1 como no Instagram, desencontradas. */

export function GaleriaGrade({ fotos }: { fotos: FotoGaleria[] }) {
  const [aberta, setAberta] = useState<FotoGaleria | null>(null);

  return (
    <>
      <ul className="col-span-4 columns-2 gap-4 md:col-span-12 md:columns-3 md:gap-6 [&>li]:mb-4 md:[&>li]:mb-6" role="list">
        {fotos.map((f, i) => (
          <Revelar as="li" key={`${f.alt}-${i}`} atraso={(i % 3) * 80} className={cn("break-inside-avoid", i === 1 && "md:mt-20")}>
            <figure>
              {f.src ? (
                <button
                  type="button"
                  onClick={() => setAberta(f)}
                  className="group relative block w-full overflow-hidden rounded-[20px] bg-borracha"
                  style={{ aspectRatio: f.proporcao }}
                  aria-label={`Ampliar foto: ${f.alt}`}
                >
                  <Image
                    src={f.src}
                    alt={f.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-pneu)] group-hover:scale-[1.04]"
                  />
                </button>
              ) : (
                // Placeholder na proporção certa, descrevendo a foto ideal
                <div
                  className="textura-banda relative flex w-full flex-col justify-end overflow-hidden rounded-[20px] border border-linha p-4 md:p-6"
                  style={{ aspectRatio: f.proporcao }}
                >
                  <span className="absolute top-4 left-4 font-display text-xs font-semibold tracking-[0.16em] text-cinza uppercase md:top-6 md:left-6">
                    Foto {String(i + 1).padStart(2, "0")} · {f.proporcao.replace("/", ":")}
                  </span>
                  <span className="text-sm leading-snug text-faixa/85 md:text-base">{f.legenda}</span>
                  {MODO_PREVIA && <span className="selo-pendente mt-3 self-start">foto a confirmar</span>}
                </div>
              )}
              {f.src && f.legenda && <figcaption className="mt-3 text-sm text-cinza">{f.legenda}</figcaption>}
            </figure>
          </Revelar>
        ))}
      </ul>
      {aberta && <Lightbox foto={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}
