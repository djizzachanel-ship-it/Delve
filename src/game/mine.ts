import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { MiningNode, EnemyKind, BossKind } from './types';

export const project = (x: number, y: number) => ({
  x: x - y,
  y: (x + y) / 2
});

export interface SpawnEnemyData {
  type: 'boss' | 'mob';
  kind?: EnemyKind;
  bossKind?: BossKind;
  x: number;
  y: number;
}

export function generateMineTrack(depth: number, focus: 'ore'|'metal'|'shards' = 'ore') {
  const grid = Array.from({length: MAP_ROWS}, () => Array(MAP_COLS).fill(1));
  const rails: {x:number, y:number}[] = [];
  const nodes: MiningNode[] = [];
  const enemiesToSpawn: SpawnEnemyData[] = [];
  
  let currC = Math.floor(MAP_COLS / 2);
  
  // Boss Room (Top)
  for(let r = 4; r <= 14; r++) {
    for(let c = currC - 7; c <= currC + 7; c++) grid[r][c] = 0;
  }
  nodes.push({ id: 'boss_n1', x: (currC-5)*TILE_SIZE, y: 7*TILE_SIZE, hp: 4, maxHp: 4 });
  nodes.push({ id: 'boss_n2', x: (currC+5)*TILE_SIZE, y: 7*TILE_SIZE, hp: 4, maxHp: 4 });
  nodes.push({ id: 'boss_n3', x: currC*TILE_SIZE, y: 5*TILE_SIZE, hp: 4, maxHp: 4 });
  
  // Select Boss according to floor depth
  const bossKinds: BossKind[] = ['foreman', 'shadow_lord', 'crystal_colossus'];
  const chosenBossKind: BossKind = bossKinds[depth % bossKinds.length];
  enemiesToSpawn.push({ 
    type: 'boss', 
    bossKind: chosenBossKind, 
    x: currC*TILE_SIZE, 
    y: 9*TILE_SIZE 
  });

  // Boss minions themed with the boss (scaled by depth: 6 to 14 minions)
  const bossMinionKind: EnemyKind = chosenBossKind === 'shadow_lord' 
    ? 'shadow_stalker' 
    : chosenBossKind === 'crystal_colossus' 
    ? 'crystal_crawler' 
    : 'corridor_goblin';

  const bossMinionCount = Math.min(14, 5 + depth * 2);
  for(let i=0; i<bossMinionCount; i++) {
     // Mix in diverse elite guards on higher depths
     let mKind = bossMinionKind;
     if (depth >= 2 && i % 3 === 0) {
       mKind = chosenBossKind === 'shadow_lord' ? 'crystal_crawler' : 'shadow_stalker';
     }
     enemiesToSpawn.push({ 
       type: 'mob', 
       kind: mKind,
       x: (currC + (Math.random()-0.5)*9)*TILE_SIZE, 
       y: (9 + (Math.random()-0.5)*5)*TILE_SIZE 
     });
  }

  for(let r = MAP_ROWS - 3; r > 14; r--) {
    // Drunkard's walk for curving the rail
    if (r % 2 === 0 && Math.random() < 0.4) {
       currC += Math.random() > 0.5 ? 1 : -1;
       currC = Math.max(10, Math.min(MAP_COLS - 11, currC));
    }
    
    grid[r][currC] = 2; // Rail
    grid[r][currC - 1] = 0;
    grid[r][currC + 1] = 0;

    // Varying corridor width
    if (Math.random() > 0.5) grid[r][currC - 2] = 0;
    if (Math.random() > 0.5) grid[r][currC + 2] = 0;

    rails.push({ x: currC * TILE_SIZE + TILE_SIZE/2, y: r * TILE_SIZE + TILE_SIZE/2 });

    // SAFE ZONE AT START: Do NOT spawn mobs near cart start (bottom 8 rows)
    const isNearStart = r > MAP_ROWS - 9;

    // Corridor enemies: Patrols along the tracks, scaling with depth
    if (!isNearStart && r % 2 === 0 && r > 15) { 
      const patrolChance = Math.min(0.75, 0.35 + depth * 0.08);
      if (Math.random() < patrolChance) {
        // Roll mob archetype based on depth
        const roll = Math.random();
        let mKind: EnemyKind = 'corridor_goblin';
        if (depth === 1) {
          mKind = roll > 0.75 ? 'shadow_stalker' : 'corridor_goblin';
        } else if (depth === 2) {
          mKind = roll > 0.65 ? 'shadow_stalker' : roll > 0.4 ? 'crystal_crawler' : 'corridor_goblin';
        } else {
          mKind = roll > 0.55 ? 'shadow_stalker' : roll > 0.25 ? 'crystal_crawler' : 'corridor_goblin';
        }

        enemiesToSpawn.push({ 
          type: 'mob', 
          kind: mKind,
          x: currC * TILE_SIZE + (Math.random() - 0.5)*TILE_SIZE*1.6, 
          y: r * TILE_SIZE + (Math.random() - 0.5)*TILE_SIZE*1.6 
        });

        // Pack spawn: On depth >= 2, patrols can be duos
        if (depth >= 2 && Math.random() < 0.42) {
          enemiesToSpawn.push({ 
            type: 'mob', 
            kind: roll > 0.5 ? 'shadow_stalker' : 'corridor_goblin',
            x: currC * TILE_SIZE + (Math.random() - 0.5)*TILE_SIZE*1.8, 
            y: (r + (Math.random() > 0.5 ? 0.6 : -0.6)) * TILE_SIZE 
          });
        }
      }
    }
    
    // Pocket branches (Dark side caverns with rich loot & guardian packs)
    if (r % 10 === 0 && r > 18 && r < MAP_ROWS - 10) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const len = 6 + Math.floor(Math.random() * 4);
        let bc = currC;
        // Carve long corridor
        for(let i=0; i<len; i++) {
           bc += dir;
           grid[r][bc] = 0;
           grid[r-1][bc] = 0;
        }
        // Pocket Room (arena in deep darkness)
        for(let pr = r-3; pr <= r+2; pr++) {
           for(let pc = bc - 2; pc <= bc + 2; pc++) {
              if (pr > 0 && pr < MAP_ROWS && pc > 0 && pc < MAP_COLS) grid[pr][pc] = 0;
           }
        }

        // Alternating: either a locked ancient Miner's Chest or rich ore node
        const isChest = (r % 20 === 0);
        if (isChest) {
            nodes.push({ 
                id: 'chest_' + r, 
                x: bc * TILE_SIZE + TILE_SIZE/2, 
                y: (r - 1) * TILE_SIZE + TILE_SIZE/2, 
                hp: 3, 
                maxHp: 3, 
                kind: 'chest',
                opened: false 
            });
        } else {
            // Normal or Volatile node
            const isVolatile = Math.random() < 0.35;
            nodes.push({ 
                id: 'node_' + r, 
                x: bc * TILE_SIZE + TILE_SIZE/2, 
                y: (r - 1) * TILE_SIZE + TILE_SIZE/2, 
                hp: 4, 
                maxHp: 4, 
                kind: isVolatile ? 'volatile' : 'normal' 
            });
        }
        
        // Darkness mobs: 2 to 4 cavern denizens guarding the side room
        const cavernGuardCount = Math.min(4, 2 + Math.floor(depth * 0.45));
        for (let g = 0; g < cavernGuardCount; g++) {
          const kindRoll = Math.random();
          const gKind: EnemyKind = kindRoll > 0.55 ? 'shadow_stalker' : kindRoll > 0.25 ? 'crystal_crawler' : 'corridor_goblin';
          enemiesToSpawn.push({ 
            type: 'mob', 
            kind: gKind,
            x: bc*TILE_SIZE + (Math.random()-0.5)*TILE_SIZE*2.2, 
            y: (r-1)*TILE_SIZE + (Math.random()-0.5)*TILE_SIZE*2.2 
          });
        }
    }

    // Corridor volatile explosive crystals for tactical mob clearing!
    if (!isNearStart && r % 15 === 0 && r > 18) {
        nodes.push({
            id: 'volatile_' + r,
            x: (currC + (Math.random() > 0.5 ? 1.5 : -1.5)) * TILE_SIZE,
            y: r * TILE_SIZE,
            hp: 2,
            maxHp: 2,
            kind: 'volatile'
        });
    }
  }
  
  // Connect rail to the boss room center
  const bossC = Math.floor(MAP_COLS / 2);
  for (let r = 14; r >= 8; r--) {
    let rc = currC;
    if (currC > bossC) currC--;
    else if (currC < bossC) currC++;
    
    grid[r][currC] = 2;
    rails.push({ x: currC * TILE_SIZE + TILE_SIZE/2, y: r * TILE_SIZE + TILE_SIZE/2 });
  }

  const spawnPos = { x: rails[0].x, y: rails[0].y };

  // Strict double check: absolutely zero mobs within 550px from spawnPos
  const safeEnemies = enemiesToSpawn.filter(e => {
    return Math.hypot(e.x - spawnPos.x, e.y - spawnPos.y) > 550;
  });

  return { grid, rails, nodes, enemiesToSpawn: safeEnemies, spawnPos };
}
