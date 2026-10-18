import { CalendarCheck, Check, MessageCircleHeart, Sparkles, Gift, CalendarHeart, Coffee } from "lucide-react";
import { plans } from "@/data/plans";
import { brand } from "@/data/brand";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FAQ } from "@/components/features/FAQ";
import { MemberCardStack } from "./MemberCard";

const planMessage = (name: string) => `Olá, Lumi! Tenho interesse no Clube Lumi, plano ${name}. Pode me passar os valores e como funciona?`;

const reasons = [
  { icon: CalendarCheck, title: "Agenda com prioridade", text: "Seus horários reservados antes, sem correr atrás de vaga na semana corrida." },
  { icon: Sparkles, title: "Unhas sempre prontas", text: "Manutenção no ritmo certo: o esmalte nunca passa do ponto e a unha natural agradece." },
  { icon: Gift, title: "Mimos de quem é da casa", text: "Benefícios exclusivos, café passado na hora e aquele cuidado de quem já conhece você." },
];

/** A ideia do clube: cartões de membro e os motivos para assinar. */
export function ClubIntro() {
  return (
    <section aria-labelledby="clube-ideia" className="container-x pb-20 md:pb-28">
      <div className="grid items-center gap-14 overflow-hidden rounded-[36px] bg-sand p-6 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-14">
        <Reveal className="lg:col-span-6" y={30}>
          <MemberCardStack />
        </Reveal>
        <div className="lg:col-span-6 lg:pl-6">
          <SectionLabel index="01">A ideia</SectionLabel>
          <h2 id="clube-ideia" className="display-md mt-6 text-balance text-ink">
            Uma assinatura para <span className="serif-accent text-wine">não precisar lembrar.</span>
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-muted">
            O Clube Lumi transforma o cuidado com as unhas em rotina, sem esforço: você escolhe um plano, a gente organiza os seus horários do mês e você só aparece para relaxar.
          </p>
          <ul className="mt-10 space-y-6">
            {reasons.map((r, i) => (
              <Reveal as="li" key={r.title} delay={0.1 + i * 0.08} className="flex gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-wine">
                  <r.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-2xl leading-tight text-ink">{r.title}</span>
                  <span className="mt-1 block text-[0.95rem] leading-relaxed text-muted">{r.text}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Os três planos, com o favorito em destaque. Sem preços: valores pelo WhatsApp. */
export function ClubPlans() {
  return (
    <section aria-labelledby="planos" className="container-x py-12 md:py-20">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="02">Planos</SectionLabel>
          <h2 id="planos" className="display-lg mt-6 text-balance text-ink">
            Três jeitos de <span className="serif-accent text-wine">se cuidar</span>
          </h2>
        </div>
        <Reveal delay={0.15} className="lg:col-span-4 lg:col-start-9">
          <p className="leading-relaxed text-muted">Escolha pelo ritmo da sua rotina. Os valores e as condições de cada plano a gente apresenta pelo WhatsApp, sem compromisso.</p>
        </Reveal>
      </div>

      <ul className="mt-14 grid gap-5 lg:mt-20 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan, i) => {
          const hi = plan.highlight;
          return (
            <Reveal
              as="li"
              key={plan.id}
              delay={i * 0.1}
              className={cn(
                "relative flex flex-col rounded-[28px] p-7 transition-shadow duration-700 md:p-9",
                hi
                  ? "bg-wine text-cream shadow-[0_40px_80px_-40px_rgba(108,31,51,0.7)] lg:-my-6 lg:py-14"
                  : "border border-wine/10 bg-cream hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]",
              )}
            >
              {hi && (
                <>
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-coral/25 blur-3xl" />
                    <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
                  </div>
                  <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-wine md:right-8 md:top-8">
                    <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
                    Mais escolhido
                  </span>
                </>
              )}
              <div className="relative flex flex-1 flex-col">
                <p className={cn("eyebrow", hi ? "text-blush/80" : "text-muted")}>Plano {String(i + 1).padStart(2, "0")}</p>
                <h3 className={cn("mt-4 font-display text-5xl leading-none md:text-6xl", hi ? "text-cream" : "text-ink")}>
                  {hi ? <span className="italic">{plan.name}</span> : plan.name}
                </h3>
                <p className={cn("mt-4 font-display text-xl leading-snug", hi ? "text-blush" : "text-ink-soft")}>{plan.tagline}</p>

                <div className={cn("my-8 h-px", hi ? "bg-cream/20" : "bg-wine/10")} />

                <ul className="space-y-4" aria-label={`Benefícios do plano ${plan.name}`}>
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-[0.95rem] leading-snug">
                      <span className={cn("mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full", hi ? "bg-cream text-wine" : "bg-blush/70 text-wine")}>
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span className={hi ? "text-cream/95" : "text-ink-soft"}>{perk}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-10">
                  <p className={cn("mb-4 text-xs", hi ? "text-blush/75" : "text-muted")}>Valores e disponibilidade pelo WhatsApp.</p>
                  <Button
                    href={whatsappLink(planMessage(plan.name))}
                    external
                    variant={hi ? "light" : "outline"}
                    magnetic={false}
                    icon={<WhatsAppIcon className="h-4 w-4" />}
                    className="w-full"
                  >
                    Quero o plano {plan.name}
                  </Button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

const steps = [
  { icon: MessageCircleHeart, title: "Escolha o seu plano", text: "Chame a gente no WhatsApp: apresentamos os valores, tiramos as dúvidas e indicamos o plano que combina com a sua rotina." },
  { icon: CalendarHeart, title: "Reserve os seus horários", text: "Combinamos juntas os dias do mês. Como membro, você tem prioridade na agenda e pode deixar horários fixos." },
  { icon: Coffee, title: "Aproveite o mês inteiro", text: "É só chegar, sentar e relaxar. Os benefícios se renovam a cada mês e a gente avisa antes de cada ciclo." },
];

/** "Como funciona": três passos do clube. */
export function ClubSteps() {
  return (
    <section aria-label="Como funciona o Clube Lumi" className="mt-16 bg-sand py-20 md:mt-24 md:py-28">
      <div className="container-x">
        <div className="max-w-3xl">
          <SectionLabel index="03">Como funciona</SectionLabel>
          <RevealText as="h2" text={"Simples como\n*marcar um café*"} className="display-lg mt-6 text-ink" />
        </div>
        <ol className="mt-14 grid gap-4 md:grid-cols-3 lg:mt-20 lg:gap-5">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.1} className="group relative flex flex-col rounded-[28px] bg-cream p-7 transition-shadow duration-700 hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)] md:p-9">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/60 text-wine transition-colors duration-500 group-hover:bg-wine group-hover:text-cream">
                  <step.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="font-display text-6xl font-light italic leading-none text-blush-deep" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-10 font-display text-3xl leading-tight text-ink">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const clubFaq = [
  {
    q: "Como funciona a renovação mensal?",
    a: "O Clube é uma assinatura mensal: os benefícios do seu plano se renovam a cada ciclo. Antes de cada renovação a gente manda uma mensagem pelo WhatsApp para confirmar os horários do mês seguinte. As condições de pagamento são combinadas na adesão.",
  },
  {
    q: "O que são os horários prioritários?",
    a: "Membros reservam antes da abertura da agenda geral e podem deixar dias e horários fixos combinados para o mês. Assim, aquele sábado de manhã ou o fim de tarde depois do trabalho ficam guardados para você.",
  },
  {
    q: "Posso pausar ou cancelar a assinatura?",
    a: "Pode, sem burocracia. Se for viajar ou precisar de uma pausa, é só avisar pelo WhatsApp antes da próxima renovação. O cancelamento também é feito por mensagem, com a mesma tranquilidade.",
  },
  {
    q: "Como uso os benefícios do plano?",
    a: "Os serviços do plano são usados ao longo do mês, nos horários que você reservar, e os descontos valem nos atendimentos feitos aqui no espaço. Se algum imprevisto acontecer, fale com a gente: encontramos uma solução juntas.",
  },
];

/** Dúvidas sobre o clube. */
export function ClubFAQ() {
  return (
    <section aria-label="Dúvidas sobre o Clube Lumi" className="container-x py-20 md:py-28">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel index="04">Dúvidas</SectionLabel>
          <RevealText as="h2" text={"Antes de\n*assinar*"} className="display-md mt-6 text-ink" />
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xs leading-relaxed text-muted">Ficou alguma pergunta? A gente explica tudo com calma pelo WhatsApp.</p>
            <a
              href={whatsappLink("Olá, Lumi! Tenho uma dúvida sobre o Clube Lumi.")}
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
          <FAQ items={clubFaq} />
        </div>
      </div>
    </section>
  );
}

/** Convite final para entrar no clube. */
export function ClubCTA() {
  return (
    <section aria-labelledby="cta-clube" className="container-x pb-24 md:pb-32">
      <div className="relative overflow-hidden rounded-[36px] bg-wine px-7 py-16 text-cream md:px-16 md:py-24" data-cursor-theme="dark">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel light>Clube Lumi</SectionLabel>
            <h2 id="cta-clube" className="display-lg mt-6 text-balance">
              Seu momento, <span className="serif-accent text-blush">reservado todo mês.</span>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-blush/85">Conte qual plano chamou a sua atenção. A gente envia os valores, explica cada detalhe e já sugere os primeiros horários.</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row lg:col-span-4 lg:flex-col lg:items-end">
            <Button
              href={whatsappLink("Olá, Lumi! Quero saber mais sobre o Clube Lumi. Pode me passar os valores e como funciona?")}
              external
              variant="light"
              size="lg"
              icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}
            >
              Quero fazer parte
            </Button>
            <Button href="/servicos" variant="coral" size="lg">
              Conhecer os serviços
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
