import { polishes, type Polish } from "@/data/colors";
import { posts, type Post } from "@/data/posts";
import { normalize } from "@/lib/utils";

/** Índice do post na lista (usado para variar a capa e numerar as edições) */
export const postIndex = (slug: string) => Math.max(0, posts.findIndex((p) => p.slug === slug));

/** Número editorial da edição: "01", "02"… */
export const postNumber = (slug: string) => String(postIndex(slug) + 1).padStart(2, "0");

/** Âncora para os subtítulos do artigo */
export const headingId = (text: string) =>
  normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Esmalte da cartela com a mesma cor da paleta (quando existe) */
export const polishForHex = (hex: string): Polish | undefined => polishes.find((p) => p.hex.toLowerCase() === hex.toLowerCase());

/** Posts relacionados: mesma categoria primeiro, depois os demais na ordem original */
export function relatedPosts(post: Post, count = 3) {
  const others = posts.filter((p) => p.slug !== post.slug);
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, count);
}
