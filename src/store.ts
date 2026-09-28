import { Reducer } from 'react';
import { GameState, Item, ItemSlot, TownBuildings, TownBuff, BuildingType, TownPlot } from './types';
import { craftItem, CRAFT_RECIPES, reforgeItemAffixes } from './game/craft';
import { calculatePlayerStats } from './game/player';
import { 
  BUILDINGS_CONFIG, 
  calculatePassiveIncome, 
  TAVERN_MEALS, 
  createDefaultPlots,
  getBuildingLevelFromPlots,
  getForgeDwellerBonus,
  getMaxDwellers,
  getBuildingDefenseStats
} from './game/townConfig';
import { Dweller, INITIAL_DWELLERS, generateDweller } from './game/dwellers';

export type GameAction = 
  | { type: 'SYNC_GAME'; payload: { health: number; resources: { ore: number; metal: number; shards: number }; depth: number } } 
  | { type: "SET_DEPTH"; payload: number } 
  | { type: "UNLOCK_DEPTH"; payload: number }
  | { type: 'ADD_RESOURCES'; payload: { ore: number; metal: number; shards: number } }
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'UNLOCK_CART_MODULE'; module: 'searchlight' | 'turret' | 'magnet' }
  | { type: 'DIE'; payload: { maxHealth: number } }
  | { type: 'HEAL' }
  | { type: 'CRAFT'; slot: ItemSlot }
  | { type: 'CRAFT_ADVANCED'; payload: { slot: ItemSlot; level: number } }
  | { type: 'EQUIP'; item: Item }
  | { type: 'UNEQUIP'; slot: ItemSlot }
  | { type: 'SALVAGE'; item: Item }
  | { type: 'UPGRADE_BUILDING'; building: BuildingType }
  | { type: 'BUILD_ON_PLOT'; plotId: number; buildingType: BuildingType; tileX?: number; tileY?: number }
  | { type: 'PLACE_BUILDING'; buildingType: BuildingType; tileX: number; tileY: number }
  | { type: 'MOVE_BUILDING'; plotId: number; tileX: number; tileY: number }
  | { type: 'UPGRADE_PLOT'; plotId: number }
  | { type: 'DEMOLISH_PLOT'; plotId: number }
  | { type: 'ASSIGN_DWELLER'; dwellerId: string; plotId: number | null }
  | { type: 'ACCEPT_DWELLER'; dwellerId: string }
  | { type: 'DISMISS_CANDIDATE'; dwellerId: string }
  | { type: 'RECRUIT_DWELLER_IN_TAVERN' }
  | { type: 'CHECK_DWELLER_ARRIVAL' }
  | { type: 'SMELT_ORE'; oreAmount: number }
  | { type: 'COLLECT_PASSIVE' }
  | { type: 'SET_TOWN_BUFF'; mealId: string }
  | { type: 'REFORGE_ITEM'; item: Item }
  | { type: 'TOGGLE_SIEGE_MODE'; enabled?: boolean }
  | { type: 'RESET_GAME' };

export const CART_MODULE_COSTS = {
  searchlight: { ore: 15, metal: 5, shards: 0 },
  turret: { ore: 25, metal: 15, shards: 1 },
  magnet: { ore: 20, metal: 10, shards: 1 }
};

export const SAVE_GAME_KEY = 'underground_cart_save_v3';

export const defaultInitialState: GameState = {
  player: { baseHealth: 55, health: 55, baseDamage: 7, baseArmor: 1, level: 1, xp: 0 },
  resources: { ore: 35, metal: 18, shards: 1 },
  inventory: [],
  equipment: { 
    head: null, 
    chest: null, 
    legs: null, 
    boots: null, 
    weapon: null, 
    offhand: null, 
    amulet: null, 
    ring: null 
  },
  unlockedDepth: 0, 
  depth: 0,
  cartModules: {
    searchlight: false,
    turret: false,
    magnet: false
  },
  town: {
    forge: 1,
    smelter: 1,
    tavern: 1,
    guild: 0,
    workshop: 0,
    barracks: 1,
    watchtower: 0
  },
  townPlots: createDefaultPlots(),
  dwellers: INITIAL_DWELLERS,
  candidateDwellers: [],
  lastDwellerArrival: Date.now(),
  activeTownBuff: null,
  lastCollectTime: Date.now()
};

