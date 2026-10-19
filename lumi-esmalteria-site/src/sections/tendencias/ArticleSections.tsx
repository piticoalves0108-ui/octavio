import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/data/posts";
import { finishLabel } from "@/data/colors";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { RevealText } from "@/components/ui/RevealText";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { finishBackground } from "@/sections/cores/finishStyles";
import { PostCover } from "./PostCover";
import { PostCard, PostMeta } from "./PostCard";
import { headingId, polishForHex, postIndex, postNumber, relatedPosts } from "./postUtils";

/** Abertura do artigo: trilha, categoria, tempo de leitura, título, resumo e capa. */
export function ArticleHeader({ post }: { post: Post }) {
  return (
    <header className="pb-12 pt-36 md:pb-16 md:pt-44">
      <div className="container-x">
        <nav aria-label="Trilha de navegação" className="mb-8">
          <ol className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
            <li>
              <TransitionLink href="/" className="hover:text-wine">
                Início
              </TransitionLink>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <TransitionLink href="/tendencias" className="hover:text-wine">
                Tendências
              </TransitionLink>
            </li>
            <li className="flex min-w-0 items-center gap-2" aria-current="page">
              <span aria-hidden>/</span>
              <span className="truncate text-ink">{post.title}</span>
            </li>
          </ol>
        </nav>
        <div className="max-w-5xl">
          <PostMeta post={post} />
          <RevealText as="h1" text={post.title} className="display-lg mt-6 text-balance text-ink" />
          <Reveal delay={0.25}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{post.excerpt}</p>
          </Reveal>
        </div>
      </div>
      <Reveal delay={0.35} y={30} className="container-x mt-12 md:mt-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[36px] sm:aspect-[16/9] lg:aspect-[21/9]">
          <PostCover palette={post.palette} seed={postIndex(post.slug)} number={postNumber(post.slug)} label={`Capa ilustrada: unhas nas cores da paleta do post ${post.title}`} />
        </div>
      </Reveal>
    </header>
  );
}

