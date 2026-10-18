import { ImageResponse } from "next/og";
import { brand } from "@/data/brand";

export const alt = `${brand.name} · ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const swatches = ["#8B2942", "#FF6B7A", "#E3C2B5", "#C98B92", "#9E1B32", "#A8B5A0"];

/** Baixa a Cormorant Garamond itálica (TTF) do Google Fonts; sem rede, a imagem sai com a fonte padrão. */
async function loadSerif() {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&display=swap")).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

/** Imagem de compartilhamento (Open Graph): frasco estilizado, cartela de cores e a assinatura da marca. */
export default async function OgImage() {
  const serif = await loadSerif();
  const display = serif ? { fontFamily: "Cormorant" } : {};
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(150deg, #FAF7F2 0%, #F5EDE6 50%, #E8D5CE 100%)", color: "#1A1A1A", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#6E5D59" }}>ESMALTERIA · {brand.location.city.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 170, lineHeight: 1, fontStyle: "italic", color: "#8B2942", letterSpacing: -2, ...display }}>Lumi</div>
            <div style={{ display: "flex", fontSize: 54, marginTop: 14, ...display }}>Seu momento de brilho.</div>
            <div style={{ display: "flex", marginTop: 36 }}>
              {swatches.map((c) => (
                <div key={c} style={{ width: 46, height: 46, borderRadius: 46, background: c, marginRight: 14, border: "3px solid #FAF7F2" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6E5D59" }}>Nail design · Gel · Alongamento · Spa dos pés · @{brand.contact.instagram}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300 }}>
          <div style={{ width: 70, height: 190, borderRadius: "35px 35px 8px 8px", background: "#141414" }} />
          <div style={{ width: 92, height: 16, background: "#C8A27A" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 230, height: 210, borderRadius: 40, background: "linear-gradient(160deg, #B23A55 0%, #8B2942 55%, #5E1626 100%)", border: "10px solid rgba(255,255,255,0.55)", color: "#FAF7F2", fontSize: 72, fontStyle: "italic", ...display }}>
            Lumi
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: serif ? [{ name: "Cormorant", data: serif, style: "italic", weight: 500 }] : undefined },
  );
}
