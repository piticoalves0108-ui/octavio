import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/SectionLabel";

/** Faixa de conversão das páginas de tendências: da leitura para a agenda. */
export function TrendsCTA({ title, accent, text, message, id = "cta-tendencias" }: { title: string; accent: string; text: string; message: string; id?: string }) {
  return (
    <section aria-labelledby={id} className="container-x py-20 md:py-28">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-7 py-16 text-cream md:px-16 md:py-24" data-cursor-theme="dark">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel light>Do papel para as suas mãos</SectionLabel>
            <h2 id={id} className="display-lg mt-6 text-balance">
              {title} <span className="serif-accent text-blush">{accent}</span>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-blush/85">{text}</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row lg:col-span-4 lg:flex-col lg:items-end">
            <Button href="/agendamento" variant="light" size="lg">
              Agendar meu horário
            </Button>
            <Button href={whatsappLink(message)} external variant="coral" size="lg" arrow={false} icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}>
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
