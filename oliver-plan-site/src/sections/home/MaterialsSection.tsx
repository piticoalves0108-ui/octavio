import { MaterialVisualizer } from "@/components/features/MaterialVisualizer";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function MaterialsSection() {
  return (
    <section id="materiais" className="container-x py-24 md:py-36">
      <div className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="05">Materialidade</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6" text="Toque os materiais *com os olhos*." />
        </div>
        <p className="leading-relaxed text-stone lg:col-span-4 lg:col-start-9">
          Lâminas naturais, lacas foscas, pedras e vidros: experimente as combinações sobre a elevação técnica de uma cozinha real. No showroom, você toca cada amostra.
        </p>
      </div>
      <MaterialVisualizer />
    </section>
  );
}
