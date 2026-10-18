/**
 * Saque no mundo: conteúdo FIXO dos baús (âncoras com tag 'bau' em data/places.ts e alguns
 * extras em ilhas), ervas colhíveis da Floresta de Lúmen e regras dos itens soltos no chão
 * (pickups de inimigos derrotados). Implementação em rpg/loot/*.
 */

export interface LootEntry {
  itemId: string;
  qty: number;
}

export interface ChestDef {
  /** Id único (vai para inventory.collectedUniques ao abrir). Igual ao id da âncora quando há uma. */
  id: string;
  /** Âncora em data/places.ts. */
  anchor: string;
  /** Deslocamento (m) relativo à âncora (x, z) e altura extra. */
  offset?: [number, number, number];
  /** Rotação (yaw) — se ausente, usa o yaw da âncora (frente do baú). */
  yaw?: number;
  /** Nome no prompt ("Abrir Baú da cripta"). */
  label: string;
  contents: LootEntry[];
  gold: number;
  /** Visual: 'wood' (madeira e ferro) ou 'arcane' (pedra rúnica de Aeternum/Elyra). */
  style: 'wood' | 'arcane';
  /** Dica de acesso (só documentação/teste). */
  access?: 'chão' | 'escalada' | 'voo';
}

export const CHESTS: ChestDef[] = [
  {
    id: 'bau_cripta',
    anchor: 'bau_cripta',
    label: 'Baú da cripta',
    style: 'arcane',
    access: 'chão',
    contents: [
      { itemId: 'pocao_vida_menor', qty: 2 },
      { itemId: 'fragmento_eter', qty: 2 },
      { itemId: 'talisma_viajante', qty: 1 },
    ],
    gold: 30,
  },
  {
    id: 'bau_ruinas_1',
    anchor: 'bau_ruinas_1',
    label: 'Baú sob a coluna caída',
    style: 'arcane',
    access: 'chão',
    contents: [
      { itemId: 'cristal_arcano', qty: 1 },
      { itemId: 'engrenagem_antiga', qty: 3 },
      { itemId: 'pocao_vida', qty: 1 },
    ],
    gold: 60,
  },
  {
    id: 'bau_ruinas_2',
    anchor: 'bau_ruinas_2',
    label: 'Baú no salão desabado',
    style: 'arcane',
    access: 'chão',
    contents: [
      { itemId: 'lanca_cristal', qty: 1 },
      { itemId: 'fragmento_eter', qty: 2 },
    ],
    gold: 80,
  },
  {
    id: 'bau_ruinas_3',
    anchor: 'bau_ruinas_3',
    label: 'Baú no alto do muro',
    style: 'arcane',
    access: 'escalada',
    contents: [
      { itemId: 'anel_runico', qty: 1 },
      { itemId: 'pocao_vida_maior', qty: 1 },
    ],
    gold: 120,
  },
  {
    id: 'bau_corvos',
    anchor: 'bau_corvos',
    label: 'Caixa de cristais roubados',
    style: 'wood',
    access: 'chão',
    contents: [
      { itemId: 'cristal_arcano', qty: 2 },
      { itemId: 'fragmento_eter', qty: 3 },
      { itemId: 'pocao_vida', qty: 2 },
      { itemId: 'gibao_couro', qty: 1 },
    ],
    gold: 90,
  },
  {
    // Só alcançável voando até a sacada da Torre do Observador.
    id: 'torre_bau_sacada',
    anchor: 'torre_bau_sacada',
    label: 'Baú da sacada do Observador',
    style: 'wood',
    access: 'voo',
    contents: [
      { itemId: 'espada_raios', qty: 1 },
      { itemId: 'fragmento_eter', qty: 2 },
    ],
    gold: 100,
  },
  {
    id: 'laboratorio_bau',
    anchor: 'laboratorio_bau',
    label: 'Armário do laboratório',
    style: 'arcane',
    access: 'chão',
    contents: [
      { itemId: 'cajado_dragao', qty: 1 },
      { itemId: 'nucleo_automato', qty: 1 },
      { itemId: 'vestes_runicas', qty: 1 },
    ],
    gold: 150,
  },
  {
    // Ilhas Suspensas de Elyra (voo).
    id: 'bau_tempestade',
    anchor: 'bau_tempestade',
    label: 'Baú da tempestade',
    style: 'arcane',
    access: 'voo',
    contents: [
      { itemId: 'orbe_eclipse', qty: 1 },
      { itemId: 'fragmento_eter', qty: 4 },
    ],
    gold: 200,
  },
  {
    // Farol Celeste (ilha a leste): do lado oposto ao fragmento de memória.
    id: 'bau_farol_celeste',
    anchor: 'farol_celeste_topo',
    offset: [-4.2, 0, 0],
    yaw: Math.PI / 2,
    label: 'Baú do Farol Celeste',
    style: 'arcane',
    access: 'voo',
    contents: [
      { itemId: 'espada_solar', qty: 1 },
      { itemId: 'pocao_vida_maior', qty: 1 },
    ],
    gold: 160,
  },
  {
    id: 'bau_elyra_manto',
    anchor: 'elyra_2_topo',
    offset: [2.5, 0, -2],
    yaw: 0.4,
    label: 'Baú esquecido de Elyra',
    style: 'arcane',
    access: 'voo',
    contents: [
      { itemId: 'manto_guardiao_tempo', qty: 1 },
      { itemId: 'elixir_furia', qty: 2 },
    ],
    gold: 90,
  },
];

