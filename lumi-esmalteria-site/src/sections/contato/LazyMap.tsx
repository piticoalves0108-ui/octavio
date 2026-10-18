"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin } from "lucide-react";
import { brand, fullAddress } from "@/data/brand";
import { cn } from "@/lib/utils";

/**
 * Mapa sob demanda: mostra uma ilustração do Plano Piloto e só carrega o iframe do
 * Google Maps quando a pessoa pede (mais leve e sem rastreamento antes do clique).
 */
export function LazyMap({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(brand.location.mapQuery)}&z=12&output=embed`;

  return (
    <div className={cn("relative overflow-hidden rounded-[28px] bg-sand ring-1 ring-wine/[0.06]", className)}>
      {/* Ilustração: lago, Eixo Monumental e o arco do Eixo Rodoviário */}
      <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="map-glow" cx="0.5" cy="0.48" r="0.5">
            <stop offset="0" stopColor="#E8D5CE" stopOpacity="0.9" />
            <stop offset="1" stopColor="#F5EDE6" stopOpacity="0" />
          </radialGradient>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#8B2942" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#map-grid)" />
        <circle cx="400" cy="240" r="260" fill="url(#map-glow)" />
        <path d="M560 60c70 20 150 70 170 150s-30 150-90 200-150 60-170 20 40-70 60-130-30-110-20-170 0-90 50-70Z" fill="#9FC3E0" fillOpacity="0.28" />
        <path d="M120 300 C 260 140, 540 140, 680 300" fill="none" stroke="#8B2942" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
        <path d="M150 300 C 280 165, 520 165, 650 300" fill="none" stroke="#8B2942" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round" />
        <path d="M400 70 L 400 440" stroke="#8B2942" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" />
        <path d="M120 420 C 260 380, 420 470, 700 400" fill="none" stroke="#C8A27A" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M60 120 C 200 160, 260 60, 380 110" fill="none" stroke="#C8A27A" strokeOpacity="0.3" strokeWidth="1.5" />
        {[
          [250, 210],
          [330, 180],
          [470, 180],
          [550, 210],
          [400, 330],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#8B2942" fillOpacity="0.25" />
        ))}
      </svg>

      <AnimatePresence>
        {!ready && (
          <motion.div initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-coral/40" aria-hidden />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-wine text-cream shadow-[0_20px_40px_-15px_rgba(139,41,66,0.7)]">
                <MapPin className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
            </span>
            <div>
              <p className="font-display text-3xl text-ink">{fullAddress}</p>
              <p className="mt-1 text-sm text-muted">{show ? "Carregando o mapa…" : "O mapa do Google só carrega quando você pedir."}</p>
            </div>
            {!show && (
              <button
                type="button"
                onClick={() => setShow(true)}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors duration-500 hover:bg-wine"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                Ver no mapa
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {show && (
        <iframe
          src={src}
          title={`Mapa de ${fullAddress}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setReady(true)}
          className={cn("absolute inset-0 h-full w-full border-0 grayscale-[35%] sepia-[12%] transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}
