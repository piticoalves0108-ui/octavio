import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { polishes } from "@/data/colors";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { NailTryOn } from "@/components/features/NailTryOn";
import { ColorLibrary } from "@/sections/cores/ColorLibrary";
import { Finishes } from "@/sections/cores/Finishes";
import { ColorsCTA } from "@/sections/cores/ColorsCTA";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, {
    title: "Cartela de cores",
    description:
      "Prove cores nas unhas antes de agendar na Lumi Esmalteria, em Brasília: nudes, rosés, vermelhos, tendências e brilhos em acabamento cremoso, perolado, metálico ou glitter.",
    path: "/cores",
  });
}

/** Cartela de cores: provador interativo, cartela completa filtrável e guia de acabamentos. */
export default function CoresPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cartela de cores"
        title={"Escolha a cor,\n*a gente* pinta."}
        intro={`Uma seleção de ${polishes.length} cores para inspirar, de nudes luminosos a vermelhos de cinema. Prove nas unhas aqui mesmo e leve a sua ideia para o atendimento.`}
      />

      <section aria-label="Provador de cores" className="container-x pb-4">
        <SectionLabel index="01" className="mb-8">
          Provador
        </SectionLabel>
        <NailTryOn initialPolish="nude-lumi" />
      </section>

      <ColorLibrary />
      <Finishes />
      <ColorsCTA />
    </>
  );
}
