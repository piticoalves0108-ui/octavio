import { cn } from "@/lib/cn";

/**
 * Corte do pneu em SVG (reserva do 3D): as cinco camadas, com a ativa em amarelo.
 * Ordem: banda, cintas, carcaça, flanco, talão.
 */
export function AnatomiaSvg({ ativa, className }: { ativa: number; className?: string }) {
  const cor = (i: number, base: string) => (i === ativa ? "#ffc400" : base);
  return (
    <svg viewBox="0 0 520 520" className={cn("h-auto w-full", className)} role="img" aria-label="Corte do pneu mostrando banda de rodagem, cintas de aço, carcaça, flanco e talão">
      {/* flanco (casca externa) */}
      <path
        d="M150 470 C 92 430, 70 330, 92 230 C 104 170, 150 112, 210 92 L 310 92 C 370 112, 416 170, 428 230 C 450 330, 428 430, 370 470"
        fill="none"
        stroke={cor(3, "#3a3b40")}
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* carcaça */}
      <path
        d="M168 452 C 118 410, 102 330, 118 240 C 128 186, 166 136, 216 120 L 304 120 C 354 136, 392 186, 402 240 C 418 330, 402 410, 352 452"
        fill="none"
        stroke={cor(2, "#5b5d64")}
        strokeWidth="8"
        strokeDasharray="2 5"
      />
      {/* banda de rodagem com sulcos */}
      <path d="M190 58 L 330 58 L 352 92 L 168 92 Z" fill={cor(0, "#2a2b30")} />
      {[214, 244, 276, 306].map((x) => (
        <rect key={x} x={x - 6} y="58" width="12" height="16" fill="#0f1012" />
      ))}
      {/* cintas de aço */}
      <rect x="182" y="98" width="156" height="7" fill={cor(1, "#9ea3a9")} />
      <rect x="190" y="108" width="140" height="5" fill={cor(1, "#7c8086")} />
      {/* talões */}
      <circle cx="160" cy="462" r="14" fill={cor(4, "#c9ccd0")} />
      <circle cx="360" cy="462" r="14" fill={cor(4, "#c9ccd0")} />
      {/* números das camadas */}
      {[
        [260, 40],
        [372, 104],
        [430, 300],
        [64, 300],
        [260, 490],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill={i === ativa ? "#ffc400" : "#1c1d20"} stroke="#3a3b40" />
          <text x={x} y={y + 5} textAnchor="middle" fill={i === ativa ? "#0f1012" : "#f4f4f2"} style={{ font: "700 14px var(--font-chakra), sans-serif" }}>
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
