import type { Metadata } from "next";
import { faq, partesMedida } from "@/content/textos";
import { negocio } from "@/content/site";
import { FlancoSvg } from "@/components/fallbacks/FlancoSvg";
import { BotaoCotar } from "@/components/motion/BotaoCotar";
import { Revelar } from "@/components/motion/Revelar";
import { CabecalhoPagina } from "@/components/sections/CabecalhoPagina";
import { jsonLdBreadcrumb, jsonLdFaq } from "@/lib/jsonld";
import { indicesCarga, indicesVelocidade } from "@/lib/medidas";

const descricao =
  "Como ler a medida do pneu (175/70 R14 84T), tabela de índice de carga e de velocidade, TWI, calibragem e rodízio. Guia da Porango Pneus.";

export const metadata: Metadata = {
  title: "Guia do pneu: medida, TWI, calibragem e rodízio",
  description: descricao,
  alternates: { canonical: "/guia-do-pneu" },
  openGraph: { title: `Guia do pneu | ${negocio.nome}`, description: descricao, url: "/guia-do-pneu" },
};

const blocos = [
  {
    id: "twi",
    titulo: "Desgaste e TWI",
    texto: [
      "TWI (Tread Wear Indicator) são pequenas saliências de 1,6 mm no fundo dos sulcos principais. O ombro do pneu tem um triângulo ou a sigla TWI mostrando onde elas ficam.",
      "Quando a banda de rodagem chega na altura da saliência, o pneu atingiu o limite legal no Brasil e precisa ser trocado. Com pouco sulco, a água não escoa e a frenagem no molhado fica bem mais longa.",
    ],
  },
  {
    id: "calibragem",
    titulo: "Calibragem",
    texto: [
      "A pressão certa é a da montadora, não a do pneu: veja a etiqueta na coluna da porta, na tampa do tanque ou no manual. Há valores diferentes para carro vazio e carregado.",
      "Calibre com o pneu frio, pelo menos a cada 15 dias, incluindo o estepe. Pneu murcho gasta nas bordas, esquenta e aumenta o consumo; pneu cheio demais gasta no centro e perde aderência.",
    ],
  },
  {
    id: "rodizio",
    titulo: "Rodízio",
    texto: [
      "Os pneus da frente gastam diferente dos de trás. O rodízio troca as posições para o desgaste ficar igual e os quatro durarem mais.",
      "O intervalo e o esquema (cruzado ou paralelo) estão no manual do carro. Muitos fabricantes indicam a cada 10.000 km. Pneus direcionais só trocam de eixo, sem mudar de lado.",
    ],
  },
  {
    id: "quando-trocar",
    titulo: "Quando trocar",
    texto: [
      "Troque ao chegar no TWI, ou antes se o pneu tiver bolha, corte no flanco, rachaduras de ressecamento ou desgaste irregular.",
      "A data de fabricação está no flanco, nos quatro últimos números do código DOT (semana e ano). Pneu velho resseca mesmo com sulco bom: siga a recomendação do fabricante.",
    ],
  },
];

