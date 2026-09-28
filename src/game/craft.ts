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
  const basePool = BASE_ITEMS[slot] || [];
  const baseIndex = Math.min(basePool.length - 1, Math.floor((itemTier - 1) / 20));
  const baseTemplate = basePool[baseIndex] || { name: 'Предмет', baseHp: 10, baseDmg: 5, baseArm: 2 };
  
  // 4. Determine Affix Count based on Rarity
  let prefixCount = 0;
  let suffixCount = 0;
  if (rarity === 'magic') { prefixCount = 1; suffixCount = 0; }
  else if (rarity === 'rare') { prefixCount = 1; suffixCount = 1; }
  else if (rarity === 'epic') { prefixCount = 2; suffixCount = 1; }
  else if (rarity === 'legendary') { prefixCount = 2; suffixCount = 2; }

  // 5. Generate Random Affixes (RNG)
  const prefixes = [];
  const suffixes = [];

  for (let i = 0; i < prefixCount && PREFIX_TEMPLATES.length > 0; i++) {
    const randomPrefix = PREFIX_TEMPLATES[Math.floor(Math.random() * PREFIX_TEMPLATES.length)];
    prefixes.push({
      ...randomPrefix,
      tier: Math.max(1, Math.floor(itemTier / 10))
    });
  }

  for (let i = 0; i < suffixCount && SUFFIX_TEMPLATES.length > 0; i++) {
    const randomSuffix = SUFFIX_TEMPLATES[Math.floor(Math.random() * SUFFIX_TEMPLATES.length)];
    suffixes.push({
      ...randomSuffix,
      tier: Math.max(1, Math.floor(itemTier / 10))
    });
  }

  // 6. Build Final Item
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
    prefixes,
    suffixes
  };

  return item;
};

export function getEstimatedStats(slot: ItemSlot, tierIndex: number) {
  const pool = BASE_ITEMS[slot] || [];
  const item = pool[Math.min(pool.length - 1, Math.max(0, tierIndex))] || { name: 'Предмет', baseHp: 10, baseDmg: 5, baseArm: 2 };
  
  return {
    name: item.name,
    minHp: item.baseHp,
    maxHp: Math.round(item.baseHp * 1.2),
    minDmg: item.baseDmg,
    maxDmg: Math.round(item.baseDmg * 1.2),
    minArm: item.baseArm,
    maxArm: Math.round(item.baseArm * 1.2)
  };
}

// Reforging an existing item rerolls its affixes with fresh rolls
export function reforgeItemAffixes(item: Item): Item {
  return craftItem(item.slot, item.tier || 1);
}
