import { BeforeAfter3D } from "@/components/features/BeforeAfter3D";
import { RevealText } from "@/components/ui/RevealText";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";

export function BeforeAfterSection() {
  return (
    <section className="bg-sand/60 py-24 md:py-32">
      <div className="container-x mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel index="04">Antes e depois</SectionLabel>
          <RevealText as="h2" className="display-lg mt-6" text="Do contrapiso *ao ambiente* pronto." />
        </div>
        <Reveal className="lg:col-span-4 lg:col-start-9">
          <p className="leading-relaxed text-stone">
            Arraste o divisor. À esquerda, o cômodo como recebemos na visita técnica, com as marcações de obra. À direita, a cozinha planejada entregue.
          </p>
        </Reveal>
      </div>
      <div className="container-x">
        <BeforeAfter3D />
      </div>
    </section>
  );
}
