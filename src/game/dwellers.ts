/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DwellerRarity = 'common' | 'rare' | 'legendary';

export interface DwellerStats {
  strength: number;   // Кузнечное дело: бонус к статам крафта и перековке
  mining: number;     // Шахтёрство: пассивная добыча руды в гильдии
  craft: number;      // Плавка: эффективность слитков и осколков
  charisma: number;   // Таверна: приток поселенцев и счастье городка
  defense: number;    // Защита: вышка, урон и выживаемость в шахте
}

export interface Dweller {
  id: string;
  name: string;
  avatar: string;
  title: string;
  gender: 'm' | 'f';
  rarity: DwellerRarity;
  level: number;
  happiness: number; // 0 - 100
  stats: DwellerStats;
  assignedPlotId: number | null; // null = отдыхает / безработный
  quote: string;
}

const FIRST_NAMES_M = [
  'Торин', 'Балин', 'Гимли', 'Борис', 'Броггар', 
  'Олаф', 'Ингвар', 'Даг', 'Кнут', 'Двалин', 
  'Фарлин', 'Глоин', 'Брокк', 'Синдри', 'Эйнар'
];

const FIRST_NAMES_F = [
  'Хельга', 'Брунхильда', 'Астрид', 'Фрида', 'Сигрид', 
  'Марта', 'Гретхен', 'Инга', 'Тира', 'Рагна'
];

const SURNAMES = [
  'Железнорук', 'Камнеруб', 'Златокоп', 'Угольщик', 'Искропряд', 
  'Молотов', 'Медногруд', 'Кремневик', 'Наковальня', 'Буровик', 
  'Горный', 'Глубинный', 'Стальной', 'Пламенный', 'Крепкий'
];

const TITLES_BY_STAT: Record<keyof DwellerStats, string[]> = {
  strength: ['Кузнец-оружейник', 'Молотобоец', 'Мастер лат', 'Подручный кузнеца'],
  mining: ['Забойщик', 'Старатель', 'Ветеран штолен', 'Рудознатец'],
  craft: ['Мастер тигля', 'Плавильщик', 'Инженер печей', 'Алхимик шлака'],
  charisma: ['Трактирщик', 'Бард штолен', 'Зазывала артели', 'Шеф-повар'],
  defense: ['Страж ворот', 'Дозорный утеса', 'Часовой карьера', 'Ветеран обороны']
};

const QUOTES = [
  '«В шахте пахнет золотом и хорошей дракой!»',
  '«Где мой верный молот? Пора ковать шедевры!»',
  '«Печи горят — город живёт и процветает!»',
  '«Гномья похлёбка в таверне ставит на ноги любого!»',
  '«Каждая жила руды шепчет свою историю.»',
  '«Теневые твари боятся звона доброй стали!»',
  '«Дай мне наковальню — и я выкую победу!»',
  '«Ни дня без куска звонкого металла!»'
];

const AVATARS_M = ['🧔', '👨‍🏭', '👴', '🤠', '🧓', '🧙‍♂️', '👷‍♂️'];
const AVATARS_F = ['👩‍🏭', '👩‍🔧', '👩‍🦰', '👱‍♀️', '👵', '🧝‍♀️'];

export function generateDweller(fixedRarity?: DwellerRarity): Dweller {
  const isMale = Math.random() > 0.35;
  const firstName = isMale 
    ? FIRST_NAMES_M[Math.floor(Math.random() * FIRST_NAMES_M.length)]
    : FIRST_NAMES_F[Math.floor(Math.random() * FIRST_NAMES_F.length)];
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const name = `${firstName} ${surname}`;

  // Rarity roll
  let rarity: DwellerRarity = fixedRarity || 'common';
  if (!fixedRarity) {
    const roll = Math.random();
    if (roll < 0.10) rarity = 'legendary';
    else if (roll < 0.35) rarity = 'rare';
    else rarity = 'common';
  }

  const statMin = rarity === 'legendary' ? 6 : rarity === 'rare' ? 4 : 1;
  const statMax = rarity === 'legendary' ? 10 : rarity === 'rare' ? 7 : 5;

  const stats: DwellerStats = {
    strength: Math.floor(Math.random() * (statMax - statMin + 1)) + statMin,
    mining: Math.floor(Math.random() * (statMax - statMin + 1)) + statMin,
    craft: Math.floor(Math.random() * (statMax - statMin + 1)) + statMin,
    charisma: Math.floor(Math.random() * (statMax - statMin + 1)) + statMin,
    defense: Math.floor(Math.random() * (statMax - statMin + 1)) + statMin,
  };

  // Find dominant stat for title
  const statKeys = Object.keys(stats) as (keyof DwellerStats)[];
  let highestStat = statKeys[0];
  statKeys.forEach(k => {
    if (stats[k] > stats[highestStat]) highestStat = k;
  });
  const titles = TITLES_BY_STAT[highestStat];
  const title = titles[Math.floor(Math.random() * titles.length)];

  const avatarPool = isMale ? AVATARS_M : AVATARS_F;
  const avatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return {
    id: `dweller_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    avatar,
    title,
    gender: isMale ? 'm' : 'f',
    rarity,
    level: 1,
    happiness: 85 + Math.floor(Math.random() * 15),
    stats,
    assignedPlotId: null,
    quote
  };
}

export const INITIAL_DWELLERS: Dweller[] = [
  {
    id: 'dweller_starter_1',
    name: 'Борис Железнорук',
    avatar: '🧔',
    title: 'Старший кузнец',
    gender: 'm',
    rarity: 'rare',
    level: 1,
    happiness: 95,
    stats: { strength: 7, mining: 3, craft: 5, charisma: 2, defense: 4 },
    assignedPlotId: 0, // Assigned to Forge on Plot 0
    quote: '«Мой молот ещё не остыл. Покажи, что нужно выковать!»'
  },
  {
    id: 'dweller_starter_2',
    name: 'Гимли Камнеруб',
    avatar: '👨‍🏭',
    title: 'Бывалый забойщик',
    gender: 'm',
    rarity: 'common',
    level: 1,
    happiness: 90,
    stats: { strength: 4, mining: 6, craft: 2, charisma: 1, defense: 5 },
    assignedPlotId: 3, // Assigned to Smelter/Guild
    quote: '«Дайте мне кирку, и я достану металл из самого сердца скалы!»'
  },
  {
    id: 'dweller_starter_3',
    name: 'Хельга Пламенная',
    avatar: '👩‍🏭',
    title: 'Трактирщица',
    gender: 'f',
    rarity: 'rare',
    level: 1,
    happiness: 92,
    stats: { strength: 2, mining: 2, craft: 4, charisma: 8, defense: 2 },
    assignedPlotId: 2, // Assigned to Tavern
    quote: '«У меня всегда наготове горячий суп и свежие сплетни о новых жителях!»'
  }
];
