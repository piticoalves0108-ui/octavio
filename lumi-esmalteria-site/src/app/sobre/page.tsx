import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { AboutManifesto } from "@/sections/sobre/AboutManifesto";
import { AboutValues } from "@/sections/sobre/AboutValues";
import { AboutSpace } from "@/sections/sobre/AboutSpace";
import { AboutTeam } from "@/sections/sobre/AboutTeam";
import { AboutCTA } from "@/sections/sobre/AboutCTA";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, {
    title: "Sobre",
    description: "Conheça a Lumi Esmalteria: um espaço de autocuidado em Brasília, onde fazer as unhas é um ritual de pausa, com nail design e atendimento sem pressa.",
    path: "/sobre",
  });
}

/** Sobre: a história da Lumi contada pelo autocuidado, valores, espaço e equipe. */
export default function SobrePage() {
  return (
    <>
      <PageHeader
        eyebrow="Sobre"
        title="Um lugar para *voltar* para si."
        intro="Na Lumi, fazer as unhas é um ritual de pausa. Um espaço em Brasília pensado para você desacelerar, ser bem cuidada e sair se sentindo mais leve."
      />
      <AboutManifesto />
      <AboutValues />
      <AboutSpace />
      <AboutTeam />
      <AboutCTA />
    </>
  );
}
