import { ImageResponse } from "next/og";
import { MERIDIANS, PARALLELS, meridianEllipse, parallelEllipse } from "@/lib/globe";
import { site } from "@/config/site";

export const dynamic = "force-static";
export const alt = `${site.name}: sites profissionais por ${site.priceLabel}/mês com atualizações`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Globe({ px }: { px: number }) {
  const r = px / 2.24;
  return (
    <svg width={px} height={px} viewBox={`${-px / 2} ${-px / 2} ${px} ${px}`}>
      <g fill="none" stroke="white" strokeWidth={1.6} opacity={0.9}>
        {PARALLELS.map((lat) => {
          const e = parallelEllipse(lat);
          return <ellipse key={lat} cx={0} cy={e.cy * r} rx={e.rx * r} ry={e.ry * r} />;
        })}
        {MERIDIANS.map((lon) => {
          const e = meridianEllipse(lon, 0.25);
          return <ellipse key={lon} cx={0} cy={0} rx={r} ry={e.ry * r} transform={`rotate(${e.rot})`} />;
        })}
        <circle cx={0} cy={0} r={r} />
      </g>
    </svg>
  );
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050506", color: "#f5f5f4", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700 }}>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{site.name}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
              Seu site profissional por R$ 250/mês.
            </div>
            <div style={{ fontSize: 34, marginTop: 24, color: "#a3a3ad" }}>Mudou alguma coisa? A gente atualiza.</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ background: "#25d366", color: "#03170a", fontSize: 28, fontWeight: 700, padding: "14px 28px", borderRadius: 999 }}>
              Quero meu site
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Globe px={440} />
        </div>
      </div>
    ),
    size,
  );
}
