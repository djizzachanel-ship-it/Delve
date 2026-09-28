const fs = require('fs');
let code = fs.readFileSync('src/lib/gameLogic.ts', 'utf-8');

code = code.replace(/export const craftItem = \(slot: ItemSlot\): Item => \{/, 'export const craftItem = (slot: ItemSlot, level: number = 0): Item => {');
code = code.replace(/const multi = multipliers\[rarity\];/, 'const multi = multipliers[rarity] * (1 + level * 0.5);');
fs.writeFileSync('src/lib/gameLogic.ts', code);
