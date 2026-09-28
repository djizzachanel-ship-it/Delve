import { Item, ItemSlot, Rarity } from '../types';
import { BASE_ITEMS, PREFIX_TEMPLATES, SUFFIX_TEMPLATES, calculateAffixTier } from './affixes';

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

/**
 * Calculates item Tier (1–100) based on subterranean depth:
 * - Глубина 1–20: Tier 1–10 (10% шанс на T15)
 * - Глубина 20–50: Tier 10–25
 * - Глубина 50–100: Tier 20–40
 * - Глубина 100–200: Tier 35–60
 * - Глубина 200–300: Tier 50–75
 * - Глубина 300–400: Tier 65–90
 * - Глубина 400–500: Tier 80–100
 * - Глубина 500+: Tier 90–100
 * Максимальный Tier строго ограничен ровно 100 (T101 и выше быть не может).
 */
export function calculateItemTier(depth: number = 1): number {
  const d = Math.max(1, depth);
  let tier = 1;

  if (d <= 20) {
    // Глубина 1–20: Tier 1–10 (10% шанс на T15)
    if (Math.random() < 0.10) {
      tier = 15;
    } else {
      tier = 1 + Math.floor(Math.random() * 10); // 1..10
    }
  } else if (d <= 50) {
    // Глубина 20–50: Tier 10–25
    tier = 10 + Math.floor(Math.random() * 16); // 10..25
  } else if (d <= 100) {
    // Глубина 50–100: Tier 20–40
    tier = 20 + Math.floor(Math.random() * 21); // 20..40
  } else if (d <= 200) {
    // Глубина 100–200: Tier 35–60
    tier = 35 + Math.floor(Math.random() * 26); // 35..60
  } else if (d <= 300) {
    // Глубина 200–300: Tier 50–75
    tier = 50 + Math.floor(Math.random() * 26); // 50..75
  } else if (d <= 400) {
    // Глубина 300–400: Tier 65–90
    tier = 65 + Math.floor(Math.random() * 26); // 65..90
  } else if (d <= 500) {
    // Глубина 400–500: Tier 80–100
    tier = 80 + Math.floor(Math.random() * 21); // 80..100
  } else {
    // Глубина 500+: Tier 90–100
    tier = 90 + Math.floor(Math.random() * 11); // 90..100
  }

  // Ограничение ровно максимум 100
  return Math.min(100, Math.max(1, tier));
}

