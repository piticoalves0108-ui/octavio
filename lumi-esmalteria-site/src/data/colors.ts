/**
 * Cartela de esmaltes: seleção ilustrativa para inspirar (nomes e coleções a confirmar com a Lumi).
 * Cada cor alimenta os swatches, o provador de cores e o frasco 3D. `finish` muda o material: cremoso, perolado, metálico ou glitter.
 */

export type Finish = "cremoso" | "perolado" | "metalico" | "glitter";

export interface Polish {
  id: string;
  name: string;
  hex: string;
  finish: Finish;
  collection: "Nudes" | "Rosas" | "Vermelhos" | "Tendência" | "Brilhos" | "Clássicos";
  mood: string;
}

export const polishes: Polish[] = [
  { id: "nude-lumi", name: "Nude Lumi", hex: "#E3BFAF", finish: "cremoso", collection: "Nudes", mood: "Nude limpo e luminoso, combina com tudo." },
  { id: "areia", name: "Areia", hex: "#D8C1A5", finish: "cremoso", collection: "Nudes", mood: "Bege quente para mãos que pedem discrição." },
  { id: "porcelana", name: "Porcelana", hex: "#F3EEE8", finish: "cremoso", collection: "Clássicos", mood: "Branco leitoso, delicado e atemporal." },
  { id: "rose-seda", name: "Rosé Seda", hex: "#D9A3A0", finish: "perolado", collection: "Rosas", mood: "Rosé com reflexo perolado de seda." },
  { id: "malva", name: "Malva", hex: "#B07A8C", finish: "cremoso", collection: "Rosas", mood: "Rosa acinzentado, elegante no dia a dia." },
  { id: "coral-brisa", name: "Coral Brisa", hex: "#FF6B7A", finish: "cremoso", collection: "Tendência", mood: "Coral vibrante, cheiro de verão." },
  { id: "pessego", name: "Pêssego", hex: "#F4AE93", finish: "cremoso", collection: "Tendência", mood: "Laranja suave que ilumina a pele." },
  { id: "vermelho-classico", name: "Vermelho Clássico", hex: "#B3122E", finish: "cremoso", collection: "Vermelhos", mood: "O vermelho de sempre, impecável." },
  { id: "cereja", name: "Cereja", hex: "#9E1B32", finish: "perolado", collection: "Vermelhos", mood: "Vermelho profundo com brilho de fruta madura." },
  { id: "vinho-noir", name: "Vinho Noir", hex: "#6C1F33", finish: "cremoso", collection: "Vermelhos", mood: "Vinho escuro, sofisticado e noturno." },
  { id: "cafe", name: "Café", hex: "#6B4232", finish: "cremoso", collection: "Tendência", mood: "Marrom chocolate, tendência das passarelas." },
  { id: "salvia", name: "Sálvia", hex: "#9CAF95", finish: "cremoso", collection: "Tendência", mood: "Verde suave e fresco, quase um chá." },
  { id: "lavanda", name: "Lavanda", hex: "#B7A7D6", finish: "perolado", collection: "Tendência", mood: "Lilás nublado com reflexo frio." },
  { id: "ceu", name: "Céu de Brasília", hex: "#9FC3E0", finish: "cremoso", collection: "Tendência", mood: "O azul do céu do cerrado num frasco." },
  { id: "onix", name: "Preto Ônix", hex: "#1A1A1A", finish: "cremoso", collection: "Clássicos", mood: "Preto profundo, gráfico e poderoso." },
  { id: "champagne", name: "Champagne", hex: "#C8A27A", finish: "metalico", collection: "Brilhos", mood: "Metálico dourado-rosé para ocasiões especiais." },
  { id: "cromado-rose", name: "Cromado Rosé", hex: "#E7B8B5", finish: "metalico", collection: "Brilhos", mood: "Efeito espelho, o queridinho das noivas." },
  { id: "glitter-rose", name: "Glitter Rosé", hex: "#E6A6AE", finish: "glitter", collection: "Brilhos", mood: "Brilho fino que pega a luz em cada gesto." },
];

export const polishMap = Object.fromEntries(polishes.map((p) => [p.id, p])) as Record<string, Polish>;
export const getPolish = (id: string) => polishMap[id] ?? polishes[0];

export const finishLabel: Record<Finish, string> = {
  cremoso: "Cremoso",
  perolado: "Perolado",
  metalico: "Metálico",
  glitter: "Glitter",
};

export const collections = ["Nudes", "Rosas", "Vermelhos", "Tendência", "Brilhos", "Clássicos"] as const;

/** Formatos de unha disponíveis no provador de cores */
export const nailShapes = [
  { id: "amendoada", name: "Amendoada" },
  { id: "quadrada", name: "Quadrada" },
  { id: "redonda", name: "Redonda" },
  { id: "stiletto", name: "Stiletto" },
] as const;
export type NailShape = (typeof nailShapes)[number]["id"];
