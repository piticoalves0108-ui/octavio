import { mostrarPendencias, oQueFalta, confirmado } from "@/lib/pendente";
import { cn } from "@/lib/utils";

/**
 * Renderiza um texto do conteúdo:
 * - confirmado: o texto normal;
 * - com {{CONFIRMAR: ...}}: um marcador tracejado em desenvolvimento, nada em produção.
 */
export function Texto({ valor, className, como: Tag = "span" }: { valor?: string | null; className?: string; como?: "span" | "p" | "h3" | "div" }) {
  if (confirmado(valor)) return <Tag className={className}>{valor}</Tag>;
  if (!valor || !mostrarPendencias) return null;
  return (
    <Tag className={className}>
      <Marcador texto={valor} />
    </Tag>
  );
}

export function Marcador({ texto, className }: { texto: string; className?: string }) {
  return (
    <mark
      data-confirmar
      title="Informação pendente: confirmar com o dono antes de publicar"
      className={cn(
        "inline rounded-md border border-dashed border-ambar/70 bg-ambar/10 px-1.5 py-0.5 font-texto text-[0.8125rem] font-normal normal-case tracking-normal text-ambar [box-decoration-break:clone]",
        className,
      )}
    >
      {"{{CONFIRMAR: "}
      {oQueFalta(texto)}
      {"}}"}
    </mark>
  );
}
