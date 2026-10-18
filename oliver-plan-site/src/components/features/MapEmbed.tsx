"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { brand, fullAddress } from "@/data/brand";

/**
 * Mapa do showroom. Só carrega o iframe do Google Maps quando o visitante pede,
 * para não pesar a página nem enviar dados a terceiros sem necessidade.
 */
export function MapEmbed({ className = "aspect-[4/3]" }: { className?: string }) {
  const [load, setLoad] = useState(false);
  const q = encodeURIComponent(brand.showroom.mapQuery);
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-sand ${className}`}>
      {load ? (
        <iframe title={`Mapa: ${fullAddress}`} src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`} className="absolute inset-0 h-full w-full grayscale-[40%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" onClick={() => setLoad(true)} className="blueprint absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-graphite text-linen shadow-xl">
            <MapPin className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <span className="text-sm font-medium">Ver mapa do showroom</span>
          <span className="max-w-[16rem] text-xs text-stone">{fullAddress}</span>
        </button>
      )}
      <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 rounded-full bg-paper/90 px-4 py-2 text-xs font-medium shadow backdrop-blur hover:bg-paper">
        Abrir no Google Maps
      </a>
    </div>
  );
}
