import { negocio } from "@/content/negocio";

const numero = negocio.whatsapp.e164.replace(/\D/g, "");

/** Link do WhatsApp com a mensagem pronta do briefing. */
export const linkWhatsApp = `https://wa.me/${numero}?text=${encodeURIComponent(negocio.whatsapp.mensagemPronta)}`;

/** WhatsApp com mensagem própria (ex.: reserva). */
export const linkWhatsAppCom = (mensagem: string) => `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

export const linkTelefone = `tel:${negocio.whatsapp.e164}`;

export const linkInstagram = negocio.instagram.url;

export const linkIfood = negocio.ifood;

/** Google Maps abrindo a busca pelo nome + endereço (funciona no app e no navegador). */
export const linkComoChegar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${negocio.nome}, ${negocio.endereco.linha}, ${negocio.endereco.bairro}, ${negocio.endereco.cidade} - ${negocio.endereco.uf}`,
)}`;
