import { cn } from "@/lib/utils";

/** Rótulo de seção no estilo de prancha técnica: "01 — Ambientes" */
export function SectionLabel({ index, children, className, light }: { index?: string; children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4", light ? "text-blush" : "text-muted", className)}>
      {index && <span className="font-display text-sm italic">{index}</span>}
      <span className={cn("h-px w-10", light ? "bg-blush/50" : "bg-wine/30")} />
      <span className="eyebrow">{children}</span>
    </div>
  );
}
