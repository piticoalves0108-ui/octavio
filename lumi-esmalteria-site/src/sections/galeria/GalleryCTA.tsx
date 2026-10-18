import { NailArt } from "@/components/features/NailArt";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/whatsapp";

/** Chamada final da galeria: agendar ou mandar uma referência pelo WhatsApp. */
export function GalleryCTA() {
  return (
    <section className="container-x pb-24 md:pb-32">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-6 py-14 text-cream sm:px-12 md:py-20 lg:px-20">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow text-blush">Sua vez</p>
            <RevealText as="h2" text={"Viu uma que é *a sua cara*?"} className="display-lg mt-5 text-cream" />
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-blush">
                Escolha serviço, dia e horário em um minuto. Se tiver uma referência, traga junto: criamos o desenho com você.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Button href="/agendamento" variant="light" size="lg">
                  Agendar horário
                </Button>
                <a
                  href={whatsappLink("Olá, Lumi! Tenho uma referência de unha e gostaria de saber se vocês fazem. Posso mandar a foto?")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/wa inline-flex h-14 items-center gap-3 rounded-full border border-cream/30 px-7 text-[0.95rem] font-medium text-cream transition-colors duration-500 hover:border-cream hover:bg-cream/10"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Enviar referência
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.3} className="lg:col-span-5">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md rounded-[28px] bg-[radial-gradient(120%_90%_at_30%_10%,rgba(255,255,255,0.9),transparent_60%),linear-gradient(160deg,#F5EDE6,#E8D5CE)] p-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.5)]">
              <NailArt design="glitter-tip" shape="amendoada" colors={["#F3E6E0", "#E6A6AE"]} length="longa" label="Nail art com glitter rosé nas pontas" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
