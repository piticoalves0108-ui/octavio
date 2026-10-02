import "server-only";
import type { Foto } from "@/content/fotos";
import { fotosGaleria } from "@/content/galeria";

/**
 * Galeria puxando do Instagram.
 *
 * Usa a Instagram API with Instagram Login (conta profissional) com um token de
 * longa duração em INSTAGRAM_ACCESS_TOKEN. O resultado fica em cache por 1 hora
 * (ISR). Sem token, ou se a API falhar, cai nas fotos locais de content/galeria.ts.
 * O token vence em 60 dias: renove pelo endpoint refresh_access_token (ver README).
 */

type MidiaInstagram = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
};

export type FotoGaleria = Foto & { link?: string; largura?: number; altura?: number };

const PROPORCOES_PADRAO: Foto["proporcao"][] = ["4/5", "1/1", "4/5", "1/1", "4/5", "1/1", "4/5", "1/1", "4/5"];

function altDaLegenda(legenda?: string) {
  const limpa = (legenda ?? "").replace(/\s+/g, " ").replace(/#\S+/g, "").trim();
  const curta = limpa.length > 110 ? `${limpa.slice(0, 107).trimEnd()}...` : limpa;
  return curta ? `Foto do Instagram do Churrasquinho do Bruce: ${curta}` : "Foto do Instagram do Churrasquinho do Bruce";
}

export async function fotosDaGaleria(): Promise<{ fotos: FotoGaleria[]; doInstagram: boolean }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return { fotos: fotosGaleria, doInstagram: false };

  try {
    const url = new URL("https://graph.instagram.com/me/media");
    url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink");
    url.searchParams.set("limit", "12");
    url.searchParams.set("access_token", token);

    const resposta = await fetch(url, { next: { revalidate: 3600 } });
    if (!resposta.ok) throw new Error(`Instagram ${resposta.status}`);
    const { data } = (await resposta.json()) as { data: MidiaInstagram[] };

    const fotos = data
      .map((m, i): FotoGaleria | null => {
        const src = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
        if (!src) return null;
        return {
          src,
          alt: altDaLegenda(m.caption),
          legenda: "",
          proporcao: PROPORCOES_PADRAO[i % PROPORCOES_PADRAO.length],
          link: m.permalink,
        };
      })
      .filter((f): f is FotoGaleria => f !== null)
      .slice(0, 9);

    return fotos.length ? { fotos, doInstagram: true } : { fotos: fotosGaleria, doInstagram: false };
  } catch {
    return { fotos: fotosGaleria, doInstagram: false };
  }
}
