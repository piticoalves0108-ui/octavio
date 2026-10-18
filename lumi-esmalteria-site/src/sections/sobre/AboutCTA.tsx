import { NailArt } from "@/components/features/NailArt";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { brand } from "@/data/brand";
import { whatsappLink } from "@/lib/whatsapp";

/** Fechamento da página Sobre: convite para reservar um tempo para si. */
export function AboutCTA() {
  return (
    <section className="container-x py-20 md:py-28">
      <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(90%_80%_at_50%_0%,rgba(255,255,255,0.75),transparent_60%),linear-gradient(170deg,#F5EDE6_0%,#E8D5CE_100%)] px-6 pb-14 pt-16 text-center sm:px-12 md:pb-20 md:pt-24">
        {/* Nail art decorativa nas laterais */}
        <div aria-hidden className="pointer-events-none absolute -left-16 top-8 hidden h-56 w-72 -rotate-12 opacity-80 md:block lg:left-0 lg:h-64 lg:w-80">
          <NailArt design="chrome" shape="stiletto" colors={["#E7B8B5", "#FFFFFF"]} length="longa" label="" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-6 hidden h-52 w-72 rotate-12 opacity-80 md:block lg:right-0 lg:h-60 lg:w-80">
          <NailArt design="solid" shape="quadrada" colors={["#8B2942"]} length="media" label="" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <p className="eyebrow text-wine">Seu momento</p>
          <RevealText as="h2" text={"Reserve um tempo\n*só para você*."} className="display-lg mt-6 text-ink" />
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Escolha o serviço, o dia e o horário. A confirmação chega pelo WhatsApp, e o resto deixa com a gente.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/agendamento" variant="wine" size="lg">
                Agendar meu horário
              </Button>
              <Button
                href={whatsappLink(`Olá, ${brand.name}! Conheci vocês pelo site e gostaria de saber mais sobre os atendimentos.`)}
                external
                variant="outline"
                size="lg"
                arrow={false}
                icon={<WhatsAppIcon className="h-5 w-5" />}
              >
                Conversar no WhatsApp
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
