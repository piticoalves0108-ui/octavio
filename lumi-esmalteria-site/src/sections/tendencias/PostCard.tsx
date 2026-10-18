import { ArrowUpRight, Clock } from "lucide-react";
import type { Post } from "@/data/posts";
import { cn } from "@/lib/utils";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { PostCover } from "./PostCover";
import { postIndex, postNumber } from "./postUtils";

/** Linha de categoria + tempo de leitura */
export function PostMeta({ post, className }: { post: Post; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted", className)}>
      <span className="eyebrow text-wine">{post.category}</span>
      <span aria-hidden className="h-1 w-1 rounded-full bg-mauve" />
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        {post.readingTime} de leitura
      </span>
    </p>
  );
}

/** Bolinhas com a paleta do post */
export function PaletteDots({ palette, className }: { palette: string[]; className?: string }) {
  return (
    <span className={cn("flex -space-x-1.5", className)} aria-hidden>
      {palette.map((c) => (
        <span key={c} className="h-5 w-5 rounded-full ring-2 ring-cream" style={{ background: c }} />
      ))}
    </span>
  );
}

/** Card de post da listagem, com capa gerada da paleta. */
export function PostCard({ post, headingLevel = "h3", className }: { post: Post; headingLevel?: "h2" | "h3"; className?: string }) {
  const Heading = headingLevel;
  return (
    <article className={cn("group", className)}>
      <TransitionLink href={`/tendencias/${post.slug}`} className="block rounded-[28px]">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] shadow-[0_30px_60px_-40px_rgba(139,41,66,0.35)]">
          <div className="absolute inset-0 transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.05]">
            <PostCover palette={post.palette} seed={postIndex(post.slug)} number={postNumber(post.slug)} label={`Capa ilustrada do post ${post.title}`} />
          </div>
          <span className="absolute left-4 top-4 rounded-full bg-cream/85 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-soft backdrop-blur">
            {post.category}
          </span>
        </div>
        <div className="px-1 pt-6">
          <PostMeta post={post} />
          <Heading className="mt-3 text-balance font-display text-[1.9rem] leading-[1.08] text-ink transition-colors duration-500 group-hover:text-wine md:text-[2.1rem]">{post.title}</Heading>
          <p className="mt-3 max-w-md leading-relaxed text-muted">{post.excerpt}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-wine">
            Ler artigo
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} aria-hidden />
          </span>
        </div>
      </TransitionLink>
    </article>
  );
}

/** Post em destaque: capa grande e texto ao lado. */
export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="group">
      <TransitionLink href={`/tendencias/${post.slug}`} className="grid overflow-hidden rounded-[36px] bg-sand lg:grid-cols-12">
        <div className="relative aspect-[4/3] overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[560px]">
          <div className="absolute inset-0 transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.04]">
            <PostCover palette={post.palette} seed={postIndex(post.slug)} number={postNumber(post.slug)} label={`Capa ilustrada do post ${post.title}`} />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-10 p-7 md:p-12 lg:col-span-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-wine px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cream">Em destaque</span>
            <PostMeta post={post} className="mt-8" />
            <h2 className="mt-4 text-balance font-display text-[2.4rem] leading-[1.02] text-ink transition-colors duration-500 group-hover:text-wine md:text-6xl">{post.title}</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">{post.excerpt}</p>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-wine/10 pt-6">
            <span className="flex items-center gap-3 text-xs text-muted">
              <PaletteDots palette={post.palette} />
              Paleta do post
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-wine">
              Ler artigo
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wine text-cream transition-transform duration-500 ease-out-expo group-hover:rotate-45">
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
            </span>
          </div>
        </div>
      </TransitionLink>
    </article>
  );
}
