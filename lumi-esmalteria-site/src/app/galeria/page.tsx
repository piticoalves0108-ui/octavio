import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { GalleryGrid } from "@/sections/galeria/GalleryGrid";
import { GalleryCTA } from "@/sections/galeria/GalleryCTA";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, {
    title: "Galeria",
    description: "Ideias de nail art, esmaltação em gel, alongamento e spa dos pés para inspirar o seu próximo atendimento na Lumi Esmalteria, em Brasília. Agende pelo WhatsApp.",
    path: "/galeria",
  });
}

/** Galeria: mosaico filtrável de trabalhos com visualização ampliada. */
export default function GaleriaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Galeria"
        title="Unhas que *contam* histórias."
        intro="Ideias de nail art, cores e formatos para inspirar o seu próximo atendimento. Escolha a sua favorita e mande para a gente: a próxima pode ser sua."
      />
      <GalleryGrid />
      <GalleryCTA />
    </>
  );
}
