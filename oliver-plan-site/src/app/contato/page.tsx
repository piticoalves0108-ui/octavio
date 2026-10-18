import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, Mail, MapPin } from "lucide-react";
import { brand, fullAddress } from "@/data/brand";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuoteWizard } from "@/components/features/QuoteWizard";
import { InstagramIcon, PinterestIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { MapEmbed } from "@/components/features/MapEmbed";

export const metadata: Metadata = {
  title: "Contato e orçamento",
  description: `Solicite um orçamento de móveis planejados em 2 minutos. Fale com a ${brand.name} pelo WhatsApp ou visite o showroom.`,
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contato"
        title="Vamos começar *o seu projeto*."
        intro="Responda algumas perguntas rápidas e receba o contato de um arquiteto com os próximos passos e uma estimativa inicial."
      />

      <section className="container-x grid gap-12 pb-24 md:pb-32 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Suspense fallback={<div className="h-[36rem] rounded-3xl bg-paper" />}>
            <QuoteWizard />
          </Suspense>
        </div>

        <aside className="space-y-10 lg:col-span-4">
          <Reveal>
            <a
              href={whatsappLink(`Olá! Vim pelo site da ${brand.name} e gostaria de conversar sobre um projeto.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 rounded-3xl bg-graphite p-6 text-linen transition-colors hover:bg-ink"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1f7a4d]">
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <span>
                <span className="eyebrow block text-concrete">Atendimento rápido</span>
                <span className="mt-1 block font-display text-2xl">{brand.contact.whatsappDisplay}</span>
              </span>
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="space-y-6 text-sm">
              <li className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-wood" strokeWidth={1.5} />
                <span>
                  <span className="eyebrow block text-stone">Showroom</span>
                  <span className="mt-1 block">{fullAddress}</span>
                </span>
              </li>
              <li className="flex gap-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-wood" strokeWidth={1.5} />
                <span>
                  <span className="eyebrow block text-stone">Horários</span>
                  {brand.showroom.hours.map((h) => (
                    <span key={h.days} className="mt-1 block">
                      {h.days}: {h.time}
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex gap-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-wood" strokeWidth={1.5} />
                <span>
                  <span className="eyebrow block text-stone">E-mail</span>
                  <a href={`mailto:${brand.contact.email}`} className="mt-1 block hover:text-wood-deep">
                    {brand.contact.email}
                  </a>
                </span>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.2} className="flex gap-3">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-3 rounded-full border border-graphite/15 px-5 text-sm hover:border-graphite">
              <InstagramIcon className="h-5 w-5" /> @{brand.contact.instagram}
            </a>
            {brand.contact.pinterest && (
              <a href={`https://www.pinterest.com/${brand.contact.pinterest}/`} target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="flex h-12 w-12 items-center justify-center rounded-full border border-graphite/15 hover:border-graphite">
                <PinterestIcon className="h-5 w-5" />
              </a>
            )}
          </Reveal>

          <Reveal delay={0.3}>
            <MapEmbed />
          </Reveal>
        </aside>
      </section>
    </>
  );
}
