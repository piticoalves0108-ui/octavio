import { TituloEntrada } from "@/components/motion/TituloEntrada";

/** Abertura das páginas internas: rótulo, título grande e linha de apoio. */
export function CabecalhoPagina({ rotulo, titulo, apoio }: { rotulo: string; titulo: string; apoio: string }) {
  return (
    <header className="relative z-10 pt-40 pb-16 md:pt-52 md:pb-24">
      <div className="grade gap-y-8">
        <div className="col-span-4 md:col-span-9">
          <p className="rotulo mb-5">
            <b aria-hidden="true">●</b> {rotulo}
          </p>
          <TituloEntrada className="text-[clamp(3rem,9vw,8.6rem)] leading-[0.88]" linhas={[{ texto: titulo }]} />
        </div>
        <p className="col-span-4 max-w-xl text-lg text-faixa/85 md:col-span-6">{apoio}</p>
        <div className="faixa-tracejada col-span-4 mt-6 opacity-70 md:col-span-12" aria-hidden="true" />
      </div>
    </header>
  );
}
