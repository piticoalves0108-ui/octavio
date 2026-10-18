import { Marquee } from "@/components/ui/Marquee";

export function MarqueeBand() {
  return (
    <section aria-label="Tipologias" className="border-y border-graphite/10 bg-paper py-7 md:py-10">
      <Marquee
        items={["Cozinhas", "Closets", "Home Office", "Salas", "Quartos", "Banheiros", "Áreas Gourmet"]}
        className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-light leading-none tracking-[-0.03em]"
        speed={45}
      />
    </section>
  );
}
