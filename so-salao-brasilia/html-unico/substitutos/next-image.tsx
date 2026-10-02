/** Substituto de next/image: <img> com o arquivo embutido no HTML. */
import type { CSSProperties, ImgHTMLAttributes } from "react";
import { ativo } from "@/lib/ativos";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
};

export default function Image({ src, fill, priority, quality, style, loading, fetchPriority, ...props }: Props) {
  void quality;
  const caminho = typeof src === "string" ? src : src.src;
  const estilo: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...props}
      src={ativo(caminho)}
      style={estilo}
      decoding="async"
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : fetchPriority}
    />
  );
}
