import { CalendarClock, Clock, HeartHandshake, MapPin, MessageCircleHeart } from "lucide-react";
import { brand, fullAddress } from "@/data/brand";
import { getPolish } from "@/data/colors";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { NailArt } from "@/components/features/NailArt";
import { HoursTable } from "./HoursTable";
import { LazyMap } from "./LazyMap";

const hello = "Olá, Lumi! Vim pelo site.";
/** Cores do mini feed do Instagram */
const feed = ["nude-lumi", "cereja", "cromado-rose"];

/** WhatsApp em destaque: número grande, botões e uma conversa ilustrada. */
export function WhatsAppHighlight() {
  return (
    <section aria-labelledby="contato-whatsapp" className="container-x">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] bg-wine px-6 py-12 text-cream sm:px-10 md:rounded-[40px] md:px-14 md:py-20" data-cursor-theme="dark">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-coral/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />

          <div className="relative grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-7">
              <SectionLabel light index="01">
                Atendimento pelo WhatsApp
              </SectionLabel>
              <h2 id="contato-whatsapp" className="mt-6 max-w-xl text-balance font-display text-3xl leading-tight text-blush md:text-4xl">
                O jeito mais rápido de <span className="serif-accent text-cream">falar com a gente.</span>
              </h2>
              <a
                href={whatsappLink(hello)}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-baseline gap-3 font-display text-[clamp(2.6rem,8.5vw,6.4rem)] leading-[0.95] tracking-[-0.02em] text-cream transition-colors duration-500 hover:text-coral"
                aria-label={`Conversar no WhatsApp ${brand.contact.whatsappDisplay} (abre em nova aba)`}
              >
                <span className="tabular-nums">{brand.contact.whatsappDisplay}</span>
              </a>
              <p className="mt-6 max-w-md leading-relaxed text-blush/85">
                Agendamentos, dúvidas sobre serviços, valores e cuidados: respondemos com carinho dentro do horário de atendimento.
              </p>
              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button href={whatsappLink(hello)} external variant="light" size="lg" icon={<WhatsAppIcon className="h-[18px] w-[18px]" />} className="whitespace-nowrap">
                  Chamar no WhatsApp
                </Button>
                <Button href="/agendamento" variant="coral" size="lg">
                  Escolher dia e horário
                </Button>
              </div>
            </div>

            {/* Conversa ilustrativa */}
            <div className="lg:col-span-5" aria-hidden>
              <div className="mx-auto max-w-sm rotate-[1.5deg] rounded-[30px] bg-cream p-3 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 rounded-[22px] bg-sand px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wine font-display text-xl italic text-cream">L</span>
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">{brand.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3BB273]" /> online
                    </span>
                  </span>
                </div>
                <div className="space-y-3 px-2 pb-3 pt-5 text-sm">
                  <Reveal delay={0.4} y={14} className="ml-auto w-fit max-w-[80%] rounded-[18px] rounded-br-md bg-blush px-4 py-2.5">
                    {hello}
                  </Reveal>
                  <Reveal delay={0.9} y={14} className="w-fit max-w-[85%] rounded-[18px] rounded-bl-md bg-sand px-4 py-2.5">
                    Oi, que alegria! Me conta qual cuidado você quer reservar e o melhor dia para você.
                  </Reveal>
                  <Reveal delay={1.4} y={14} className="flex w-fit items-center gap-1 rounded-[18px] rounded-bl-md bg-sand px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Horários (com status ao vivo) e cartão do Instagram. */
export function HoursAndSocial() {
  return (
    <section aria-label="Horários e Instagram" className="container-x pt-8 md:pt-10">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-[28px] bg-cream p-6 shadow-[0_30px_60px_-45px_rgba(139,41,66,0.35)] ring-1 ring-ink/[0.06] sm:p-9 md:p-11">
            <div className="flex items-center justify-between gap-4">
              <SectionLabel index="02">Horários</SectionLabel>
              <Clock className="h-5 w-5 text-wine" strokeWidth={1.4} aria-hidden />
            </div>
            <h2 className="display-md mt-6 text-ink">
              Quando <span className="serif-accent text-wine">estamos aqui</span>
            </h2>
            <div className="mt-8">
              <HoursTable />
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted">Atendimento com horário marcado. Em feriados, confirme a agenda pelo WhatsApp.</p>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="lg:col-span-5">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] p-6 text-ink shadow-[0_30px_60px_-40px_rgba(139,41,66,0.45)] sm:p-9 md:p-11"
            style={{ background: "radial-gradient(120% 90% at 100% 0%, #FF6B7A33 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, #C8A27A40 0%, transparent 60%), linear-gradient(160deg, #E8D5CE 0%, #F5EDE6 100%)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <SectionLabel index="03">Instagram</SectionLabel>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/80 text-wine transition-transform duration-700 ease-out-expo group-hover:rotate-[-8deg] group-hover:scale-110">
                <InstagramIcon className="h-5 w-5" />
              </span>
            </div>
            {/* Mini "feed" com cores da casa */}
            <div className="mt-8 grid grid-cols-3 gap-2.5" aria-hidden>
              {feed.map((id, i) => {
                const p = getPolish(id);
                return (
                  <span
                    key={id}
                    className="gloss aspect-square rounded-2xl shadow-[0_14px_30px_-18px_rgba(139,41,66,0.5)] transition-transform duration-700 ease-out-expo group-hover:-translate-y-1"
                    style={{ background: `radial-gradient(120% 90% at 30% 20%, #ffffff66 0%, transparent 45%), ${p.hex}`, transitionDelay: `${i * 60}ms` }}
                  />
                );
              })}
            </div>
            <div className="mt-8">
              <p className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-none tracking-[-0.02em] text-ink transition-colors duration-500 group-hover:text-wine">
                @{brand.contact.instagram}
              </p>
              <p className="mt-4 max-w-xs leading-relaxed text-ink-soft">As artes da semana, cores da estação e os bastidores do nosso cantinho.</p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-ink/30 pb-1 text-sm font-medium transition-colors duration-500 group-hover:border-wine group-hover:text-wine">
                Seguir no Instagram
                <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </span>
            </div>
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/** Localização em Brasília com mapa sob demanda. */
export function LocationSection() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.location.address ? fullAddress : brand.location.mapQuery)}`;
  return (
    <section aria-labelledby="contato-local" className="container-x pt-24 md:pt-32">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-4">
          <SectionLabel index="04">Onde estamos</SectionLabel>
          <h2 id="contato-local" className="display-lg mt-6 text-ink">
            {brand.location.city} <span className="serif-accent text-wine">- {brand.location.state}</span>
          </h2>
          <p className="mt-6 max-w-sm leading-relaxed text-muted">
            Um espaço claro e acolhedor em {brand.location.city}. Para receber o endereço e a melhor forma de chegar, é só chamar a gente no WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4">
            <Button href={whatsappLink("Olá, Lumi! Pode me enviar a localização do espaço?")} external variant="outline" icon={<MapPin className="h-4 w-4" strokeWidth={1.6} />}>
              Pedir a localização
            </Button>
            {/* Só faz sentido abrir o Maps quando houver endereço confirmado */}
            {brand.location.address && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-ink underline decoration-wine/40 underline-offset-4 transition-colors hover:text-wine">
                Abrir no Google Maps <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
          </div>
          {brand.location.address && <p className="mt-6 text-xs text-muted">{fullAddress}</p>}
        </div>
        <Reveal className="lg:col-span-8">
          <LazyMap className="aspect-[4/5] sm:aspect-[16/10]" />
        </Reveal>
      </div>
    </section>
  );
}

/** Combinados genéricos: os detalhes (tolerância, prazos) são confirmados com a Lumi antes de publicar */
const policy = [
  { icon: Clock, title: "Pontualidade com carinho", text: "Chegar no horário marcado garante o seu atendimento completo e sem pressa. Se surgir um imprevisto, avise a gente pelo WhatsApp." },
  { icon: CalendarClock, title: "Remarque pelo WhatsApp", text: "Precisa remarcar ou cancelar? Avise com a maior antecedência possível: assim o horário pode ficar com outra cliente." },
  { icon: MessageCircleHeart, title: "Confirmação na conversa", text: "Os pedidos feitos pelo site são confirmados no WhatsApp, de acordo com a agenda do dia." },
  { icon: HeartHandshake, title: "Cuidados especiais", text: "Gestantes, diabéticas e pessoas com alergias têm atendimento adaptado: é só contar para a gente." },
];

/** Política de atendimento em quatro pontos. */
export function PolicySection() {
  return (
    <section aria-labelledby="contato-politica" className="container-x pt-24 md:pt-32">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <SectionLabel index="05">Combinados</SectionLabel>
          <h2 id="contato-politica" className="sr-only">
            Política de atendimento
          </h2>
          <RevealText as="p" text={"Política de\n*atendimento*"} className="display-md mt-6 text-ink" />
          <p className="mt-6 max-w-sm leading-relaxed text-muted">Poucos combinados para que cada horário seja tranquilo para você e para quem vem depois.</p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[28px] bg-wine/10 sm:grid-cols-2 lg:col-span-8">
          {policy.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.08} className="bg-cream p-7 md:p-9">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-wine">
                  <p.icon className="h-5 w-5" strokeWidth={1.4} aria-hidden />
                </span>
                <span className="font-display text-2xl italic text-wine/50" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl leading-tight text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Chamada final para o agendamento online. */
export function ContactCTA() {
  const polish = getPolish("rose-seda");
  return (
    <section aria-labelledby="contato-cta" className="container-x pb-24 pt-24 md:pb-32 md:pt-32">
      <div
        className="relative grid overflow-hidden rounded-[32px] bg-sand md:rounded-[40px] lg:grid-cols-12"
        style={{ background: `radial-gradient(70% 80% at 82% 105%, ${polish.hex}70 0%, transparent 70%), radial-gradient(40% 50% at 100% 0%, #FF6B7A1f 0%, transparent 70%), var(--color-sand)` }}
      >
        <div className="relative z-10 px-6 py-12 sm:px-10 md:px-14 md:py-20 lg:col-span-7">
          <SectionLabel>Agendamento online</SectionLabel>
          <h2 id="contato-cta" className="display-lg mt-6 text-balance text-ink">
            Pronta para a <span className="serif-accent text-wine">sua pausa?</span>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-muted">Escolha o serviço, o dia, o horário e a profissional em poucos passos. O pedido chega pronto no nosso WhatsApp.</p>
          <div className="mt-9">
            <Button href="/agendamento" variant="wine" size="lg">
              Agendar meu horário
            </Button>
          </div>
        </div>
        <div className="relative min-h-[280px] lg:col-span-5 lg:min-h-0">
          <div className="absolute inset-0 flex items-end justify-center px-6 pb-8 pt-2 lg:items-center lg:px-10 lg:py-12">
            <NailArt design="french" shape="amendoada" length="longa" colors={[polish.hex, "#FAF7F2"]} paint label={`Ilustração de unhas amendoadas em ${polish.name}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
