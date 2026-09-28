import { Item, ItemSlot, Rarity, ItemAffix } from '../types';

// ==========================================
// BASE ITEMS BY SLOT & TIER
// ==========================================
export const BASE_ITEMS: Record<ItemSlot, { name: string; baseHp: number; baseDmg: number; baseArm: number }[]> = {
  weapon: [
    { name: 'Кирка Шахтёра', baseHp: 0, baseDmg: 6, baseArm: 0 },
    { name: 'Кованый Меч', baseHp: 4, baseDmg: 10, baseArm: 0 },
    { name: 'Стальной Палаш', baseHp: 8, baseDmg: 15, baseArm: 1 },
    { name: 'Обсидиановый Клинок', baseHp: 12, baseDmg: 21, baseArm: 1 },
    { name: 'Рунный Секач Недр', baseHp: 18, baseDmg: 28, baseArm: 2 }
  ],
  head: [
    { name: 'Кожаный Подшлемник', baseHp: 8, baseDmg: 0, baseArm: 1 },
    { name: 'Шахтёрская Каска', baseHp: 14, baseDmg: 1, baseArm: 2 },
    { name: 'Стальной Бацинет', baseHp: 22, baseDmg: 2, baseArm: 4 },
    { name: 'Шлем Глубинного Стража', baseHp: 32, baseDmg: 2, baseArm: 6 },
    { name: 'Венец Бездны', baseHp: 45, baseDmg: 3, baseArm: 8 }
  ],
  chest: [
    { name: 'Плотная Стеганка', baseHp: 14, baseDmg: 0, baseArm: 2 },
    { name: 'Клёпаный Нагрудник', baseHp: 24, baseDmg: 1, baseArm: 4 },
    { name: 'Пластинчатая Кираса', baseHp: 36, baseDmg: 1, baseArm: 7 },
    { name: 'Латы Горного Титана', baseHp: 52, baseDmg: 2, baseArm: 11 },
    { name: 'Панцирь Тёмных Недр', baseHp: 72, baseDmg: 3, baseArm: 15 }
  ]
};

// ==========================================
// PREFIX POOL (Префиксы)
// ==========================================
export interface AffixTemplate {
  name: string;
  stat: 'health' | 'damage' | 'armor';
  multiplier: number;
  description: string;
  allowedSlots?: ItemSlot[];
}

export const PREFIX_TEMPLATES: AffixTemplate[] = [
  { name: 'Острый', stat: 'damage', multiplier: 1.25, description: '+Урон', allowedSlots: ['weapon', 'head'] },
  { name: 'Закалённый', stat: 'armor', multiplier: 1.3, description: '+Броня', allowedSlots: ['chest', 'head', 'weapon'] },
  { name: 'Титановый', stat: 'health', multiplier: 1.35, description: '+Здоровье' },
  { name: 'Теневой', stat: 'damage', multiplier: 1.3, description: '+Урон и Тьма' },
  { name: 'Рунный', stat: 'armor', multiplier: 1.35, description: '+Броня и Стойкость' },
  { name: 'Пламенный', stat: 'damage', multiplier: 1.4, description: '+Огненный урон', allowedSlots: ['weapon'] },
  { name: 'Адамантовый', stat: 'armor', multiplier: 1.45, description: '+Высшая броня', allowedSlots: ['chest', 'head'] },
  { name: 'Древний', stat: 'health', multiplier: 1.4, description: '+Древнее здоровье' },
  { name: 'Тяжёлый', stat: 'armor', multiplier: 1.25, description: '+Броня', allowedSlots: ['chest', 'head'] },
  { name: 'Мифриловый', stat: 'health', multiplier: 1.3, description: '+Мифриловая стойкость' }
];

// ==========================================
// SUFFIX POOL (Суффиксы)
// ==========================================
export const SUFFIX_TEMPLATES: AffixTemplate[] = [
  { name: 'Медведя', stat: 'health', multiplier: 1.3, description: '+Здоровье медведя' },
  { name: 'Сокола', stat: 'damage', multiplier: 1.3, description: '+Урон сокола' },
  { name: 'Черепахи', stat: 'armor', multiplier: 1.35, description: '+Броня черепахи', allowedSlots: ['chest', 'head'] },
  { name: 'Стойкости', stat: 'health', multiplier: 1.25, description: '+Стойкость к ударам' },
  { name: 'Ярости', stat: 'damage', multiplier: 1.35, description: '+Ярость битвы', allowedSlots: ['weapon'] },
  { name: 'Глубин', stat: 'armor', multiplier: 1.3, description: '+Защита глубин' },
  { name: 'Несокрушимости', stat: 'armor', multiplier: 1.45, description: '+Несокрушимый оплот', allowedSlots: ['chest'] },
  { name: 'Тёмных Недр', stat: 'damage', multiplier: 1.35, description: '+Сила недр' },
  { name: 'Горного Великана', stat: 'health', multiplier: 1.45, description: '+Здоровье великана' },
  { name: 'Стального Стража', stat: 'armor', multiplier: 1.4, description: '+Стальная защита' }
];

