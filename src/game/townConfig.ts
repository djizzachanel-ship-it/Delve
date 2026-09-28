import { TownBuildings, TownBuff, Resources, BuildingType, TownPlot } from '../types';
import { Dweller } from './dwellers';

export interface BuildingInfo {
  id: BuildingType;
  name: string;
  shortDesc: string;
  icon: string;
  maxLevel: number;
  workerSlotCount: (level: number) => number;
  primaryStat: 'strength' | 'mining' | 'craft' | 'charisma' | 'defense';
  primaryStatDesc: string;
  getLevelDesc: (level: number) => string;
  getNextUpgradeDesc: (level: number) => string;
  getCost: (level: number) => { ore: number; metal: number; shards: number };
}


export const BUILDINGS_CONFIG: Record<BuildingType, BuildingInfo> = {
  town_hall: {
    id: 'town_hall',
    name: 'Ратуша «Чертог Старейшин»',
    shortDesc: 'Центр управления поселением: градостроительство, инфраструктура и крепостная баллиста',
    icon: 'Landmark',
    maxLevel: 5,
    workerSlotCount: (lvl) => Math.min(3, lvl),
    primaryStat: 'charisma',
    primaryStatDesc: 'Харизма старосты ускоряет приток жителей и увеличивает общее производство (+3% за очко)',
    getLevelDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Деревянный чертог. Управление поселением и градостроительство. Баллиста: 20 урона.';
        case 2: return 'Каменный совет. +2 слота застройки. Прочность: +400 HP. Баллиста: 35 урона.';
        case 3: return 'Укреплённая ратуша. Увеличивает лимит жителей и счастье. Баллиста: 55 урона.';
        case 4: return 'Цитадель Недр. +20% к пассивной добыче всех зданий. Двойная баллиста: 80 урона.';
        case 5: return 'Величественный замок. Абсолютная защита поселения и статус столицы региона.';
        default: return 'Главное здание поселения';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Увеличит запас здоровья Ратуши до 1800 HP, урон баллисты до 35 и откроет новые постройки';
        case 2: return 'Увеличит счастье жителей, пассивный доход и откроет Дозорные башни';
        case 3: return 'Откроет продвинутую оборону и увеличит дальность поражения баллисты';
        case 4: return 'Максимальный уровень: превратит поселение в неприступную Цитадель Недр';
        default: return 'Максимальный уровень';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 0, metal: 0, shards: 0 },       // 0 -> 1
        { ore: 45, metal: 20, shards: 1 },     // 1 -> 2
        { ore: 95, metal: 50, shards: 3 },     // 2 -> 3
        { ore: 180, metal: 100, shards: 8 },   // 3 -> 4
        { ore: 350, metal: 200, shards: 20 },  // 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  forge: {
    id: 'forge',
    name: 'Кузница «Жаркий Горн»',
    shortDesc: 'Ковка оружия, шлемов и нагрудников со сбалансированными характеристиками',
    icon: 'Hammer',
    maxLevel: 5,
    workerSlotCount: (lvl) => Math.min(2, lvl),
    primaryStat: 'strength',
    primaryStatDesc: 'Сила кузнеца усиливает базовые характеристики скованной брони и оружия (+2% за очко)',
    getLevelDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Т1 Снаряжение (Бронзовое). Базовые характеристики.';
        case 2: return 'Т2 Снаряжение (Кованое железо). Шанс Редких аффиксов.';
        case 3: return 'Т3 Снаряжение (Закалённая сталь). Доступна перековка аффиксов.';
        case 4: return 'Т4 Снаряжение (Обсидиан и Руны). Гарантировано 2 мощных аффикса.';
        case 5: return 'Т5 Снаряжение (Древний Мифрил). Легендарная мощь недр.';
        default: return 'Базовая кузница';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Откроет Т2 ковку (Кованое железо) и +20% шанс редких аффиксов';
        case 2: return 'Откроет Т3 ковку (Сталь) и возможность перековывать свойства';
        case 3: return 'Откроет Т4 ковку (Обсидиан) с гарантированными парными аффиксами';
        case 4: return 'Откроет высший Т5 тир (Мифрил) и максимальные показатели урона';
        default: return 'Максимальный уровень мастерства';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 20, metal: 8, shards: 0 },    // 0 -> 1 (стройка)
        { ore: 35, metal: 15, shards: 0 },   // 1 -> 2
        { ore: 65, metal: 30, shards: 2 },   // 2 -> 3
        { ore: 110, metal: 55, shards: 5 },  // 3 -> 4
        { ore: 200, metal: 100, shards: 10 },// 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  smelter: {
    id: 'smelter',
    name: 'Плавильня «Огненный Тигель»',
    shortDesc: 'Переплавка сырой руды в прочные слитки металла и пассивный доход',
    icon: 'Flame',
    maxLevel: 5,
    workerSlotCount: (lvl) => Math.min(2, lvl),
    primaryStat: 'craft',
    primaryStatDesc: 'Мастерство плавильщика даёт бонусный металл при переплавке и шанс кристаллов',
    getLevelDesc: (lvl) => {
      if (lvl === 0) return 'Не построена. Постройте для плавки руды в металл.';
      switch (lvl) {
        case 1: return 'Примитивная печь: курс 3 руды = 1 металл. Пассивный доход: +1 металл / мин.';
        case 2: return 'Двухкамерная печь: курс 2.5 руды = 1 металл. Пассивный доход: +2 металла / мин.';
        case 3: return 'Паровой дутьевой горн: курс 2 руды = 1 металл. Пассивный доход: +4 металла / мин.';
        case 4: return 'Магический тигель: 15% шанс получить Осколок при плавке!';
        case 5: return 'Автономная домна: максимальная скорость выплавки и пассивных слитков.';
        default: return 'Печь работает на полную мощность';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      if (lvl === 0) return 'Построить плавильню для превращения руды в ценный металл';
      switch (lvl) {
        case 1: return 'Улучшит курс до 2.5 к 1 и удвоит пассивную выплавку';
        case 2: return 'Улучшит курс до 2 к 1 и ускорит работу печи';
        case 3: return 'Даст шанс 15% выкристаллизовать Осколок при каждой переплавке';
        case 4: return 'Автоматизирует процесс и увеличит выплавку в 2 раза';
        default: return 'Максимальный уровень';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 15, metal: 5, shards: 0 },    // 0 -> 1
        { ore: 35, metal: 15, shards: 0 },   // 1 -> 2
        { ore: 65, metal: 30, shards: 2 },   // 2 -> 3
        { ore: 110, metal: 55, shards: 4 },  // 3 -> 4
        { ore: 200, metal: 95, shards: 8 },  // 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  tavern: {
    id: 'tavern',
    name: 'Таверна «Привал Рудокопа»',
    shortDesc: 'Отдых перед спуском, сытная еда, привлечение новых жителей городка',
    icon: 'Coffee',
    maxLevel: 5,
    workerSlotCount: (lvl) => 1,
    primaryStat: 'charisma',
    primaryStatDesc: 'Харизма трактирщика ускоряет прибытие новых жителей и повышает общее счастье',
    getLevelDesc: (lvl) => {
      if (lvl === 0) return 'Не построена. Постройте, чтобы отдыхать и брать пайки в шахту.';
      switch (lvl) {
        case 1: return 'Деревянный трактир: Полное исцеление + Сытная похлёбка (+25 макс. HP).';
        case 2: return 'Уютный камин: Доступен Горючий эликсир (+50% к радиусу и времени факелов).';
        case 3: return 'Погреб настоек: Гномья настойка (+20% к урону и шансу крита).';
        case 4: return 'Привал ветеранов: Дополнительный бонус +10% к шансу ценного лута.';
        case 5: return 'Сердце городка: Все эффекты блюд усиливаются на 50%.';
        default: return 'Уютный трактир';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      if (lvl === 0) return 'Построить таверну для исцеления и провианта перед экспедициями';
      switch (lvl) {
        case 1: return 'Откроет Горючий эликсир для безопасного исследования темноты';
        case 2: return 'Откроет Гномью настойку, повышающую урон шахтёра в бою';
        case 3: return 'Откроет бонус удачи старателя к выпадению экипировки';
        case 4: return 'Усилит все порции еды и зелий на 50%';
        default: return 'Максимальный уровень';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 20, metal: 8, shards: 0 },    // 0 -> 1
        { ore: 40, metal: 18, shards: 1 },   // 1 -> 2
        { ore: 75, metal: 35, shards: 2 },   // 2 -> 3
        { ore: 130, metal: 65, shards: 5 },  // 3 -> 4
        { ore: 220, metal: 110, shards: 10 },// 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  guild: {
    id: 'guild',
    name: 'Гильдия Старателей',
    shortDesc: 'Автономная добыча руды наёмными шахтёрами и увеличение хранилища',
    icon: 'Warehouse',
    maxLevel: 5,
    workerSlotCount: (lvl) => Math.min(3, lvl),
    primaryStat: 'mining',
    primaryStatDesc: 'Добыча шахтёра напрямую умножает пассивный приток сырой руды и металла',
    getLevelDesc: (lvl) => {
      if (lvl === 0) return 'Не построена. Постройте артель для пассивного сбора руды!';
      switch (lvl) {
        case 1: return '1 рабочий забой: добыча руды +3/мин.';
        case 2: return '2 рабочих забоя: +6 руды и +1 металл / мин.';
        case 3: return 'Механизированный подъемник: +12 руды и +3 металла / мин.';
        case 4: return 'Картель рудокопов: +20 руды, +6 металла, редкие осколки.';
        case 5: return 'Шахтёрская корпорация: максимальный поток сырья!';
        default: return 'Старатели неустанно трудятся';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      if (lvl === 0) return 'Построить артель старателей для пассивной добычи руды';
      switch (lvl) {
        case 1: return 'Нанять ещё старателей и увеличить вместимость склада';
        case 2: return 'Установить подъёмник для автоматической доставки металла';
        case 3: return 'Организовать глубокие шурфы для поиска осколков кристаллов';
        case 4: return 'Максимальная модернизация добывающего картеля';
        default: return 'Максимальный уровень';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 15, metal: 6, shards: 0 },    // 0 -> 1
        { ore: 35, metal: 15, shards: 0 },   // 1 -> 2
        { ore: 70, metal: 32, shards: 2 },   // 2 -> 3
        { ore: 120, metal: 60, shards: 4 },  // 3 -> 4
        { ore: 210, metal: 100, shards: 9 }, // 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  barracks: {
    id: 'barracks',
    name: 'Жилые Бараки «Тёплый Кров»',
    shortDesc: 'Увеличивает вместимость жителей городка и обеспечивает им отдых',
    icon: 'Home',
    maxLevel: 5,
    workerSlotCount: () => 0,
    primaryStat: 'defense',
    primaryStatDesc: 'Каждый уровень бараков расширяет лимит жителей на +3',
    getLevelDesc: (lvl) => {
      if (lvl === 0) return 'Не построены. Городок может вместить только 3 жителей.';
      return `Вместимость городка: +${lvl * 3} жителей. Отдых повышает настроение на ${lvl * 5}%.`;
    },
    getNextUpgradeDesc: (lvl) => {
      return `Увеличит вместимость городка на +3 жителя (макс. ${(lvl + 1) * 3 + 3})`;
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 15, metal: 5, shards: 0 },    // 0 -> 1
        { ore: 30, metal: 12, shards: 0 },   // 1 -> 2
        { ore: 60, metal: 28, shards: 1 },   // 2 -> 3
        { ore: 100, metal: 50, shards: 3 },  // 3 -> 4
        { ore: 180, metal: 90, shards: 6 },  // 4 -> 5
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  workshop: {
    id: 'workshop',
    name: 'Мастерская Вагонеток',
    shortDesc: 'Разработка оборонительных модулей и прожекторов для рельсов',
    icon: 'Wrench',
    maxLevel: 3,
    workerSlotCount: (lvl) => 1,
    primaryStat: 'craft',
    primaryStatDesc: 'Инженер ускоряет стрельбу турели и радиус магнита вагонетки',
    getLevelDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Открыта установка Мощного Прожектора и Авто-Турели.';
        case 2: return 'Открыта установка Магнита Руды и ускорение тележки.';
        case 3: return 'Открыт Тесла-разрядник по рельсам и усиление скорострельности.';
        default: return 'Мастерская работает';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      switch (lvl) {
        case 1: return 'Откроет магнитный захват ресурсов и улучшенные ходовые части';
        case 2: return 'Откроет электро-защиту путей от теневых тварей';
        default: return 'Все модули исследованы';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 20, metal: 8, shards: 0 },   // 0 -> 1
        { ore: 40, metal: 20, shards: 1 },  // 1 -> 2
        { ore: 85, metal: 45, shards: 3 },  // 2 -> 3
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  },

  watchtower: {
    id: 'watchtower',
    name: 'Дозорная Вышка',
    shortDesc: 'Охрана городка, обнаружение скрытых жил и боевая поддержка в шахте',
    icon: 'Shield',
    maxLevel: 3,
    workerSlotCount: (lvl) => 1,
    primaryStat: 'defense',
    primaryStatDesc: 'Часовой на вышке даёт герою постоянный бонус +брони и урона в шахте',
    getLevelDesc: (lvl) => {
      if (lvl === 0) return 'Не построена. Постройте вышку для боевых бонусов.';
      switch (lvl) {
        case 1: return 'Дозорный пост: +3 к базовому урону в шахте.';
        case 2: return 'Сигнальный горн: +6 к урону и +2 к броне.';
        case 3: return 'Крепостная башня: +10 к урону, +4 к броне, подсветка врагов.';
        default: return 'Вышка стоит на страже';
      }
    },
    getNextUpgradeDesc: (lvl) => {
      if (lvl === 0) return 'Построить дозорную вышку для укрепления обороны';
      switch (lvl) {
        case 1: return 'Увеличит бонус урона и добавит +2 брони герою';
        case 2: return 'Максимальная защита: +10 урона и +4 брони';
        default: return 'Максимальный уровень';
      }
    },
    getCost: (lvl) => {
      const costs = [
        { ore: 25, metal: 10, shards: 0 },  // 0 -> 1
        { ore: 50, metal: 25, shards: 1 },  // 1 -> 2
        { ore: 100, metal: 50, shards: 3 }, // 2 -> 3
      ];
      return costs[lvl] || { ore: 999, metal: 999, shards: 99 };
    }
  }
};

export function getBuildingDefenseStats(type: BuildingType, level: number = 1): {
  isDefensive: boolean;
  damage?: number;
  attackRange?: number;
  attackSpeed?: number;
  targetType?: 'ground' | 'air' | 'all';
  hp: number;
  maxHp: number;
} {
  switch (type) {
    case 'town_hall':
      return {
        isDefensive: true,
        damage: 15 + level * 10,
        attackRange: 5 + Math.floor(level * 0.5),
        attackSpeed: 1.0 + level * 0.1,
        targetType: 'all',
        hp: 1200 + level * 300,
        maxHp: 1200 + level * 300
      };
    case 'watchtower':
      return {
        isDefensive: true,
        damage: 22 + level * 12,
        attackRange: 6 + level * 0.5,
        attackSpeed: 1.4 + level * 0.2,
        targetType: 'all',
        hp: 600 + level * 200,
        maxHp: 600 + level * 200
      };
    case 'workshop':
      return {
        isDefensive: true,
        damage: 12 + level * 8,
        attackRange: 4,
        attackSpeed: 0.8,
        targetType: 'ground',
        hp: 750 + level * 150,
        maxHp: 750 + level * 150
      };
    case 'forge':
      return { isDefensive: false, hp: 800 + level * 200, maxHp: 800 + level * 200 };
    case 'barracks':
      return { isDefensive: false, hp: 900 + level * 250, maxHp: 900 + level * 250 };
    case 'smelter':
      return { isDefensive: false, hp: 750 + level * 180, maxHp: 750 + level * 180 };
    case 'tavern':
      return { isDefensive: false, hp: 700 + level * 150, maxHp: 700 + level * 150 };
    case 'guild':
      return { isDefensive: false, hp: 650 + level * 150, maxHp: 650 + level * 150 };
  }
}

export function createDefaultPlots(): TownPlot[] {
  return [
    { 
      id: 0, 
      name: 'Ратуша «Чертог Старейшин»',
      buildingType: 'town_hall', 
      level: 1, 
      assignedDwellerIds: [], 
      tileX: 9, 
      tileY: 8,
      positionGrid: { x: 9, y: 8, width: 2, height: 2 },
      isDefensive: true,
      targetType: 'all',
      damage: 25,
      attackRange: 5,
      attackSpeed: 1.1,
      hp: 1500,
      maxHp: 1500
    },
    { 
      id: 1, 
      name: 'Кузница «Жаркий Горн»',
      buildingType: 'forge', 
      level: 1, 
      assignedDwellerIds: ['dweller_starter_1'], 
      tileX: 14, 
      tileY: 9,
      positionGrid: { x: 14, y: 9, width: 2, height: 2 },
      isDefensive: false,
      hp: 1000,
      maxHp: 1000
    },
    { 
      id: 2, 
      name: 'Жилые бараки',
      buildingType: 'barracks', 
      level: 1, 
      assignedDwellerIds: [], 
      tileX: 11, 
      tileY: 4,
      positionGrid: { x: 11, y: 4, width: 2, height: 2 },
      isDefensive: false,
      hp: 1150,
      maxHp: 1150
    },
    { 
      id: 3, 
      name: 'Таверна «Пьяный Рудокоп»',
      buildingType: 'tavern', 
      level: 1, 
      assignedDwellerIds: ['dweller_starter_3'], 
      tileX: 5, 
      tileY: 10,
      positionGrid: { x: 5, y: 10, width: 2, height: 2 },
      isDefensive: false,
      hp: 850,
      maxHp: 850
    },
    { 
      id: 4, 
      name: 'Плавильня «Огненный Тигель»',
      buildingType: 'smelter', 
      level: 1, 
      assignedDwellerIds: ['dweller_starter_2'], 
      tileX: 10, 
      tileY: 14,
      positionGrid: { x: 10, y: 14, width: 2, height: 2 },
      isDefensive: false,
      hp: 930,
      maxHp: 930
    },
  ];
}


// ==========================================
// TAVERN MEALS & BUFFS
// ==========================================
export const TAVERN_MEALS: { id: string; name: string; desc: string; cost: { ore: number; metal: number }; buff: TownBuff; minLevel: number }[] = [
  {
    id: 'stew',
    name: '🍲 Похлёбка из пещерных грибов',
    desc: '+25 к максимальному здоровью на следующий спуск',
    cost: { ore: 6, metal: 2 },
    minLevel: 1,
    buff: {
      id: 'stew',
      name: 'Сытый рудокоп',
      desc: '+25 макс. HP',
      bonusHp: 25
    }
  },
  {
    id: 'torch_oil',
    name: '🧪 Горючий концентрат',
    desc: '+50% к радиусу света и длительности брошенных факелов',
    cost: { ore: 10, metal: 4 },
    minLevel: 2,
    buff: {
      id: 'torch_oil',
      name: 'Яркое пламя',
      desc: '+50% время и радиус факелов',
      bonusTorchLife: 1.5
    }
  },
  {
    id: 'dwarf_ale',
    name: '🍺 Крепкий гномий эль',
    desc: '+6 к урону и +15% к шансу критического удара',
    cost: { ore: 14, metal: 6 },
    minLevel: 3,
    buff: {
      id: 'dwarf_ale',
      name: 'Ярость подземелий',
      desc: '+6 урона, повышенный крит',
      bonusDmg: 6
    }
  }
];

// ==========================================
// BUILDING & DWELLER BONUS HELPERS
// ==========================================
export function getBuildingLevelFromPlots(plots: TownPlot[] | undefined, type: BuildingType): number {
  if (!plots || !Array.isArray(plots)) return 0;
  const plot = plots.find(p => p.buildingType === type);
  return plot ? plot.level : 0;
}

export function getDwellersInBuilding(plots: TownPlot[] | undefined, dwellers: Dweller[] | undefined, type: BuildingType): Dweller[] {
  if (!plots || !dwellers) return [];
  const plot = plots.find(p => p.buildingType === type);
  if (!plot || !plot.assignedDwellerIds) return [];
  return dwellers.filter(d => plot.assignedDwellerIds.includes(d.id));
}

export function getMaxDwellers(plots: TownPlot[] | undefined): number {
  const barracksLvl = getBuildingLevelFromPlots(plots, 'barracks');
  return 3 + (barracksLvl * 3);
}

export function getForgeDwellerBonus(plots: TownPlot[] | undefined, dwellers: Dweller[] | undefined): { statMultiplier: number; bonusRareLuck: number; blacksmithNames: string[] } {
  const workers = getDwellersInBuilding(plots, dwellers, 'forge');
  if (workers.length === 0) return { statMultiplier: 1.0, bonusRareLuck: 0, blacksmithNames: [] };

  const totalStrength = workers.reduce((sum, w) => sum + (w.stats.strength || 0), 0);
  return {
    statMultiplier: 1 + (totalStrength * 0.025), // +2.5% stats per strength point!
    bonusRareLuck: totalStrength * 0.015,         // +1.5% rare/epic luck per strength point!
    blacksmithNames: workers.map(w => w.name)
  };
}

export function getWatchtowerBonus(plots: TownPlot[] | undefined, dwellers: Dweller[] | undefined): { damage: number; armor: number } {
  const towerLvl = getBuildingLevelFromPlots(plots, 'watchtower');
  if (towerLvl === 0) return { damage: 0, armor: 0 };

  const workers = getDwellersInBuilding(plots, dwellers, 'watchtower');
  const defensePoints = workers.reduce((sum, w) => sum + (w.stats.defense || 0), 0);

  const baseDmg = towerLvl === 1 ? 3 : towerLvl === 2 ? 6 : 10;
  const baseArm = towerLvl === 1 ? 0 : towerLvl === 2 ? 2 : 4;

  return {
    damage: baseDmg + Math.floor(defensePoints * 0.5),
    armor: baseArm + Math.floor(defensePoints * 0.3)
  };
}

// ==========================================
// PASSIVE RESOURCE INCOME CALCULATION
// ==========================================
export function calculatePassiveIncome(
  town: TownBuildings,
  lastCollectTime: number = Date.now(),
  now: number = Date.now(),
  plots?: TownPlot[],
  dwellers?: Dweller[]
): { ore: number; metal: number; shards: number; minutesPassed: number; isCapped: boolean } {
  const guildLvl = plots ? getBuildingLevelFromPlots(plots, 'guild') : (town.guild || 0);
  const smelterLvl = plots ? getBuildingLevelFromPlots(plots, 'smelter') : (town.smelter || 0);

  if (guildLvl === 0 && smelterLvl === 0) {
    return { ore: 0, metal: 0, shards: 0, minutesPassed: 0, isCapped: false };
  }

  // Workers bonus in guild and smelter
  const guildWorkers = getDwellersInBuilding(plots, dwellers, 'guild');
  const totalMining = guildWorkers.reduce((sum, w) => sum + (w.stats.mining || 0), 0);

  const smelterWorkers = getDwellersInBuilding(plots, dwellers, 'smelter');
  const totalCraft = smelterWorkers.reduce((sum, w) => sum + (w.stats.craft || 0), 0);

  // Maximum idle time accumulation: 120 minutes (2 hours)
  const elapsedMs = Math.max(0, now - lastCollectTime);
  const rawMinutes = elapsedMs / (1000 * 60);
  const maxMinutes = 120;
  const minutes = Math.min(rawMinutes, maxMinutes);
  const isCapped = rawMinutes >= maxMinutes;

  // Rates per minute
  let orePerMin = 0;
  let metalPerMin = 0;
  let shardChance = 0;

  if (guildLvl >= 1) orePerMin += 3 + Math.floor(totalMining * 0.4);
  if (guildLvl >= 2) { orePerMin += 3; metalPerMin += 1 + Math.floor(totalMining * 0.2); }
  if (guildLvl >= 3) { orePerMin += 6; metalPerMin += 2; }
  if (guildLvl >= 4) { orePerMin += 8; metalPerMin += 3; shardChance += 0.05; }
  if (guildLvl >= 5) { orePerMin += 12; metalPerMin += 5; shardChance += 0.1; }

  if (smelterLvl >= 1) metalPerMin += 1 + Math.floor(totalCraft * 0.3);
  if (smelterLvl >= 2) metalPerMin += 1.5;
  if (smelterLvl >= 3) metalPerMin += 2.5;
  if (smelterLvl >= 4) { metalPerMin += 3.5; shardChance += 0.05 + (totalCraft * 0.01); }
  if (smelterLvl >= 5) metalPerMin += 5;

  const totalOre = Math.floor(orePerMin * minutes);
  const totalMetal = Math.floor(metalPerMin * minutes);
  const totalShards = Math.floor(shardChance * minutes);

  return {
    ore: totalOre,
    metal: totalMetal,
    shards: totalShards,
    minutesPassed: Math.floor(minutes),
    isCapped
  };
}

