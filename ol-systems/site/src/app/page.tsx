import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyContact } from "@/components/StickyContact";
import { Audience } from "@/components/sections/Audience";
import { Comparison } from "@/components/sections/Comparison";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Included } from "@/components/sections/Included";
import { Portfolio } from "@/components/sections/Portfolio";
import { Pricing } from "@/components/sections/Pricing";
import { Problem } from "@/components/sections/Problem";
import { Testimonials } from "@/components/sections/Testimonials";
import { UpdateDemo } from "@/components/sections/UpdateDemo";
import { faq } from "@/config/content";
import { isPending, site } from "@/config/site";

/** Dados estruturados (schema.org) para o Google entender o serviço e o preço. */
function JsonLd() {
  const service = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.name,
    url: site.url,
    description: "Criação e manutenção de sites profissionais para empresas e perfis do Instagram, por assinatura mensal com atualizações inclusas.",
    sameAs: [site.instagram.url],
    ...(site.whatsapp ? { telephone: `+${site.whatsapp}` } : {}),
    makesOffer: {
      "@type": "Offer",
      name: "Site Sempre Atualizado",
      description: "Site profissional com hospedagem e atualizações sempre que o cliente pedir.",
      price: site.price.toFixed(2),
      priceCurrency: "BRL",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: site.price.toFixed(2),
        priceCurrency: "BRL",
        unitCode: "MON",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
      },
    },
  };
  // No FAQ estruturado só entram respostas já confirmadas.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items
      .filter((f) => !isPending(f.a))
      .map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd />
      <Header />
      <main className="relative z-10">
        <Hero />
        <Problem />
        <UpdateDemo />
        <Included />
        <HowItWorks />
        <Comparison />
        <Audience />
        <Portfolio />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
