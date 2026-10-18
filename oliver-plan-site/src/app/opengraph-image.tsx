import { ImageResponse } from "next/og";
import { brand } from "@/data/brand";

export const alt = `${brand.name} · ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento (Open Graph) gerada no build, no estilo de prancha técnica. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#F4EFE9",
          color: "#2B2B2B",
          backgroundImage: "linear-gradient(to right, rgba(184,176,165,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(184,176,165,0.35) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 6, color: "#6f685f" }}>
          <span>{brand.descriptor.toUpperCase()}</span>
          <span>DESDE {brand.founded}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, lineHeight: 1, letterSpacing: -4 }}>{brand.name}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
            <div style={{ width: 120, height: 3, background: "#8B6F47", marginRight: 24 }} />
            <div style={{ fontSize: 40, color: "#6B5434" }}>{brand.tagline}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6f685f" }}>
          <span>Cozinhas · Closets · Home Office · Salas · Quartos · Banheiros</span>
          <span>@{brand.contact.instagram}</span>
        </div>
      </div>
    ),
    size,
  );
}
