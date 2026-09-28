const fs = require('fs');
let code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');
code = code.replace(/interface Enemy \{ id: string; x: number; y: number; hp: number; maxHp: number; speed: number; damage: number; boss: boolean; aggro: boolean; \}/, 'interface Enemy { id: string; x: number; y: number; hp: number; maxHp: number; speed: number; damage: number; boss: boolean; aggro: boolean; attackTimer: number; chargeX?: number; chargeY?: number; }');
code = code.replace(/boss: true, aggro: false/g, 'boss: true, aggro: false, attackTimer: 0');
code = code.replace(/boss: false, aggro: false/g, 'boss: false, aggro: false, attackTimer: 0');
code = code.replace(/boss: false, aggro: true/g, 'boss: false, aggro: true, attackTimer: 0');

const combatSearch = `        if (e.aggro) {
            if (eDist > 25) {
              const speed = e.speed;
              moveWithCollisions(e, (ex / eDist) * speed, (ey / eDist) * speed, e.boss ? 20 : 12, dt, g.grid);
            } else if (p.inLight) { 
              const rawDmg = e.damage;
              const dmgReduction = stats.armor / (stats.armor + 20); 
              const mDamage = Math.max(1, Math.floor(rawDmg * (1 - dmgReduction)));
              g.player.hp -= mDamage;
              spawnText(g.player.x, g.player.y, \`-\${mDamage}\`, '#ef4444');
              
              // knockback enemy slightly
              e.x -= (ex / eDist) * 30;
              e.y -= (ey / eDist) * 30;
              
              if (g.player.hp <= 0) {
                 endWave(true);
                 return;
              }
            }
        }`;

const combatReplace = `        if (e.aggro) {
            if (e.attackTimer > 0) e.attackTimer -= dt;
            
            // Boss mechanics: dash attack
            if (e.boss && eDist < 150 && e.attackTimer <= 0) {
                // start charge
                e.chargeX = (ex / eDist) * 200;
                e.chargeY = (ey / eDist) * 200;
                e.attackTimer = 2.0; // 2 seconds between charges
            }
            
            if (e.boss && e.attackTimer > 1.0 && e.chargeX) {
                // Currently dashing
                moveWithCollisions(e, e.chargeX, e.chargeY, 20, dt, g.grid);
                if (eDist < 30) { // hit player during dash
                    e.chargeX = 0; // stop dash
                    e.attackTimer = 1.0;
                    const rawDmg = e.damage;
                    const dmgReduction = stats.armor / (stats.armor + 20); 
                    const mDamage = Math.max(1, Math.floor(rawDmg * (1 - dmgReduction)));
                    g.player.hp -= mDamage;
                    spawnText(g.player.x, g.player.y, \`-\${mDamage}\`, '#ef4444');
                    if (g.player.hp <= 0) { endWave(true); return; }
                }
            } else {
                if (eDist > 25) {
                  const speed = e.speed;
                  moveWithCollisions(e, (ex / eDist) * speed, (ey / eDist) * speed, e.boss ? 20 : 12, dt, g.grid);
                } else if (p.inLight && e.attackTimer <= 0) { 
                  e.attackTimer = 1.0; // 1 second cooldown for normal attacks
                  const rawDmg = e.damage;
                  const dmgReduction = stats.armor / (stats.armor + 20); 
                  const mDamage = Math.max(1, Math.floor(rawDmg * (1 - dmgReduction)));
                  g.player.hp -= mDamage;
                  spawnText(g.player.x, g.player.y, \`-\${mDamage}\`, '#ef4444');
                  
                  // knockback enemy slightly
                  e.x -= (ex / eDist) * 30;
                  e.y -= (ey / eDist) * 30;
                  
                  if (g.player.hp <= 0) {
                     endWave(true);
                     return;
                  }
                }
            }
        }`;
code = code.replace(combatSearch, combatReplace);
fs.writeFileSync('src/components/MineTab.tsx', code);
