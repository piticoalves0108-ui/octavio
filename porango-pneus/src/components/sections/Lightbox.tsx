"use client";

import Image from "next/image";
import type { FotoGaleria } from "@/content/site";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Lightbox da galeria (carregado só quando alguém clica numa foto). */
export default function Lightbox({ foto, aoFechar }: { foto: FotoGaleria; aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <div className="relative aspect-[4/5] max-h-[80svh] w-full md:aspect-[4/3]">
          <Image src={foto.src} alt={foto.alt} fill sizes="92vw" className="rounded-2xl object-contain" />
        </div>
        <DialogTitle className="sr-only">{foto.alt}</DialogTitle>
        <DialogDescription className="mt-4 text-center text-sm text-cinza">
          {foto.legenda}
          {foto.post && (
            <>
              {" "}
              <a href={foto.post} target="_blank" rel="noopener noreferrer" className="text-faixa underline decoration-sinal underline-offset-4">
                Ver no Instagram
              </a>
            </>
          )}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
