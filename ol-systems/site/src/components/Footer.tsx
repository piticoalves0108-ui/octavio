import { contactHref, site } from "@/config/site";
import { Fill } from "./Fill";
import { Logo } from "./Header";
import { InstagramIcon, WhatsAppIcon } from "./icons";

export function Footer() {
  return (
    <footer className="relative border-t border-line px-4 pb-28 pt-14 sm:px-6 lg:px-10 lg:pb-14">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Sites profissionais para empresas e perfis do Instagram, com atualizações sempre que você pedir.
          </p>
          <p className="mt-3 text-sm text-dim">
            Atendimento: <Fill text={site.serviceArea} />
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <a href={contactHref()} target="_blank" rel="noopener noreferrer" data-cta="footer" className="inline-flex items-center gap-2 text-muted hover:text-fg">
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
          </a>
          <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-muted hover:text-fg">
            <InstagramIcon className="h-4 w-4" /> @{site.instagram.handle}
          </a>
          <a href="/politica-de-privacidade/" className="text-muted hover:text-fg">
            Política de privacidade
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1320px] flex-col gap-2 border-t border-line pt-6 text-xs text-dim sm:flex-row sm:justify-between">
        <span>
          © {new Date().getFullYear()} {site.name}
          {site.cnpj && (
            <>
              {" "}
              · CNPJ <Fill text={site.cnpj} />
            </>
          )}
        </span>
        <span>Feito com cuidado pela própria {site.name}.</span>
      </div>
    </footer>
  );
}
