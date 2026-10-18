import { brand, brandSince, fullAddress, navigation } from "@/data/brand";
import { categories } from "@/data/categories";
import { instagramUrl, whatsappLink } from "@/lib/whatsapp";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Button } from "@/components/ui/Button";
import { InstagramIcon, PinterestIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Newsletter } from "@/components/features/Newsletter";
import { LogoMark } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer data-header="dark" className="relative overflow-hidden bg-graphite text-linen" data-cursor-theme="dark">
      {/* Newsletter */}
      <div className="container-x grid gap-10 border-b border-linen/10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-6">
          <p className="eyebrow text-wood-light">Caderno de inspirações</p>
          <h2 className="display-md mt-5 max-w-xl text-balance">
            Ideias de marcenaria, materiais e projetos, <span className="serif-accent">uma vez por mês</span>.
          </h2>
        </div>
        <div className="flex items-end lg:col-span-5 lg:col-start-8">
          <Newsletter dark />
        </div>
      </div>

      <div className="container-x grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="max-w-xs text-sm leading-relaxed text-concrete">{brand.description}</p>
          <div className="mt-8 flex gap-3">
            <a href={whatsappLink(`Olá! Vim pelo site da ${brand.name}.`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/15 transition-colors hover:bg-linen hover:text-graphite">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </a>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/15 transition-colors hover:bg-linen hover:text-graphite">
              <InstagramIcon className="h-[18px] w-[18px]" />
            </a>
            {brand.contact.pinterest && (
              <a href={`https://www.pinterest.com/${brand.contact.pinterest}/`} target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/15 transition-colors hover:bg-linen hover:text-graphite">
                <PinterestIcon className="h-[18px] w-[18px]" />
              </a>
            )}
          </div>
        </div>

        <nav aria-label="Rodapé" className="lg:col-span-2">
          <p className="eyebrow mb-5 text-concrete/70">Navegue</p>
          <ul className="space-y-3 text-sm">
            {navigation.map((n) => (
              <li key={n.href}>
                <TransitionLink href={n.href} className="transition-colors hover:text-wood-light">
                  {n.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-2">
          <p className="eyebrow mb-5 text-concrete/70">Ambientes</p>
          <ul className="space-y-3 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <TransitionLink href={`/ambientes?categoria=${c.id}`} className="transition-colors hover:text-wood-light">
                  {c.plural}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <p className="eyebrow mb-5 text-concrete/70">Showroom</p>
          <address className="not-italic text-sm leading-relaxed">
            {fullAddress}
            <br />
            {brand.showroom.hours.map((h) => (
              <span key={h.days} className="block text-concrete">
                {h.days}: {h.time}
              </span>
            ))}
          </address>
          <div className="mt-5 space-y-1 text-sm">
            {brand.contact.email && (
              <a href={`mailto:${brand.contact.email}`} className="block hover:text-wood-light">
                {brand.contact.email}
              </a>
            )}
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="block hover:text-wood-light">
              WhatsApp {brand.contact.whatsappDisplay}
            </a>
          </div>
          <div className="mt-8">
            <Button href="/contato" variant="light">
              Solicitar orçamento
            </Button>
          </div>
        </div>
      </div>

      {/* Assinatura gigante */}
      <div className="container-x relative">
        <p aria-hidden className="select-none whitespace-nowrap font-display text-[19vw] font-light leading-[0.8] tracking-[-0.05em] text-linen/[0.06]">
          {brand.wordmark[0]} <span className="serif-accent">{brand.wordmark[1]}</span>
        </p>
      </div>

      <div className="container-x flex flex-col items-start justify-between gap-4 border-t border-linen/10 py-8 text-xs text-concrete sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <LogoMark className="h-6 w-6" />
          <span>
            © {year} {brand.name}. Todos os direitos reservados.
          </span>
        </div>
        <span>
          {brand.tagline} · {brandSince}
        </span>
      </div>
    </footer>
  );
}