export const CHEST_BY_ID: Record<string, ChestDef> = Object.fromEntries(CHESTS.map((c) => [c.id, c]));

/** Parâmetros visuais/de interação dos baús. */
export const CHEST_RULES = {
  interactRange: 2.6,
  /** Duração da animação de abrir (s). */
  openDuration: 0.7,
  /** Ângulo final da tampa (rad). */
  openAngle: 1.9,
  /** Além desta distância (m) o modelo é ocultado. */
  visibleDistance: 180,
};

// ---------------------------------------------------------------------------
// Ervas colhíveis (Floresta de Lúmen)
// ---------------------------------------------------------------------------

export interface HerbSpot {
  id: string;
  x: number;
  z: number;
}

/** Grupos de ervas: centro (x,z), raio e quantidade. Posições geradas de forma determinística. */
const HERB_GROUPS: { prefix: string; x: number; z: number; r: number; n: number; seed: number }[] = [
  { prefix: 'clareira', x: -36, z: 150, r: 20, n: 6, seed: 11 },
  { prefix: 'bosque_oeste', x: -95, z: 215, r: 26, n: 4, seed: 23 },
  { prefix: 'bosque_leste', x: 45, z: 125, r: 26, n: 3, seed: 37 },
  { prefix: 'bosque_sul', x: -15, z: 255, r: 22, n: 3, seed: 41 },
];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const HERB_SPOTS: HerbSpot[] = HERB_GROUPS.flatMap((g) => {
  const rnd = lcg(g.seed);
  const out: HerbSpot[] = [];
  for (let i = 0; i < g.n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = g.r * (0.3 + 0.7 * Math.sqrt(rnd()));
    out.push({ id: `erva_${g.prefix}_${i + 1}`, x: Math.round((g.x + Math.cos(a) * d) * 10) / 10, z: Math.round((g.z + Math.sin(a) * d) * 10) / 10 });
  }
  return out;
});

export const HERB_RULES = {
  itemId: 'erva_lumen',
  /** Quantidade colhida [mín, máx]. */
  qty: [1, 2] as [number, number],
  interactRange: 2.2,
  /** Dias de jogo até renascer (1 = no dia seguinte). */
  regrowDays: 1,
  visibleDistance: 120,
};

// ---------------------------------------------------------------------------
// Itens soltos no chão (saque de inimigos)
// ---------------------------------------------------------------------------

export const PICKUP_RULES = {
  /** Máximo de itens soltos ao mesmo tempo (os mais antigos comuns somem primeiro). */
  maxActive: 40,
  /** Raio em que o item é puxado até o jogador. */
  magnetRadius: 3.2,
  /** Velocidade do "ímã" (m/s). */
  magnetSpeed: 9,
  /** Distância de coleta automática. */
  collectRadius: 0.9,
  /** Tempo depois de cair antes de poder ser puxado (s). */
  settleTime: 0.6,
  /** Interação manual [E]. */
  interactRange: 2.4,
  /** Itens comuns/incomuns e ouro somem depois disto (s). Raros ou melhores ficam (e são salvos). */
  despawnSeconds: 300,
  /** Espalhamento dos itens em volta do ponto de morte (m). */
  scatter: 1.3,
  /** Distância máxima (m) do jogador para que a morte de um inimigo sem matador conhecido conte para ele. */
  shareRadius: 60,
  /** Altura de flutuação (m). */
  hover: 0.45,
};

/** Rolagem de quantidade/ chance (pura). `rnd` em [0, 1). */
export function rollQty(qty: [number, number] | undefined, rnd: () => number): number {
  if (!qty) return 1;
  const lo = Math.max(0, Math.floor(Math.min(qty[0], qty[1])));
  const hi = Math.max(lo, Math.floor(Math.max(qty[0], qty[1])));
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

/** Rola uma tabela de drops (contrato C1) e devolve [itemId, qtd] para cada sucesso. */
export function rollDrops(drops: readonly { itemId: string; chance: number; qty?: [number, number] }[], rnd: () => number): LootEntry[] {
  const out: LootEntry[] = [];
  for (const d of drops) {
    if (!(d.chance > 0)) continue;
    if (rnd() >= d.chance) continue;
    const q = rollQty(d.qty, rnd);
    if (q > 0) out.push({ itemId: d.itemId, qty: q });
  }
  return out;
}

/** Rola o ouro [mín, máx]. */
export function rollGold(gold: readonly [number, number] | undefined, rnd: () => number): number {
  if (!gold) return 0;
  return rollQty([gold[0], gold[1]], rnd);
}
