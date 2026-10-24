/**
 * Itens: definições tipadas (nome, descrição, ícone procedural, categoria, raridade,
 * pilha, valor, requisitos, bônus de atributos e efeitos de uso).
 * As armas são geradas a partir de WEAPONS (data/weapons.ts): o id do item = id da arma.
 * Ids do contrato C6 (consumíveis, materiais, missão e amuletos) estão todos aqui.
 */
import { WEAPONS, WEAPON_IDS, WEAPON_TYPE_NAMES, RARITIES, type Rarity, type WeaponDef, type WeaponType } from './weapons';
import type { StatMods } from './progression';

export type ItemCategory = 'weapon' | 'consumable' | 'material' | 'quest' | 'amulet' | 'armor';
export type ItemSlot = 'weapon' | 'amulet' | 'armor';

export const CATEGORY_NAMES: Record<ItemCategory, string> = {
  weapon: 'Arma',
  consumable: 'Consumível',
  material: 'Material',
  quest: 'Item de missão',
  amulet: 'Amuleto',
  armor: 'Vestes',
};

/** Ordem de exibição/ordenação das categorias no inventário. */
export const CATEGORY_ORDER: ItemCategory[] = ['weapon', 'armor', 'amulet', 'consumable', 'material', 'quest'];

/** Formas que a UI sabe desenhar (canvas/SVG procedural). */
export type ItemIconShape =
  | 'staff'
  | 'sword'
  | 'dagger'
  | 'spear'
  | 'gauntlet'
  | 'orb'
  | 'potion'
  | 'flask'
  | 'crystal'
  | 'ore'
  | 'herb'
  | 'leather'
  | 'gear'
  | 'core'
  | 'shard'
  | 'key'
  | 'hammer'
  | 'scroll'
  | 'letter'
  | 'amulet'
  | 'ring'
  | 'robe'
  | 'coin'
  | 'apple'
  | 'mushroom'
  | 'meat'
  | 'berries'
  | 'dish'
  | 'bowl';

export interface ItemIcon {
  /** Caractere simples (fallback de texto). */
  glyph: string;
  shape: ItemIconShape;
  /** Cor principal (CSS). */
  color: string;
}

/** Grupo de recarga compartilhada entre consumíveis. */
export type CooldownGroup = 'potion' | 'elixir' | 'food';

export interface ConsumableEffect {
  /** Cura instantânea (pontos). */
  heal?: number;
  /** Cura instantânea (fração da vida máxima), somada a `heal`. */
  healPct?: number;
  /** Energia restaurada (pontos). */
  energy?: number;
  /** Efeito temporário de atributos. */
  buff?: { id: string; name: string; duration: number; mods: StatMods };
  cooldownGroup: CooldownGroup;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  icon: ItemIcon;
  stackable: boolean;
  maxStack: number;
  /** Valor base (ouro). Preço de compra/venda deriva dele (data/shops.ts). */
  value: number;
  /** Nível mínimo para equipar. */
  levelReq?: number;
  /** Bônus aditivos de atributo enquanto equipado (amuletos/vestes). */
  stats?: StatMods;
  /** Slot de equipamento (armas, amuletos, vestes). */
  slot?: ItemSlot;
  /** Id em WEAPONS (armas). */
  weaponId?: string;
  /** Efeito de uso (consumíveis). */
  use?: ConsumableEffect;
  /** Não pode ser vendido nem descartado (itens de missão, cajado de Kaelen). */
  bound?: boolean;
  /** Texto de história curto (tooltip). */
  lore?: string;
}

/** Recargas dos grupos de consumíveis (s). */
export const CONSUMABLE_COOLDOWNS: Record<CooldownGroup, number> = {
  potion: 3,
  elixir: 40,
  food: 1,
};

/** Capacidades do inventário. */
export const INVENTORY_LIMITS = {
  /** Pilhas na mochila (itens equipados e de missão não ocupam espaço). */
  capacity: 40,
  /** Pilhas no baú pessoal. */
  stashCapacity: 80,
  /** Ouro máximo carregado. */
  maxGold: 999999,
  /** Pilha máxima padrão de empilháveis. */
  defaultMaxStack: 99,
};

// ---------------------------------------------------------------------------
// Armas (geradas de WEAPONS)
// ---------------------------------------------------------------------------

