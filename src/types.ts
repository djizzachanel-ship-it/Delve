import { Dweller } from './game/dwellers';

export type ItemSlot = 'weapon' | 'head' | 'chest';
export type Rarity = 'common' | 'magic' | 'rare' | 'epic';

export interface ItemAffix {
  name: string;
  type: 'prefix' | 'suffix';
  stat: 'health' | 'damage' | 'armor';
  value: number;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  baseName?: string;
  slot: ItemSlot;
  rarity: Rarity;
  stats: {
    health: number;
    damage: number;
    armor: number;
  };
  prefix?: ItemAffix;
  suffix?: ItemAffix;
  level?: number;
}

export interface Player {
  baseHealth: number;
  health: number;
  baseDamage: number;
  baseArmor: number;
  level: number;
  xp: number;
}

export interface Monster {
  id: string;
  name: string;
  maxHealth: number;
  health: number;
  damage: number;
}

export interface Resources {
  ore: number;
  metal: number;
  shards: number;
}

export interface FloatingText {
  id: string;
  text: string;
  type: 'damage' | 'heal' | 'loot' | 'playerDamage';
}

export type BuildingType = 
  | 'town_hall'  // Ратуша (Главное здание поселения, градостроительство, центр обороны)
  | 'forge'      // Кузница (Ковка брони, шлемов, оружия и перековка)
  | 'smelter'    // Плавильня (Переплавка руды в металл и осколки)
  | 'tavern'     // Таверна (Отдых, пайки, приток жителей, счастье)
  | 'guild'      // Гильдия старателей (Пассивная добыча руды)
  | 'barracks'   // Жилые бараки (Вместимость жителей, отдых)
  | 'workshop'   // Мастерская вагонеток (Модули тележки)
  | 'watchtower';// Дозорная вышка (Защитные баффы и боевая башня)

export interface PositionGrid {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TargetType = 'ground' | 'air' | 'all' | 'closest' | 'strongest';

export interface TownPlot {
  id: number;                     // ID постройки / участка
  name?: string;                  // Название объекта
  buildingType: BuildingType | null; // null = свободный участок для застройки
  level: number;                  // 1..5
  assignedDwellerIds: string[];   // ID назначенных жителей
  tileX?: number;                 // Координата X на ландшафте городка
  tileY?: number;                 // Координата Y на ландшафте городка
  
  // City Grid System & Tower Defense Architecture
  positionGrid?: PositionGrid;    // Ячейки координатной сетки { x, y, width, height }
  isDefensive?: boolean;          // Оборонительное сооружение (наносит урон врагам)
  targetType?: TargetType;        // Тип целей (наземные, воздушные, все)
  damage?: number;                // Урон за атаку в режиме Tower Defense
  attackRange?: number;           // Радиус поражения в клетках сетки
  attackSpeed?: number;           // Скорость атаки (выстрелов в секунду)
  hp?: number;                    // Текущее здоровье здания
  maxHp?: number;                 // Максимальное здоровье здания
}

export interface TownBuildings {
  town_hall?: number; // 1-5: Settlement tier & construction permits
  forge: number;      // 1-5: unlocks higher tier gear crafts
  smelter: number;    // 0-5: converts raw ore to metal and passive metal income
  tavern: number;     // 0-5: expedition food buffs and morale
  guild: number;      // 0-5: passive miners income & storage
  workshop: number;   // 0-5: cart tower defense research
  barracks?: number;  // 0-5: living quarters
  watchtower?: number;// 0-5: defense tower
}

export interface TownBuff {
  id: string;
  name: string;
  desc: string;
  bonusHp?: number;
  bonusDmg?: number;
  bonusTorchLife?: number;
}

export interface GameState {
  player: Player;
  resources: Resources;
  inventory: Item[];
  equipment: {
    weapon: Item | null;
    head: Item | null;
    chest: Item | null;
  };
  unlockedDepth: number; 
  depth: number;
  cartModules: {
    searchlight: boolean;
    turret: boolean;
    magnet: boolean;
  };
  town: TownBuildings;
  townPlots: TownPlot[];
  dwellers: Dweller[];
  candidateDwellers: Dweller[];
  lastDwellerArrival: number;
  activeTownBuff?: TownBuff | null;
  lastCollectTime?: number;
  isSiegeMode?: boolean; // Флаг режима осады / обороны города (Tower Defense)
}

