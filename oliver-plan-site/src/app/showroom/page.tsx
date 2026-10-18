import type { Metadata } from "next";
import { Box, Layers, Ruler, Sparkles } from "lucide-react";
import { brand, fullAddress } from "@/data/brand";
import { whatsappLink } from "@/lib/whatsapp";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tour3D } from "@/components/features/Tour3D";
import { MapEmbed } from "@/components/features/MapEmbed";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Showroom e tour virtual",
  description: `Faça um tour 3D pelo showroom da ${brand.name} e agende sua visita para tocar amostras, testar ferragens e conhecer os ambientes montados.`,
  alternates: { canonical: "/showroom" },
};

const features = [
  { icon: Box, title: "Ambientes montados", text: "Cozinha, closet e living em escala real para abrir, fechar e sentir." },
  { icon: Layers, title: "Parede de amostras", text: "Lâminas, lacas, pedras, vidros e metais lado a lado, sob luz natural." },
  { icon: Ruler, title: "Mesa de projeto", text: "Desenhamos com você em 3D, com as medidas reais do seu espaço." },
  { icon: Sparkles, title: "Ferragens em teste", text: "Teste o amortecimento, o toque e a abertura de cada mecanismo." },
];

export default function ShowroomPage() {
  return (
    <>
      <PageHeader
        eyebrow="Showroom"
        title="Visite antes de *ir até nós*."
        intro="Passeie pelo showroom em 3D, troque os acabamentos das vinhetas e, quando quiser, agende uma visita para tocar cada material."
      />

      <section aria-label="Tour virtual do showroom" className="container-x pb-24 md:pb-32">
        <Tour3D preset="showroom" height="h-[82svh] min-h-[560px]" />
      </section>

      <section className="container-x grid gap-14 pb-24 md:pb-32 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionLabel index="02">O que você encontra</SectionLabel>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <f.icon className="h-6 w-6 text-wood" strokeWidth={1.3} />
                <h3 className="mt-5 font-display text-2xl">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-3xl bg-paper p-8">
            <p className="eyebrow text-stone">Endereço</p>
            <p className="mt-2 font-display text-2xl">{fullAddress}</p>
            <div className="mt-6 space-y-1 text-sm">
              {brand.showroom.hours.map((h) => (
                <p key={h.days} className="flex justify-between border-b border-graphite/10 pb-2">
                  <span className="text-stone">{h.days}</span>
                  <span>{h.time}</span>
                </p>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                href={whatsappLink(`Olá! Gostaria de agendar uma visita ao showroom da ${brand.name}.`)}
                external
                variant="solid"
                size="lg"
                magnetic={false}
                className="w-full"
                icon={<WhatsAppIcon className="h-5 w-5" />}
                arrow={false}
              >
                Agendar visita
              </Button>
              <Button href="/contato" variant="outline" size="lg" magnetic={false} className="w-full">
                Solicitar orçamento
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <MapEmbed />
          </div>
        </div>
      </section>
    </>
  );
}
