import type { Project } from "@/data/projects";
import { formatNumber } from "@/lib/utils";

/**
 * Desenho técnico (elevação frontal) gerado a partir das medidas do projeto:
 * módulos, folgas, rodapé e cotas, como numa prancha executiva.
 */
export function Elevation({ project }: { project: Project }) {
  const { width, height, modules } = project.elevation;
  const pad = 420;
  const vbW = width + pad * 2;
  const vbH = height + pad * 2;
  const plinth = 100;
  let x = 0;

  return (
    <figure className="bg-paper p-4 sm:p-8">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-auto w-full text-graphite" role="img" aria-label={`Elevação técnica: ${formatNumber(width)} por ${formatNumber(height)} milímetros, ${modules.length} módulos`}>
        <defs>
          <pattern id="hatch" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="60" stroke="currentColor" strokeWidth="6" opacity="0.18" />
          </pattern>
        </defs>
        <g transform={`translate(${pad} ${pad})`} fill="none" stroke="currentColor" strokeWidth="8">
          {/* Piso */}
          <line x1={-200} y1={height} x2={width + 200} y2={height} strokeWidth="10" />
          <rect x={-200} y={height} width={width + 400} height={60} fill="url(#hatch)" stroke="none" />
          {/* Contorno */}
          <rect x={0} y={0} width={width} height={height} />
          <rect x={0} y={height - plinth} width={width} height={plinth} fill="currentColor" opacity="0.12" stroke="none" />
          {/* Módulos */}
          {modules.map((w, i) => {
            const mx = x;
            x += w;
            const doors = w > 700 ? 2 : 1;
            return (
              <g key={i}>
                {i > 0 && <line x1={mx} y1={0} x2={mx} y2={height} />}
                {Array.from({ length: doors }, (_, d) => {
                  const dx = mx + (w / doors) * d;
                  const dw = w / doors;
                  return <rect key={d} x={dx + 12} y={20} width={dw - 24} height={height - plinth - 40} strokeWidth="4" opacity="0.6" />;
                })}
                {/* Indicação de abertura (traço técnico) */}
                <polyline points={`${mx + 20},${20} ${mx + w - 20},${(height - plinth) / 2} ${mx + 20},${height - plinth - 20}`} strokeWidth="3" strokeDasharray="30 22" opacity="0.35" />
                {/* Cota do módulo */}
                <g opacity="0.75">
                  <line x1={mx} y1={height + 170} x2={mx + w} y2={height + 170} strokeWidth="4" />
                  <line x1={mx} y1={height + 130} x2={mx} y2={height + 210} strokeWidth="4" />
                  <line x1={mx + w} y1={height + 130} x2={mx + w} y2={height + 210} strokeWidth="4" />
                  <text x={mx + w / 2} y={height + 290} textAnchor="middle" fill="currentColor" stroke="none" fontSize="78" fontFamily="var(--font-manrope)">
                    {formatNumber(w)}
                  </text>
                </g>
              </g>
            );
          })}
          {/* Cota total horizontal */}
          <line x1={0} y1={-170} x2={width} y2={-170} strokeWidth="5" />
          <line x1={0} y1={-220} x2={0} y2={-120} strokeWidth="5" />
          <line x1={width} y1={-220} x2={width} y2={-120} strokeWidth="5" />
          <text x={width / 2} y={-220} textAnchor="middle" fill="currentColor" stroke="none" fontSize="96" fontFamily="var(--font-manrope)" letterSpacing="6">
            {formatNumber(width)} MM
          </text>
          {/* Cota total vertical */}
          <line x1={width + 170} y1={0} x2={width + 170} y2={height} strokeWidth="5" />
          <line x1={width + 120} y1={0} x2={width + 220} y2={0} strokeWidth="5" />
          <line x1={width + 120} y1={height} x2={width + 220} y2={height} strokeWidth="5" />
          <text x={width + 270} y={height / 2} fill="currentColor" stroke="none" fontSize="96" fontFamily="var(--font-manrope)" letterSpacing="6" transform={`rotate(90 ${width + 270} ${height / 2})`} textAnchor="middle">
            {formatNumber(height)} MM
          </text>
        </g>
      </svg>
      <figcaption className="mt-4 flex justify-between border-t border-graphite/10 pt-4 text-[0.65rem] tracking-[0.18em] text-stone">
        <span>ELEVAÇÃO FRONTAL · {project.name.toUpperCase()}</span>
        <span>MEDIDAS EM MM</span>
      </figcaption>
    </figure>
  );
}
