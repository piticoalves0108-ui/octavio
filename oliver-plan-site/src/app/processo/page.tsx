import type { Metadata } from "next";
import { faq } from "@/data/content";
import { PageHeader } from "@/components/layout/PageHeader";
import { Timeline } from "@/sections/process/Timeline";
import { FAQ } from "@/components/features/FAQ";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealText } from "@/components/ui/RevealText";
import { BeforeAfter3D } from "@/components/features/BeforeAfter3D";
import { CTASection } from "@/sections/home/CTASection";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Briefing, visita técnica, projeto 3D, aprovação, produção e montagem: veja cada etapa do atendimento, prazos e o que você recebe.",
  alternates: { canonical: "/processo" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function ProcessoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageHeader eyebrow="Processo" title="Do primeiro café *à entrega das chaves*." intro="Seis etapas, um cronograma claro e um arquiteto acompanhando cada uma delas. Em média, de 50 a 65 dias do briefing à montagem." />

      <section className="container-x pb-16 md:pb-24">
        <Timeline />
      </section>

      <section className="bg-sand/60 py-24 md:py-32">
        <div className="container-x mb-12 max-w-3xl">
          <SectionLabel index="02">Visita técnica → entrega</SectionLabel>
          <RevealText as="h2" className="display-md mt-6" text="O que medimos *é o que entregamos*." />
        </div>
        <div className="container-x">
          <BeforeAfter3D />
        </div>
      </section>

      <section className="container-x grid gap-12 py-24 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel index="03">Dúvidas frequentes</SectionLabel>
          <RevealText as="h2" className="display-md mt-6" text="Perguntas que *todo mundo* faz." />
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <FAQ items={faq} />
        </div>
      </section>

      <CTASection />
    </>
  );
}