export function loadSavedState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_GAME_KEY) || localStorage.getItem('underground_cart_save_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.player && parsed.resources) {
        // Migration to plots if missing
        let plots: TownPlot[] = Array.isArray(parsed.townPlots) ? parsed.townPlots : createDefaultPlots();
        const hasTownHall = plots.some(p => p.buildingType === 'town_hall');
        if (!hasTownHall) {
          const defaultTownHall = createDefaultPlots()[0];
          plots = [defaultTownHall, ...plots];
        }

        const defaultCoords = [
          { x: 9, y: 8 },
          { x: 14, y: 9 },
          { x: 11, y: 4 },
          { x: 5, y: 10 },
          { x: 10, y: 14 },
          { x: 15, y: 14 }
        ];

        plots = plots.map((p, idx) => {
          const tX = p.tileX !== undefined ? p.tileX : defaultCoords[idx % defaultCoords.length].x;
          const tY = p.tileY !== undefined ? p.tileY : defaultCoords[idx % defaultCoords.length].y;
          const defStats = p.buildingType ? getBuildingDefenseStats(p.buildingType, p.level || 1) : null;

          return {
            ...p,
            tileX: tX,
            tileY: tY,
            positionGrid: p.positionGrid || {
              x: tX,
              y: tY,
              width: 2,
              height: 2
            },
            isDefensive: p.isDefensive !== undefined ? p.isDefensive : (defStats?.isDefensive || false),
            damage: p.damage !== undefined ? p.damage : defStats?.damage,
            attackRange: p.attackRange !== undefined ? p.attackRange : defStats?.attackRange,
            attackSpeed: p.attackSpeed !== undefined ? p.attackSpeed : defStats?.attackSpeed,
            targetType: p.targetType || defStats?.targetType,
            hp: p.hp !== undefined ? p.hp : (defStats?.hp || 800),
            maxHp: p.maxHp !== undefined ? p.maxHp : (defStats?.maxHp || 800),
          };
        });
        let dwellers: Dweller[] = Array.isArray(parsed.dwellers) && parsed.dwellers.length > 0 ? parsed.dwellers : INITIAL_DWELLERS;

        return {
          ...defaultInitialState,
          ...parsed,
          player: { ...defaultInitialState.player, ...parsed.player },
          resources: { ...defaultInitialState.resources, ...parsed.resources },
          equipment: { ...defaultInitialState.equipment, ...(parsed.equipment || {}) },
          cartModules: { ...defaultInitialState.cartModules, ...(parsed.cartModules || {}) },
          town: { ...defaultInitialState.town, ...(parsed.town || {}) },
          townPlots: plots,
          dwellers: dwellers,
          candidateDwellers: Array.isArray(parsed.candidateDwellers) ? parsed.candidateDwellers : [],
          lastDwellerArrival: parsed.lastDwellerArrival || Date.now(),
          activeTownBuff: parsed.activeTownBuff || null,
          lastCollectTime: parsed.lastCollectTime || Date.now(),
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : []
        };
      }
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return defaultInitialState;
}

