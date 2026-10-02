import { hero } from "@/content/textos";
import { classesBotao } from "@/components/ui/botao";
import { IconeSeta } from "@/components/ui/icones";
import { Magnetico } from "@/components/ui/Magnetico";
import { LinkTransicao } from "@/components/layout/Transicao";
import { VitrineHero } from "./VitrineHero";

/** Divide "*trecho*" em itálico rosé (destaque do título). */
function Linha({ texto }: { texto: string }) {
  const m = texto.match(/^\*(.*)\*$/);
  return m ? <em className="text-[#b5776a] italic">{m[1]}</em> : <>{texto}</>;
}

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="titulo-hero"
      className="relative overflow-hidden pt-28 pb-16 lg:min-h-[100svh] lg:pb-16"
    >
      <div className="grade items-center gap-y-12">
        <div className="col-span-12 lg:col-span-5">
          <p className="sobretitulo surge text-champanhe-texto" style={{ ["--i" as string]: 0 }}>
            {hero.sobretitulo}
          </p>
          <h1 id="titulo-hero" className="mt-5 text-[clamp(2.8rem,5.5vw,6rem)] leading-[0.97]">
            {hero.titulo.map((linha, i) => (
              <span key={i} className="linha-revela" style={{ ["--i" as string]: i }}>
                <span>
                  <Linha texto={linha} />
                </span>
              </span>
            ))}
          </h1>
          <p className="surge mt-6 max-w-[34rem] texto-grande text-tinta-suave" style={{ ["--i" as string]: 1 }}>
            {hero.texto}
          </p>
          <div className="surge mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ ["--i" as string]: 2 }}>
            <Magnetico>
              <LinkTransicao href="/#configurador" className={classesBotao("primario")}>
                {hero.ctaPrincipal}
                <span className="grid size-7 place-items-center rounded-full bg-rose text-grafite transition-transform duration-500 group-hover/botao:translate-x-1">
                  <IconeSeta className="size-4" />
                </span>
              </LinkTransicao>
            </Magnetico>
            <LinkTransicao href="/showroom" className={classesBotao("fantasma")}>
              {hero.ctaSecundario}
            </LinkTransicao>
          </div>
          <ul
            className="surge mt-10 flex flex-wrap gap-2"
            style={{ ["--i" as string]: 3 }}
            aria-label="Por que comprar direto da fábrica"
          >
            {hero.selos.map((selo) => (
              <li key={selo} className="rounded-full border border-grafite/15 px-4 py-2 text-sm text-tinta">
                {selo}
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <VitrineHero />
        </div>
      </div>
    </section>
  );
}
