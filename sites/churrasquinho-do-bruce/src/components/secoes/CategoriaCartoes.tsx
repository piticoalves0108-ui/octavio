import { IconeSacola, IconeSeta, IconeWhatsApp } from "@/components/Icones";
import { LinkRastreado } from "@/components/conversao/LinkRastreado";
import type { Categoria } from "@/content/cardapio";
import { linkIfood, linkWhatsAppCom } from "@/lib/links";
import { confirmado, mostrarPendencias } from "@/lib/pendente";
import { cn } from "@/lib/utils";
import { CartaoItem } from "./CartaoItem";

/** Itens que podem aparecer: confirmados sempre; pendentes só em desenvolvimento. */
export function itensVisiveis(categoria: Categoria) {
  return categoria.itens.filter((i) => confirmado(i.nome) || mostrarPendencias);
}

/** Avisa onde ver preço quando algum item ainda está sem preço confirmado. */
export function AvisoPreco({ categoria, className }: { categoria: Categoria; className?: string }) {
  if (categoria.itens.every((i) => i.preco !== null)) return null;
  return (
    <p className={cn("text-sm text-fumaca", className)}>
      Veja os preços no{" "}
      <LinkRastreado href={linkIfood} evento="pedir_ifood" origem={`preco-${categoria.id}`} className="font-semibold text-osso underline underline-offset-4 hover:text-ambar">
        iFood
      </LinkRastreado>{" "}
      ou pergunta no WhatsApp.
    </p>
  );
}

/**
 * Grade de cards de uma categoria. Se nenhum item estiver confirmado (e as
 * pendências estiverem escondidas), mostra um card de chamada para o iFood e
 * o WhatsApp no lugar, sem inventar item nenhum.
 */
export function CategoriaCartoes({ categoria, colunas = "sm:grid-cols-2 xl:grid-cols-3", origem }: { categoria: Categoria; colunas?: string; origem: string }) {
  const itens = itensVisiveis(categoria);

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-carvao-3 p-6 md:p-8">
        <p className="text-lg">Veja as opções de {categoria.titulo.toLowerCase()} e os preços no iFood, ou pergunta direto pro Bruce.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkRastreado href={linkIfood} evento="pedir_ifood" origem={origem} className="botao botao-brasa">
            <IconeSacola className="size-5" /> Ver no iFood
          </LinkRastreado>
          <LinkRastreado
            href={linkWhatsAppCom(`Olá! Vim pelo site. O que tem de ${categoria.titulo.toLowerCase()} hoje?`)}
            evento="pedir_whatsapp"
            origem={origem}
            className="botao botao-linha"
          >
            <IconeWhatsApp className="size-5" /> Perguntar no WhatsApp <IconeSeta className="size-4" />
          </LinkRastreado>
        </div>
      </div>
    );
  }

  return (
    <ul className={cn("grid gap-4 md:gap-5", colunas)}>
      {itens.map((item) => (
        <li key={item.id}>
          <CartaoItem item={item} />
        </li>
      ))}
    </ul>
  );
}
