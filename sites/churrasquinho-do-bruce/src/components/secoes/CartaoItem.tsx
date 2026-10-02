import { Marcador, Texto } from "@/components/Pendente";
import { CardTilt } from "@/components/motion/CardTilt";
import { ContadorPreco } from "@/components/motion/ContadorPreco";
import type { ItemCardapio } from "@/content/cardapio";
import { mostrarPendencias } from "@/lib/pendente";
import { cn } from "@/lib/utils";

/** Card de item do cardápio: tilt 3D no hover e preço contando (quando confirmado). */
export function CartaoItem({ item, className, nivelTitulo = "h4" }: { item: ItemCardapio; className?: string; nivelTitulo?: "h3" | "h4" }) {
  const Titulo = nivelTitulo;
  return (
    <CardTilt className={cn("cartao-item h-full rounded-2xl border border-carvao-3 bg-carvao-2/80 p-5 backdrop-blur-sm md:p-6", className)}>
      <div className="flex h-full flex-col gap-2 [transform:translateZ(24px)]">
        <Titulo className="titulo titulo-sm text-osso">
          <Texto valor={item.nome} />
        </Titulo>
        <Texto valor={item.descricao} como="p" className="text-[0.9375rem] leading-snug text-fumaca" />
        <div className="mt-auto pt-2 text-lg font-semibold text-ambar">
          {item.preco !== null ? <ContadorPreco valor={item.preco} /> : mostrarPendencias ? <Marcador texto="{{CONFIRMAR: preço}}" /> : null}
        </div>
      </div>
    </CardTilt>
  );
}