const WEAPON_ICON: Record<WeaponType, ItemIconShape> = {
  sword: 'sword',
  dagger: 'dagger',
  spear: 'spear',
  staff: 'staff',
  techno: 'gauntlet',
  artifact: 'orb',
};
const WEAPON_GLYPH: Record<WeaponType, string> = {
  sword: '†',
  dagger: '‡',
  spear: '↟',
  staff: '⚚',
  techno: '✊',
  artifact: '◉',
};

function hexCss(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function weaponItem(w: WeaponDef): ItemDef {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    category: 'weapon',
    rarity: w.rarity,
    icon: { glyph: WEAPON_GLYPH[w.type], shape: WEAPON_ICON[w.type], color: hexCss(w.model.glow) },
    stackable: false,
    maxStack: 1,
    value: w.value,
    levelReq: w.levelReq,
    slot: 'weapon',
    weaponId: w.id,
    // O cajado de Kaelen não pode ser vendido nem descartado.
    bound: w.id === 'cajado_ancestral' ? true : undefined,
  };
}

// ---------------------------------------------------------------------------
// Demais itens
// ---------------------------------------------------------------------------

type Base = Omit<ItemDef, 'stackable' | 'maxStack'> & { stackable?: boolean; maxStack?: number };

function item(d: Base): ItemDef {
  const stackable = d.stackable ?? (d.category === 'consumable' || d.category === 'material');
  return { ...d, stackable, maxStack: stackable ? d.maxStack ?? INVENTORY_LIMITS.defaultMaxStack : 1 };
}

