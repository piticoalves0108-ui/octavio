/**
 * Catálogo de acabamentos. Cada acabamento descreve:
 * - como desenhar a textura (procedural, ver src/lib/textures.ts), usada tanto no CSS quanto no Three.js;
 * - os parâmetros físicos do material 3D (rugosidade, metal, transmissão).
 */

export type FinishKind = "madeira" | "laca" | "pedra" | "vidro" | "metal" | "tecido";

export type TextureSpec =
  | { type: "wood"; base: string; dark: string; light: string; figure?: "straight" | "cathedral"; scale?: number }
  | { type: "stone"; base: string; vein: string; vein2?: string; density?: number }
  | { type: "solid"; base: string; noise?: number }
  | { type: "fluted"; base: string; tint: string }
  | { type: "linen"; base: string; thread: string };

export interface Finish {
  id: string;
  name: string;
  kind: FinishKind;
  collection: string;
  hex: string;
  texture: TextureSpec;
  roughness: number;
  metalness?: number;
  /** 0..1 — vidros */
  transmission?: number;
  opacity?: number;
  description: string;
  usage: string;
  /** Uso interno das cenas 3D (não aparece no catálogo nem no visualizador) */
  internal?: boolean;
}

export const finishes: Finish[] = [
  // ——— Madeiras ———
  {
    id: "nogueira",
    name: "Nogueira Caiena",
    kind: "madeira",
    collection: "Lâminas naturais",
    hex: "#6B4A2F",
    texture: { type: "wood", base: "#6f4c31", dark: "#4a2f1c", light: "#8a6544", figure: "cathedral" },
    roughness: 0.55,
    description: "Lâmina natural de nogueira com veios em catedral, tom chocolate e toque acetinado.",
    usage: "Torres, painéis e frentes de destaque",
  },
  {
    id: "carvalho",
    name: "Carvalho Malva",
    kind: "madeira",
    collection: "Lâminas naturais",
    hex: "#A8835A",
    texture: { type: "wood", base: "#ae8a60", dark: "#8a6740", light: "#c7a57b", figure: "straight" },
    roughness: 0.6,
    description: "Carvalho europeu de veio reto, claro e luminoso, com acabamento fosco natural.",
    usage: "Frentes, prateleiras e tampos",
  },
  {
    id: "freijo",
    name: "Freijó Natural",
    kind: "madeira",
    collection: "Madeira maciça",
    hex: "#9C7A50",
    texture: { type: "wood", base: "#9f7c51", dark: "#7a5a36", light: "#b8956a", figure: "straight", scale: 1.3 },
    roughness: 0.58,
    description: "Madeira maciça brasileira de reflorestamento, veio marcado e tom mel.",
    usage: "Ripados, mesas e peças maciças",
  },
  {
    id: "cumaru",
    name: "Cumaru Tostado",
    kind: "madeira",
    collection: "Madeira maciça",
    hex: "#5E4130",
    texture: { type: "wood", base: "#5e4130", dark: "#3e2a1e", light: "#7a5741", figure: "straight", scale: 0.8 },
    roughness: 0.5,
    description: "Madeira densa e durável, de tom tostado, ideal para bancadas e áreas externas.",
    usage: "Bancadas, áreas gourmet e estantes",
  },
  // ——— Lacas e laminados ———
  {
    id: "areia",
    name: "Off-white Areia",
    kind: "laca",
    collection: "Laca fosca",
    hex: "#E9E1D6",
    texture: { type: "solid", base: "#e7dfd3", noise: 0.03 },
    roughness: 0.72,
    description: "Laca fosca de toque aveludado em off-white quente. Não marca digitais.",
    usage: "Frentes sem puxador e armários superiores",
  },
  {
    id: "grafite",
    name: "Grafite Profundo",
    kind: "laca",
    collection: "Laminado ultra-mate",
    hex: "#2F2E2C",
    texture: { type: "solid", base: "#302f2d", noise: 0.04 },
    roughness: 0.78,
    description: "Laminado ultra-mate com tecnologia anti-digitais e reparo térmico de microrriscos.",
    usage: "Bases, ilhas e home theaters",
  },
  {
    id: "oliva",
    name: "Verde Oliva",
    kind: "laca",
    collection: "Laca fosca",
    hex: "#5A6B4F",
    texture: { type: "solid", base: "#5a6b4f", noise: 0.035 },
    roughness: 0.7,
    description: "Verde terroso e sofisticado, que conversa com madeira, latão e pedra natural.",
    usage: "Frentes, ilhas e marcenaria de destaque",
  },
  {
    id: "terracota",
    name: "Terracota",
    kind: "laca",
    collection: "Laca fosca",
    hex: "#C96E4B",
    texture: { type: "solid", base: "#c26a48", noise: 0.035 },
    roughness: 0.7,
    description: "Tom de argila queimada que aquece ambientes neutros e lavabos.",
    usage: "Nichos, lavabos e peças de acento",
  },
  {
    id: "concreto",
    name: "Cinza Concreto",
    kind: "laca",
    collection: "Laminado texturizado",
    hex: "#B8B0A5",
    texture: { type: "stone", base: "#b5ada2", vein: "#a39b90", vein2: "#c9c2b8", density: 0.2 },
    roughness: 0.85,
    description: "Laminado com textura mineral que reproduz o cimento queimado.",
    usage: "Painéis, bancadas de apoio e home office",
  },
  // ——— Pedras ———
  {
    id: "calacatta",
    name: "Mármore Calacatta",
    kind: "pedra",
    collection: "Pedras naturais",
    hex: "#EDEAE4",
    texture: { type: "stone", base: "#efece6", vein: "#9b9183", vein2: "#c9b79a", density: 0.9 },
    roughness: 0.18,
    description: "Mármore italiano com veios dourados e cinzentos, polido ou levigado.",
    usage: "Bancadas, ilhas em cascata e banheiros",
  },
  {
    id: "travertino",
    name: "Travertino Romano",
    kind: "pedra",
    collection: "Pedras naturais",
    hex: "#D8C7AE",
    texture: { type: "stone", base: "#d9c8ae", vein: "#bea886", vein2: "#e9dcc6", density: 0.55 },
    roughness: 0.55,
    description: "Pedra porosa de tons quentes, levigada, com veios horizontais suaves.",
    usage: "Bancadas, lavabos e tampos",
  },
  {
    id: "nero",
    name: "Quartzo Nero",
    kind: "pedra",
    collection: "Superfícies técnicas",
    hex: "#1F1F1F",
    texture: { type: "stone", base: "#202020", vein: "#3a3a3a", vein2: "#4a4744", density: 0.35 },
    roughness: 0.25,
    description: "Quartzo de alta resistência a manchas e impacto, preto com leve brilho mineral.",
    usage: "Bancadas de cozinha e áreas gourmet",
  },
  // ——— Vidros ———
  {
    id: "bronze",
    name: "Vidro Reflecta Bronze",
    kind: "vidro",
    collection: "Vidros",
    hex: "#8A6A4A",
    texture: { type: "solid", base: "#7d5f43", noise: 0.01 },
    roughness: 0.08,
    metalness: 0.4,
    transmission: 0.35,
    opacity: 0.55,
    description: "Vidro temperado com película bronze que revela o interior com discrição.",
    usage: "Portas de closet, cristaleiras e adegas",
  },
  {
    id: "canelado",
    name: "Vidro Canelado",
    kind: "vidro",
    collection: "Vidros",
    hex: "#CFD3CF",
    texture: { type: "fluted", base: "#c9cfcb", tint: "#eef1ee" },
    roughness: 0.25,
    transmission: 0.6,
    opacity: 0.6,
    description: "Vidro com caneluras verticais que difunde a luz e esconde o conteúdo.",
    usage: "Portas de armários superiores e divisórias",
  },
  // ——— Metais ———
  {
    id: "preto-fosco",
    name: "Preto Fosco",
    kind: "metal",
    collection: "Ferragens e perfis",
    hex: "#1B1B1B",
    texture: { type: "solid", base: "#1d1d1d", noise: 0.02 },
    roughness: 0.45,
    metalness: 0.7,
    description: "Perfis e puxadores em alumínio com pintura eletrostática preta.",
    usage: "Puxadores, perfis e estruturas",
  },
  {
    id: "champagne",
    name: "Champagne Escovado",
    kind: "metal",
    collection: "Ferragens e perfis",
    hex: "#B89B72",
    texture: { type: "solid", base: "#b89b72", noise: 0.03 },
    roughness: 0.35,
    metalness: 0.9,
    description: "Metal escovado com banho champagne, quente e discreto.",
    usage: "Puxadores, cabideiros e perfis de vidro",
  },
  // ——— Piso das cenas 3D (interno) ———
  {
    id: "piso-carvalho",
    name: "Piso Carvalho",
    kind: "madeira",
    collection: "Pisos",
    hex: "#C8A57A",
    texture: { type: "wood", base: "#caa87d", dark: "#b8936a", light: "#d6b78f", figure: "straight", scale: 0.7 },
    roughness: 0.65,
    description: "Piso de madeira usado nas cenas.",
    usage: "Piso",
    internal: true,
  },
  // ——— Tecidos ———
  {
    id: "linho",
    name: "Linho Cru",
    kind: "tecido",
    collection: "Estofados",
    hex: "#D7CDBF",
    texture: { type: "linen", base: "#d6ccbe", thread: "#c3b8a8" },
    roughness: 0.95,
    description: "Linho de trama aberta para cabeceiras e painéis estofados.",
    usage: "Cabeceiras, painéis e bancos",
  },
];

/** Acabamentos do catálogo (sem os internos das cenas) */
export const catalogFinishes = finishes.filter((f) => !f.internal);

export const finishMap = Object.fromEntries(finishes.map((f) => [f.id, f])) as Record<string, Finish>;
export const getFinish = (id: string): Finish => finishMap[id] ?? finishes[0];

/** Grupos exibidos no visualizador de materiais */
export const finishGroups: { id: FinishKind; label: string }[] = [
  { id: "madeira", label: "Madeiras" },
  { id: "laca", label: "Lacas e laminados" },
  { id: "pedra", label: "Pedras" },
  { id: "vidro", label: "Vidros" },
  { id: "metal", label: "Metais" },
];
