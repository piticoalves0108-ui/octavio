import type { Metadata } from "next";
import { brand, fullAddress } from "@/data/brand";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactCTA, HoursAndSocial, LocationSection, PolicySection, WhatsAppHighlight } from "@/sections/contato/ContactSections";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a ${brand.name} pelo WhatsApp ${brand.contact.whatsappDisplay}, veja os horários de atendimento, siga @${brand.contact.instagram} no Instagram e agende o seu horário em ${fullAddress}.`,
  alternates: { canonical: "/contato" },
};

/** Página de contato: WhatsApp em destaque, horários, Instagram, localização e combinados. */
export default function ContatoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contato"
        title={"Vamos *conversar*?"}
        intro="Estamos a uma mensagem de distância. Tire dúvidas, peça uma sugestão de cor ou reserve o seu horário: a gente responde com carinho."
      />
      <WhatsAppHighlight />
      <HoursAndSocial />
      <LocationSection />
      <PolicySection />
      <ContactCTA />
    </>
  );
}
