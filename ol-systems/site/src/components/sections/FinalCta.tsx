import { finalCta } from "@/config/content";
import { site } from "@/config/site";
import { ContactButton } from "../ContactButton";
import { InstagramIcon } from "../icons";
import { SvgGlobe } from "../SvgGlobe";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-10 lg:py-40">
      <SvgGlobe
        animate
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(130vw,1100px)] w-[min(130vw,1100px)] -translate-x-1/2 -translate-y-1/2 text-white/[0.08]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,transparent,var(--color-ink))]" />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display text-[clamp(2.4rem,6.5vw,5.4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-balance">
          {finalCta.title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">{finalCta.text}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <ContactButton source="final" size="lg" pulse>
            Quero meu site
          </ContactButton>
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg"
          >
            <InstagramIcon className="h-5 w-5" />@{site.instagram.handle}
          </a>
        </div>
      </div>
    </section>
  );
}
