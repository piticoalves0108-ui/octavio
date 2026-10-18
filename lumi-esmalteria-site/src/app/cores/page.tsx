import type { Metadata } from "next";
import { polishes } from "@/data/colors";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { NailTryOn } from "@/components/features/NailTryOn";
import { ColorLibrary } from "@/sections/cores/ColorLibrary";
import { Finishes } from "@/sections/cores/Finishes";
import { ColorsCTA } from "@/sections/cores/ColorsCTA";

export const metadata: Metadata = {
  title: "Cartela de cores",
  description:
    "Experimente as cores da Lumi Esmalteria nas unhas antes de agendar: nudes, rosés, vermelhos, tendências e brilhos em acabamento cremoso, perolado, metálico ou glitter. Brasília.",
  alternates: { canonical: "/cores" },
};

/** Cartela de cores: provador interativo, cartela completa filtrável e guia de acabamentos. */
export default function CoresPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cartela de cores"
        title={"Escolha a cor,\n*a gente* pinta."}
        intro={`${polishes.length} cores selecionadas a dedo, de nudes luminosos a vermelhos de cinema. Prove nas unhas aqui mesmo e chegue ao atendimento com a escolha feita.`}
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
