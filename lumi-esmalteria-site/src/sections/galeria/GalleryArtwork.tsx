"use client";

import { NailArt } from "@/components/features/NailArt";
import { SmartImage } from "@/components/ui/SmartImage";
import type { GalleryItem } from "@/data/gallery";
import { cn } from "@/lib/utils";
import { artBackgrounds } from "./artStyles";

/** Visual de uma peça: nail art desenhada sobre fundo suave ou foto (spa). Preenche o pai (relative). */
export function GalleryArtwork({ item, index, sizes, paint = true, className }: { item: GalleryItem; index: number; sizes: string; paint?: boolean; className?: string }) {
  if (item.photo) {
    return <SmartImage src={item.photo} alt={`${item.title}: ${item.caption}`} sizes={sizes} fallbackLabel={item.title} className={className} />;
  }
  if (!item.art) return null;
  return (
    <div className="absolute inset-0" style={{ background: artBackgrounds[index % artBackgrounds.length] }}>
      <div className={cn("absolute inset-[8%] flex items-center justify-center", className)}>
        <NailArt {...item.art} paint={paint} label={`${item.title}: ${item.caption}`} />
      </div>
    </div>
  );
}
