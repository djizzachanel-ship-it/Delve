const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');

const search = `    case 'HEAL': {
      const stats = calculatePlayerStats(state.player, state.equipment);
      return {
        ...state,
        player: { ...state.player, health: stats.maxHealth }
      };
    }`;
const replace = `    case 'HEAL': {
      const stats = calculatePlayerStats(state.player, state.equipment);
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
        // We will modify craftItem to take level
        const item = craftItem(action.payload.slot, action.payload.level);
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
    }`;
code = code.replace(search, replace);
fs.writeFileSync('src/store.ts', code);
