const fs = require('fs');
const code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');
const search = "rails.push({ x: currC * TILE_SIZE + TILE_SIZE/2, y: r * TILE_SIZE + TILE_SIZE/2 });";
const replace = `rails.push({ x: currC * TILE_SIZE + TILE_SIZE/2, y: r * TILE_SIZE + TILE_SIZE/2 });
    
    // Spawn mobs along the main corridor rails
    if (Math.random() > 0.8 && r > 18 && r < MAP_ROWS - 10) {
        enemiesToSpawn.push({ type: 'mob', x: currC * TILE_SIZE + (Math.random() - 0.5)*TILE_SIZE*1.5, y: r * TILE_SIZE + (Math.random() - 0.5)*TILE_SIZE*1.5 });
    }`;
const newCode = code.replace(search, replace);
fs.writeFileSync('src/components/MineTab.tsx', newCode);
