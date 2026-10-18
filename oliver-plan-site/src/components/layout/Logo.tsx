import { brand } from "@/data/brand";
import { cn } from "@/lib/utils";

/** Símbolo: a quina de uma planta baixa dentro de um módulo. Logotipo tipográfico ao lado. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 24V8h16" stroke="currentColor" strokeWidth="1.2" />
      <path d="M13 24V13h11" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
      <circle cx="24" cy="24" r="2" fill="#8B6F47" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] font-light tracking-[-0.02em]">
          {brand.wordmark[0]} <span className="serif-accent">{brand.wordmark[1]}</span>
        </span>
        {!compact && <span className="eyebrow mt-1 text-[0.55rem] tracking-[0.3em] opacity-60">{brand.descriptor}</span>}
      </span>
    </span>
  );
}