/** Corpo do artigo com índice lateral (desktop) e medida confortável de leitura. */
export function ArticleBody({ post }: { post: Post }) {
  const headings = post.body.filter((b) => b.heading).map((b) => b.heading as string);
  const middle = Math.ceil(post.body.length / 2);
  return (
    <div className="container-x grid gap-12 pb-8 lg:grid-cols-12">
      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-28 rounded-[28px] border border-wine/10 p-6">
          <p className="eyebrow text-muted">Neste artigo</p>
          <ol className="mt-5 space-y-3 text-sm">
            {headings.map((h, i) => (
              <li key={h} className="flex gap-3">
                <span className="w-5 shrink-0 font-display text-base italic leading-5 text-wine/80 lining-nums">{String(i + 1).padStart(2, "0")}</span>
                <a href={`#${headingId(h)}`} className="text-ink-soft transition-colors hover:text-wine">
                  {/* O índice já numera: tira o "1." de subtítulos que vêm numerados */}
                  {h.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <article className="lg:col-span-8 lg:col-start-5">
        <div className="max-w-[65ch]">
          {post.body.map((block, i) => (
            <div key={i}>
              {block.heading && (
                <h2 id={headingId(block.heading)} className="mt-14 scroll-mt-28 font-display text-[2rem] leading-tight text-ink lining-nums md:text-[2.4rem]">
                  {block.heading}
                </h2>
              )}
              <p
                className={
                  i === 0
                    ? "text-xl leading-[1.75] text-ink-soft first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[4.6rem] first-letter:leading-[0.8] first-letter:text-wine md:text-[1.35rem]"
                    : "mt-5 text-[1.075rem] leading-[1.85] text-ink-soft"
                }
              >
                {block.text}
              </p>

              {/* Nota da Lumi no meio do texto */}
              {i === middle - 1 && (
                <aside className="my-12 rounded-[28px] bg-sand p-7 md:p-8">
                  <p className="eyebrow text-wine">Nota da Lumi</p>
                  <p className="mt-3 font-display text-2xl leading-snug text-ink">Quer levar essa ideia para as suas mãos? Mande o link deste post e a gente adapta para você.</p>
                  <a
                    href={whatsappLink(`Olá, Lumi! Li o post "${post.title}" no site e quero agendar. Tem horário?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-wine underline decoration-wine/30 underline-offset-[6px] hover:decoration-wine"
                  >
                    <WhatsAppIcon className="h-4 w-4" aria-hidden />
                    Conversar pelo WhatsApp
                  </a>
                </aside>
              )}
            </div>
          ))}
          <p className="mt-14 border-t border-wine/10 pt-6 text-sm leading-relaxed text-muted">
            Conteúdo informativo da equipe Lumi. Em caso de alterações nas unhas ou na pele, procure um dermatologista.
          </p>
        </div>
      </article>
    </div>
  );
}

/** "Paleta do post": as cores do artigo, com atalho para cada uma na cartela. */
export function PaletteStrip({ post }: { post: Post }) {
  return (
    <section aria-labelledby="paleta-do-post" className="container-x py-20 md:py-24">
      <div className="rounded-[36px] bg-sand p-7 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel>Paleta do post</SectionLabel>
            <h2 id="paleta-do-post" className="display-md mt-5 text-ink">
              As cores <span className="serif-accent text-wine">deste artigo</span>
            </h2>
          </div>
          <TransitionLink href="/cores" className="inline-flex items-center gap-2 text-sm font-medium text-wine underline decoration-wine/30 underline-offset-[6px] hover:decoration-wine">
            Ver a cartela completa <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </TransitionLink>
        </div>
        <ul className={cn("mt-10 grid grid-cols-2 gap-4", post.palette.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
          {post.palette.map((hex) => {
            const polish = polishForHex(hex);
            const href = polish ? `/cores?cor=${polish.id}` : "/cores";
            return (
              <li key={hex} className="last:odd:col-span-2 sm:last:odd:col-span-1">
                <TransitionLink href={href} className="group block h-full rounded-[24px] bg-cream p-3 transition-shadow duration-500 hover:shadow-[0_30px_60px_-35px_rgba(139,41,66,0.35)]">
                  <span
                    aria-hidden
                    className="relative block h-32 overflow-hidden rounded-[18px] ring-1 ring-black/5 md:h-40"
                    style={{ background: polish ? finishBackground(polish.finish, polish.hex) : hex }}
                  >
                    <span className="absolute inset-y-0 left-0 w-[14%] -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-white/0 via-white/45 to-white/0 transition-transform duration-1000 ease-out-expo group-hover:translate-x-[800%]" />
                  </span>
                  <span className="block px-2 pb-1 pt-4">
                    <span className="block font-display text-xl leading-tight text-ink">{polish ? polish.name : "Tom de inspiração"}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] uppercase tracking-[0.14em] text-muted">
                      {polish ? finishLabel[polish.finish] : hex.toUpperCase()}
                      <ArrowUpRight className="h-3.5 w-3.5 text-wine opacity-0 transition-opacity duration-500 group-hover:opacity-100" strokeWidth={1.5} aria-hidden />
                    </span>
                  </span>
                </TransitionLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Leituras relacionadas no fim do artigo. */
export function RelatedPosts({ post }: { post: Post }) {
  const related = relatedPosts(post, 3);
  return (
    <section aria-labelledby="leia-tambem" className="container-x pt-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionLabel>Continue lendo</SectionLabel>
          <h2 id="leia-tambem" className="display-md mt-5 text-ink">
            Leia <span className="serif-accent text-wine">também</span>
          </h2>
        </div>
        <TransitionLink href="/tendencias" className="inline-flex items-center gap-2 text-sm font-medium text-wine underline decoration-wine/30 underline-offset-[6px] hover:decoration-wine">
          Todos os artigos <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </TransitionLink>
      </div>
      <ul className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {related.map((p, i) => (
          <Reveal as="li" key={p.slug} delay={i * 0.08}>
            <PostCard post={p} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
