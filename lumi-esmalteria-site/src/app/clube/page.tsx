import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClubCTA, ClubFAQ, ClubIntro, ClubPlans, ClubSteps } from "@/sections/clube/ClubSections";

export const metadata: Metadata = {
  title: "Clube Lumi",
  description:
    "Assinatura mensal de cuidados com as unhas na Lumi Esmalteria, em Brasília: agenda com prioridade, unhas sempre prontas e mimos de membro. Conheça os planos pelo WhatsApp.",
  alternates: { canonical: "/clube" },
};

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