export function saveStateToStorage(state: GameState) {
  try {
    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export const initialState: GameState = loadSavedState();


const internalReducer: Reducer<GameState, GameAction> = (state, action) => {
  switch (action.type) {
    case 'RESET_GAME': {
      try {
        localStorage.removeItem(SAVE_GAME_KEY);
        localStorage.removeItem('underground_cart_save_v1');
      } catch (e) {}
      return defaultInitialState;
    }
    case 'SYNC_GAME': {
      return {
        ...state,
        depth: action.payload.depth,
        player: { ...state.player, health: action.payload.health },
        resources: {
          ore: state.resources.ore + action.payload.resources.ore,
          metal: state.resources.metal + action.payload.resources.metal,
          shards: state.resources.shards + action.payload.resources.shards,
        }
      };
    }

    case 'ADD_RESOURCES': {
      return {
        ...state,
        resources: {
          ore: state.resources.ore + action.payload.ore,
          metal: state.resources.metal + action.payload.metal,
          shards: state.resources.shards + action.payload.shards,
        }
      };
    }

    case 'ADD_ITEM': {
      return {
        ...state,
        inventory: [...state.inventory, action.item]
      };
    }

    case 'UNLOCK_CART_MODULE': {
      const cost = CART_MODULE_COSTS[action.module];
      if (
        state.resources.ore >= cost.ore &&
        state.resources.metal >= cost.metal &&
        state.resources.shards >= cost.shards
      ) {
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards
          },
          cartModules: {
            ...state.cartModules,
            [action.module]: true
          }
        };
      }
      return state;
    }

    case 'DIE': {
      return {
        ...state,
        unlockedDepth: 0, 
        depth: 0,
        player: { ...state.player, health: action.payload.maxHealth },
        activeTownBuff: null
      };
    }

    case 'HEAL': {
      const stats = calculatePlayerStats(state.player, state.equipment, state.activeTownBuff);
      return {
        ...state,
        player: { ...state.player, health: stats.maxHealth }
      };
    }

    case 'SET_DEPTH':
      return { ...state, depth: action.payload };

    case 'UNLOCK_DEPTH':
      return { ...state, unlockedDepth: Math.max(state.unlockedDepth || 0, action.payload) };

    case 'CRAFT_ADVANCED': {
      const tierIndex = Math.min(CRAFT_RECIPES.length - 1, Math.max(0, action.payload.level));
      const recipe = CRAFT_RECIPES[tierIndex];
      const forgeLvl = state.townPlots
        ? getBuildingLevelFromPlots(state.townPlots, 'forge')
        : (state.town?.forge || 1);

      if (forgeLvl < recipe.requiredForgeLevel) {
        return state; // Forge level too low
      }

      const cost = recipe.cost;
      if (
        state.resources.ore >= cost.ore &&
        state.resources.metal >= cost.metal &&
        state.resources.shards >= cost.shards
      ) {
        // Dweller blacksmith bonus!
        const dwellerBonus = getForgeDwellerBonus(state.townPlots, state.dwellers);
        const item = craftItem(
          action.payload.slot, 
          tierIndex, 
          forgeLvl,
          dwellerBonus.statMultiplier,
          dwellerBonus.bonusRareLuck
        );
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards,
          },
          inventory: [...state.inventory, item]
        };
      }
      return state;
    }

    case 'CRAFT': {
      const recipe = CRAFT_RECIPES[0];
      const cost = recipe.cost;
      const forgeLvl = state.townPlots
        ? getBuildingLevelFromPlots(state.townPlots, 'forge')
        : (state.town?.forge || 1);

      if (
        state.resources.ore >= cost.ore &&
        state.resources.metal >= cost.metal &&
        state.resources.shards >= cost.shards
      ) {
        const dwellerBonus = getForgeDwellerBonus(state.townPlots, state.dwellers);
        const item = craftItem(
          action.slot, 
          0, 
          forgeLvl,
          dwellerBonus.statMultiplier,
          dwellerBonus.bonusRareLuck
        );
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards,
          },
          inventory: [...state.inventory, item]
        };
      }
      return state;
    }


    case 'EQUIP': {
      const oldItem = state.equipment[action.item.slot];
      const newInventory = state.inventory.filter(i => i.id !== action.item.id);
      if (oldItem) newInventory.push(oldItem);
      
      const newState = {
        ...state,
        inventory: newInventory,
        equipment: { ...state.equipment, [action.item.slot]: action.item }
      };
      
      const stats = calculatePlayerStats(newState.player, newState.equipment, newState.activeTownBuff);
      if (newState.player.health > stats.maxHealth) {
        newState.player.health = stats.maxHealth;
      }
      return newState;
    }

    case 'UNEQUIP': {
      const item = state.equipment[action.slot];
      if (!item) return state;
      return {
        ...state,
        equipment: { ...state.equipment, [action.slot]: null },
        inventory: [...state.inventory, item]
      };
    }

    case 'SALVAGE': {
      const salvageOre = action.item.rarity === 'common' ? 5 : action.item.rarity === 'magic' ? 12 : action.item.rarity === 'rare' ? 28 : 60;
      const salvageMetal = action.item.rarity === 'common' ? 2 : action.item.rarity === 'magic' ? 5 : action.item.rarity === 'rare' ? 12 : 25;
      const salvageShards = action.item.rarity === 'epic' ? 1 : 0;
      return {
        ...state,
        inventory: state.inventory.filter(i => i.id !== action.item.id),
        resources: { 
          ...state.resources, 
          ore: state.resources.ore + salvageOre,
          metal: state.resources.metal + salvageMetal,
          shards: state.resources.shards + salvageShards
        }
      };
    }

    case 'BUILD_ON_PLOT': {
      const plots = state.townPlots || createDefaultPlots();
      const plot = plots.find(p => p.id === action.plotId);
      if (!plot || plot.buildingType !== null) return state;

      const bInfo = BUILDINGS_CONFIG[action.buildingType];
      if (!bInfo) return state;

      const cost = bInfo.getCost(0); // cost for building 0 -> 1
      if (
        state.resources.ore < cost.ore ||
        state.resources.metal < cost.metal ||
        state.resources.shards < cost.shards
      ) {
        return state;
      }

      const newPlots = plots.map(p => {
        if (p.id === action.plotId) {
          return { 
            ...p, 
            buildingType: action.buildingType, 
            level: 1, 
            assignedDwellerIds: [],
            tileX: action.tileX !== undefined ? action.tileX : p.tileX,
            tileY: action.tileY !== undefined ? action.tileY : p.tileY
          };
        }
        return p;
      });

      const newTown = { ...state.town, [action.buildingType]: Math.max(state.town[action.buildingType] || 0, 1) };

      return {
        ...state,
        resources: {
          ore: state.resources.ore - cost.ore,
          metal: state.resources.metal - cost.metal,
          shards: state.resources.shards - cost.shards,
        },
        townPlots: newPlots,
        town: newTown
      };
    }

    case 'PLACE_BUILDING': {
      const bInfo = BUILDINGS_CONFIG[action.buildingType];
      if (!bInfo) return state;

      const cost = bInfo.getCost(0);
      if (
        state.resources.ore < cost.ore ||
        state.resources.metal < cost.metal ||
        state.resources.shards < cost.shards
      ) {
        return state;
      }

      const plots = state.townPlots || createDefaultPlots();
      // Check if an empty plot exists to reuse, or create new plot
      const emptyPlot = plots.find(p => p.buildingType === null);
      let newPlots: TownPlot[];

      const defStats = getBuildingDefenseStats(action.buildingType, 1);
      if (emptyPlot) {
        newPlots = plots.map(p => {
          if (p.id === emptyPlot.id) {
            return {
              ...p,
              name: bInfo.name,
              buildingType: action.buildingType,
              level: 1,
              assignedDwellerIds: [],
              tileX: action.tileX,
              tileY: action.tileY,
              positionGrid: { x: action.tileX, y: action.tileY, width: 2, height: 2 },
              ...defStats
            };
          }
          return p;
        });
      } else {
        const nextId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 0;
        const newPlot: TownPlot = {
          id: nextId,
          name: bInfo.name,
          buildingType: action.buildingType,
          level: 1,
          assignedDwellerIds: [],
          tileX: action.tileX,
          tileY: action.tileY,
          positionGrid: { x: action.tileX, y: action.tileY, width: 2, height: 2 },
          ...defStats
        };
        newPlots = [...plots, newPlot];
      }

      const newTown = { 
        ...state.town, 
        [action.buildingType]: Math.max(state.town[action.buildingType] || 0, 1) 
      };

      return {
        ...state,
        resources: {
          ore: state.resources.ore - cost.ore,
          metal: state.resources.metal - cost.metal,
          shards: state.resources.shards - cost.shards,
        },
        townPlots: newPlots,
        town: newTown
      };
    }

    case 'MOVE_BUILDING': {
      const plots = state.townPlots || createDefaultPlots();
      const newPlots = plots.map(p => {
        if (p.id === action.plotId) {
          return { 
            ...p, 
            tileX: action.tileX, 
            tileY: action.tileY,
            positionGrid: { x: action.tileX, y: action.tileY, width: 2, height: 2 }
          };
        }
        return p;
      });
      return {
        ...state,
        townPlots: newPlots
      };
    }

    case 'UPGRADE_PLOT': {
      const plots = state.townPlots || createDefaultPlots();
      const plot = plots.find(p => p.id === action.plotId);
      if (!plot || !plot.buildingType) return state;

      const bInfo = BUILDINGS_CONFIG[plot.buildingType];
      if (!bInfo || plot.level >= bInfo.maxLevel) return state;

      const cost = bInfo.getCost(plot.level);
      if (
        state.resources.ore < cost.ore ||
        state.resources.metal < cost.metal ||
        state.resources.shards < cost.shards
      ) {
        return state;
      }

      const nextLvl = plot.level + 1;
      const defStats = getBuildingDefenseStats(plot.buildingType, nextLvl);
      const newPlots = plots.map(p => {
        if (p.id === action.plotId) {
          return { 
            ...p, 
            level: nextLvl,
            ...defStats
          };
        }
        return p;
      });

      const newTown = { ...state.town, [plot.buildingType]: nextLvl };

      return {
        ...state,
        resources: {
          ore: state.resources.ore - cost.ore,
          metal: state.resources.metal - cost.metal,
          shards: state.resources.shards - cost.shards,
        },
        townPlots: newPlots,
        town: newTown
      };
    }

    case 'TOGGLE_SIEGE_MODE': {
      const nextMode = action.enabled !== undefined ? action.enabled : !state.isSiegeMode;
      return {
        ...state,
        isSiegeMode: nextMode
      };
    }

    case 'DEMOLISH_PLOT': {
      const plots = state.townPlots || createDefaultPlots();
      const plot = plots.find(p => p.id === action.plotId);
      if (!plot || !plot.buildingType) return state;

      // Free any dwellers assigned to this plot
      const newDwellers = (state.dwellers || []).map(d => {
        if (d.assignedPlotId === action.plotId) {
          return { ...d, assignedPlotId: null };
        }
        return d;
      });

      const bType = plot.buildingType;
      const bInfo = BUILDINGS_CONFIG[bType];
      const cost = bInfo.getCost(Math.max(0, plot.level - 1));
      const refundOre = Math.floor(cost.ore * 0.4);
      const refundMetal = Math.floor(cost.metal * 0.4);

      const newPlots = plots.map(p => {
        if (p.id === action.plotId) {
          return { ...p, buildingType: null, level: 0, assignedDwellerIds: [] };
        }
        return p;
      });

      const newTown = { ...state.town, [bType]: 0 };

      return {
        ...state,
        resources: {
          ...state.resources,
          ore: state.resources.ore + refundOre,
          metal: state.resources.metal + refundMetal
        },
        townPlots: newPlots,
        town: newTown,
        dwellers: newDwellers
      };
    }

    case 'ASSIGN_DWELLER': {
      const dwellers = state.dwellers || [];
      const dweller = dwellers.find(d => d.id === action.dwellerId);
      if (!dweller) return state;

      const plots = state.townPlots || createDefaultPlots();
      const prevPlotId = dweller.assignedPlotId;
      const targetPlotId = action.plotId;

      if (targetPlotId !== null) {
        const targetPlot = plots.find(p => p.id === targetPlotId);
        if (!targetPlot || !targetPlot.buildingType) return state;
        const bInfo = BUILDINGS_CONFIG[targetPlot.buildingType];
        const maxWorkers = bInfo.workerSlotCount(targetPlot.level);
        if (targetPlot.assignedDwellerIds.length >= maxWorkers && !targetPlot.assignedDwellerIds.includes(action.dwellerId)) {
          return state; // Capacity reached!
        }
      }

      const newDwellers = dwellers.map(d => {
        if (d.id === action.dwellerId) {
          return { ...d, assignedPlotId: targetPlotId };
        }
        return d;
      });

      const newPlots = plots.map(p => {
        let workers = p.assignedDwellerIds ? [...p.assignedDwellerIds] : [];
        if (p.id === prevPlotId) {
          workers = workers.filter(id => id !== action.dwellerId);
        }
        if (p.id === targetPlotId) {
          if (!workers.includes(action.dwellerId)) {
            workers.push(action.dwellerId);
          }
        }
        return { ...p, assignedDwellerIds: workers };
      });

      return {
        ...state,
        dwellers: newDwellers,
        townPlots: newPlots
      };
    }

    case 'ACCEPT_DWELLER': {
      const candidates = state.candidateDwellers || [];
      const candidate = candidates.find(d => d.id === action.dwellerId);
      if (!candidate) return state;

      const maxLimit = getMaxDwellers(state.townPlots);
      if ((state.dwellers?.length || 0) >= maxLimit) {
        return state;
      }

      return {
        ...state,
        candidateDwellers: candidates.filter(d => d.id !== action.dwellerId),
        dwellers: [...(state.dwellers || []), candidate]
      };
    }

    case 'DISMISS_CANDIDATE': {
      return {
        ...state,
        candidateDwellers: (state.candidateDwellers || []).filter(d => d.id !== action.dwellerId)
      };
    }

    case 'RECRUIT_DWELLER_IN_TAVERN': {
      const recruitCost = { ore: 20, metal: 10 };
      if (state.resources.ore < recruitCost.ore || state.resources.metal < recruitCost.metal) {
        return state;
      }
      const maxLimit = getMaxDwellers(state.townPlots);
      if ((state.dwellers?.length || 0) >= maxLimit) {
        return state;
      }

      const newDweller = generateDweller();
      return {
        ...state,
        resources: {
          ...state.resources,
          ore: state.resources.ore - recruitCost.ore,
          metal: state.resources.metal - recruitCost.metal
        },
        dwellers: [...(state.dwellers || []), newDweller]
      };
    }

    case 'CHECK_DWELLER_ARRIVAL': {
      const now = Date.now();
      const lastArrival = state.lastDwellerArrival || 0;
      const maxLimit = getMaxDwellers(state.townPlots);
      const currentCount = state.dwellers?.length || 0;
      const candidates = state.candidateDwellers || [];

      // Every 60s candidate arrives if there is room and fewer than 2 waiting
      if (now - lastArrival > 60000 && candidates.length < 2 && currentCount < maxLimit) {
        const candidate = generateDweller();
        return {
          ...state,
          lastDwellerArrival: now,
          candidateDwellers: [...candidates, candidate]
        };
      }
      return state;
    }

    case 'UPGRADE_BUILDING': {
      const bInfo = BUILDINGS_CONFIG[action.building];
      const currentLevel = state.town[action.building] || 0;
      if (currentLevel >= bInfo.maxLevel) return state;

      const cost = bInfo.getCost(currentLevel);
      if (
        state.resources.ore >= cost.ore &&
        state.resources.metal >= cost.metal &&
        state.resources.shards >= cost.shards
      ) {
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards
          },
          town: {
            ...state.town,
            [action.building]: currentLevel + 1
          }
        };
      }
      return state;
    }

    case 'SMELT_ORE': {
      const smelterLvl = state.townPlots 
        ? getBuildingLevelFromPlots(state.townPlots, 'smelter') 
        : (state.town.smelter || 0);
      if (smelterLvl === 0) return state;

      const rate = smelterLvl >= 3 ? 2 : smelterLvl >= 2 ? 2.5 : 3;
      const oreNeeded = Math.floor(action.oreAmount);
      if (oreNeeded < rate || state.resources.ore < oreNeeded) return state;

      const metalProduced = Math.floor(oreNeeded / rate);
      const oreConsumed = Math.floor(metalProduced * rate);

      // Shard bonus at lvl 4+
      const shardBonus = smelterLvl >= 4 && Math.random() < 0.15 ? 1 : 0;

      return {
        ...state,
        resources: {
          ...state.resources,
          ore: state.resources.ore - oreConsumed,
          metal: state.resources.metal + metalProduced,
          shards: state.resources.shards + shardBonus
        }
      };
    }

    case 'COLLECT_PASSIVE': {
      const income = calculatePassiveIncome(
        state.town, 
        state.lastCollectTime || Date.now(), 
        Date.now(),
        state.townPlots,
        state.dwellers
      );
      if (income.ore === 0 && income.metal === 0 && income.shards === 0) return state;

      return {
        ...state,
        lastCollectTime: Date.now(),
        resources: {
          ore: state.resources.ore + income.ore,
          metal: state.resources.metal + income.metal,
          shards: state.resources.shards + income.shards
        }
      };
    }


    case 'SET_TOWN_BUFF': {
      const meal = TAVERN_MEALS.find(m => m.id === action.mealId);
      if (!meal) return state;
      if (state.resources.ore < meal.cost.ore || state.resources.metal < meal.cost.metal) return state;

      const stats = calculatePlayerStats(state.player, state.equipment, meal.buff);
      return {
        ...state,
        resources: {
          ...state.resources,
          ore: state.resources.ore - meal.cost.ore,
          metal: state.resources.metal - meal.cost.metal
        },
        activeTownBuff: meal.buff,
        player: {
          ...state.player,
          health: stats.maxHealth // also full heal!
        }
      };
    }

    case 'REFORGE_ITEM': {
      const cost = { ore: 15, metal: 10, shards: 1 };
      if (
        state.resources.ore < cost.ore ||
        state.resources.metal < cost.metal ||
        state.resources.shards < cost.shards
      ) {
        return state;
      }

      const reforged = reforgeItemAffixes(action.item);
      const isEquipped = state.equipment[action.item.slot]?.id === action.item.id;

      if (isEquipped) {
        const newEquip = { ...state.equipment, [action.item.slot]: reforged };
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards
          },
          equipment: newEquip
        };
      } else {
        return {
          ...state,
          resources: {
            ore: state.resources.ore - cost.ore,
            metal: state.resources.metal - cost.metal,
            shards: state.resources.shards - cost.shards
          },
          inventory: state.inventory.map(i => i.id === action.item.id ? reforged : i)
        };
      }
    }

    default:
      return state;
  }
};

export const gameReducer: Reducer<GameState, GameAction> = (state, action) => {
  const nextState = internalReducer(state, action);
  if (nextState !== state) {
    saveStateToStorage(nextState);
  }
  return nextState;
};
