import type { ResolvingMetadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { posts } from "@/data/posts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FeaturedPost, PostCard } from "@/sections/tendencias/PostCard";
import { TrendsCTA } from "@/sections/tendencias/TrendsCTA";

const description =
  "Cores da estação, nail art, cuidados para o esmalte durar e pequenos rituais de bem-estar: o diário da Lumi Esmalteria, em Brasília.";

export function generateMetadata(_: unknown, parent: ResolvingMetadata) {
  return pageMetadata(parent, { title: "Tendências", description, path: "/tendencias" });
}

/** Tendências: o post mais recente em destaque e os demais numa grade editorial. */
export default function TendenciasPage() {
  const [featured, ...rest] = posts;
  return (
    <>
      <PageHeader
        eyebrow="Tendências"
        title={"Diário de *cor*\ne cuidado."}
        intro="As cores que estão nas passarelas, cuidados que fazem o esmalte durar e pequenos rituais para desacelerar. Leituras curtas, para fazer com um café."
      />

      <section aria-label="Post em destaque" className="container-x">
        <Reveal y={30}>
          <FeaturedPost post={featured} />
        </Reveal>
      </section>

      <section aria-labelledby="mais-leituras" className="container-x pt-24 md:pt-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel index="02">Arquivo</SectionLabel>
            <h2 id="mais-leituras" className="display-md mt-6 text-ink">
              Mais <span className="serif-accent text-wine">leituras</span>
            </h2>
          </div>
          <p className="text-sm text-muted">{posts.length} artigos · cuidados, nail art e bem-estar</p>
        </div>
        <ul className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:gap-x-14">
          {rest.map((post, i) => (
            <Reveal as="li" key={post.slug} delay={(i % 2) * 0.1} className={i % 2 === 1 ? "md:mt-28" : undefined}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </ul>
      </section>

      <TrendsCTA
        title="Gostou de alguma ideia?"
        accent="A gente faz em você."
        text="Mande o print do post ou o nome da cor pelo WhatsApp. Combinamos o desenho, o formato e o melhor horário para você."
        message="Olá, Lumi! Vi uma ideia nas tendências do site e quero fazer nas minhas unhas. Tem horário?"
      />
    </>
  );
}
