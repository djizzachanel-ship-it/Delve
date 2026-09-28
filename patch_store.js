const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');

const searchAction = `| { type: 'HEAL' }`;
const replaceAction = `| { type: 'HEAL' }
  | { type: 'SET_DEPTH'; payload: number }
  | { type: 'UNLOCK_DEPTH'; payload: number }
  | { type: 'CRAFT_ADVANCED'; payload: { slot: ItemSlot, level: number } }`;

const searchInitial = `  unlockedDepth: 0, depth: 0,`;
const replaceInitial = `  unlockedDepth: 0, depth: 0,`; // leave it

const searchReducer = `    case 'HEAL': {
      const stats = calculatePlayerStats(state.player, state.equipment);
      return {
        ...state,
        player: { ...state.player, health: stats.maxHealth }
      };
    }`;
const replaceReducer = `    case 'HEAL': {
      const stats = calculatePlayerStats(state.player, state.equipment);
      return {
        ...state,
        player: { ...state.player, health: stats.maxHealth }
      };
    }
    case 'SET_DEPTH':
      return { ...state, depth: action.payload };
    case 'UNLOCK_DEPTH':
      return { ...state, unlockedDepth: Math.max(state.unlockedDepth, action.payload) };
    case 'CRAFT_ADVANCED': {
      const scale = action.payload.level + 1;
      const baseCost = CRAFTING_COSTS[action.payload.slot];
      const cost = {
        ore: baseCost.ore * scale,
        metal: baseCost.metal * scale,
        shards: baseCost.shards * scale + (scale > 2 ? 1 : 0)
      };
      if (
        state.resources.ore >= cost.ore &&
        state.resources.metal >= cost.metal &&
        state.resources.shards >= cost.shards
      ) {
        // we'll pass depth to craftItem if we update it, for now we will just use it directly in a modified craftItem
        return state; // handled in next patch
      }
      return state;
    }`;
    
// We will replace this manually.
