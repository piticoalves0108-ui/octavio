/**
 * Lojas: estoque (renovado a cada dia de jogo), preços de compra/venda, categorias que cada
 * comerciante aceita e o aprimoramento de armas do ferreiro (ouro + materiais).
 * API em rpg/Inventory.ts (openShop, buy, sell, upgradeWeapon, upgradeCost).
 */
import type { ItemCategory } from './items';
import type { Rarity } from './weapons';
import { WEAPON_UPGRADE } from './weapons';

export interface ShopStockEntry {
  itemId: string;
  /** Quantidade em estoque a cada renovação. */
  qty: number;
  /** Só aparece a partir deste nível do jogador. */
  minLevel?: number;
}

export interface ShopDef {
  id: string;
  name: string;
  /** Nome do comerciante. */
  keeper: string;
  kind: 'merchant' | 'smith' | 'tavern';
  /** Fala curta exibida no topo da loja. */
  greeting: string;
  /** Multiplicador do preço de compra sobre o valor do item. */
  buyMul: number;
  /** Multiplicador do preço que o comerciante paga (venda do jogador). */
  sellMul: number;
  /** Categorias que o comerciante compra do jogador. */
  buys: ItemCategory[];
  stock: ShopStockEntry[];
  /** Aprimora armas (ferreiro). */
  upgrades?: boolean;
  /** Âncora (data/places.ts) do balcão — registra um interagível "Negociar" ali. */
  anchor?: string;
}

export const SHOPS: Record<string, ShopDef> = {
  loja_sabine: {
    id: 'loja_sabine',
    name: 'Empório da Sabine',
    keeper: 'Sabine',
    kind: 'merchant',
    greeting: 'Tudo tem preço, mago. Até a sua pressa.',
    buyMul: 1.15,
    sellMul: 0.35,
    buys: ['weapon', 'armor', 'amulet', 'consumable', 'material'],
    stock: [
      { itemId: 'pocao_vida_menor', qty: 8 },
      { itemId: 'pocao_energia', qty: 5 },
      { itemId: 'elixir_furia', qty: 1 },
      { itemId: 'gibao_couro', qty: 1 },
      { itemId: 'manto_viajante', qty: 1 },
      { itemId: 'talisma_viajante', qty: 1 },
      { itemId: 'adaga_arcana', qty: 1 },
      { itemId: 'amuleto_floresta', qty: 1, minLevel: 4 },
      { itemId: 'minerio_ferroluz', qty: 10 },
      { itemId: 'erva_lumen', qty: 6 },
      { itemId: 'couro_lobo', qty: 4 },
    ],
    anchor: 'barraca_2_cliente',
  },
  forja_doran: {
    id: 'forja_doran',
    name: 'Forja de Brumafria',
    keeper: 'Doran Forjafria',
    kind: 'smith',
    greeting: 'Aço bom não mente! Quer comprar, vender ou deixar essa lâmina mais afiada?',
    buyMul: 1,
    sellMul: 0.4,
    buys: ['weapon', 'armor', 'material'],
    stock: [
      { itemId: 'espada_ferro', qty: 2 },
      { itemId: 'lanca_guarda', qty: 2 },
      { itemId: 'adaga_arcana', qty: 1 },
      { itemId: 'lanca_cristal', qty: 1, minLevel: 4 },
      { itemId: 'gibao_couro', qty: 1 },
      { itemId: 'cota_ferroluz', qty: 1, minLevel: 3 },
      { itemId: 'minerio_ferroluz', qty: 15 },
      { itemId: 'engrenagem_antiga', qty: 4 },
    ],
    upgrades: true,
    anchor: 'forja_cliente',
  },
  taverna_hilda: {
    id: 'taverna_hilda',
    name: 'Taverna do Javali Rúnico',
    keeper: 'Hilda',
    kind: 'tavern',
    greeting: 'Senta, querido! Poção quentinha, saiu agora do caldeirão.',
    buyMul: 1,
    sellMul: 0.3,
    buys: ['consumable', 'material'],
    stock: [
      { itemId: 'pocao_vida_menor', qty: 10 },
      { itemId: 'pocao_vida', qty: 5 },
      { itemId: 'pocao_vida_maior', qty: 1, minLevel: 3 },
      { itemId: 'pocao_energia', qty: 6 },
      { itemId: 'elixir_furia', qty: 2 },
    ],
    anchor: 'taverna_balcao_cliente',
  },
};

