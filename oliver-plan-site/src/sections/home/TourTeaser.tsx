import { Tour3D } from "@/components/features/Tour3D";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

export function TourTeaser() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-x mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="08">Tour 3D</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6" text="Entre no projeto *antes* de ele existir." />
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <p className="leading-relaxed text-stone">
            Gire o olhar, mude de ponto de vista, abra os detalhes e troque os acabamentos em tempo real. É assim que você aprova o seu projeto conosco.
          </p>
          <div className="mt-6">
            <Button href="/showroom" variant="outline">
              Visitar o showroom virtual
            </Button>
          </div>
        </div>
      </div>
      <div className="container-x">
        <Tour3D preset="closet" />
      </div>
    </section>
  );
}
