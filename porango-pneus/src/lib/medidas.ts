/** Opções do seletor de medida (pneus de passeio e utilitários leves mais comuns). */
export const larguras = ["145", "155", "165", "175", "185", "195", "205", "215", "225", "235", "245", "255", "265", "275"];
export const perfis = ["35", "40", "45", "50", "55", "60", "65", "70", "75", "80"];
export const aros = ["13", "14", "15", "16", "17", "18", "19", "20"];
export const quantidades = [1, 2, 4] as const;

export function formatarMedida(largura: string, perfil: string, aro: string) {
  return `${largura}/${perfil} R${aro}`;
}

/** Índice de carga: kg por pneu (tabela padrão ETRTO/ALAPA). */
export const indicesCarga: [number, number][] = [
  [75, 387], [76, 400], [77, 412], [78, 425], [79, 437], [80, 450], [81, 462], [82, 475],
  [83, 487], [84, 500], [85, 515], [86, 530], [87, 545], [88, 560], [89, 580], [90, 600],
  [91, 615], [92, 630], [93, 650], [94, 670], [95, 690], [96, 710], [97, 730], [98, 750],
  [99, 775], [100, 800], [101, 825], [102, 850], [103, 875], [104, 900], [105, 925],
  [106, 950], [107, 975], [108, 1000], [109, 1030], [110, 1060],
];

/** Índice de velocidade: km/h máximos. */
export const indicesVelocidade: [string, number][] = [
  ["L", 120], ["M", 130], ["N", 140], ["P", 150], ["Q", 160], ["R", 170], ["S", 180],
  ["T", 190], ["U", 200], ["H", 210], ["V", 240], ["W", 270], ["Y", 300],
];
