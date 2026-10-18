import { brand } from "@/data/brand";

/** Link wa.me com mensagem pré-formatada */
export const whatsappLink = (message?: string) =>
  `https://wa.me/${brand.contact.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

export const instagramUrl = `https://www.instagram.com/${brand.contact.instagram}/`;

/** Mensagem padrão para agendar um serviço específico */
export const bookServiceMessage = (serviceName: string, extra?: string) =>
  `Olá, Lumi! Gostaria de agendar: ${serviceName}.${extra ? `\n${extra}` : ""}\nPode me passar os horários disponíveis?`;
