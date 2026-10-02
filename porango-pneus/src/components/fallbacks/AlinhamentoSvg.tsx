import { cn } from "@/lib/cn";

/** Eixo dianteiro visto de cima (reserva do 3D): antes torto, depois paralelo. */
export function AlinhamentoSvg({ alinhado, className }: { alinhado: boolean; className?: string }) {
  const toeE = alinhado ? 0 : -8;
  const toeD = alinhado ? 0 : -3;
  const laser = alinhado ? "#ffc400" : "#e10600";
  return (
    <svg viewBox="0 0 520 520" className={cn("h-auto w-full", className)} role="img" aria-label={alinhado ? "Rodas alinhadas, paralelas ao eixo do carro" : "Rodas desalinhadas, apontando para lados diferentes"}>
      <line x1="260" y1="40" x2="260" y2="480" stroke="#f4f4f2" strokeOpacity="0.25" strokeDasharray="10 12" />
      <rect x="150" y="372" width="220" height="10" rx="5" fill="#2a2b2f" />
      {[
        [140, toeE],
        [380, toeD],
      ].map(([x, ang]) => (
        <g key={x}>
          <line x1={x} y1="60" x2={x} y2="377" stroke="#f4f4f2" strokeOpacity="0.2" />
          <rect x={x - 62} y="44" width="124" height="26" rx="3" fill="#1c1d20" stroke="#3a3b40" />
          <line x1={x} y1="46" x2={x} y2="68" stroke="#f4f4f2" />
          <g
            style={{
              transform: `rotate(${ang}deg)`,
              transformOrigin: `${x}px 377px`,
              transformBox: "view-box",
              transition: "transform .8s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <line x1={x} y1="377" x2={x} y2="62" stroke={laser} strokeWidth="3" />
            <circle cx={x} cy="62" r="6" fill={laser} />
            <rect x={x - 26} y="317" width="52" height="120" rx="14" fill="#1a1b1e" stroke="#3a3b40" strokeWidth="2" />
            <line x1={x} y1="320" x2={x} y2="434" stroke="#0f1012" strokeWidth="52" strokeDasharray="4 8" />
          </g>
        </g>
      ))}
    </svg>
  );
}
