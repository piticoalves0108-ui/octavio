import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const tamanhoOg = { width: 1200, height: 630 };

/** Imagem de Open Graph no padrão visual do site (gerada no build). */
export async function gerarOg(titulo: string, subtitulo: string) {
  const pasta = join(process.cwd(), "src/app/_fontes");
  const [chakra, redHat] = await Promise.all([
    readFile(join(pasta, "ChakraPetch-Bold.ttf")),
    readFile(join(pasta, "RedHatText-Medium.ttf")),
  ]);

  const blocos = Array.from({ length: 48 }, (_, i) => i * 7.5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0f1012",
          color: "#f4f4f2",
          position: "relative",
          fontFamily: "Red Hat Text",
        }}
      >
        <svg width="760" height="760" viewBox="0 0 200 200" style={{ position: "absolute", right: -170, top: -65 }}>
          <circle cx="100" cy="100" r="92" fill="#1c1d20" />
          {blocos.map((a) => (
            <rect key={a} x="97" y="6" width="6" height="10" fill="#2c2d31" transform={`rotate(${a} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="58" fill="#0f1012" stroke="#3a3b40" strokeWidth="2" />
          <circle cx="100" cy="100" r="52" fill="none" stroke="#9aa0a6" strokeWidth="3" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x="94" y="52" width="12" height="36" rx="4" fill="#7d8389" transform={`rotate(${a} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="13" fill="#25262a" stroke="#ffc400" strokeWidth="2.5" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%" }}>
          <div style={{ display: "flex", fontFamily: "Chakra Petch", fontSize: 26, letterSpacing: 5, color: "#a2a29d" }}>
            PORANGO&nbsp;<span style={{ color: "#ffc400" }}>PNEUS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div
              style={{
                fontFamily: "Chakra Petch",
                fontSize: 92,
                lineHeight: 0.92,
                textTransform: "uppercase",
                letterSpacing: -1,
              }}
            >
              {titulo}
            </div>
            <div style={{ marginTop: 28, fontSize: 30, color: "#a2a29d", maxWidth: 620 }}>{subtitulo}</div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 34, height: 8, background: "#ffc400" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...tamanhoOg,
      fonts: [
        { name: "Chakra Petch", data: chakra, weight: 700, style: "normal" },
        { name: "Red Hat Text", data: redHat, weight: 500, style: "normal" },
      ],
    },
  );
}