const OTHER: ItemDef[] = [
  // --- Consumíveis ---
  item({
    id: 'pocao_vida_menor',
    name: 'Poção de Vida Menor',
    description: 'Um frasco pequeno de infusão vermelha. Fecha cortes e devolve o fôlego.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '♥', shape: 'potion', color: '#e0474c' },
    value: 25,
    maxStack: 20,
    use: { heal: 40, cooldownGroup: 'potion' },
  }),
  item({
    id: 'pocao_vida',
    name: 'Poção de Vida',
    description: 'Receita da taverna, reforçada com erva-lúmen. Cura ferimentos sérios.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '♥', shape: 'potion', color: '#ff2f4a' },
    value: 60,
    maxStack: 20,
    use: { heal: 75, healPct: 0.1, cooldownGroup: 'potion' },
  }),
  item({
    id: 'pocao_vida_maior',
    name: 'Poção de Vida Maior',
    description: 'Destilada com cristal arcano. O líquido pulsa como um coração.',
    category: 'consumable',
    rarity: 'rare',
    icon: { glyph: '♥', shape: 'potion', color: '#ff5fa0' },
    value: 140,
    maxStack: 20,
    use: { heal: 120, healPct: 0.25, cooldownGroup: 'potion' },
  }),
  item({
    id: 'pocao_energia',
    name: 'Poção de Energia',
    description: 'Éter líquido, azul e frio. Reabastece a energia mágica.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '✧', shape: 'potion', color: '#4fb8ff' },
    value: 40,
    maxStack: 20,
    use: { energy: 70, cooldownGroup: 'potion' },
  }),
  item({
    id: 'elixir_furia',
    name: 'Elixir da Fúria',
    description: 'Amargo e quente. Por meio minuto, cada golpe e cada feitiço ardem com mais força.',
    category: 'consumable',
    rarity: 'rare',
    icon: { glyph: '✹', shape: 'flask', color: '#ff8a2a' },
    value: 120,
    maxStack: 10,
    use: { buff: { id: 'furia', name: 'Fúria', duration: 30, mods: { meleePower: 0.25, spellPower: 0.25, critChance: 0.05 } }, cooldownGroup: 'elixir' },
  }),

  // --- Ingredientes (comem-se crus ou vão para a panela numa fogueira) ---
  item({
    id: 'maca',
    name: 'Maçã',
    description: 'Vermelha e crocante. Cai dos carvalhos quando alguém sacode o tronco. Assada fica melhor.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '●', shape: 'apple', color: '#e0473c' },
    value: 3,
    use: { heal: 8, cooldownGroup: 'food' },
  }),
  item({
    id: 'frutas_silvestres',
    name: 'Frutas Silvestres',
    description: 'Um punhado de amoras colhidas nos arbustos. Doces e um pouco azedas.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '⁂', shape: 'berries', color: '#7a4ad8' },
    value: 3,
    use: { heal: 5, energy: 8, cooldownGroup: 'food' },
  }),
  item({
    id: 'cogumelo',
    name: 'Cogumelo-do-Bosque',
    description: 'Cresce à sombra das árvores. Cru é borrachudo; cozido rende um bom ensopado.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '♠', shape: 'mushroom', color: '#c8603a' },
    value: 4,
    use: { heal: 6, cooldownGroup: 'food' },
  }),
  item({
    id: 'carne_crua',
    name: 'Carne Crua',
    description: 'Carne fresca de caça. Precisa de fogo antes de ir para o estômago.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '◗', shape: 'meat', color: '#d0605a' },
    value: 6,
    use: { heal: 4, cooldownGroup: 'food' },
  }),
  // --- Pratos (cozinhados na fogueira) ---
  item({
    id: 'maca_assada',
    name: 'Maçã Assada',
    description: 'Casca tostada, miolo macio e quente.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '●', shape: 'apple', color: '#b0582a' },
    value: 8,
    use: { heal: 22, cooldownGroup: 'food' },
  }),
  item({
    id: 'frutas_quentes',
    name: 'Frutas Quentes',
    description: 'Amoras aquecidas até virarem quase geleia.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '⁂', shape: 'bowl', color: '#8a4ad8' },
    value: 8,
    use: { heal: 14, energy: 25, cooldownGroup: 'food' },
  }),
  item({
    id: 'cogumelo_assado',
    name: 'Cogumelo Assado',
    description: 'No espeto, com um pouco de cinza para dar sabor.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '♠', shape: 'mushroom', color: '#9a5a2a' },
    value: 9,
    use: { heal: 20, cooldownGroup: 'food' },
  }),
  item({
    id: 'espetinho',
    name: 'Espetinho de Carne',
    description: 'Carne de caça assada na brasa. Simples e honesta.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '◗', shape: 'meat', color: '#a0582a' },
    value: 14,
    use: { heal: 45, cooldownGroup: 'food' },
  }),
  item({
    id: 'assado_farto',
    name: 'Assado Farto',
    description: 'Dois pedaços de carne assados devagar. Dá para dividir, mas ninguém divide.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '◗', shape: 'dish', color: '#a0582a' },
    value: 30,
    use: { heal: 70, buff: { id: 'regeneracao', name: 'Regeneração', duration: 90, mods: { healthRegen: 4 } }, cooldownGroup: 'food' },
  }),
  item({
    id: 'ensopado_cogumelos',
    name: 'Ensopado de Cogumelos',
    description: 'Grosso, cheiroso e quente. Devolve a vida e o fôlego mágico.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '♨', shape: 'bowl', color: '#c89a5a' },
    value: 24,
    use: { heal: 40, energy: 40, cooldownGroup: 'food' },
  }),
  item({
    id: 'torta_frutas',
    name: 'Torta de Frutas',
    description: 'Maçã e amoras numa massa improvisada. Dá vontade de correr o mundo.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '◒', shape: 'dish', color: '#d89a4a' },
    value: 26,
    use: { heal: 35, buff: { id: 'vigor', name: 'Vigor', duration: 180, mods: { energyRegen: 4, moveSpeed: 0.08 } }, cooldownGroup: 'food' },
  }),
  item({
    id: 'prato_cacador',
    name: 'Prato do Caçador',
    description: 'Carne com cogumelos. A refeição de quem vai enfrentar coisa grande.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '◗', shape: 'dish', color: '#b86a3a' },
    value: 40,
    use: { heal: 60, buff: { id: 'forca_cacador', name: 'Força do Caçador', duration: 150, mods: { meleePower: 0.2, damageReduction: 0.05 } }, cooldownGroup: 'food' },
  }),
  item({
    id: 'cha_lumen',
    name: 'Chá de Lúmen',
    description: 'Erva-lúmen com frutas silvestres. A mente clareia e os feitiços fluem.',
    category: 'consumable',
    rarity: 'uncommon',
    icon: { glyph: '♨', shape: 'bowl', color: '#7ad89a' },
    value: 36,
    use: { energy: 60, buff: { id: 'mente_clara', name: 'Mente Clara', duration: 150, mods: { spellPower: 0.18, cooldownReduction: 0.1 } }, cooldownGroup: 'food' },
  }),
  item({
    id: 'caldo_eter',
    name: 'Caldo de Éter',
    description: 'Um caldo azul que brilha. Tem gosto de chuva e de relâmpago.',
    category: 'consumable',
    rarity: 'rare',
    icon: { glyph: '♨', shape: 'bowl', color: '#5ac8ff' },
    value: 60,
    use: { energy: 100, healPct: 0.2, cooldownGroup: 'food' },
  }),
  item({
    id: 'banquete_arcano',
    name: 'Banquete Arcano',
    description: 'Carne, cogumelos, maçã e erva-lúmen. Um prato digno do Império antigo.',
    category: 'consumable',
    rarity: 'epic',
    icon: { glyph: '✦', shape: 'dish', color: '#e8b84a' },
    value: 120,
    use: { heal: 100, healPct: 0.2, buff: { id: 'banquete', name: 'Banquete Arcano', duration: 240, mods: { maxHealth: 30, healthRegen: 2, spellPower: 0.1, meleePower: 0.1 } }, cooldownGroup: 'food' },
  }),
  item({
    id: 'comida_duvidosa',
    name: 'Comida Duvidosa',
    description: 'Ninguém sabe bem o que é. Mas alimenta... mais ou menos.',
    category: 'consumable',
    rarity: 'common',
    icon: { glyph: '?', shape: 'bowl', color: '#7a7a6a' },
    value: 3,
    use: { heal: 6, cooldownGroup: 'food' },
  }),

  // --- Materiais ---
  item({
    id: 'fragmento_eter',
    name: 'Fragmento de Éter',
    description: 'Lasca cristalina que ainda guarda um sopro da energia do mundo.',
    category: 'material',
    rarity: 'uncommon',
    icon: { glyph: '◆', shape: 'shard', color: '#7fe6ff' },
    value: 18,
  }),
  item({
    id: 'minerio_ferroluz',
    name: 'Minério de Ferroluz',
    description: 'Ferro com veios que brilham fracos no escuro. A base de toda boa lâmina.',
    category: 'material',
    rarity: 'common',
    icon: { glyph: '▲', shape: 'ore', color: '#c8b48a' },
    value: 8,
  }),
  item({
    id: 'cristal_arcano',
    name: 'Cristal Arcano',
    description: 'Cristal lapidado pelo Império. Ferreiros pagam caro por ele.',
    category: 'material',
    rarity: 'rare',
    icon: { glyph: '◈', shape: 'crystal', color: '#b07cff' },
    value: 45,
  }),
  item({
    id: 'erva_lumen',
    name: 'Erva-Lúmen',
    description: 'Flor da Floresta de Lúmen que brilha à noite. Base de poções.',
    category: 'material',
    rarity: 'common',
    icon: { glyph: '✿', shape: 'herb', color: '#9bff8a' },
    value: 6,
  }),
  item({
    id: 'couro_lobo',
    name: 'Couro de Lobo',
    description: 'Pele grossa e escura, ainda com cheiro de mato.',
    category: 'material',
    rarity: 'common',
    icon: { glyph: '▤', shape: 'leather', color: '#8a6a4a' },
    value: 10,
  }),
  item({
    id: 'nucleo_automato',
    name: 'Núcleo de Autômato',
    description: 'Coração de engrenagens e runas de um constructo. Ainda zumbe.',
    category: 'material',
    rarity: 'rare',
    icon: { glyph: '◎', shape: 'core', color: '#ffb347' },
    value: 70,
  }),
  item({
    id: 'engrenagem_antiga',
    name: 'Engrenagem Antiga',
    description: 'Peça de bronze rúnico da era de Aeternum.',
    category: 'material',
    rarity: 'common',
    icon: { glyph: '✲', shape: 'gear', color: '#d0a050' },
    value: 12,
  }),

  // --- Missão ---
  item({
    id: 'cristal_chave',
    name: 'Cristal-Chave',
    description: 'Um cristal facetado com um selo do Império. Abre o portão das Ruínas de Aeternum.',
    category: 'quest',
    rarity: 'epic',
    icon: { glyph: '⬢', shape: 'key', color: '#5ff0ff' },
    value: 0,
    bound: true,
  }),
  item({
    id: 'martelo_doran',
    name: 'Martelo de Doran',
    description: 'O martelo ancestral da família Forjafria. Pesado, gasto e cheio de histórias.',
    category: 'quest',
    rarity: 'rare',
    icon: { glyph: '⚒', shape: 'hammer', color: '#c0c8d0' },
    value: 0,
    bound: true,
  }),
  item({
    id: 'inscricao_elyra',
    name: 'Inscrição de Elyra',
    description: 'Decalque de uma inscrição das Ilhas Suspensas. Teodoro vai querer ver isto.',
    category: 'quest',
    rarity: 'rare',
    icon: { glyph: '✎', shape: 'scroll', color: '#e8d8a0' },
    value: 0,
    bound: true,
    stackable: true,
    maxStack: 9,
  }),
  item({
    id: 'fragmento_memoria',
    name: 'Fragmento de Memória',
    description: 'Um caco de luz que guarda um instante da vida de Kaelen.',
    category: 'quest',
    rarity: 'legendary',
    icon: { glyph: '✺', shape: 'shard', color: '#ffd36a' },
    value: 0,
    bound: true,
    stackable: true,
    maxStack: 9,
  }),
  item({
    id: 'carta_barao',
    name: 'Carta do Barão',
    description: 'Carta lacrada com o brasão de Ferroluz. Promete ouro por cristais.',
    category: 'quest',
    rarity: 'uncommon',
    icon: { glyph: '✉', shape: 'letter', color: '#e8e0c8' },
    value: 0,
    bound: true,
  }),
  item({
    id: 'bilhete_corvos',
    name: 'Bilhete Amassado',
    description: 'Ordens dos Corvos, rabiscadas às pressas. Faltam pedaços.',
    category: 'quest',
    rarity: 'common',
    icon: { glyph: '✉', shape: 'letter', color: '#b8a888' },
    value: 0,
    bound: true,
  }),

  // --- Amuletos ---
  item({
    id: 'amuleto_floresta',
    name: 'Amuleto da Floresta',
    description: 'Folhas de lúmen trançadas em prata. A floresta reconhece quem o usa.',
    category: 'amulet',
    rarity: 'rare',
    icon: { glyph: '❦', shape: 'amulet', color: '#7dff9a' },
    value: 320,
    levelReq: 2,
    slot: 'amulet',
    stats: { healthRegen: 1.5, maxHealth: 20, moveSpeed: 0.04 },
  }),
  item({
    id: 'talisma_viajante',
    name: 'Talismã do Viajante',
    description: 'Pena de grifo presa a uma runa de vento. Leve como o céu.',
    category: 'amulet',
    rarity: 'uncommon',
    icon: { glyph: '➶', shape: 'amulet', color: '#a8e0ff' },
    value: 180,
    levelReq: 1,
    slot: 'amulet',
    stats: { flightCost: -0.15, moveSpeed: 0.05, dodgeCost: -0.1 },
  }),
  item({
    id: 'anel_runico',
    name: 'Anel Rúnico',
    description: 'Um anel de circuito com runas que acendem ao toque da magia.',
    category: 'amulet',
    rarity: 'rare',
    icon: { glyph: '○', shape: 'ring', color: '#5fb8ff' },
    value: 380,
    levelReq: 3,
    slot: 'amulet',
    stats: { spellPower: 0.12, critChance: 0.04, maxEnergy: 10 },
  }),
  item({
    id: 'amuleto_guardiao',
    name: 'Amuleto do Guardião',
    description: 'Uma placa do peito do Guardião Mecânico, ainda morna. Protege quem a carrega.',
    category: 'amulet',
    rarity: 'epic',
    icon: { glyph: '⛨', shape: 'amulet', color: '#ffb347' },
    value: 900,
    levelReq: 5,
    slot: 'amulet',
    stats: { damageReduction: 0.08, maxHealth: 30, shieldPower: 0.2 },
  }),

  // --- Vestes ---
  item({
    id: 'gibao_couro',
    name: 'Gibão de Couro de Lobo',
    description: 'Couro curtido em camadas. Aguenta garras e flechas perdidas.',
    category: 'armor',
    rarity: 'common',
    icon: { glyph: '▥', shape: 'robe', color: '#8a6a4a' },
    value: 90,
    levelReq: 1,
    slot: 'armor',
    stats: { maxHealth: 15, damageReduction: 0.03 },
  }),
  item({
    id: 'manto_viajante',
    name: 'Manto do Viajante',
    description: 'Tecido leve e encerado, cortado para o vento. Bom para quem voa longe.',
    category: 'armor',
    rarity: 'uncommon',
    icon: { glyph: '▥', shape: 'robe', color: '#6aa0c8' },
    value: 160,
    levelReq: 2,
    slot: 'armor',
    stats: { maxEnergy: 15, flightSpeed: 0.06, flightCost: -0.08 },
  }),
  item({
    id: 'vestes_runicas',
    name: 'Vestes Rúnicas',
    description: 'Fios de cobre bordados em runas antigas. Conduzem o Éter como veias.',
    category: 'armor',
    rarity: 'rare',
    icon: { glyph: '▥', shape: 'robe', color: '#58d8ff' },
    value: 420,
    levelReq: 4,
    slot: 'armor',
    stats: { spellPower: 0.08, energyRegen: 1.5, maxEnergy: 10 },
  }),
  item({
    id: 'cota_ferroluz',
    name: 'Cota de Ferroluz',
    description: 'Malha de ferroluz por baixo de um gibão. Pesada, mas confiável.',
    category: 'armor',
    rarity: 'rare',
    icon: { glyph: '▥', shape: 'robe', color: '#c8b48a' },
    value: 460,
    levelReq: 4,
    slot: 'armor',
    stats: { maxHealth: 35, damageReduction: 0.06, meleePower: 0.05, flightCost: 0.05 },
  }),
  item({
    id: 'manto_guardiao_tempo',
    name: 'Manto do Guardião do Tempo',
    description: 'O manto cerimonial de Kaelen, guardado no alto de uma ilha. As runas lembram dele.',
    category: 'armor',
    rarity: 'legendary',
    icon: { glyph: '▥', shape: 'robe', color: '#ffd36a' },
    value: 2400,
    levelReq: 7,
    slot: 'armor',
    stats: { maxHealth: 30, maxEnergy: 30, cooldownReduction: 0.08, spellPower: 0.1, flightCost: -0.1 },
  }),
];

