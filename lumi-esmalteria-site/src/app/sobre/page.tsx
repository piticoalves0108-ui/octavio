import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AboutManifesto } from "@/sections/sobre/AboutManifesto";
import { AboutValues } from "@/sections/sobre/AboutValues";
import { AboutSpace } from "@/sections/sobre/AboutSpace";
import { AboutTeam } from "@/sections/sobre/AboutTeam";
import { AboutCTA } from "@/sections/sobre/AboutCTA";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a Lumi Esmalteria: um espaço de autocuidado e bem-estar em Brasília, com nail design autoral, biossegurança rigorosa e atendimento sem pressa.",
  alternates: { canonical: "/sobre" },
};

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
