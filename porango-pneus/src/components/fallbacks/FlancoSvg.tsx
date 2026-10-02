import { cn } from "@/lib/cn";

/**
 * Flanco em SVG (sem WebGL / movimento reduzido / antes do 3D carregar):
 * a mesma leitura da medida, com a parte ativa acesa em amarelo.
 */
const PARTES = ["175", "/", "70", " ", "R14", " ", "84", "T"];
const ROTULOS = [0, 2, 4, 6, 7];

export function FlancoSvg({ destaque, className }: { destaque: number | null; className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={cn("h-auto w-full", className)} role="img" aria-label="Flanco do pneu com a medida 175/70 R14 84T">
      <defs>
        <path id="arco-medida" d="M 120 300 A 180 180 0 0 1 480 300" />
        <path id="arco-marca" d="M 75 300 A 225 225 0 0 0 525 300" />
        <radialGradient id="brilho-flanco" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#2a2b30" />
          <stop offset="1" stopColor="#141518" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="292" fill="#101114" />
      <circle cx="300" cy="300" r="280" fill="url(#brilho-flanco)" />
      {/* blocos da banda: um círculo tracejado faz os 72 dentes */}
      <circle cx="300" cy="300" r="287" fill="none" stroke="#0b0b0d" strokeWidth="14" strokeDasharray="7.5 17.5" />
      <circle cx="300" cy="300" r="250" fill="none" stroke="#24252a" strokeWidth="2" />
      <circle cx="300" cy="300" r="132" fill="#0c0d0f" />
      <circle cx="300" cy="300" r="122" fill="none" stroke="#8e9297" strokeWidth="6" />
      {[0, 72, 144, 216, 288].map((a) => (
        <rect key={a} x="288" y="186" width="24" height="76" rx="8" fill="#a9adb2" transform={`rotate(${a} 300 300)`} />
      ))}
      <circle cx="300" cy="300" r="30" fill="#1f2023" stroke="#ffc400" strokeWidth="3" />
      <text fill="#c9c9c3" style={{ font: "700 52px var(--font-chakra), sans-serif" }} letterSpacing="2">
        <textPath href="#arco-medida" startOffset="50%" textAnchor="middle">
          {PARTES.map((p, i) => (
            <tspan
              key={i}
              fill={ROTULOS.indexOf(i) === destaque ? "#ffc400" : undefined}
              style={{ transition: "fill .3s" }}
            >
              {p}
            </tspan>
          ))}
        </textPath>
      </text>
      <text fill="#5e5f64" style={{ font: "700 26px var(--font-chakra), sans-serif" }} letterSpacing="6">
        <textPath href="#arco-marca" startOffset="50%" textAnchor="middle">
          PORANGO PNEUS · RADIAL TUBELESS
        </textPath>
      </text>
    </svg>
  );
}
