import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClubCTA, ClubFAQ, ClubIntro, ClubPlans, ClubSteps } from "@/sections/clube/ClubSections";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, {
    title: "Clube Lumi",
    description:
      "Clube Lumi: assinatura mensal de cuidados com as unhas na Lumi Esmalteria, em Brasília. Conheça os planos e tire suas dúvidas pelo WhatsApp.",
    path: "/clube",
  });
}

/** Clube Lumi: a ideia da assinatura, os três planos, como funciona, dúvidas e convite. */
export default function ClubePage() {
  return (
    <>
      <PageHeader
        eyebrow="Clube Lumi"
        title={"Autocuidado\n*todo* mês."}
        intro="Uma assinatura para quem não abre mão de mãos bonitas: horários com prioridade, manutenção no ritmo certo e pequenos mimos de quem é da casa."
      />
      <ClubIntro />
      <ClubPlans />
      <ClubSteps />
      <ClubFAQ />
      <ClubCTA />
    </>
  );
}
