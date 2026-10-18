import { brand } from "@/data/brand";

export const whatsappLink = (message?: string) =>
  `https://wa.me/${brand.contact.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

export const mailtoLink = (subject: string, body: string) =>
  `mailto:${brand.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const instagramUrl = `https://www.instagram.com/${brand.contact.instagram}/`;