export default function GuiaDoPneu() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            jsonLdBreadcrumb([{ nome: "Início", caminho: "/" }, { nome: "Guia do pneu", caminho: "/guia-do-pneu" }]),
            jsonLdFaq(),
          ]),
        }}
      />
      <CabecalhoPagina
        rotulo="Guia do pneu"
        titulo="Entenda o seu pneu"
        apoio="Medida, índices, desgaste, calibragem e rodízio: o básico para rodar seguro e acertar na hora de trocar."
      />

      {/* Como ler a medida */}
      <section id="medida" aria-labelledby="titulo-ler-medida" className="relative z-10 pb-24 md:pb-36">
        <div className="grade gap-y-12">
          <div className="col-span-4 md:col-span-5">
            <h2 id="titulo-ler-medida" className="text-[clamp(2.2rem,4.6vw,4rem)]">
              Como ler a medida
            </h2>
            <p className="mt-5 text-faixa/85">
              Ela fica gravada no flanco, a lateral do pneu, sempre no mesmo formato. No exemplo, <strong>175/70 R14 84T</strong>:
            </p>
            <dl className="mt-8 border-t border-linha">
              {partesMedida.map((p) => (
                <div key={p.nome} className="grid grid-cols-[5rem_1fr] gap-4 border-b border-linha py-5">
                  <dt className="font-display text-2xl font-bold text-sinal">{p.trecho}</dt>
                  <dd>
                    <span className="block font-display text-sm font-semibold tracking-[0.14em] uppercase">{p.nome}</span>
                    <span className="mt-1 block text-faixa/85">{p.texto}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <Revelar className="col-span-4 md:col-span-6 md:col-start-7">
            <FlancoSvg destaque={null} className="mx-auto max-w-[560px]" />
          </Revelar>
        </div>
      </section>

      {/* Tabelas */}
      <section aria-label="Tabelas de índices" className="secao-solida relative z-10 border-t border-linha py-24 md:py-36">
        <div className="grade gap-y-16">
          <div className="col-span-4 md:col-span-6">
            <h2 className="text-[clamp(2rem,3.6vw,3rem)]">Índice de carga</h2>
            <p className="mt-3 text-cinza">Peso máximo por pneu. Nunca use índice menor que o indicado no manual.</p>
            <div className="mt-8 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de índice de carga">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">Índice de carga e peso máximo por pneu em quilos</caption>
                <thead>
                  <tr className="border-b border-linha font-display text-xs tracking-[0.16em] text-cinza uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Índice</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">kg</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Índice</th>
                    <th scope="col" className="py-3 font-semibold">kg</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(indicesCarga.length / 2) }, (_, i) => {
                    const a = indicesCarga[i];
                    const b = indicesCarga[i + Math.ceil(indicesCarga.length / 2)];
                    return (
                      <tr key={a[0]} className="border-b border-linha/60">
                        <th scope="row" className={`py-2 pr-4 font-display font-bold ${a[0] === 84 ? "text-sinal" : ""}`}>
                          {a[0]}
                        </th>
                        <td className="py-2 pr-4">{a[1]}</td>
                        {b ? (
                          <>
                            <th scope="row" className="py-2 pr-4 font-display font-bold">
                              {b[0]}
                            </th>
                            <td className="py-2">{b[1]}</td>
                          </>
                        ) : (
                          <td colSpan={2} />
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-span-4 md:col-span-5 md:col-start-8">
            <h2 className="text-[clamp(2rem,3.6vw,3rem)]">Índice de velocidade</h2>
            <p className="mt-3 text-cinza">Velocidade máxima que o pneu aguenta com a carga do índice.</p>
            <div className="mt-8 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de índice de velocidade">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">Índice de velocidade e velocidade máxima em km/h</caption>
                <thead>
                  <tr className="border-b border-linha font-display text-xs tracking-[0.16em] text-cinza uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Letra</th>
                    <th scope="col" className="py-3 font-semibold">km/h</th>
                  </tr>
                </thead>
                <tbody>
                  {indicesVelocidade.map(([letra, kmh]) => (
                    <tr key={letra} className="border-b border-linha/60">
                      <th scope="row" className={`py-2 pr-4 font-display font-bold ${letra === "T" ? "text-sinal" : ""}`}>
                        {letra}
                      </th>
                      <td className="py-2">{kmh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Blocos de cuidado */}
      <section aria-label="Cuidados com o pneu" className="secao-solida relative z-10 py-24 md:py-36">
        <div className="grade gap-y-16">
          {blocos.map((b, i) => (
            <Revelar key={b.id} className="col-span-4 md:col-span-6">
              <article id={b.id} className="border-t border-linha pt-8">
                <span className="font-display text-sm font-semibold text-sinal tabular-nums">0{i + 1}</span>
                <h2 className="mt-3 text-[clamp(2rem,3.6vw,3rem)]">{b.titulo}</h2>
                {b.texto.map((t) => (
                  <p key={t.slice(0, 20)} className="mt-4 max-w-xl text-faixa/85">
                    {t}
                  </p>
                ))}
              </article>
            </Revelar>
          ))}
        </div>
      </section>

      {/* Perguntas frequentes em texto corrido (o JSON-LD FAQPage acompanha) */}
      <section aria-labelledby="titulo-faq-guia" className="secao-solida relative z-10 border-t border-linha py-24 md:py-36">
        <div className="grade gap-y-10">
          <h2 id="titulo-faq-guia" className="col-span-4 text-[clamp(2.2rem,4.6vw,4rem)] md:col-span-4">
            Perguntas frequentes
          </h2>
          <div className="col-span-4 space-y-10 md:col-span-7 md:col-start-6">
            {faq.map((f) => (
              <div key={f.pergunta}>
                <h3 className="text-xl md:text-2xl">{f.pergunta}</h3>
                <p className="mt-3 text-faixa/85">{f.resposta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-cta-guia" className="secao-solida relative z-10 border-t border-linha py-24 md:py-36">
        <div className="grade gap-y-10">
          <h2 id="titulo-cta-guia" className="col-span-4 text-[clamp(2.4rem,6vw,5.6rem)] md:col-span-8">
            Já sabe a medida?
          </h2>
          <div className="col-span-4 flex flex-col gap-6 md:col-span-4 md:items-end md:self-end">
            <p className="text-lg text-cinza md:text-right">Mande pelo WhatsApp e receba a cotação.</p>
            <BotaoCotar origem="pagina_guia" />
          </div>
        </div>
      </section>
    </>
  );
}
