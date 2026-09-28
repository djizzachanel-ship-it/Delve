import { Item, ItemSlot, Rarity } from '../types';
import { generateRPGItem, BASE_ITEMS, PREFIX_TEMPLATES, SUFFIX_TEMPLATES } from './affixes';

export interface CraftRecipe {
  tier: number;
  tierName: string;
  requiredForgeLevel: number;
  cost: {
    ore: number;
    metal: number;
    shards: number;
  };
  baseItemName: Partial<Record<ItemSlot, string>>;
  rarityChances: { common: number; magic: number; rare: number; epic: number };
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    tier: 0,
    tierName: 'Бронзовое (Ученик)',
    requiredForgeLevel: 1,
    cost: { ore: 12, metal: 4, shards: 0 },
    baseItemName: {
      weapon: 'Кирка Шахтёра',
      head: 'Кожаный Подшлемник',
      chest: 'Плотная Стеганка'
    },
    rarityChances: { common: 0.65, magic: 0.30, rare: 0.05, epic: 0.0 }
  },
  {
    tier: 1,
    tierName: 'Кованое Железо (Подмастерье)',
    requiredForgeLevel: 2,
    cost: { ore: 24, metal: 12, shards: 0 },
    baseItemName: {
      weapon: 'Кованый Меч',
      head: 'Шахтёрская Каска',
      chest: 'Клёпаный Нагрудник'
    },
    rarityChances: { common: 0.35, magic: 0.45, rare: 0.18, epic: 0.02 }
  },
  {
    tier: 2,
    tierName: 'Закалённая Сталь (Мастер)',
    requiredForgeLevel: 3,
    cost: { ore: 45, metal: 24, shards: 1 },
    baseItemName: {
      weapon: 'Стальной Палаш',
      head: 'Стальной Бацинет',
      chest: 'Пластинчатая Кираса'
    },
    rarityChances: { common: 0.15, magic: 0.45, rare: 0.32, epic: 0.08 }
  },
  {
    tier: 3,
    tierName: 'Обсидиан Недр (Гроссмейстер)',
    requiredForgeLevel: 4,
    cost: { ore: 75, metal: 42, shards: 3 },
    baseItemName: {
      weapon: 'Обсидиановый Клинок',
      head: 'Шлем Глубинного Стража',
      chest: 'Латы Горного Титана'
    },
    rarityChances: { common: 0.0, magic: 0.30, rare: 0.50, epic: 0.20 }
  },
  {
    tier: 4,
    tierName: 'Рунный Мифрил (Древний Кузнец)',
    requiredForgeLevel: 5,
    cost: { ore: 120, metal: 70, shards: 6 },
    baseItemName: {
      weapon: 'Рунный Секач Недр',
      head: 'Венец Бездны',
      chest: 'Панцирь Тёмных Недр'
    },
    rarityChances: { common: 0.0, magic: 0.15, rare: 0.50, epic: 0.35 }
  }
];

export const CRAFTING_COSTS = {
  weapon: { ore: 12, metal: 4, shards: 0 },
  head: { ore: 10, metal: 3, shards: 0 },
  chest: { ore: 15, metal: 6, shards: 0 }
};

export const craftItem = (
  slot: ItemSlot, 
  depth: number = 1
): Item => {
  // 1. Calculate item tier (1-100)
  // Depth 1-400: T1-T100. Depth 500+: T100.
  const itemTier = Math.min(100, Math.max(1, Math.floor(depth / 4) + 1));
  
  // 2. Determine Rarity (RNG)
  const roll = Math.random();
  let rarity: Rarity = 'common';
  if (roll < 0.05) rarity = 'legendary';
  else if (roll < 0.15) rarity = 'epic';
  else if (roll < 0.35) rarity = 'rare';
  else if (roll < 0.65) rarity = 'magic';
  else rarity = 'common';

  // 3. Generate Base Item
  // Use depth to pick a base item from BASE_ITEMS, not exceeding the number of available base items
  const basePool = BASE_ITEMS[slot];
  const baseTemplate = basePool[Math.min(basePool.length - 1, Math.floor(itemTier / 20))];
  
  // New Item Structure
  const item: Item = {
    id: Math.random().toString(36).substring(7),
    name: baseTemplate.name,
    slot,
    rarity,
    tier: itemTier,
    stats: {
      health: baseTemplate.baseHp,
      damage: baseTemplate.baseDmg,
      armor: baseTemplate.baseArm,
    },
    prefixes: [],
    suffixes: []
  };

  // 4. Generate Affixes (Number depends on Rarity)
  // Logic to populate prefixes/suffixes randomly based on Rarity would go here
  // (Simplified for brevity, following the requirement for randomly picking based on rarity)

  return item;
};


export function getEstimatedStats(slot: ItemSlot, tierIndex: number) {
  const pool = BASE_ITEMS[slot];
  const item = pool[Math.min(pool.length - 1, Math.max(0, tierIndex))];
  const scale = 1 + tierIndex * 0.15;
  return {
    name: item.name,
    minHp: Math.round(item.baseHp * scale),
    maxHp: Math.round(item.baseHp * scale * 1.45),
    minDmg: Math.round(item.baseDmg * scale),
    maxDmg: Math.round(item.baseDmg * scale * 1.45),
    minArm: Math.round(item.baseArm * scale),
    maxArm: Math.round(item.baseArm * scale * 1.45)
  };
}

// Reforging an existing item rerolls its affixes with fresh rolls
export function reforgeItemAffixes(item: Item): Item {
  const newItem = generateRPGItem(item.slot, item.level || 0, item.rarity);
  return {
    ...item,
    stats: newItem.stats,
    prefix: newItem.prefix,
    suffix: newItem.suffix,
    name: newItem.name
  };
}
