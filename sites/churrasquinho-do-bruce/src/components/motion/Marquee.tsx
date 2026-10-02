import { IconeChama } from "@/components/Icones";

const ITENS = ["Churrasquinho", "Hambúrguer", "Almoço", "Delivery"];

/** Faixa infinita (CSS puro). Pausa no hover; parada com movimento reduzido. */
export function Marquee() {
  const sequencia = (
    <div className="flex shrink-0 items-center">
      {[0, 1, 2].map((r) =>
        ITENS.map((item) => (
          <span key={`${r}-${item}`} className="flex items-center">
            <span className="titulo px-5 text-[clamp(2.4rem,6vw,5rem)] leading-none md:px-8">{item}</span>
            <IconeChama className="h-[0.9em] w-auto text-[clamp(1.6rem,3.6vw,3rem)] text-carvao/80" />
          </span>
        )),
      )}
    </div>
  );

  return (
    <div className="relative z-[2] -my-3 overflow-hidden bg-brasa py-3 text-carvao shadow-[0_0_80px_rgba(255,90,31,0.35)] md:-my-5 md:-rotate-[1.4deg] md:py-4">
      <p className="sr-only">Churrasquinho, hambúrguer, almoço e delivery.</p>
      <div aria-hidden className="marquee-faixa flex w-max animate-marquee hover:[animation-play-state:paused]">
        {sequencia}
        {sequencia}
      </div>
    </div>
  );
}
