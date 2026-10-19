import { Armchair, CalendarHeart, HeartHandshake, Leaf, Move3d } from "lucide-react";
import { services } from "@/data/services";
import { faq } from "@/data/content";
import { brand } from "@/data/brand";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FAQ } from "@/components/features/FAQ";
import { BottleViewer } from "@/components/three/BottleViewer";
import { serviceIcons } from "./ServiceCard";

/** Índice dos serviços: atalhos para as âncoras (#id) de cada um. */
export function ServiceIndex() {
  return (
    <nav aria-label="Atalhos para os serviços" className="container-x pb-6">
      <ul className="flex flex-wrap gap-2.5">
        {services.map((s) => {
          const Icon = serviceIcons[s.icon];
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-wine/15 bg-cream px-4 py-2.5 text-sm text-ink-soft transition-colors duration-500 hover:border-wine hover:bg-wine hover:text-cream"
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {s.name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "Gire o frasco": o frasco 3D para escolher cor e acabamento antes de agendar. */
export function BottleSection() {
  return (
    <section aria-label="Gire o frasco" className="container-x py-20 md:py-28">
      <div className="grid overflow-hidden rounded-[36px] bg-sand lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-10 p-8 pb-0 md:p-12 md:pb-0 lg:col-span-4 lg:pb-12">
          <div>
            <SectionLabel index="✦">Antes de agendar</SectionLabel>
            <RevealText as="h2" text={"Gire o *frasco*"} className="display-lg mt-6 text-ink" />
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-sm leading-relaxed text-muted">
                Escolha a cor e o acabamento com calma: cremoso, perolado, metálico ou glitter. Gire o frasco, veja como a luz desliza no vidro e leve a sua escolha para o atendimento.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="hidden lg:block">
            <p className="flex items-center gap-3 text-sm text-ink-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-wine">
                <Move3d className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              Arraste para girar e toque nas cores
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-8">
          <BottleViewer initialPolish="vinho-noir" className="h-[72svh] min-h-[480px] w-full" />
        </div>
      </div>
    </section>
  );
}

const steps = [
  { icon: CalendarHeart, title: "Agendamento pelo WhatsApp", text: "Você conta o que deseja, escolhemos juntas o melhor dia e horário e combinamos tudo por mensagem." },
  { icon: Armchair, title: "Acolhimento", text: "Chegou, sentou: um momento de pausa e a cartela de cores em mãos." },
  { icon: HeartHandshake, title: "Atendimento sem pressa", text: "Material esterilizado, técnica cuidadosa e tempo reservado só para você, do preparo ao top coat." },
  { icon: Leaf, title: "Dicas de cuidado para casa", text: "Você sai com orientações para fazer o resultado durar mais e lembrete para a próxima manutenção." },
];

/** "Como funciona o atendimento": faixa de quatro passos. */
export function ProcessSteps() {
  return (
    <section aria-label="Como funciona o atendimento" className="bg-sand py-20 md:py-28">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="02">Experiência Lumi</SectionLabel>
            <RevealText as="h2" text={"Como funciona\no *atendimento*"} className="display-lg mt-6 text-ink" />
          </div>
          <Reveal delay={0.15} className="lg:col-span-4 lg:col-start-9">
            <p className="leading-relaxed text-muted">Do primeiro “oi” à última camada de brilho, cada etapa foi pensada para você desacelerar.</p>
          </Reveal>
        </div>
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-5">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.08} className="group relative flex flex-col rounded-[28px] bg-cream p-7 transition-shadow duration-700 hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] md:p-8">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/60 text-wine transition-colors duration-500 group-hover:bg-wine group-hover:text-cream">
                  <step.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="font-display text-5xl font-light italic leading-none text-blush-deep" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-10 font-display text-2xl leading-tight text-ink">{step.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Perguntas frequentes sobre os serviços. */
export function ServicesFAQ() {
  return (
    <section aria-label="Perguntas frequentes" className="container-x py-20 md:py-28">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel index="03">Dúvidas</SectionLabel>
          <RevealText as="h2" text={"Perguntas\n*frequentes*"} className="display-md mt-6 text-ink" />
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xs leading-relaxed text-muted">Não encontrou o que procurava? Fale com a gente, respondemos com carinho.</p>
            <a
              href={whatsappLink("Olá, Lumi! Tenho uma dúvida sobre os serviços.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-wine underline decoration-wine/30 underline-offset-[6px] hover:decoration-wine"
            >
              <WhatsAppIcon className="h-4 w-4" aria-hidden />
              {brand.contact.whatsappDisplay}
            </a>
          </Reveal>
        </div>
        <div className="lg:col-span-8">
          <FAQ items={faq} />
        </div>
      </div>
    </section>
  );
}

/** Faixa final de conversão. */
export function ServicesCTA() {
  return (
    <section aria-labelledby="cta-servicos" className="container-x pb-24 md:pb-32">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-7 py-16 text-cream md:px-16 md:py-24" data-cursor-theme="dark">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel light>Sua pausa está reservada</SectionLabel>
            <h2 id="cta-servicos" className="display-lg mt-6 text-balance">
              Escolha o serviço, <span className="serif-accent text-blush">a gente cuida do resto.</span>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-blush/85">Valores e horários são combinados com carinho pelo WhatsApp. Respondemos rapidinho no horário de atendimento.</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row lg:col-span-4 lg:flex-col lg:items-end">
            <Button href={whatsappLink("Olá, Lumi! Vim pela página de serviços e gostaria de agendar.")} external variant="light" size="lg" icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}>
              Agendar pelo WhatsApp
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
