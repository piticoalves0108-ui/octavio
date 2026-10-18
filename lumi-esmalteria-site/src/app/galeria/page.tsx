import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { GalleryGrid } from "@/sections/galeria/GalleryGrid";
import { GalleryCTA } from "@/sections/galeria/GalleryCTA";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Nail art, esmaltação em gel, alongamento e spa dos pés: inspire-se nos trabalhos da Lumi Esmalteria em Brasília e agende o seu pelo WhatsApp.",
  alternates: { canonical: "/galeria" },
};

/** Galeria: mosaico filtrável de trabalhos com visualização ampliada. */
export default function GaleriaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Galeria"
        title="Unhas que *contam* histórias."
        intro="Uma coleção de cores, formatos e desenhos feitos com calma e precisão. Escolha a sua favorita e mande para a gente: a próxima pode ser sua."
      />
      <GalleryGrid />
      <GalleryCTA />
    </>
  );
}
