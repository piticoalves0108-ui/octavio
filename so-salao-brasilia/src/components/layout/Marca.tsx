import { cn } from "@/lib/cn";

/** Logotipo tipográfico: "Só Salão" em DM Serif + "Brasília" espaçado em Outfit. */
export function Marca({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 leading-none whitespace-nowrap",
        claro ? "text-gelo" : "text-grafite",
        className,
      )}
    >
      <span className="font-serif text-[1.6rem] tracking-[-0.01em]">Só Salão</span>
      <span
        className={cn(
          "sobretitulo text-[0.62rem] tracking-[0.32em]",
          claro ? "text-champanhe" : "text-champanhe-texto",
        )}
      >
        Brasília
      </span>
    </span>
  );
}
