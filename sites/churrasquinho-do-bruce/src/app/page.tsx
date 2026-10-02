import type { Metadata } from "next";
import { Marquee } from "@/components/motion/Marquee";
import { Cardapio } from "@/components/secoes/Cardapio";
import { ComoChegar } from "@/components/secoes/ComoChegar";
import { Galeria } from "@/components/secoes/Galeria";
import { Hero } from "@/components/secoes/Hero";
import { Historia } from "@/components/secoes/Historia";
import { Palco } from "@/components/three/Palco";
import { jsonLdRestaurante, serializarJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Galeria do Instagram revalida a cada hora (se houver token).
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(jsonLdRestaurante()) }} />
      <Palco />
      <Hero />
      <Marquee />
      <Cardapio />
      <Historia />
      <Galeria />
      <ComoChegar />
    </>
  );
}