export const craftItem = (
  slot: ItemSlot, 
  depth: number = 1,
  forcedTier?: number,
  forcedRarity?: Rarity
): Item => {
  // 1. Calculate item tier (1-100)
  const itemTier = forcedTier !== undefined 
    ? Math.min(100, Math.max(1, forcedTier)) 
    : calculateItemTier(depth);
  
  // 2. Determine Rarity (RNG based on depth if not forced)
  let rarity: Rarity = forcedRarity || 'common';
  if (!forcedRarity) {
    let chances: { r: Rarity; chance: number }[] = [];
    if (depth <= 20) {
      chances = [
        { r: 'common', chance: 0.75 },
        { r: 'magic', chance: 0.20 },
        { r: 'rare', chance: 0.05 },
        { r: 'epic', chance: 0.0 },
        { r: 'legendary', chance: 0.0 },
      ];
    } else if (depth <= 100) {
      chances = [
        { r: 'common', chance: 0.50 },
        { r: 'magic', chance: 0.35 },
        { r: 'rare', chance: 0.13 },
        { r: 'epic', chance: 0.019 },
        { r: 'legendary', chance: 0.001 },
      ];
    } else if (depth <= 300) {
      chances = [
        { r: 'common', chance: 0.25 },
        { r: 'magic', chance: 0.45 },
        { r: 'rare', chance: 0.22 },
        { r: 'epic', chance: 0.07 },
        { r: 'legendary', chance: 0.01 },
      ];
    } else {
      chances = [
        { r: 'common', chance: 0.10 },
        { r: 'magic', chance: 0.35 },
        { r: 'rare', chance: 0.35 },
        { r: 'epic', chance: 0.16 },
        { r: 'legendary', chance: 0.04 },
      ];
    }

    const roll = Math.random();
    let cumulative = 0;
    for (const entry of chances) {
      cumulative += entry.chance;
      if (roll < cumulative) {
        rarity = entry.r;
        break;
      }
    }
  }

  // 3. Generate Base Item
  const basePool = BASE_ITEMS[slot] || [];
  const baseIndex = Math.min(basePool.length - 1, Math.floor((itemTier - 1) / 20));
  const baseTemplate = basePool[baseIndex] || { name: 'Предмет', baseHp: 10, baseDmg: 5, baseArm: 2 };
  
  // Base stat scaling with rarity and tier
  const rarityMultipliers: Record<Rarity, number> = {
    common: 1.0,
    magic: 1.15,
    rare: 1.30,
    epic: 1.50,
    legendary: 1.80
  };
  const tierMultiplier = 1 + (itemTier - 1) * 0.04;
  const rMulti = (rarityMultipliers[rarity] || 1.0) * tierMultiplier;

  let baseHealth = Math.round(baseTemplate.baseHp * rMulti);
  let baseDamage = Math.round(baseTemplate.baseDmg * rMulti);
  let baseArmor = Math.round(baseTemplate.baseArm * rMulti);

  // 4. Determine Affix Count based on Rarity
  let prefixCount = 0;
  let suffixCount = 0;
  if (rarity === 'magic') { prefixCount = 1; suffixCount = 0; }
  else if (rarity === 'rare') { prefixCount = 1; suffixCount = 1; }
  else if (rarity === 'epic') { prefixCount = 2; suffixCount = 1; }
  else if (rarity === 'legendary') { prefixCount = 2; suffixCount = 2; }

  // 5. Generate Random Affixes (RNG)
  const validPrefixes = PREFIX_TEMPLATES.filter(p => !p.allowedSlots || p.allowedSlots.includes(slot));
  const validSuffixes = SUFFIX_TEMPLATES.filter(s => !s.allowedSlots || s.allowedSlots.includes(slot));
  const prefixPool = validPrefixes.length > 0 ? validPrefixes : PREFIX_TEMPLATES;
  const suffixPool = validSuffixes.length > 0 ? validSuffixes : SUFFIX_TEMPLATES;

  const prefixes = [];
  const suffixes = [];

  for (let i = 0; i < prefixCount && prefixPool.length > 0; i++) {
    const template = prefixPool[Math.floor(Math.random() * prefixPool.length)];
    const pAffixTier = calculateAffixTier(itemTier);
    const affixScale = 1 + (pAffixTier - 1) * 0.15;
    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04)));
      baseHealth += bonusVal;
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03)));
      baseDamage += bonusVal;
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025)));
      baseArmor += bonusVal;
    }

    prefixes.push({
      name: template.name,
      type: 'prefix' as const,
      category: template.stat === 'damage' ? 'offensive' as const : template.stat === 'armor' ? 'defensive' as const : 'utility' as const,
      stat: template.stat,
      tier: pAffixTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${pAffixTier})`
    });
  }

  for (let i = 0; i < suffixCount && suffixPool.length > 0; i++) {
    const template = suffixPool[Math.floor(Math.random() * suffixPool.length)];
    const sAffixTier = calculateAffixTier(itemTier);
    const affixScale = 1 + (sAffixTier - 1) * 0.15;
    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04)));
      baseHealth += bonusVal;
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03)));
      baseDamage += bonusVal;
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025)));
      baseArmor += bonusVal;
    }

    suffixes.push({
      name: template.name,
      type: 'suffix' as const,
      category: template.stat === 'damage' ? 'offensive' as const : template.stat === 'armor' ? 'defensive' as const : 'utility' as const,
      stat: template.stat,
      tier: sAffixTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${sAffixTier})`
    });
  }

  // Construct Display Name
  let finalName = baseTemplate.name;
  if (prefixes.length > 0 && suffixes.length > 0) {
    finalName = `${prefixes[0].name} ${baseTemplate.name} ${suffixes[0].name}`;
  } else if (prefixes.length > 0) {
    finalName = `${prefixes[0].name} ${baseTemplate.name}`;
  } else if (suffixes.length > 0) {
    finalName = `${baseTemplate.name} ${suffixes[0].name}`;
  }

  // 6. Build Final Item
  const item: Item = {
    id: Math.random().toString(36).substring(7),
    name: finalName,
    baseName: baseTemplate.name,
    slot,
    rarity,
    tier: itemTier,
    stats: {
      health: baseHealth,
      damage: baseDamage,
      armor: baseArmor,
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

/**
 * Recalculates the total item stats from base item template and attached prefixes/suffixes.
 */
export function recalculateItemStats(item: Item): Item {
  const itemTier = item.tier || 1;
  const basePool = BASE_ITEMS[item.slot] || [];
  const baseIndex = Math.min(basePool.length - 1, Math.floor((itemTier - 1) / 20));
  const baseTemplate = basePool.find(b => b.name === item.baseName) || basePool[baseIndex] || { name: 'Предмет', baseHp: 10, baseDmg: 5, baseArm: 2 };

  const rarityMultipliers: Record<Rarity, number> = {
    common: 1.0,
    magic: 1.15,
    rare: 1.30,
    epic: 1.50,
    legendary: 1.80
  };
  const tierMultiplier = 1 + (itemTier - 1) * 0.04;
  const rMulti = (rarityMultipliers[item.rarity] || 1.0) * tierMultiplier;

  let baseHealth = Math.round(baseTemplate.baseHp * rMulti);
  let baseDamage = Math.round(baseTemplate.baseDmg * rMulti);
  let baseArmor = Math.round(baseTemplate.baseArm * rMulti);

  // Add all prefix bonuses
  (item.prefixes || []).forEach(pref => {
    if (pref.stat === 'health') baseHealth += pref.value;
    else if (pref.stat === 'damage') baseDamage += pref.value;
    else if (pref.stat === 'armor') baseArmor += pref.value;
  });

  // Add all suffix bonuses
  (item.suffixes || []).forEach(suff => {
    if (suff.stat === 'health') baseHealth += suff.value;
    else if (suff.stat === 'damage') baseDamage += suff.value;
    else if (suff.stat === 'armor') baseArmor += suff.value;
  });

  // Recompute name
  let finalName = baseTemplate.name;
  const prefixes = item.prefixes || [];
  const suffixes = item.suffixes || [];
  if (prefixes.length > 0 && suffixes.length > 0) {
    finalName = `${prefixes[0].name} ${baseTemplate.name} ${suffixes[0].name}`;
  } else if (prefixes.length > 0) {
    finalName = `${prefixes[0].name} ${baseTemplate.name}`;
  } else if (suffixes.length > 0) {
    finalName = `${baseTemplate.name} ${suffixes[0].name}`;
  }

  return {
    ...item,
    name: finalName,
    baseName: baseTemplate.name,
    stats: {
      ...item.stats,
      health: baseHealth,
      damage: baseDamage,
      armor: baseArmor
    }
  };
}

/**
 * Returns maximum allowed prefixes & suffixes for a given rarity.
 */
export function getMaxAffixes(rarity: Rarity): { maxPrefixes: number; maxSuffixes: number } {
  switch (rarity) {
    case 'magic': return { maxPrefixes: 1, maxSuffixes: 1 }; // Total 1-2
    case 'rare': return { maxPrefixes: 1, maxSuffixes: 1 };  // Total 2
    case 'epic': return { maxPrefixes: 2, maxSuffixes: 2 };  // Total up to 4
    case 'legendary': return { maxPrefixes: 2, maxSuffixes: 2 }; // Total up to 4
    case 'common':
    default:
      return { maxPrefixes: 0, maxSuffixes: 0 };
  }
}

/**
 * 1. Add Affix (Добавление аффикса):
 * If the item has an open affix slot according to its rarity, adds 1 random prefix or suffix.
 * The Tier of the newly added affix is calculated via calculateAffixTier(item.tier).
 */
export function addAffixToItem(item: Item): { success: boolean; item: Item; message: string } {
  const max = getMaxAffixes(item.rarity);
  const currentPrefixes = [...(item.prefixes || [])];
  const currentSuffixes = [...(item.suffixes || [])];

  const canAddPrefix = currentPrefixes.length < max.maxPrefixes;
  const canAddSuffix = currentSuffixes.length < max.maxSuffixes;

  if (!canAddPrefix && !canAddSuffix) {
    return {
      success: false,
      item,
      message: `На предмете редкости «${item.rarity}» уже максимальное количество аффиксов!`
    };
  }

  // Choose randomly whether to add a prefix or suffix if both are open
  const choosePrefix = canAddPrefix && canAddSuffix ? Math.random() < 0.5 : canAddPrefix;

  const validPrefixes = PREFIX_TEMPLATES.filter(p => !p.allowedSlots || p.allowedSlots.includes(item.slot));
  const validSuffixes = SUFFIX_TEMPLATES.filter(s => !s.allowedSlots || s.allowedSlots.includes(item.slot));
  const prefixPool = validPrefixes.length > 0 ? validPrefixes : PREFIX_TEMPLATES;
  const suffixPool = validSuffixes.length > 0 ? validSuffixes : SUFFIX_TEMPLATES;

  const itemTier = item.tier || 1;
  const affixTier = calculateAffixTier(itemTier);
  const affixScale = 1 + (affixTier - 1) * 0.15;
  const epicBonus = item.rarity === 'epic' ? 1.25 : item.rarity === 'legendary' ? 1.5 : 1.0;

  if (choosePrefix) {
    const existingNames = new Set(currentPrefixes.map(p => p.name));
    const available = prefixPool.filter(p => !existingNames.has(p.name));
    const template = (available.length > 0 ? available : prefixPool)[Math.floor(Math.random() * (available.length > 0 ? available.length : prefixPool.length))];

    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus));
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus));
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus));
    }

    currentPrefixes.push({
      name: template.name,
      type: 'prefix',
      category: template.stat === 'damage' ? 'offensive' : template.stat === 'armor' ? 'defensive' : 'utility',
      stat: template.stat,
      tier: affixTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${affixTier})`
    });
  } else {
    const existingNames = new Set(currentSuffixes.map(s => s.name));
    const available = suffixPool.filter(s => !existingNames.has(s.name));
    const template = (available.length > 0 ? available : suffixPool)[Math.floor(Math.random() * (available.length > 0 ? available.length : suffixPool.length))];

    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus));
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus));
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus));
    }

    currentSuffixes.push({
      name: template.name,
      type: 'suffix',
      category: template.stat === 'damage' ? 'offensive' : template.stat === 'armor' ? 'defensive' : 'utility',
      stat: template.stat,
      tier: affixTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${affixTier})`
    });
  }

  const updatedItem = recalculateItemStats({
    ...item,
    prefixes: currentPrefixes,
    suffixes: currentSuffixes
  });

  return {
    success: true,
    item: updatedItem,
    message: `Добавлено новое свойство (T${affixTier})!`
  };
}

