import React from "react";
import { GameEngineState } from './types';
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { project } from './mine';
import { updateCombat, moveWithCollisions, createEnemyInstance } from './combat';
import { sound } from './audio';
import { generateRPGItem } from './affixes';
import { ItemSlot } from '../types';
import { EnemyKind } from './types';

export const spawnText = (g: GameEngineState, x: number, y: number, text: string, color: string) => {
    g.texts.push({ id: Math.random().toString(), x, y, text, color, life: 1, floatY: 0 });
};

export const updateGame = (
    g: GameEngineState, 
    dt: number, 
    stats: { damage: number, maxHealth: number, armor: number }, 
    depth: number, 
    endWave: (died: boolean) => void,
    torchCdRef: React.RefObject<HTMLSpanElement | null>
) => {
    const p = g.player;
    const joy = g.joystick;
    const cart = g.cart;

    // Regen HP
    if (p.hp > 0 && p.hp < stats.maxHealth) {
        p.hp = Math.min(p.hp + 1 * dt, stats.maxHealth);
    }
    
    if (g.torchCooldown > 0) g.torchCooldown -= dt;
    if (torchCdRef?.current) {
       if (g.torchCooldown > 0) {
          torchCdRef.current.style.display = 'flex';
          torchCdRef.current.innerText = Math.ceil(g.torchCooldown).toString();
       } else {
          torchCdRef.current.style.display = 'none';
       }
    }

    // Check Light Status
    let inLight = false;
    const cartLightRadius = g.cartModules?.searchlight 
        ? ((cart.pathIndex >= g.rails.length - 1) ? 900 : 550) 
        : ((cart.pathIndex >= g.rails.length - 1) ? 800 : 350);
    const distToCart = Math.hypot(p.x - cart.x, p.y - cart.y);
    if (distToCart < cartLightRadius) inLight = true;
    
    for (let i = g.torches.length - 1; i >= 0; i--) {
       const t = g.torches[i];
       t.life -= dt;
       if (t.life <= 0) {
           g.torches.splice(i, 1);
       } else if (Math.hypot(p.x - t.x, p.y - t.y) < 280) {
           inLight = true;
       }
    }
    p.inLight = inLight;

    // Cart Movement & Dynamic Catch-up
    // Find player's closest rail index to know if player is ahead along the tracks
    let playerRailIdx = 0;
    let minPlayerDistToRail = Infinity;
    for (let i = 0; i < g.rails.length; i++) {
        const d = Math.hypot(p.x - g.rails[i].x, p.y - g.rails[i].y);
        if (d < minPlayerDistToRail) {
            minPlayerDistToRail = d;
            playerRailIdx = i;
        }
    }

    const railsAhead = playerRailIdx - cart.pathIndex;
    const isPlayerAhead = railsAhead > 0 || (p.y < cart.y - 30);
    const isOnRails = minPlayerDistToRail < 90;
    const isNearRails = minPlayerDistToRail < 200;

    let targetSpeed = 85;
    let isCatchingUp = false;

    // Cart advances if not at the end of track
    if (cart.pathIndex < g.rails.length - 1) {
        if (isPlayerAhead) {
            // Player ran ahead! Speed up smoothly to catch up with player
            if (distToCart > 400 || railsAhead >= 5) {
                targetSpeed = 260; // High sprint speed when player is far ahead
                isCatchingUp = true;
            } else if (distToCart > 240 || railsAhead >= 3) {
                targetSpeed = 190;
                isCatchingUp = true;
            } else if (distToCart > 130 || railsAhead >= 1) {
                targetSpeed = 135;
                isCatchingUp = true;
            } else {
                targetSpeed = 95;
            }

            // Extra boost if player is actively running on or near the tracks
            if (isCatchingUp && isOnRails) {
                targetSpeed *= 1.25;
            } else if (isCatchingUp && isNearRails) {
                targetSpeed *= 1.12;
            }
        } else {
            // Player is beside or behind the cart
            if (distToCart < 110) {
                // Player is comfortably alongside the cart
                targetSpeed = 75;
            } else if (p.y > cart.y + 120 && railsAhead < -1) {
                // Player stayed far behind or took a deep detour - wait/crawl so we don't leave them
                targetSpeed = 20;
            } else {
                targetSpeed = 65;
            }
        }

        // Smooth acceleration / deceleration
        const currentSpeed = cart.speed || 85;
        const accelRate = isCatchingUp ? 220 : 150;
        let newSpeed = currentSpeed;
        if (newSpeed < targetSpeed) {
            newSpeed = Math.min(targetSpeed, newSpeed + accelRate * dt);
        } else {
            newSpeed = Math.max(targetSpeed, newSpeed - accelRate * dt);
        }
        cart.speed = newSpeed;
        cart.isCatchingUp = isCatchingUp;

        // Move along the rails path
        let remainingMove = newSpeed * dt;
        while (remainingMove > 0 && cart.pathIndex < g.rails.length - 1) {
            const curTarget = g.rails[cart.pathIndex];
            const cx = curTarget.x - cart.x;
            const cy = curTarget.y - cart.y;
            const cDist = Math.hypot(cx, cy);

            if (cDist <= remainingMove) {
                cart.x = curTarget.x;
                cart.y = curTarget.y;
                remainingMove -= cDist;
                cart.pathIndex++;
            } else {
                cart.x += (cx / cDist) * remainingMove;
                cart.y += (cy / cDist) * remainingMove;
                remainingMove = 0;
            }
        }
    } else {
        cart.speed = 0;
        cart.isCatchingUp = false;
    }

    // CART MODULE: Auto-Turret (Tower Defense - supporting poke, balanced)
    if (g.cartModules?.turret) {
        g.turretCooldown = (g.turretCooldown || 0) - dt;
        if (g.turretCooldown <= 0) {
            const nearbyEnemy = g.enemies
                .filter(e => e.hp > 0 && Math.hypot(e.x - cart.x, e.y - cart.y) < 300)
                .sort((a, b) => Math.hypot(a.x - cart.x, a.y - cart.y) - Math.hypot(b.x - cart.x, b.y - cart.y))[0];
            
            if (nearbyEnemy) {
                g.turretCooldown = 1.45; // balanced firing rate
                cart.turretAngle = Math.atan2(nearbyEnemy.y - cart.y, nearbyEnemy.x - cart.x);
                const tDmg = 7 + Math.floor(depth * 0.8);
                nearbyEnemy.hp -= tDmg;
                sound.playTurret();
                
                g.slashes.push({
                    id: Math.random().toString(),
                    x: (cart.x + nearbyEnemy.x) / 2,
                    y: (cart.y + nearbyEnemy.y) / 2,
                    angle: cart.turretAngle,
                    life: 0.18,
                    color: '#38bdf8',
                    radius: Math.hypot(nearbyEnemy.x - cart.x, nearbyEnemy.y - cart.y) / 2
                });

                spawnText(g, nearbyEnemy.x, nearbyEnemy.y - 18, `-${tDmg} ТУРЕЛЬ`, '#38bdf8');
            }
        }
    }

    // BLESSING: Tesla Torches (balanced single-target shock tick)
    if (g.activePerk === 'tesla_torches') {
        g.teslaCooldown = (g.teslaCooldown || 0) - dt;
        if (g.teslaCooldown <= 0) {
            g.teslaCooldown = 2.2;
            g.torches.forEach(t => {
                const target = g.enemies
                    .filter(e => e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) < 220)
                    .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
                if (target) {
                    const zapDmg = 7 + Math.floor(depth * 0.7);
                    target.hp -= zapDmg;
                    sound.playTesla();
                    g.slashes.push({
                        id: Math.random().toString(),
                        x: (t.x + target.x) / 2,
                        y: (t.y + target.y) / 2,
                        angle: Math.atan2(target.y - t.y, target.x - t.x),
                        life: 0.2,
                        color: '#06b6d4',
                        radius: Math.hypot(target.x - t.x, target.y - t.y) / 2
                    });
                    spawnText(g, target.x, target.y - 15, `⚡ -${zapDmg}`, '#06b6d4');
                }
            });
        }
    }

    // Player Movement
    p.moving = false;
    if (joy.active) {
      const dx = joy.currX - joy.originX;
      const dy = joy.currY - joy.originY;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 5) {
        p.moving = true;
        const MAX_R = 40;
        const moveDist = Math.min(dist, MAX_R);
        const speed = 250;
        
        const sdx = (dx / dist) * speed * (moveDist / MAX_R);
        const sdy = (dy / dist) * speed * (moveDist / MAX_R);
        
        const vx = sdx / 2 + sdy;
        const vy = sdy - sdx / 2;
        
        const vDist = Math.hypot(vx, vy);
        if (vDist > 0) {
          const normVx = (vx / vDist) * speed * (moveDist / MAX_R);
          const normVy = (vy / vDist) * speed * (moveDist / MAX_R);
          moveWithCollisions(p, normVx, normVy, 14, dt, g.grid);
        }
      }
    }

    // Process Volatile Exploding Nodes (balanced AoE burst)
    for (let i = g.nodes.length - 1; i >= 0; i--) {
        const n = g.nodes[i];
        if (n.exploding) {
            n.fuseTimer = (n.fuseTimer || 0.4) - dt;
            if (n.fuseTimer <= 0) {
                // Detonation!
                g.screenShake = 16;
                sound.playExplosion();
                g.slashes.push({ 
                    id: Math.random().toString(), 
                    x: n.x, 
                    y: n.y, 
                    angle: 0, 
                    life: 0.35, 
                    color: '#ea580c', 
                    radius: 120 
                });

                // Damage all mobs in blast radius (balanced to 45 + 5*depth)
                g.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - n.x, e.y - n.y) < 140) {
                        const blastDmg = 45 + depth * 5;
                        e.hp -= blastDmg;
                        spawnText(g, e.x, e.y, `-${blastDmg} ДЕТОНАЦИЯ!`, '#f97316');
                    }
                });

                // Damage player if standing too close
                if (Math.hypot(p.x - n.x, p.y - n.y) < 65) {
                    p.hp -= 10;
                    spawnText(g, p.x, p.y, '-10 ВОЛНА ВЗРЫВА', '#ef4444');
                }

                // Drop explosion mineral shards
                for (let k = 0; k < 5; k++) {
                    g.loots.push({ 
                        id: Math.random().toString(), 
                        x: n.x, 
                        y: n.y, 
                        type: Math.random() > 0.5 ? 'shards' : 'metal', 
                        vx: (Math.random() - 0.5) * 260, 
                        vy: (Math.random() - 0.5) * 260, 
                        magnet: false 
                    });
                }

                g.nodes.splice(i, 1);
            }
        }
    }

    // Mining & Interactive Nodes (Chests and Minerals)
    if (!p.moving) {
       const node = g.nodes.find(n => !n.exploding && Math.hypot(n.x - p.x, n.y - p.y) < 100);
       if (node && (p.inLight || node.kind === 'chest')) {
           p.miningTimer += dt;
           if (p.miningTimer >= 0.8) {
               p.miningTimer = 0;
               const dmg = 1; 
               node.hp -= dmg;
               sound.playMining();

               if (node.kind === 'chest') {
                   spawnText(g, node.x, node.y, 'ВЗЛОМ СУНДУКА...', '#fbbf24');
                   if (node.hp <= 0 && !node.opened) {
                       node.opened = true;
                       g.screenShake = 14;
                       sound.playLoot();
                       spawnText(g, node.x, node.y - 25, 'ТАЙНИК ШАХТЕРА ВСКРЫТ!', '#facc15');

                       // Rich chest loot shower: 8 Ore, 6 Metal, 4 Shards!
                       for (let k = 0; k < 14; k++) {
                           const type = k < 7 ? 'ore' : k < 11 ? 'metal' : 'shards';
                           g.loots.push({
                               id: Math.random().toString(),
                               x: node.x,
                               y: node.y,
                               type,
                               vx: (Math.random() - 0.5) * 260,
                               vy: (Math.random() - 0.5) * 260,
                               magnet: false
                           });
                       }

                       // Guaranteed RPG Item reward from ancient mine chest!
                       const possibleSlots: ItemSlot[] = ['weapon', 'head', 'chest'];
                       const dropSlot = possibleSlots[Math.floor(Math.random() * possibleSlots.length)];
                       const itemFound = generateRPGItem(dropSlot, depth, Math.random() < 0.4 ? 'rare' : 'magic');
                       if (!g.accumulatedItems) g.accumulatedItems = [];
                       g.accumulatedItems.push(itemFound);
                       spawnText(g, node.x, node.y - 45, `✨ НАХОДКА: ${itemFound.name}`, itemFound.rarity === 'rare' ? '#facc15' : '#60a5fa');

                       g.nodes = g.nodes.filter(n => n.id !== node.id);
                   }
               } else if (node.kind === 'volatile') {
                   spawnText(g, node.x, node.y, `-${dmg} УДАР`, '#f97316');
                   if (node.hp <= 0 && !node.exploding) {
                       node.exploding = true;
                       node.fuseTimer = 0.4;
                       sound.playTorch();
                       spawnText(g, node.x, node.y - 25, '⚠️ ДЕТОНАЦИЯ ЧЕРЕЗ 0.4с!', '#ef4444');
                       g.screenShake = 8;
                   }
               } else {
                   spawnText(g, node.x, node.y, `-${dmg}`, '#facc15');
                   
                   if (!node.mobSpawned) {
                       node.mobSpawned = true;
                       const kindRoll = Math.random();
                       const ambKind: EnemyKind = kindRoll > 0.65 ? 'shadow_stalker' : kindRoll > 0.35 ? 'crystal_crawler' : 'corridor_goblin';
                       g.enemies.push(createEnemyInstance(
                           ambKind,
                           depth,
                           node.x + (Math.random() - 0.5) * 80,
                           node.y + (Math.random() - 0.5) * 80,
                           { aggro: true }
                       ));
                       sound.playWhoosh();
                       spawnText(g, node.x, node.y - 40, "ЗАСАДА ИЗ ЖИЛЫ!", '#ef4444');
                   }

                   if (node.hp <= 0) {
                       g.nodes = g.nodes.filter(n => n.id !== node.id);
                       sound.playLoot();
                       const isBossNode = node.id.startsWith('boss');
                       let rCount = isBossNode ? 6 : 3;
                       for(let i=0; i<rCount; i++) {
                           const r = Math.random();
                           let type: 'ore'|'metal'|'shards' = 'ore';
                           if (r > 0.8) type = 'shards';
                           else if (r > 0.5) type = 'metal';
                           g.loots.push({ id: Math.random().toString(), x: node.x, y: node.y, type, vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*200, magnet: false });
                       }
                   }
               }
           }
       } else {
           p.miningTimer = 0;
       }
    } else {
       p.miningTimer = 0;
    }

    // ==========================================
    // DYNAMIC MONSTER AMBUSHES & PROGRESSIVE DEPTH WAVES
    // ==========================================
    const isBossDead = g.enemies.some(e => e.boss && e.hp <= 0) || g.bossDefeated;
    const maxAliveMobs = 22 + depth * 4;
    const aliveMobsCount = g.enemies.filter(e => e.hp > 0).length;

    // Helper to find a walkable floor tile around a center point
    const findCavernSpawn = (refX: number, refY: number, minDistance = 320, maxDistance = 460) => {
        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDistance + Math.random() * (maxDistance - minDistance);
            const sx = refX + Math.cos(angle) * dist;
            const sy = refY + Math.sin(angle) * dist;
            const col = Math.floor(sx / TILE_SIZE);
            const row = Math.floor(sy / TILE_SIZE);

            if (row >= 4 && row < MAP_ROWS - 2 && col >= 4 && col < MAP_COLS - 4) {
                if (g.grid[row]?.[col] === 0 || g.grid[row]?.[col] === 2) {
                    return { x: sx, y: sy };
                }
            }
        }
        return null;
    };

    if (!isBossDead && aliveMobsCount < maxAliveMobs) {
        // 1. Dynamic Ambient Ambushes from Cavern Fissures
        if (g.ambientAmbushTimer === undefined) {
            g.ambientAmbushTimer = Math.max(6, 16 - depth * 2);
        }
        g.ambientAmbushTimer -= dt;

        if (g.ambientAmbushTimer <= 0) {
            // Shorter intervals as you delve deeper
            g.ambientAmbushTimer = Math.max(6.5, 14 - depth * 1.6) + Math.random() * 3.5;

            const spawnPos = findCavernSpawn(p.x, p.y, 300, 440);
            if (spawnPos) {
                const squadSize = 1 + Math.floor(Math.random() * (1 + depth * 0.45));
                sound.playWhoosh();
                g.screenShake = Math.max(g.screenShake, 3);
                spawnText(g, spawnPos.x, spawnPos.y - 25, '⚠️ ЗАСАДА ИЗ ТЬМЫ!', '#ef4444');

                for (let k = 0; k < squadSize; k++) {
                    const roll = Math.random();
                    let kind: EnemyKind = 'corridor_goblin';
                    if (depth === 1) {
                        kind = roll > 0.65 ? 'shadow_stalker' : 'corridor_goblin';
                    } else if (depth === 2) {
                        kind = roll > 0.6 ? 'shadow_stalker' : roll > 0.35 ? 'crystal_crawler' : 'corridor_goblin';
                    } else {
                        kind = roll > 0.5 ? 'shadow_stalker' : roll > 0.25 ? 'crystal_crawler' : 'corridor_goblin';
                    }

                    const offsetX = (Math.random() - 0.5) * 60;
                    const offsetY = (Math.random() - 0.5) * 60;
                    g.enemies.push(createEnemyInstance(
                        kind,
                        depth,
                        spawnPos.x + offsetX,
                        spawnPos.y + offsetY,
                        { aggro: true }
                    ));
                }
            }
        }

        // 2. Cart Rail Progress Milestones (Intercepting Raids)
        if (!g.cartMilestonesTriggered) {
            g.cartMilestonesTriggered = { p25: false, p50: false, p75: false };
        }
        const cartProgress = cart.pathIndex / Math.max(1, g.rails.length - 1);

        // 25% milestone
        if (cartProgress >= 0.25 && !g.cartMilestonesTriggered.p25) {
            g.cartMilestonesTriggered.p25 = true;
            sound.playTorch();
            spawnText(g, cart.x, cart.y - 40, '⚠️ НАПАДЕНИЕ НА ПУТИ (25%)!', '#f97316');
            g.screenShake = 6;
            for (let k = 0; k < 2; k++) {
                const sp = findCavernSpawn(cart.x, cart.y, 260, 390);
                if (sp) {
                    g.enemies.push(createEnemyInstance(
                        Math.random() > 0.5 ? 'corridor_goblin' : 'shadow_stalker',
                        depth,
                        sp.x,
                        sp.y,
                        { aggro: true }
                    ));
                }
            }
        }

        // 50% milestone
        if (cartProgress >= 0.50 && !g.cartMilestonesTriggered.p50) {
            g.cartMilestonesTriggered.p50 = true;
            sound.playTesla();
            spawnText(g, cart.x, cart.y - 45, '⚠️ ТЕНЕВОЙ ПЕРЕХВАТ ОБОЗА (50%)!', '#c084fc');
            g.screenShake = 8;
            const waveSize = 2 + (depth >= 2 ? 1 : 0);
            for (let k = 0; k < waveSize; k++) {
                const sp = findCavernSpawn(cart.x, cart.y, 260, 390);
                if (sp) {
                    g.enemies.push(createEnemyInstance(
                        k === 0 ? 'crystal_crawler' : 'shadow_stalker',
                        depth,
                        sp.x,
                        sp.y,
                        { aggro: true }
                    ));
                }
            }
        }

        // 75% milestone (Boss Vanguard attack)
        if (cartProgress >= 0.75 && !g.cartMilestonesTriggered.p75) {
            g.cartMilestonesTriggered.p75 = true;
            sound.playWhoosh();
            spawnText(g, cart.x, cart.y - 45, '⚠️ АВАНГАРД БОССА В АТАКЕ (75%)!', '#ef4444');
            g.screenShake = 9;
            const vanguardSize = 2 + Math.min(3, Math.floor(depth * 0.7));
            for (let k = 0; k < vanguardSize; k++) {
                const sp = findCavernSpawn(cart.x, cart.y, 240, 380);
                if (sp) {
                    g.enemies.push(createEnemyInstance(
                        k % 2 === 0 ? 'crystal_crawler' : 'shadow_stalker',
                        depth,
                        sp.x,
                        sp.y,
                        { aggro: true }
                    ));
                }
            }
        }

        // 3. Darkness Danger (Shadows stalk lingering players)
        if (!p.inLight) {
            g.darknessTimer = (g.darknessTimer || 0) + dt;
            if (g.darknessTimer >= 4.2) {
                g.darknessTimer = 0;
                const stalkerPos = findCavernSpawn(p.x, p.y, 180, 300);
                if (stalkerPos) {
                    sound.playHurt();
                    spawnText(g, p.x, p.y - 35, '⚠️ ТЬМА СГУЩАЕТСЯ: ВАС НАСТИГЛА ТЕНЬ!', '#c084fc');
                    g.enemies.push(createEnemyInstance(
                        'shadow_stalker',
                        depth,
                        stalkerPos.x,
                        stalkerPos.y,
                        { aggro: true }
                    ));
                }
            }
        } else {
            g.darknessTimer = Math.max(0, (g.darknessTimer || 0) - dt * 2.5);
        }
    }

    // Combat (Moved to combat.ts)
    updateCombat(g, stats, dt, depth, (x, y, text, color) => spawnText(g, x, y, text, color));

    // Loot Collection (Player Magnet + CART MAGNET MODULE)
    const hasCartMagnet = Boolean(g.cartModules?.magnet);
    for (let i = g.loots.length - 1; i >= 0; i--) {
        const l = g.loots[i];
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.vx *= 0.9;
        l.vy *= 0.9;
        
        const distToPlayer = Math.hypot(p.x - l.x, p.y - l.y);
        const distToCart = Math.hypot(cart.x - l.x, cart.y - l.y);

        if (distToPlayer < 130 && p.inLight) l.magnet = true;
        if (g.winTimer > 0) l.magnet = true; // Auto-magnet during victory
        
        // Cart magnet pull
        if (hasCartMagnet && distToCart < 280) {
            const magSpeed = 440;
            l.x += ((cart.x - l.x) / distToCart) * magSpeed * dt;
            l.y += ((cart.y - l.y) / distToCart) * magSpeed * dt;
            if (distToCart < 30) {
                g.accumulatedLoot[l.type]++;
                g.loots.splice(i, 1);
                continue;
            }
        }
        
        if (l.magnet) {
            const magSpeed = 440;
            l.x += ((p.x - l.x) / distToPlayer) * magSpeed * dt;
            l.y += ((p.y - l.y) / distToPlayer) * magSpeed * dt;
        }
        
        if (distToPlayer < 24) {
            g.accumulatedLoot[l.type]++;
            g.loots.splice(i, 1);
            sound.playLoot();

            // Blessing: Whirlwind Scavenger (Cleave spin on loot pickup, balanced to 6 + depth*0.6)
            if (g.activePerk === 'whirlwind_scavenger') {
                sound.playSlash();
                g.slashes.push({
                    id: Math.random().toString(),
                    x: p.x,
                    y: p.y,
                    angle: Math.random() * Math.PI * 2,
                    life: 0.22,
                    color: '#10b981',
                    radius: 70
                });
                g.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 75) {
                        const spinDmg = 6 + Math.floor(depth * 0.6);
                        e.hp -= spinDmg;
                        spawnText(g, e.x, e.y, `-${spinDmg} ВИХРЬ`, '#10b981');
                    }
                });
            }
        }
    }

    // Death Check
    if (p.hp <= 0) {
        endWave(true);
    }
    
    // Darkness damage
    if (!p.inLight) {
        p.hp -= 2.5 * dt;
    }

    // Slashes and Texts
    g.slashes.forEach(s => s.life -= dt);
    g.slashes = g.slashes.filter(s => s.life > 0);
    g.texts.forEach(t => {
      t.life -= dt;
      t.floatY += 50 * dt;
    });
    g.texts = g.texts.filter(t => t.life > 0);

    // Win condition: BOSS DEFEATED!
    const bossAlive = g.enemies.some(e => e.boss && e.hp > 0);
    if (!bossAlive && (g.bossDefeated || cart.pathIndex >= g.rails.length - 1)) {
       if (g.winTimer === 0) {
           g.winTimer = 3.2; // 3.2 seconds victory flourish
           g.screenShake = 16;
           sound.playVictory();
           spawnText(g, p.x, p.y - 35, '🏆 ЭТАЖ ЗАЧИЩЕН! ВЫХОД...', '#4ade80');
       }
       g.winTimer -= dt;
       // Magnetize all remaining loot on the entire map to the player!
       g.loots.forEach(l => { l.magnet = true; });
       if (g.winTimer <= 0) {
           endWave(false);
       }
    }
};
