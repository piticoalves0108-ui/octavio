/**
 * Mapa estilizado (ilustrativo, sem dados de terceiros): quadras em asfalto e a
 * faixa amarela levando até o pino da loja. Não representa ruas reais; o caminho
 * de verdade abre no Google Maps pelo botão "Como chegar".
 * O desenho é um arquivo em /public (carrega só quando chega perto da tela) e os
 * rótulos ficam em HTML, com a fonte do site.
 */
export function MapaSvg() {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/mapa-ilustrativo.svg"
        alt="Mapa ilustrativo com o caminho até a loja"
        width={600}
        height={540}
        loading="lazy"
        decoding="async"
        className="h-auto w-full"
      />
      <span
        aria-hidden="true"
        className="absolute top-[45%] left-[63%] font-display text-[clamp(0.7rem,1.6vw,1.1rem)] font-bold tracking-[0.12em] uppercase"
      >
        Porango Pneus
      </span>
      <span className="absolute bottom-3 left-4 text-xs text-cinza">Mapa ilustrativo</span>
    </div>
  );
}
