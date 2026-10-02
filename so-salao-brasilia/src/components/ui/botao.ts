import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "rose" | "claro" | "fantasma";
type Tamanho = "normal" | "compacto";

/**
 * Classes dos botões (para <a>, <button> ou <Link>). Altura mínima de 44–48px (toque).
 * Padding, altura e fonte vêm só do `tamanho` e da variante, para que as classes extras
 * nunca conflitem (o `extra` serve para largura, margem, fundo e afins).
 */
export function classesBotao(variante: Variante = "primario", extra?: string, tamanho: Tamanho = "normal") {
  return cn(
    "group/botao relative inline-flex items-center justify-center gap-2.5 rounded-full",
    "font-medium tracking-[0.01em] whitespace-nowrap",
    "transition-[background-color,color,box-shadow,transform] duration-300 ease-[var(--ease-saida)]",
    "disabled:pointer-events-none disabled:opacity-50",
    tamanho === "normal" ? "min-h-12 py-3 text-[0.95rem]" : "min-h-11 py-2 text-sm",
    variante !== "fantasma" && (tamanho === "normal" ? "px-6" : "px-5"),
    variante === "primario" && "bg-grafite text-gelo hover:bg-[#3a3a40] shadow-[0_10px_30px_-12px_rgba(42,42,46,0.6)]",
    variante === "secundario" && "border border-grafite/25 text-grafite hover:border-grafite hover:bg-grafite/[0.04]",
    variante === "rose" && "bg-rose text-grafite hover:bg-[#efd3cc] shadow-[0_10px_30px_-14px_rgba(232,197,189,0.9)]",
    variante === "claro" && "border border-gelo/30 text-gelo hover:border-gelo hover:bg-gelo/[0.06]",
    variante === "fantasma" &&
      "text-grafite underline decoration-grafite/30 underline-offset-[6px] hover:decoration-grafite",
    extra,
  );
}
