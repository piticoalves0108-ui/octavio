/**
 * Galeria. As peças de nail art são desenhadas em SVG pelo componente <NailArt />
 * (sempre carregam e trocam de cor). Fotos do Unsplash entram em spa e ambiente.
 * Troque pelas fotos reais da Lumi antes de publicar.
 */
import type { NailShape } from "./colors";

export type GalleryCategory = "unhas" | "nail-art" | "spa" | "alongamento";

export type NailDesign = "solid" | "french" | "micro-french" | "ombre" | "chrome" | "marble" | "dots" | "line" | "floral" | "glitter-tip" | "half-moon" | "abstract";

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  /** Peça desenhada (nail art em SVG) */
  art?: { design: NailDesign; shape: NailShape; colors: string[]; length?: "curta" | "media" | "longa" };
  /** Foto (spa, ambiente) */
  photo?: string;
  caption: string;
}

export const galleryCategories: { id: GalleryCategory; label: string }[] = [
  { id: "unhas", label: "Unhas" },
  { id: "nail-art", label: "Nail art" },
  { id: "spa", label: "Spa dos pés" },
  { id: "alongamento", label: "Alongamento" },
];

const u = (id: string) => `https://images.unsplash.com/${id}`;

export const gallery: GalleryItem[] = [
  { id: "g1", title: "Nude Lumi", category: "unhas", art: { design: "solid", shape: "amendoada", colors: ["#E3BFAF"], length: "media" }, caption: "Esmaltação em gel no nude da casa." },
  { id: "g2", title: "Francesinha fina", category: "nail-art", art: { design: "micro-french", shape: "amendoada", colors: ["#F3E6E0", "#1A1A1A"], length: "media" }, caption: "Micro francesinha preta sobre base leitosa." },
  { id: "g3", title: "Cromado rosé", category: "nail-art", art: { design: "chrome", shape: "stiletto", colors: ["#E7B8B5", "#FFFFFF"], length: "longa" }, caption: "Efeito espelho em alongamento stiletto." },
  { id: "g4", title: "Vermelho clássico", category: "unhas", art: { design: "solid", shape: "redonda", colors: ["#B3122E"], length: "curta" }, caption: "Curtinhas, redondas e impecáveis." },
  { id: "g5", title: "Mármore", category: "nail-art", art: { design: "marble", shape: "quadrada", colors: ["#F4F0EC", "#8C7F79"], length: "media" }, caption: "Mármore branco com veios pintados à mão." },
  { id: "g6", title: "Ombré pêssego", category: "alongamento", art: { design: "ombre", shape: "amendoada", colors: ["#F6D7CB", "#F4AE93"], length: "longa" }, caption: "Alongamento em gel com degradê suave." },
  { id: "g7", title: "Spa dos pés", category: "spa", photo: u("photo-1544161515-4ab6ce6db874"), caption: "Ritual de pausa com escalda-pés aromático." },
  { id: "g8", title: "Pontos dourados", category: "nail-art", art: { design: "dots", shape: "redonda", colors: ["#E3BFAF", "#C8A27A"], length: "curta" }, caption: "Minimalismo com pontos em dourado." },
  { id: "g9", title: "Vinho noir", category: "unhas", art: { design: "solid", shape: "quadrada", colors: ["#6C1F33"], length: "media" }, caption: "Vinho escuro, acabamento espelhado." },
  { id: "g10", title: "Meia-lua", category: "nail-art", art: { design: "half-moon", shape: "amendoada", colors: ["#D9A3A0", "#F3EEE8"], length: "media" }, caption: "Meia-lua invertida em rosé e porcelana." },
  { id: "g11", title: "Stiletto vinho", category: "alongamento", art: { design: "solid", shape: "stiletto", colors: ["#8B2942"], length: "longa" }, caption: "Fibra de vidro com acabamento vinho." },
  { id: "g12", title: "Floral delicado", category: "nail-art", art: { design: "floral", shape: "amendoada", colors: ["#F6E9E4", "#FF6B7A", "#9CAF95"], length: "media" }, caption: "Florzinhas pintadas à mão sobre nude." },
  { id: "g13", title: "Hidratação profunda", category: "spa", photo: u("photo-1570172619644-dfd03ed5d881"), caption: "Máscara nutritiva e toalha morna." },
  { id: "g14", title: "Linhas finas", category: "nail-art", art: { design: "line", shape: "quadrada", colors: ["#F3EEE8", "#1A1A1A"], length: "media" }, caption: "Traços gráficos em preto ônix." },
  { id: "g15", title: "Glitter na ponta", category: "alongamento", art: { design: "glitter-tip", shape: "amendoada", colors: ["#F3E6E0", "#E6A6AE"], length: "longa" }, caption: "Base leitosa com glitter rosé nas pontas." },
  { id: "g16", title: "Sálvia", category: "unhas", art: { design: "solid", shape: "amendoada", colors: ["#9CAF95"], length: "curta" }, caption: "Verde sálvia, a cor da estação." },
  { id: "g17", title: "Abstrato", category: "nail-art", art: { design: "abstract", shape: "redonda", colors: ["#F4AE93", "#8B2942", "#E8D5CE"], length: "media" }, caption: "Manchas orgânicas em tons terrosos." },
  { id: "g18", title: "Ritual de massagem", category: "spa", photo: u("photo-1540555700478-4be289fbecef"), caption: "Massagem relaxante no fim do spa." },
  { id: "g19", title: "Francesinha colorida", category: "alongamento", art: { design: "french", shape: "quadrada", colors: ["#F3E6E0", "#FF6B7A"], length: "longa" }, caption: "Francesa em coral sobre alongamento quadrado." },
  { id: "g20", title: "Lavanda perolada", category: "unhas", art: { design: "solid", shape: "redonda", colors: ["#B7A7D6"], length: "curta" }, caption: "Lilás perolado de efeito nublado." },
];