const ALL: ItemDef[] = [...WEAPON_IDS.map((id) => weaponItem(WEAPONS[id])), ...OTHER];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(ALL.map((d) => [d.id, d]));
export const ITEM_IDS: string[] = ALL.map((d) => d.id);

export function getItemDef(id: string | null | undefined): ItemDef | undefined {
  return id ? ITEMS[id] : undefined;
}

export function isItemId(id: unknown): id is string {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id);
}

/** Cor CSS da raridade (UI). */
export function rarityCss(r: Rarity): string {
  return RARITIES[r].css;
}

/** Linhas de tooltip de uma arma (dano/velocidade/alcance/efeito), considerando aprimoramento. */
export function weaponLines(weaponId: string, upgrade = 0, upgradeMul = 1): string[] {
  const w = WEAPONS[weaponId];
  if (!w) return [];
  const out: string[] = [];
  out.push(`${WEAPON_TYPE_NAMES[w.type]} · ${RARITIES[w.rarity].name}${upgrade > 0 ? ` · +${upgrade}` : ''}`);
  out.push(`Dano: ${Math.round(w.damage * upgradeMul)} (${DAMAGE_TYPE_NAMES[w.damageType] ?? w.damageType})`);
  out.push(`Velocidade: ${Math.round(w.speed * 100)}%`);
  out.push(`Alcance: ${w.range.toFixed(1).replace('.', ',')} m`);
  if (w.critBonus) out.push(`Crítico: +${Math.round(w.critBonus * 100)}%`);
  out.push(`Escala com: ${w.scaling === 'spell' ? 'poder mágico' : 'poder físico'}`);
  if (w.special) out.push(`Efeito: ${w.special}`);
  return out;
}

export const DAMAGE_TYPE_NAMES: Record<string, string> = {
  physical: 'físico',
  arcane: 'arcano',
  fire: 'fogo',
  lightning: 'raio',
  void: 'vazio',
  time: 'tempo',
  frost: 'gelo',
};
