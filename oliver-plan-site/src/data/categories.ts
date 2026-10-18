import { img } from "./images";

export type CategoryId =
  | "cozinha"
  | "closet"
  | "home-office"
  | "sala"
  | "quarto"
  | "banheiro"
  | "area-gourmet";

export type StyleId = "moderno" | "classico" | "minimalista" | "industrial";
export type MaterialId = "mdf" | "madeira-macica" | "laminado";
export type ToneId = "claro" | "madeira" | "escuro" | "colorido";

export interface Category {
  id: CategoryId;
  name: string;
  plural: string;
  short: string;
  description: string;
  image: string;
  /** Cena do tour 3D usada pelos projetos desta categoria */
  tour: TourPreset;
}

export type TourPreset = "cozinha" | "closet" | "sala" | "showroom";

export const categories: Category[] = [
  {
    id: "cozinha",
    name: "Cozinha",
    plural: "Cozinhas",
    short: "Ilhas, torres quentes e despensas pensadas para quem recebe.",
    description:
      "Cozinhas como centro da casa: ilhas com pedra natural, torres quentes, despensas ocultas e ferragens com amortecimento em cada gaveta.",
    image: img.kitchen[0],
    tour: "cozinha",
  },
  {
    id: "closet",
    name: "Closet",
    plural: "Closets",
    short: "Vidro, iluminação embutida e cada peça no seu lugar.",
    description:
      "Closets que funcionam como uma boutique particular: portas em vidro bronze, gaveteiros com tampo de vidro, sapateiras e LED embutido.",
    image: img.closet[0],
    tour: "closet",
  },
  {
    id: "home-office",
    name: "Home Office",
    plural: "Home Offices",
    short: "Marcenaria que organiza o trabalho e some quando ele acaba.",
    description:
      "Bancadas na altura certa, passa-fios ocultos, estantes e portas de correr para fechar o escritório quando o expediente termina.",
    image: img.office[0],
    tour: "sala",
  },
  {
    id: "sala",
    name: "Sala",
    plural: "Salas",
    short: "Painéis ripados, racks suspensos e estantes que contam histórias.",
    description:
      "Salas de estar e home theaters com painéis ripados, racks suspensos, adegas e estantes que recebem a coleção de cada família.",
    image: img.living[0],
    tour: "sala",
  },
  {
    id: "quarto",
    name: "Quarto",
    plural: "Quartos",
    short: "Cabeceiras estofadas, armários do piso ao teto e silêncio.",
    description:
      "Suítes com cabeceiras estofadas, criados suspensos, armários do piso ao teto e iluminação indireta para desacelerar.",
    image: img.bedroom[0],
    tour: "closet",
  },
  {
    id: "banheiro",
    name: "Banheiro",
    plural: "Banheiros",
    short: "Gabinetes resistentes à umidade e bancadas esculpidas.",
    description:
      "Gabinetes em MDF ultra (resistente à umidade), bancadas esculpidas em pedra e nichos iluminados que transformam o banho em ritual.",
    image: img.bathroom[0],
    tour: "sala",
  },
  {
    id: "area-gourmet",
    name: "Área Gourmet",
    plural: "Áreas Gourmet",
    short: "Churrasqueira, adega e bancada para receber sem pressa.",
    description:
      "Varandas e espaços gourmet com marcenaria para áreas externas, adegas climatizadas e bancadas que acompanham a churrasqueira.",
    image: img.gourmet[0],
    tour: "cozinha",
  },
];

export const styles: { id: StyleId; name: string; description: string }[] = [
  { id: "moderno", name: "Moderno", description: "Linhas retas, contraste de materiais e tecnologia aparente." },
  { id: "classico", name: "Clássico", description: "Molduras, boiseries e proporções atemporais." },
  { id: "minimalista", name: "Minimalista", description: "Superfícies contínuas, sem puxadores, quase silenciosas." },
  { id: "industrial", name: "Industrial", description: "Metal preto, madeira maciça e texturas cruas." },
];

export const materialTypes: { id: MaterialId; name: string }[] = [
  { id: "mdf", name: "MDF" },
  { id: "madeira-macica", name: "Madeira maciça" },
  { id: "laminado", name: "Laminado" },
];

export const tones: { id: ToneId; name: string; swatch: string }[] = [
  { id: "claro", name: "Claros", swatch: "#E9E1D6" },
  { id: "madeira", name: "Madeiras", swatch: "#8B6F47" },
  { id: "escuro", name: "Escuros", swatch: "#2B2B2B" },
  { id: "colorido", name: "Cor", swatch: "#5A6B4F" },
];

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;
export const getStyle = (id: StyleId) => styles.find((s) => s.id === id)!;
export const getMaterialType = (id: MaterialId) => materialTypes.find((m) => m.id === id)!;
