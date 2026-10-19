import { polishes } from "@/data/colors";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { r2 } from "@/lib/random";
import { finishBackground } from "./finishStyles";

/** Ondulação do leque de frascos (valores fixos: mesmo HTML no servidor e no navegador) */
const FAN_Y = [0, 17, 21, 9, -10, -22];
const fan = polishes.filter((_, i) => i % 3 === 0);

/** Fechamento da página de cores: indecisa? A gente ajuda a escolher. */
export function ColorsCTA() {
  return (
    <section aria-labelledby="cta-cores" className="container-x py-20 md:py-28">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-6 py-14 text-cream sm:px-7 sm:py-16 md:px-16 md:py-24" data-cursor-theme="dark">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

        {/* Leque de amostras de esmalte */}
        <div aria-hidden className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 items-center gap-3 xl:flex">
          {fan.map((p, i) => (
            <span
              key={p.id}
              className="relative block h-44 w-12 overflow-hidden rounded-[999px_999px_16px_16px] shadow-[0_20px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
              style={{ background: finishBackground(p.finish, p.hex), transform: `translateY(${FAN_Y[i % FAN_Y.length]}px) rotate(${r2(-6 + i * 2.4)}deg)` }}
            >
              <span className="absolute left-[24%] top-[10%] h-1/2 w-[16%] rounded-full bg-gradient-to-b from-white/60 to-white/0" />
            </span>
          ))}
        </div>

        <div className="relative max-w-2xl">
          {/* Versão compacta do leque para telas menores */}
          <div aria-hidden className="mb-10 flex h-24 items-end gap-2 xl:hidden">
            {fan.map((p, i) => (
              <span
                key={p.id}
                className="relative block h-20 w-7 overflow-hidden rounded-[999px_999px_10px_10px] shadow-[0_14px_28px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                style={{ background: finishBackground(p.finish, p.hex), transform: `translateY(${r2(FAN_Y[i % FAN_Y.length] * 0.35)}px) rotate(${r2(-6 + i * 2.4)}deg)` }}
              >
                <span className="absolute left-[24%] top-[10%] h-1/2 w-[16%] rounded-full bg-gradient-to-b from-white/60 to-white/0" />
              </span>
            ))}
          </div>
          <SectionLabel light>Indecisa entre duas?</SectionLabel>
          <h2 id="cta-cores" className="display-lg mt-6 text-balance">
            Traga as duas, <span className="serif-accent text-blush">a gente decide junto.</span>
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-blush/85">
            No atendimento você testa as amostras na luz do espaço, com calma. Conte pelo WhatsApp quais cores te chamaram atenção e reservamos o seu horário.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <Button
              href={whatsappLink("Olá, Lumi! Estou em dúvida entre algumas cores da cartela. Pode me ajudar a escolher e ver um horário?")}
              external
              variant="light"
              size="lg"
              icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}
              className="max-sm:w-full max-sm:px-5"
            >
              Falar no WhatsApp
            </Button>
            <Button href="/agendamento" variant="coral" size="lg" className="max-sm:w-full max-sm:px-5">
              Escolher dia e horário
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
