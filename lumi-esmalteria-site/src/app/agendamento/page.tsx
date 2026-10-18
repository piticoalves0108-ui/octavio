import type { Metadata } from "next";
import { Suspense } from "react";
import { faq } from "@/data/content";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealText } from "@/components/ui/RevealText";
import { FAQ } from "@/components/features/FAQ";
import { BookingWizard } from "@/components/features/BookingWizard";

export const metadata: Metadata = {
  title: "Agendamento",
  description:
    "Escolha serviço, profissional, dia e horário na Lumi Esmalteria, em Brasília, e envie o pedido pronto pelo WhatsApp. Confirmamos a disponibilidade pela conversa.",
  alternates: { canonical: "/agendamento" },
};

/** Perguntas que mais aparecem na hora de agendar */
const bookingFaq = faq.filter((f) => /agendamento|atraso|gestantes/i.test(f.q));

/** Página de agendamento: assistente em seis passos que termina numa mensagem pronta no WhatsApp. */
export default function AgendamentoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Agendamento"
        title={"Reserve o *seu*\nmomento."}
        intro="Escolha o cuidado, o dia e o horário que combinam com você. O pedido segue pronto pelo WhatsApp e a gente confirma a disponibilidade por lá, rapidinho."
        aside={
          <ol className="mt-8 grid grid-cols-3 gap-3 border-t border-wine/15 pt-6 text-sm">
            {["Escolha", "Envie", "Confirmamos"].map((s, i) => (
              <li key={s}>
                <span className="font-display text-2xl italic text-wine">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-1 block text-ink-soft">{s}</span>
              </li>
            ))}
          </ol>
        }
      />

      <Suspense fallback={<WizardSkeleton />}>
        <BookingWizard />
      </Suspense>

      {bookingFaq.length > 0 && (
        <section aria-label="Dúvidas sobre o agendamento" className="container-x pb-24 md:pb-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionLabel>Antes de agendar</SectionLabel>
              <RevealText as="h2" text={"Dúvidas *rápidas*"} className="display-md mt-6 text-ink" />
            </div>
            <div className="lg:col-span-8">
              <FAQ items={bookingFaq} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** Esqueleto do assistente enquanto os parâmetros da URL são lidos */
function WizardSkeleton() {
  return (
    <div className="container-x pb-24 md:pb-32" aria-hidden>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14">
        <div className="h-[640px] animate-pulse rounded-[32px] bg-sand md:rounded-[40px] lg:col-span-8" />
        <div className="hidden h-[420px] animate-pulse rounded-[28px] bg-sand/70 lg:col-span-4 lg:block" />
      </div>
    </div>
  );
}
