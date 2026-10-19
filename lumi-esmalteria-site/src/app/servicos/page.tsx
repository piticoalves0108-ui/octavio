import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { services } from "@/data/services";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ServiceCard } from "@/sections/servicos/ServiceCard";
import { BottleSection, ProcessSteps, ServiceIndex, ServicesCTA, ServicesFAQ } from "@/sections/servicos/ServicesSections";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, {
    title: "Serviços",
    description:
      "Unhas tradicionais, esmaltação em gel, nail design, alongamento, spa dos pés, blindagem e Dia de Noiva na Lumi Esmalteria, em Brasília. Agende pelo WhatsApp.",
    path: "/servicos",
  });
}

/** Página de serviços: cada serviço em detalhe, frasco 3D, jornada do atendimento, dúvidas e CTA. */
export default function ServicosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Serviços"
        title={"Cuidado com *tempo*\npara as suas mãos"}
        intro="Do clássico impecável ao nail design autoral: cada serviço é feito sem pressa, com material esterilizado e acabamento de vitrine. Os valores são combinados pelo WhatsApp."
      />
      <ServiceIndex />

      <section aria-label="Lista de serviços" className="container-x pt-10 md:pt-16">
        <SectionLabel index="01">Nossos serviços</SectionLabel>
        <div className="mt-10">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} total={services.length} />
          ))}
        </div>
      </section>

      <BottleSection />
      <ProcessSteps />
      <ServicesFAQ />
      <ServicesCTA />
    </>
  );
}
