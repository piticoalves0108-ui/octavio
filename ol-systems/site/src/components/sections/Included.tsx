import { Lock, MapPin, Palette, RefreshCw, Search, Server, Smartphone } from "lucide-react";
import { included } from "@/config/content";
import { isPending } from "@/config/site";
import { Fill } from "../Fill";
import { InstagramIcon, WhatsAppIcon } from "../icons";
import { Reveal } from "../Reveal";
import { SectionTitle } from "../Title";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  palette: Palette,
  smartphone: Smartphone,
  whatsapp: WhatsAppIcon,
  map: MapPin,
  instagram: InstagramIcon,
  search: Search,
  server: Server,
  lock: Lock,
  refresh: RefreshCw,
};

export function Included() {
  return (
    <section id="incluso" className="relative mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <SectionTitle index="03" label={included.label} title={included.title} className="max-w-3xl" />
      <ul className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {included.items.map((it, i) => {
          const Icon = ICONS[it.icon];
          const highlight = it.icon === "refresh";
          return (
            <li key={it.title} className={`bg-ink ${highlight ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <Reveal delay={(i % 3) * 0.06} y={18} className="h-full">
                <div
                  className={`group flex h-full gap-5 p-7 transition-colors duration-500 hover:bg-panel lg:p-8 ${
                    highlight ? "bg-[radial-gradient(120%_120%_at_0%_0%,rgb(37_211_102/0.12),transparent_60%)]" : ""
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 flex-none place-items-center rounded-2xl border transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 ${
                      highlight ? "border-wa/50 text-wa" : "border-line-strong text-fg"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight">{it.title}</h3>
                    <p className={`mt-1.5 leading-relaxed ${isPending(it.text) ? "" : "text-muted"}`}>
                      <Fill text={it.text} />
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
