import { cn } from "@/lib/utils";

/** Logotipo: "Lumi" em itálico com uma gota de esmalte no pingo do i. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("relative font-display text-[2rem] italic leading-none tracking-tight", light ? "text-cream" : "text-wine")}>
        Lumi
        <span aria-hidden className="absolute -right-[0.18em] top-[0.02em] h-[0.2em] w-[0.2em] rounded-full bg-coral" />
      </span>
      <span className={cn("eyebrow text-[0.55rem] tracking-[0.34em]", light ? "text-blush" : "text-muted")}>esmalteria</span>
    </span>
  );
}
