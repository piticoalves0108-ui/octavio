import { IconePneu } from "@/components/ui/Icones";

/**
 * Marca provisória em tipografia, até chegar o logo oficial.
 * {{CONFIRMAR: grafia exata do nome e logo}} Troque por <Image src="/images/logo.svg" .../>.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <IconePneu className="h-7 w-7 text-sinal" />
      <span className="font-display text-[1.05rem] leading-none font-bold tracking-[0.12em] uppercase">
        Porango<span className="text-sinal"> Pneus</span>
      </span>
    </span>
  );
}
