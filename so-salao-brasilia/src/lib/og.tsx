/**
 * Gerador das imagens de Open Graph (1200×630), com as fontes da marca e um render
 * da cena 3D. Usado pelos arquivos opengraph-image.tsx de cada página.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const tamanhoOg = { width: 1200, height: 630 };

async function arquivo(caminho: string) {
  return readFile(join(process.cwd(), caminho));
}

export async function imagemOg({
  sobretitulo,
  titulo,
  imagem = "src/assets/og/cadeira.png",
}: {
  sobretitulo: string;
  titulo: string;
  imagem?: string;
}) {
  const [serif, sans, foto] = await Promise.all([
    arquivo("src/assets/fonts/DMSerifDisplay-Regular.ttf"),
    arquivo("src/assets/fonts/Outfit-Medium.ttf"),
    arquivo(imagem).catch(() => null),
  ]);
  const src = foto ? `data:image/png;base64,${foto.toString("base64")}` : null;

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f7f5f3", fontFamily: "Outfit" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 56px 56px 72px",
          width: 700,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: "DM Serif Display", fontSize: 40, color: "#2a2a2e" }}>Só Salão</span>
          <span style={{ fontSize: 16, letterSpacing: 6, color: "#7a6440" }}>BRASÍLIA</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 20, letterSpacing: 4, color: "#7a6440", textTransform: "uppercase" }}>
            {sobretitulo}
          </span>
          <span
            style={{ fontFamily: "DM Serif Display", fontSize: 66, lineHeight: 1.02, color: "#2a2a2e", marginTop: 18 }}
          >
            {titulo}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Entrega em até 7 dias úteis", "Até 12x sem juros"].map((t) => (
            <span
              key={t}
              style={{
                display: "flex",
                fontSize: 20,
                color: "#2a2a2e",
                border: "1.5px solid rgba(42,42,46,0.25)",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          background: "#ece5df",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* ImageResponse (Satori) só aceita <img>; next/image não se aplica aqui. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} width={500} height={625} style={{ objectFit: "cover" }} alt="" /> : null}
      </div>
    </div>,
    {
      ...tamanhoOg,
      fonts: [
        { name: "DM Serif Display", data: serif, weight: 400, style: "normal" },
        { name: "Outfit", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
