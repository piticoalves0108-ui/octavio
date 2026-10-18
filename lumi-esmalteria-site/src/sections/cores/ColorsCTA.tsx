import { polishes } from "@/data/colors";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { finishBackground } from "./finishStyles";

/** Fechamento da página de cores: indecisa? A gente ajuda a escolher. */
export function ColorsCTA() {
  return (
    <section aria-labelledby="cta-cores" className="container-x py-20 md:py-28">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-7 py-16 text-cream md:px-16 md:py-24" data-cursor-theme="dark">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

        {/* Leque de amostras de esmalte */}
        <div aria-hidden className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 items-center gap-3 xl:flex">
          {polishes.filter((_, i) => i % 3 === 0).map((p, i) => (
            <span
              key={p.id}
              className="relative block h-44 w-12 overflow-hidden rounded-[999px_999px_16px_16px] shadow-[0_20px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
              style={{ background: finishBackground(p.finish, p.hex), transform: `translateY(${Math.round(Math.sin(i * 0.9) * 22)}px) rotate(${-6 + i * 2.4}deg)` }}
            >
              <span className="absolute left-[24%] top-[10%] h-1/2 w-[16%] rounded-full bg-gradient-to-b from-white/60 to-white/0" />
            </span>
          ))}
        </div>

        <div className="relative max-w-2xl">
          <SectionLabel light>Indecisa entre duas?</SectionLabel>
          <h2 id="cta-cores" className="display-lg mt-6 text-balance">
            Traga as duas, <span className="serif-accent text-blush">a gente decide junto.</span>
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-blush/85">
            No atendimento você testa as amostras na luz do espaço, com calma. Conte pelo WhatsApp quais cores te chamaram atenção e reservamos o seu horário.
          </p>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
            <Button
              href={whatsappLink("Olá, Lumi! Estou em dúvida entre algumas cores da cartela. Pode me ajudar a escolher e ver um horário?")}
              external
              variant="light"
              size="lg"
              icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}
            >
              Conversar pelo WhatsApp
            </Button>
            <Button href="/agendamento" variant="coral" size="lg">
              Escolher dia e horário
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