/**
 * 2. Reroll Single Affix (Переролл одного аффикса):
 * Selects 1 random existing affix on the item and replaces it completely with a new random affix (type & tier rolled freshly).
 */
export function rerollSingleAffix(item: Item): { success: boolean; item: Item; message: string } {
  const prefixes = [...(item.prefixes || [])];
  const suffixes = [...(item.suffixes || [])];
  const totalAffixes = prefixes.length + suffixes.length;

  if (totalAffixes === 0) {
    return {
      success: false,
      item,
      message: 'На предмете нет магических свойств для переролла!'
    };
  }

  const itemTier = item.tier || 1;
  const epicBonus = item.rarity === 'epic' ? 1.25 : item.rarity === 'legendary' ? 1.5 : 1.0;

  // Pick a random affix index across all prefixes + suffixes
  const targetIndex = Math.floor(Math.random() * totalAffixes);

  if (targetIndex < prefixes.length) {
    // Reroll prefix at targetIndex
    const validPrefixes = PREFIX_TEMPLATES.filter(p => !p.allowedSlots || p.allowedSlots.includes(item.slot));
    const prefixPool = validPrefixes.length > 0 ? validPrefixes : PREFIX_TEMPLATES;
    const template = prefixPool[Math.floor(Math.random() * prefixPool.length)];

    const newTier = calculateAffixTier(itemTier);
    const affixScale = 1 + (newTier - 1) * 0.15;

    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus));
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus));
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus));
    }

    prefixes[targetIndex] = {
      name: template.name,
      type: 'prefix',
      category: template.stat === 'damage' ? 'offensive' : template.stat === 'armor' ? 'defensive' : 'utility',
      stat: template.stat,
      tier: newTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${newTier})`
    };
  } else {
    // Reroll suffix
    const suffixIndex = targetIndex - prefixes.length;
    const validSuffixes = SUFFIX_TEMPLATES.filter(s => !s.allowedSlots || s.allowedSlots.includes(item.slot));
    const suffixPool = validSuffixes.length > 0 ? validSuffixes : SUFFIX_TEMPLATES;
    const template = suffixPool[Math.floor(Math.random() * suffixPool.length)];

    const newTier = calculateAffixTier(itemTier);
    const affixScale = 1 + (newTier - 1) * 0.15;

    let bonusVal = 0;
    if (template.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus));
    } else if (template.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus));
    } else if (template.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus));
    }

    suffixes[suffixIndex] = {
      name: template.name,
      type: 'suffix',
      category: template.stat === 'damage' ? 'offensive' : template.stat === 'armor' ? 'defensive' : 'utility',
      stat: template.stat,
      tier: newTier,
      value: bonusVal,
      description: `+${bonusVal} ${template.description} (T${newTier})`
    };
  }

  const updatedItem = recalculateItemStats({
    ...item,
    prefixes,
    suffixes
  });

  return {
    success: true,
    item: updatedItem,
    message: 'Свойство успешно заменено на новое!'
  };
}

/**
 * 3. Reroll Values (Переролл значений):
 * Preserves the exact affix types and tiers, but randomly recalculates bonus numeric values within their tier range (e.g. ±15% variance).
 */
export function rerollAffixValues(item: Item): { success: boolean; item: Item; message: string } {
  const prefixes = [...(item.prefixes || [])];
  const suffixes = [...(item.suffixes || [])];
  const totalAffixes = prefixes.length + suffixes.length;

  if (totalAffixes === 0) {
    return {
      success: false,
      item,
      message: 'На предмете нет магических свойств для изменения числовых значений!'
    };
  }

  const itemTier = item.tier || 1;
  const epicBonus = item.rarity === 'epic' ? 1.25 : item.rarity === 'legendary' ? 1.5 : 1.0;

  // Recalculate prefix values with random variance within the tier
  const newPrefixes = prefixes.map(pref => {
    const template = PREFIX_TEMPLATES.find(p => p.name === pref.name) || { multiplier: 1.0, description: pref.stat };
    const tier = pref.tier || 1;
    const affixScale = 1 + (tier - 1) * 0.15;
    // RNG variance: 0.85 to 1.15 multiplier
    const variance = 0.85 + Math.random() * 0.30;

    let bonusVal = 0;
    if (pref.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus * variance));
    } else if (pref.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus * variance));
    } else if (pref.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus * variance));
    }

    const rawDesc = template.description || pref.description.replace(/\(T\d+\)/, '').trim();
    return {
      ...pref,
      value: bonusVal,
      description: `+${bonusVal} ${rawDesc} (T${tier})`
    };
  });

  // Recalculate suffix values with random variance within the tier
  const newSuffixes = suffixes.map(suff => {
    const template = SUFFIX_TEMPLATES.find(s => s.name === suff.name) || { multiplier: 1.0, description: suff.stat };
    const tier = suff.tier || 1;
    const affixScale = 1 + (tier - 1) * 0.15;
    const variance = 0.85 + Math.random() * 0.30;

    let bonusVal = 0;
    if (suff.stat === 'health') {
      bonusVal = Math.max(4, Math.round(6 * template.multiplier * affixScale * (1 + itemTier * 0.04) * epicBonus * variance));
    } else if (suff.stat === 'damage') {
      bonusVal = Math.max(1, Math.round(2 * template.multiplier * affixScale * (1 + itemTier * 0.03) * epicBonus * variance));
    } else if (suff.stat === 'armor') {
      bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * affixScale * (1 + itemTier * 0.025) * epicBonus * variance));
    }

    const rawDesc = template.description || suff.description.replace(/\(T\d+\)/, '').trim();
    return {
      ...suff,
      value: bonusVal,
      description: `+${bonusVal} ${rawDesc} (T${tier})`
    };
  });

  const updatedItem = recalculateItemStats({
    ...item,
    prefixes: newPrefixes,
    suffixes: newSuffixes
  });

  return {
    success: true,
    item: updatedItem,
    message: 'Значения свойств перероллены!'
  };
}
