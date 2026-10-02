import { IconeSacola, IconeWhatsApp } from "@/components/Icones";
import { Magnetico } from "@/components/motion/Magnetico";
import { linkIfood, linkWhatsApp } from "@/lib/links";
import { cn } from "@/lib/utils";
import { LinkRastreado } from "./LinkRastreado";

/** Par de botões "Pedir no WhatsApp" + "Pedir no iFood". */
export function BotoesPedido({ origem, className }: { origem: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Magnetico>
        <LinkRastreado href={linkWhatsApp} evento="pedir_whatsapp" origem={origem} className="botao botao-brasa">
          <IconeWhatsApp className="size-5" />
          Pedir no WhatsApp
        </LinkRastreado>
      </Magnetico>
      <Magnetico>
        <LinkRastreado href={linkIfood} evento="pedir_ifood" origem={origem} className="botao botao-linha">
          <IconeSacola className="size-5" />
          Pedir no iFood
        </LinkRastreado>
      </Magnetico>
    </div>
  );
}
