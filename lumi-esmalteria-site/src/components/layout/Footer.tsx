import { brand, fullAddress, navigation } from "@/data/brand";
import { services } from "@/data/services";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Button } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden rounded-t-[40px] bg-wine text-cream" data-cursor-theme="dark">
      <div className="container-x grid gap-12 py-20 sm:grid-cols-2 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-blush/80">{brand.description}</p>
          <div className="mt-8 flex gap-3">
            <a href={whatsappLink("Olá, Lumi! Vim pelo site.")} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 transition-colors hover:bg-cream hover:text-wine">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </a>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 transition-colors hover:bg-cream hover:text-wine">
              <InstagramIcon className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>
        <nav aria-label="Rodapé" className="lg:col-span-2">
          <p className="eyebrow mb-5 text-blush/60">Navegue</p>
          <ul className="space-y-3 text-sm">
            {[...navigation, { href: "/agendamento", label: "Agendamento" }].map((n) => (
              <li key={n.href}>
                <TransitionLink href={n.href} className="transition-colors hover:text-coral">
                  {n.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-3">
          <p className="eyebrow mb-5 text-blush/60">Serviços</p>
          <ul className="space-y-3 text-sm">
            {services.map((s) => (
              <li key={s.id}>
                <TransitionLink href={`/agendamento?servico=${s.id}`} className="transition-colors hover:text-coral">
                  {s.name}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="eyebrow mb-5 text-blush/60">Horários</p>
          <ul className="space-y-1.5 text-sm">
            {brand.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4 border-b border-cream/10 pb-1.5">
                <span className="text-blush/80">{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-blush/80">{fullAddress}</p>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm hover:text-coral">
            WhatsApp {brand.contact.whatsappDisplay}
          </a>
          <div className="mt-6">
            <Button href="/agendamento" variant="coral">
              Agendar horário
            </Button>
          </div>
        </div>
      </div>
      <div className="container-x relative">
        <p aria-hidden className="select-none whitespace-nowrap font-display text-[28vw] italic leading-[0.75] tracking-[-0.03em] text-cream/[0.07]">
          Lumi
        </p>
      </div>
      <div className="container-x flex flex-col gap-3 border-t border-cream/10 py-7 text-xs text-blush/70 sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {year} {brand.name}. Todos os direitos reservados.
        </span>
        <span>@{brand.contact.instagram}</span>
      </div>
    </footer>
  );
}
