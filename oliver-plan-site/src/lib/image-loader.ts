/**
 * Loader global do next/image.
 * Fotos do Unsplash são redimensionadas e convertidas (AVIF/WebP) pela própria CDN do Unsplash.
 * Arquivos locais (renders em /public) são servidos como estão.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    return url.toString();
  }
  return `${src}?w=${width}`;
}