export const SHOP_IDS = Object.keys(SHOPS);

export const SHOP_RULES = {
  /** Itens vendidos pelo jogador ficam disponíveis para recompra (mesmo preço) até a renovação. */
  buybackMax: 12,
  /** Valor de revenda cresce com o aprimoramento: × (1 + bônus · nível). */
  upgradeValueBonus: 0.25,
  /** Preço mínimo de compra (ouro). */
  minBuyPrice: 1,
  interactRange: 2.4,
};

/** Preço de compra de um item de valor `value` numa loja. */
export function buyPrice(value: number, shop: Pick<ShopDef, 'buyMul'>): number {
  return Math.max(SHOP_RULES.minBuyPrice, Math.ceil(value * shop.buyMul));
}

/** Quanto o comerciante paga por 1 unidade (0 = não compra). */
export function sellPrice(value: number, upgrade: number, shop: Pick<ShopDef, 'sellMul'>): number {
  if (value <= 0) return 0;
  return Math.max(1, Math.floor(value * shop.sellMul * (1 + SHOP_RULES.upgradeValueBonus * Math.max(0, upgrade))));
}

// ---------------------------------------------------------------------------
// Aprimoramento de armas (ferreiro)
// ---------------------------------------------------------------------------

/** Multiplicador do custo em ouro por raridade. */
export const UPGRADE_RARITY_COST: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.8,
  rare: 1,
  epic: 1.3,
  legendary: 1.6,
  mythic: 2,
};

/** Materiais para ir do nível atual (índice) ao seguinte. */
export const UPGRADE_MATERIALS: { itemId: string; qty: number }[][] = [
  [{ itemId: 'minerio_ferroluz', qty: 2 }],
  [
    { itemId: 'minerio_ferroluz', qty: 3 },
    { itemId: 'fragmento_eter', qty: 1 },
  ],
  [
    { itemId: 'minerio_ferroluz', qty: 3 },
    { itemId: 'engrenagem_antiga', qty: 2 },
    { itemId: 'cristal_arcano', qty: 1 },
  ],
  [
    { itemId: 'cristal_arcano', qty: 2 },
    { itemId: 'fragmento_eter', qty: 3 },
    { itemId: 'nucleo_automato', qty: 1 },
  ],
  [
    { itemId: 'cristal_arcano', qty: 3 },
    { itemId: 'fragmento_eter', qty: 4 },
    { itemId: 'nucleo_automato', qty: 2 },
  ],
];

export interface UpgradeCost {
  /** Nível atual → próximo. */
  from: number;
  to: number;
  gold: number;
  materials: { itemId: string; qty: number }[];
}

/** Custo do próximo aprimoramento (null se já está no máximo). Pura. */
export function weaponUpgradeCost(currentLevel: number, rarity: Rarity): UpgradeCost | null {
  const l = Math.max(0, Math.floor(currentLevel || 0));
  if (l >= WEAPON_UPGRADE.maxLevel) return null;
  const gold = Math.round((WEAPON_UPGRADE.goldCost[l] ?? WEAPON_UPGRADE.goldCost[WEAPON_UPGRADE.goldCost.length - 1]) * (UPGRADE_RARITY_COST[rarity] ?? 1));
  return { from: l, to: l + 1, gold, materials: (UPGRADE_MATERIALS[l] ?? []).map((m) => ({ ...m })) };
}
