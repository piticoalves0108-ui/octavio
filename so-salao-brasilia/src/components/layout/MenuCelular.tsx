"use client";

/** Menu do celular (Dialog no padrão shadcn/ui). Carregado só quando a pessoa abre o menu. */
import { navegacao } from "@/content/textos";
import { linkWhatsappPadrao, negocio, whatsappPrincipal } from "@/content/negocio";
import { classesBotao } from "@/components/ui/botao";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconeInstagram, IconeWhatsapp } from "@/components/ui/icones";
import { LinkRastreado } from "@/components/ui/LinkRastreado";
import { LinkTransicao } from "./Transicao";

type Props = {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  botao: React.RefObject<HTMLButtonElement | null>;
};

export function MenuCelular({ aberto, aoMudar, botao }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          botao.current?.focus();
        }}
        className="inset-0 flex flex-col overflow-y-auto px-6 pt-24 pb-10"
        rotuloFechar="Fechar menu"
      >
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <DialogDescription className="sr-only">Navegação do site e contatos da Só Salão Brasília.</DialogDescription>
        <nav aria-label="Menu do celular">
          <ul className="flex flex-col gap-1">
            {navegacao.map((item, i) => (
              <li
                key={item.href}
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                className="animate-[surge_0.6s_var(--ease-saida)_both]"
              >
                <DialogClose asChild>
                  <LinkTransicao href={item.href} className="block py-3 font-serif text-[2.6rem] leading-none">
                    {item.rotulo}
                  </LinkTransicao>
                </DialogClose>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto space-y-4 pt-10">
          <LinkRastreado
            href={linkWhatsappPadrao}
            evento="whatsapp_clique"
            origem="menu"
            externo
            className={classesBotao("primario", "w-full")}
          >
            <IconeWhatsapp className="size-5" />
            WhatsApp {whatsappPrincipal.exibicao}
          </LinkRastreado>
          <LinkRastreado
            href={negocio.instagram.url}
            evento="instagram_clique"
            origem="menu"
            externo
            className={classesBotao("secundario", "w-full")}
          >
            <IconeInstagram className="size-5" />
            {negocio.instagram.usuario}
          </LinkRastreado>
          <p className="text-sm text-tinta-suave">{negocio.endereco.completo}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
