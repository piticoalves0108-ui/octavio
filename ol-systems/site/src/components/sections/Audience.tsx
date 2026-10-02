import { Briefcase, Scissors, Stethoscope, Store, UtensilsCrossed, Wrench } from "lucide-react";
import { audience } from "@/config/content";
import { InstagramIcon } from "../icons";
import { Reveal } from "../Reveal";
import { SectionTitle } from "../Title";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  store: Store,
  utensils: UtensilsCrossed,
  scissors: Scissors,
  stethoscope: Stethoscope,
  wrench: Wrench,
  briefcase: Briefcase,
  instagram: InstagramIcon,
};

export function Audience() {
  return (
    <section className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <SectionTitle index="06" label={audience.label} title={audience.title} className="max-w-3xl" />
      <ul className="mt-12 flex flex-wrap gap-3">
        {audience.items.map((a, i) => {
          const Icon = ICONS[a.icon];
          return (
            <li key={a.label}>
              <Reveal delay={i * 0.05} y={14}>
                <span className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-panel/70 py-3 pl-3.5 pr-5 text-base transition-colors duration-300 hover:border-white hover:bg-white hover:text-ink sm:text-lg">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {a.label}
                </span>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