// ==========================================
// GENERATOR FUNCTION
// ==========================================
export function generateRPGItem(slot: ItemSlot, level: number = 0, forcedRarity?: Rarity): Item {
  // 1. Determine Rarity
  const rarities: { r: Rarity; chance: number }[] = [
    { r: 'common', chance: 0.50 },
    { r: 'magic', chance: 0.30 },
    { r: 'rare', chance: 0.15 },
    { r: 'epic', chance: 0.05 }
  ];

  let rarity: Rarity = forcedRarity || 'common';
  if (!forcedRarity) {
    const roll = Math.random();
    let cumulative = 0;
    for (const item of rarities) {
      cumulative += item.chance;
      if (roll <= cumulative) {
        rarity = item.r;
        break;
      }
    }
  }

  // 2. Select Base Item according to level
  const basePool = BASE_ITEMS[slot];
  const tierIndex = Math.min(basePool.length - 1, Math.max(0, level));
  const baseTemplate = basePool[tierIndex];

  // Base Stats scaled by rarity & tier
  const rarityMultipliers: Record<Rarity, number> = {
    common: 1.0,
    magic: 1.15,
    rare: 1.30,
    epic: 1.50
  };
  const rMulti = rarityMultipliers[rarity] * (1 + level * 0.15);

  let health = Math.round(baseTemplate.baseHp * rMulti);
  let damage = Math.round(baseTemplate.baseDmg * rMulti);
  let armor = Math.round(baseTemplate.baseArm * rMulti);

  // 3. Roll Affixes according to Rarity:
  // - Common: No affixes
  // - Magic: 1 affix (50% prefix, 50% suffix)
  // - Rare: 2 affixes (1 prefix + 1 suffix)
  // - Epic: 2 affixes with elevated stats
  let prefix: ItemAffix | undefined = undefined;
  let suffix: ItemAffix | undefined = undefined;

  const validPrefixes = PREFIX_TEMPLATES.filter(p => !p.allowedSlots || p.allowedSlots.includes(slot));
  const validSuffixes = SUFFIX_TEMPLATES.filter(s => !s.allowedSlots || s.allowedSlots.includes(slot));

  if (rarity === 'magic') {
    const isPrefix = Math.random() > 0.5;
    if (isPrefix && validPrefixes.length > 0) {
      const template = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
      let bonusVal = 0;
      if (template.stat === 'health') {
        bonusVal = Math.max(4, Math.round(8 * template.multiplier * (1 + level * 0.2)));
        health += bonusVal;
      } else if (template.stat === 'damage') {
        bonusVal = Math.max(1, Math.round(2 * template.multiplier * (1 + level * 0.15)));
        damage += bonusVal;
      } else if (template.stat === 'armor') {
        bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * (1 + level * 0.12)));
        armor += bonusVal;
      }

      prefix = {
        name: template.name,
        type: 'prefix',
        stat: template.stat,
        value: bonusVal,
        description: `+${bonusVal} ${template.description}`
      };
    } else if (validSuffixes.length > 0) {
      const template = validSuffixes[Math.floor(Math.random() * validSuffixes.length)];
      let bonusVal = 0;
      if (template.stat === 'health') {
        bonusVal = Math.max(4, Math.round(8 * template.multiplier * (1 + level * 0.2)));
        health += bonusVal;
      } else if (template.stat === 'damage') {
        bonusVal = Math.max(1, Math.round(2 * template.multiplier * (1 + level * 0.15)));
        damage += bonusVal;
      } else if (template.stat === 'armor') {
        bonusVal = Math.max(1, Math.round(1.2 * template.multiplier * (1 + level * 0.12)));
        armor += bonusVal;
      }

      suffix = {
        name: template.name,
        type: 'suffix',
        stat: template.stat,
        value: bonusVal,
        description: `+${bonusVal} ${template.description}`
      };
    }
  } else if (rarity === 'rare' || rarity === 'epic') {
    const epicBonus = rarity === 'epic' ? 1.3 : 1.0;

    // Pick Prefix
    if (validPrefixes.length > 0) {
      const template = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
      let bonusVal = 0;
      if (template.stat === 'health') {
        bonusVal = Math.max(6, Math.round(12 * template.multiplier * (1 + level * 0.25) * epicBonus));
        health += bonusVal;
      } else if (template.stat === 'damage') {
        bonusVal = Math.max(2, Math.round(3 * template.multiplier * (1 + level * 0.2) * epicBonus));
        damage += bonusVal;
      } else if (template.stat === 'armor') {
        bonusVal = Math.max(1, Math.round(1.8 * template.multiplier * (1 + level * 0.15) * epicBonus));
        armor += bonusVal;
      }

      prefix = {
        name: template.name,
        type: 'prefix',
        stat: template.stat,
        value: bonusVal,
        description: `+${bonusVal} ${template.description}`
      };
    }

    // Pick Suffix
    if (validSuffixes.length > 0) {
      const template = validSuffixes[Math.floor(Math.random() * validSuffixes.length)];
      let bonusVal = 0;
      if (template.stat === 'health') {
        bonusVal = Math.max(6, Math.round(12 * template.multiplier * (1 + level * 0.25) * epicBonus));
        health += bonusVal;
      } else if (template.stat === 'damage') {
        bonusVal = Math.max(2, Math.round(3 * template.multiplier * (1 + level * 0.2) * epicBonus));
        damage += bonusVal;
      } else if (template.stat === 'armor') {
        bonusVal = Math.max(1, Math.round(1.8 * template.multiplier * (1 + level * 0.15) * epicBonus));
        armor += bonusVal;
      }

      suffix = {
        name: template.name,
        type: 'suffix',
        stat: template.stat,
        value: bonusVal,
        description: `+${bonusVal} ${template.description}`
      };
    }
  }

  // 4. Construct Display Name
  let finalName = baseTemplate.name;
  if (prefix && suffix) {
    finalName = `${prefix.name} ${baseTemplate.name} ${suffix.name}`;
  } else if (prefix) {
    finalName = `${prefix.name} ${baseTemplate.name}`;
  } else if (suffix) {
    finalName = `${baseTemplate.name} ${suffix.name}`;
  }

  return {
    id: Math.random().toString(36).substring(7),
    name: finalName,
    baseName: baseTemplate.name,
    slot,
    rarity,
    stats: {
      health,
      damage,
      armor
    },
    prefix,
    suffix,
    level: level + 1
  };
}
