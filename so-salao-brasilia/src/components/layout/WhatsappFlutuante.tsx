import { linkWhatsappPadrao } from "@/content/negocio";
import { IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { Magnetico } from "@/components/ui/Magnetico";

/** Botão flutuante de WhatsApp com a mensagem pronta do briefing. */
export function WhatsappFlutuante() {
  return (
    <div className="fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6">
      <Magnetico forca={0.22}>
        <LinkRastreado
          href={linkWhatsappPadrao}
          evento="whatsapp_clique"
          origem="flutuante"
          externo
          aria-label="Pedir orçamento pelo WhatsApp"
          className="group flex h-14 items-center gap-3 rounded-full bg-grafite pr-2 pl-2 text-gelo shadow-[0_18px_40px_-14px_rgba(42,42,46,0.7)] transition-[padding] duration-500 ease-[var(--ease-saida)] md:pr-6"
        >
          <span className="grid size-10 place-items-center rounded-full bg-[#25D366] text-white">
            <IconeWhatsapp className="size-6" />
          </span>
          <span className="hidden text-[0.95rem] font-medium md:inline">Orçamento no WhatsApp</span>
        </LinkRastreado>
      </Magnetico>
    </div>
  );
}
