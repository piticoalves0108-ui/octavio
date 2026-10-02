import { hero } from "@/config/content";
import { ContactButton } from "../ContactButton";
import { Fill } from "../Fill";
import { HeroTitle } from "../HeroTitle";
import { HeroVisual } from "../HeroVisual";

export function Hero() {
  return (
    <section
      id="topo"
      className="relative mx-auto grid min-h-[100svh] max-w-[1320px] items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-10 lg:pb-10 lg:pt-24"
    >
      <div className="relative z-10 lg:col-span-7">
        <p className="fade-up mb-7 inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wa opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-wa" />
          </span>
          {hero.eyebrow}
        </p>
        <HeroTitle />
        <p
          className="fade-up mt-7 max-w-[34rem] text-[1.075rem] leading-relaxed text-muted sm:text-lg"
          style={{ ["--d" as string]: "650ms" }}
        >
          {hero.subtitle}
        </p>
        <div className="fade-up mt-9 flex flex-wrap items-center gap-4" style={{ ["--d" as string]: "800ms" }}>
          <ContactButton source="hero" pulse>
            {hero.ctaPrimary}
          </ContactButton>
          <a
            href="#portfolio"
            className="inline-flex h-13 items-center rounded-full border border-line-strong px-6 font-semibold text-fg transition-colors hover:border-white hover:bg-white hover:text-ink"
          >
            {hero.ctaSecondary}
          </a>
        </div>
        <p className="fade-up mt-6 text-sm text-dim" style={{ ["--d" as string]: "950ms" }}>
          <Fill text={hero.trustLine} />
        </p>
      </div>
      <div className="relative lg:col-span-5 lg:-mr-6 xl:-mr-12">
        <HeroVisual />
      </div>
    </section>
  );
}
