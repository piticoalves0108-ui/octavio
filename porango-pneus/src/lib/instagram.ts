import { galeria, type FotoGaleria } from "@/content/site";

/**
 * Galeria "puxada do Instagram".
 *
 * Com INSTAGRAM_ACCESS_TOKEN (Instagram API com login do Instagram, conta profissional),
 * busca os últimos posts de imagem e revalida a cada hora. Sem token, usa as fotos
 * locais de `galeria` em site.ts (ou os placeholders).
 */
type MidiaInstagram = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
};

export async function fotosGaleria(): Promise<FotoGaleria[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return galeria;

  try {
    const url = new URL("https://graph.instagram.com/v21.0/me/media");
    url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink");
    url.searchParams.set("limit", "12");
    url.searchParams.set("access_token", token);
    const resposta = await fetch(url, { next: { revalidate: 3600 } });
    if (!resposta.ok) return galeria;
    const { data } = (await resposta.json()) as { data: MidiaInstagram[] };
    const fotos = data
      .filter((m) => m.media_type !== "VIDEO" || m.thumbnail_url)
      .slice(0, 6)
      .map<FotoGaleria>((m, i) => ({
        src: m.media_type === "VIDEO" ? (m.thumbnail_url as string) : m.media_url,
        alt: resumirLegenda(m.caption) || "Foto do Instagram da Porango Pneus",
        legenda: resumirLegenda(m.caption),
        proporcao: i % 3 === 1 ? "1/1" : "4/5",
        post: m.permalink,
      }));
    return fotos.length ? fotos : galeria;
  } catch {
    return galeria;
  }
}

function resumirLegenda(legenda?: string) {
  if (!legenda) return "";
  const linha = legenda.split("\n")[0].replace(/#\S+/g, "").trim();
  return linha.length > 110 ? `${linha.slice(0, 107)}...` : linha;
}
