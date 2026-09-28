import { Enemy, EnemyKind, BossKind, GameEngineState, Slash } from './types';
import { sound } from './audio';
import { generateRPGItem } from './affixes';
import { ItemSlot } from '../types';

/**
 * Calculates fair, diminishing-returns damage reduction from armor.
 * Prevents player from becoming fully immune, while keeping crafted armor highly impactful.
 */
export function calculateDamageAgainstArmor(enemyDamage: number, armor: number, depth: number): number {
  // New Formula: damageTaken = damage * K / (K + armor)
  // Armor provides diminishing percentage damage reduction, prevents 0 damage.
  const K = 50;
  const damageTaken = enemyDamage * K / (K + armor);
  
  // Minimum damage scales smoothly with depth so deeper floors stay challenging:
  const minFloor = Math.max(3, 2 + Math.floor(depth * 0.8));
  
  return Math.max(minFloor, Math.round(damageTaken));
}

/**
 * Central factory for spawning calibrated enemies that scale progressively with depth.
 */
export function createEnemyInstance(
  kind: EnemyKind,
  depth: number,
  x: number,
  y: number,
  options?: { isBoss?: boolean; bossKind?: BossKind; aggro?: boolean }
): Enemy {
  const isBoss = options?.isBoss ?? false;
  if (isBoss) {
    const bKind = options?.bossKind || 'foreman';
    let hp = 380 + depth * 60;
    let dmg = 22 + depth * 4;
    let spd = 45;
    let name = 'Бригадир Дробильщик';

    if (bKind === 'shadow_lord') {
      hp = 320 + depth * 50;
      dmg = 26 + Math.floor(depth * 4.5);
      spd = 55;
      name = 'Повелитель Мглы';
    } else if (bKind === 'crystal_colossus') {
      hp = 520 + depth * 75;
      dmg = 20 + depth * 3.8;
      spd = 38;
      name = 'Кристальный Колосс';
    }

    return {
      id: 'boss_' + Math.random().toString(36).substring(7),
      x,
      y,
      hp: Math.round(hp),
      maxHp: Math.round(hp),
      speed: spd,
      damage: Math.round(dmg),
      boss: true,
      bossKind: bKind,
      name,
      aggro: options?.aggro ?? false,
      attackTimer: 0
    };
  }

  // Normal mobs with rich depth progression
  let hp = 36 + depth * 14;
  let spd = 65 + Math.min(22, depth * 2.2);
  let dmg = 9 + depth * 2.5;
  let name = 'Гоблин-забойщик';

  if (kind === 'shadow_stalker') {
    hp = 26 + depth * 10;
    spd = 88 + Math.min(25, depth * 3);
    dmg = 12 + depth * 3.0;
    name = 'Теневой Ловец';
  } else if (kind === 'crystal_crawler') {
    hp = 65 + depth * 22;
    spd = 42 + Math.min(16, depth * 1.6);
    dmg = 10 + depth * 2.8;
    name = 'Кристальный Панцирник';
  }

  return {
    id: 'mob_' + Math.random().toString(36).substring(7),
    x,
    y,
    hp: Math.round(hp),
    maxHp: Math.round(hp),
    speed: Math.round(spd),
    damage: Math.round(dmg),
    boss: false,
    kind,
    name,
    aggro: options?.aggro ?? false,
    attackTimer: 0
  };
}

export function updateCombat(
    g: GameEngineState, 
    pStats: { damage: number, maxHealth: number, armor: number }, 
    dt: number, 
    depth: number, 
    spawnText: (x: number, y: number, text: string, color: string) => void
) {
    const p = g.player;

    // Decay screen shake
    if (g.screenShake > 0) {
        g.screenShake = Math.max(0, g.screenShake - dt * 25);
    }

    // Invulnerability frames decay
    if (p.invulnTimer && p.invulnTimer > 0) {
        p.invulnTimer -= dt;
    }

    // Effective player stats modified by active perks (rebalanced for minimal fair bonuses)
    let effectiveArmor = pStats.armor;
    let effectiveDamage = pStats.damage;
    if (g.activePerk === 'light_shield' && p.inLight) {
        effectiveArmor += 3; // Subtle +3 armor in light
    }
    if (g.activePerk === 'shadow_hunter') {
        effectiveDamage = Math.floor(effectiveDamage * 1.15); // +15% damage
    }

    // Light check for enemies
    const cartLightRadius = g.cartModules?.searchlight 
        ? ((g.cart.pathIndex >= g.rails.length - 1) ? 900 : 550) 
        : ((g.cart.pathIndex >= g.rails.length - 1) ? 800 : 350);

    g.enemies.forEach(e => {
        if (e.hp <= 0) return;
        const ex = p.x - e.x;
        const ey = p.y - e.y;
        const eDist = Math.hypot(ex, ey);

        // Check if enemy is illuminated by cart, torches, or player
        const distToCart = Math.hypot(e.x - g.cart.x, e.y - g.cart.y);
        let eInLight = distToCart < cartLightRadius || Math.hypot(e.x - p.x, e.y - p.y) < 100;
        if (!eInLight) {
            for (const t of g.torches) {
                if (Math.hypot(e.x - t.x, e.y - t.y) < 280) {
                    eInLight = true;
                    break;
                }
            }
        }
        e.inLight = eInLight;

        // Shadow stalkers burn & weaken in the light!
        if (e.kind === 'shadow_stalker' && eInLight) {
            const burn = 8 * dt;
            e.hp -= burn;
            if (Math.random() < dt * 2) {
                spawnText(e.x, e.y - 15, 'СВЕТ ЖЖЁТ!', '#c084fc');
            }
        }
        
        // Aggro trigger
        const aggroDist = e.boss ? 500 : (e.kind === 'shadow_stalker' && !eInLight) ? 450 : 350;
        if (!e.aggro && eDist < aggroDist) {
            e.aggro = true;
        }

        if (e.aggro) {
            if (e.attackTimer > 0) e.attackTimer -= dt;

            // Current speed modifier (shadow stalkers are sluggish in light, speedy in dark)
            let actualSpeed = e.speed;
            if (e.kind === 'shadow_stalker') {
                actualSpeed = eInLight ? e.speed * 0.65 : e.speed * 1.35;
            }

            // BOSS MECHANICS
            if (e.boss) {
                const bKind = e.bossKind || 'foreman';

                // Shadow Lord: Shadow Blink & Ambush (Depth 2 Boss)
                if (bKind === 'shadow_lord') {
                    // Stun handling: if stunned after a whiffed attack, boss is helpless
                    if (e.stunTimer && e.stunTimer > 0) {
                        e.stunTimer -= dt;
                        // Boss cannot act while stunned
                    }
                    // Stage 1: Currently telegraphing ambush location
                    else if (e.telegraphTimer && e.telegraphTimer > 0) {
                        e.telegraphTimer -= dt;
                        if (e.telegraphTimer <= 0) {
                            // EXECUTE TELEPORT!
                            const destX = e.targetX ?? (p.x + 85);
                            const destY = e.targetY ?? (p.y + 40);
                            e.x = destX;
                            e.y = destY;
                            g.screenShake = 6;

                            // Spawn dark mist arrival burst
                            g.slashes.push({ 
                                id: Math.random().toString(), 
                                x: destX, 
                                y: destY, 
                                angle: 0, 
                                life: 0.35, 
                                color: '#a855f7', 
                                radius: 45 
                            });

                            // DO NOT HIT INSTANTLY!
                            // Boss materializes and raises shadow blades with a 0.6s attack wind-up!
                            e.preparingStrike = true;
                            e.strikeTimer = 0.6;
                            e.strikeAngle = Math.atan2(p.y - destY, p.x - destX);
                            e.telegraphTimer = 0;
                            spawnText(e.x, e.y - 30, '⚠️ ЗАМАХ КЛИНКОВ! УВОРАЧИВАЙТЕСЬ!', '#f43f5e');
                            sound.playWhoosh();
                        }
                    }
                    // Stage 2: Preparing strike (Player has 0.6s window to step aside, dodge or sprint away!)
                    else if (e.preparingStrike && e.strikeTimer !== undefined) {
                        e.strikeTimer -= dt;
                        if (e.strikeTimer <= 0) {
                            e.preparingStrike = false;
                            const strikeAngle = e.strikeAngle ?? Math.atan2(p.y - e.y, p.x - e.x);
                            const strikeRadius = 60;

                            // Visual attack slash arc
                            g.slashes.push({ 
                                id: Math.random().toString(), 
                                x: e.x + Math.cos(strikeAngle) * 35, 
                                y: e.y + Math.sin(strikeAngle) * 35, 
                                angle: strikeAngle, 
                                life: 0.38, 
                                color: '#c084fc', 
                                radius: strikeRadius 
                            });

                            // Check if player is caught in the strike cone
                            const curDist = Math.hypot(p.x - e.x, p.y - e.y);
                            const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);
                            let angleDiff = Math.abs(strikeAngle - angleToPlayer);
                            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                            // Hit if within 60px and within 120-degree cone (1.05 radians)
                            const isHit = curDist <= strikeRadius && angleDiff < 1.05;

                            if (isHit) {
                                if (!p.invulnTimer || p.invulnTimer <= 0) {
                                    const rawBossStrike = Math.round(e.damage * 1.3);
                                    const dmg = calculateDamageAgainstArmor(rawBossStrike, effectiveArmor, depth);
                                    p.hp -= dmg;
                                    p.invulnTimer = 0.85; // i-frames to prevent instant death combos
                                    g.screenShake = 10;
                                    spawnText(p.x, p.y, `-${dmg} ТЕНЕВОЙ УДАР!`, '#ef4444');
                                    sound.playHurt();
                                }
                                e.attackTimer = 3.5;
                            } else {
                                // SUCCESSFUL DODGE! Boss swings at empty air!
                                spawnText(p.x, p.y, '💨 УСПЕШНОЕ УКЛОНЕНИЕ!', '#38bdf8');
                                spawnText(e.x, e.y - 25, '😵 БОСС ОГЛУШЕН! АТАКУЙТЕ!', '#facc15');
                                sound.playWhoosh();
                                e.stunTimer = 1.6; // Boss is stunned and vulnerable to player counter-attacks!
                                e.attackTimer = 4.5;
                            }
                        }
                    }
                    // Stage 0: Initiate Ambush when player is in range
                    else if (eDist < 330 && e.attackTimer <= 0 && (!e.stunTimer || e.stunTimer <= 0)) {
                        // Start Telegraph: Lock destination behind player's current trajectory (85px away)
                        const behindAngle = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.35;
                        e.targetX = p.x + Math.cos(behindAngle) * 85;
                        e.targetY = p.y + Math.sin(behindAngle) * 85;
                        e.telegraphTimer = 1.75; // Generous 1.75 seconds to react!
                        e.maxTelegraph = 1.75;
                        e.telegraphType = 'shadow_blink';
                        e.telegraphRadius = 60;
                        spawnText(e.x, e.y - 25, '⚠️ ТЕНЕВОЙ ПРИЦЕЛ ЗА СПИНУ!', '#c084fc');
                        sound.playTesla();
                    }
                }
                // Foreman: Charging ground slam
                else if (bKind === 'foreman') {
                    if (e.telegraphTimer && e.telegraphTimer > 0) {
                        e.telegraphTimer -= dt;
                        if (e.telegraphTimer <= 0) {
                            const dx = (e.targetX ?? p.x) - e.x;
                            const dy = (e.targetY ?? p.y) - e.y;
                            const len = Math.hypot(dx, dy) || 1;
                            e.chargeX = (dx / len) * 230;
                            e.chargeY = (dy / len) * 230;
                            e.attackTimer = 2.4;
                            e.telegraphTimer = 0;
                            spawnText(e.x, e.y - 20, 'РАЗБЕГ!', '#f97316');
                        }
                    } else if (eDist < 290 && e.attackTimer <= 0 && !e.chargeX) {
                        e.targetX = p.x;
                        e.targetY = p.y;
                        e.telegraphTimer = 0.9;
                        e.maxTelegraph = 0.9;
                        e.telegraphType = 'ground_slam';
                        e.telegraphRadius = 55;
                        spawnText(e.x, e.y - 25, '⚠️ ГОТОВИТ ТАРАН!', '#ea580c');
                        sound.playTorch();
                    }

                    // Active dash forward
                    if (e.chargeX && e.attackTimer > 1.8) {
                        moveWithCollisions(e, e.chargeX, e.chargeY, 22, dt, g.grid);
                        if (eDist < 45) {
                            e.chargeX = 0;
                            e.attackTimer = 1.8;
                            const rawChargeDmg = Math.round(e.damage * 1.4);
                            const dmg = calculateDamageAgainstArmor(rawChargeDmg, effectiveArmor, depth);
                            p.hp -= dmg;
                            g.screenShake = 12;
                            spawnText(p.x, p.y, `-${dmg} СОТРЯСЕНИЕ!`, '#ef4444');
                            sound.playHurt();
                        }
                    } else if (e.chargeX && e.attackTimer <= 1.8) {
                        e.chargeX = 0;
                        e.attackTimer = 3.5;
                    }
                }
                // Crystal Colossus: Shockwave Nova
                else if (bKind === 'crystal_colossus') {
                    if (e.telegraphTimer && e.telegraphTimer > 0) {
                        e.telegraphTimer -= dt;
                        if (e.telegraphTimer <= 0) {
                            g.screenShake = 10;
                            spawnText(e.x, e.y - 30, 'КРИСТАЛЬНЫЙ ВЗРЫВ', '#38bdf8');
                            for (let i = 0; i < 6; i++) {
                                const angle = (Math.PI / 3) * i;
                                g.slashes.push({ id: Math.random().toString(), x: e.x, y: e.y, angle, life: 0.4, color: '#38bdf8', radius: 75 });
                            }
                            if (eDist < 85) {
                                const rawNovaDmg = Math.round(e.damage * 1.35);
                                const dmg = calculateDamageAgainstArmor(rawNovaDmg, effectiveArmor, depth);
                                p.hp -= dmg;
                                spawnText(p.x, p.y, `-${dmg}`, '#0284c7');
                                sound.playHurt();
                            } else {
                                spawnText(p.x, p.y, '💨 ВНЕ ЗОНЫ!', '#38bdf8');
                            }
                            e.telegraphTimer = 0;
                            e.attackTimer = 4.5;
                        }
                    } else if (e.attackTimer <= 0) {
                        e.telegraphTimer = 1.1;
                        e.maxTelegraph = 1.1;
                        e.telegraphType = 'nova';
                        e.targetX = e.x;
                        e.targetY = e.y;
                        e.telegraphRadius = 85;
                        spawnText(e.x, e.y - 30, '⚠️ ЭНЕРГИЯ КРИСТАЛЛОВ...', '#38bdf8');
                    }
                }
            }

            // Normal Movement towards player (halted when channeling telegraph, preparing strike, stunned or dashing)
            const isChanneling = e.boss && e.telegraphTimer && e.telegraphTimer > 0;
            const isDashing = e.boss && Boolean(e.chargeX);
            const isPreparingStrike = e.boss && Boolean(e.preparingStrike);
            const isStunned = Boolean(e.stunTimer && e.stunTimer > 0);

            if (!isChanneling && !isDashing && !isPreparingStrike && !isStunned) {
                if (eDist > 26) {
                    const normVx = (ex / eDist) * actualSpeed;
                    const normVy = (ey / eDist) * actualSpeed;
                    moveWithCollisions(e, normVx, normVy, e.boss ? 22 : 12, dt, g.grid);
                } else {
                    // Melee attack player (respects player i-frames to prevent insta-kill melts)
                    if (e.attackTimer <= 0 && (!p.invulnTimer || p.invulnTimer <= 0)) {
                        const dmg = calculateDamageAgainstArmor(e.damage, effectiveArmor, depth);
                        p.hp -= dmg;
                        p.invulnTimer = 0.55; // Invulnerability window
                        g.screenShake = Math.max(g.screenShake, 4);
                        spawnText(p.x, p.y, `-${dmg}`, '#ef4444');
                        e.attackTimer = e.kind === 'shadow_stalker' ? 0.85 : 1.2;
                    }
                }
            }
        }
    });

    // PLAYER ATTACKS: Works both while standing STILL and while MOVING!
    if (p.attackTimer > 0) p.attackTimer -= dt;

    if (p.attackTimer <= 0 && p.inLight) {
        // Find all enemies in melee arc/range (cleave up to 2 targets)
        const enemiesInRange = g.enemies
            .filter(e => e.hp > 0 && Math.hypot(p.x - e.x, p.y - e.y) < 115)
            .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y));

        if (enemiesInRange.length > 0) {
            p.attackTimer = 0.42; // Fast, fluid attack cadence
            sound.playSlash();

            const primary = enemiesInRange[0];
            const strikeAngle = Math.atan2(primary.y - p.y, primary.x - p.x);

            // Visual slash effect
            g.slashes.push({ 
                id: Math.random().toString(), 
                x: p.x + Math.cos(strikeAngle) * 35, 
                y: p.y + Math.sin(strikeAngle) * 35, 
                angle: strikeAngle, 
                life: 0.22,
                color: '#facc15'
            });

            // Strike up to 2 enemies in range
            const targetsToHit = enemiesInRange.slice(0, 2);

            targetsToHit.forEach((target, index) => {
                const isCrit = Math.random() < 0.22;
                let rawDmg = isCrit ? Math.floor(effectiveDamage * 1.8) : effectiveDamage;
                if (index > 0) rawDmg = Math.floor(rawDmg * 0.7); // secondary cleave

                // Mob kind damage modifiers
                if (target.kind === 'shadow_stalker' && target.inLight) {
                    rawDmg = Math.floor(rawDmg * 1.5); // +50% bonus vs shadow in light
                } else if (target.kind === 'crystal_crawler') {
                    rawDmg = Math.max(1, rawDmg - 4); // rock carapace
                }

                target.hp -= rawDmg;
                sound.playHit(isCrit);

                if (isCrit) {
                    g.screenShake = Math.max(g.screenShake, 6);
                    spawnText(target.x, target.y - 10, `КРИТ! -${rawDmg}`, '#facc15');
                } else {
                    spawnText(target.x, target.y, `-${rawDmg}`, '#ffffff');
                }

                // Shadow Lord reaction to damage (only if NOT stunned)
                if (target.boss && target.bossKind === 'shadow_lord' && (!target.stunTimer || target.stunTimer <= 0) && Math.random() < 0.15) {
                    target.x += (Math.random() - 0.5) * 80;
                    target.y += (Math.random() - 0.5) * 80;
                    spawnText(target.x, target.y, 'МЕРЦАНИЕ', '#a855f7');
                }

                // Handling Death
                if (target.hp <= 0) {
                    // Shadow Hunter perk: heal on kill (+2 HP, fair sustain)
                    if (g.activePerk === 'shadow_hunter') {
                        p.hp = Math.min(pStats.maxHealth, p.hp + 2);
                        spawnText(p.x, p.y - 22, '+2 HP ВАМПИРИЗМ', '#10b981');
                    }

                    // Volatile crystals perk: explosion on enemy kill (rebalanced to 8 + depth*0.8)
                    if (g.activePerk === 'volatile_crystals') {
                        const crystalDmg = 8 + Math.floor(depth * 0.8);
                        g.slashes.push({ 
                            id: Math.random().toString(), 
                            x: target.x, 
                            y: target.y, 
                            angle: 0, 
                            life: 0.25, 
                            color: '#f97316', 
                            radius: 60 
                        });
                        g.screenShake = Math.max(g.screenShake, 4);
                        g.enemies.forEach(other => {
                            if (other.hp > 0 && other.id !== target.id && Math.hypot(other.x - target.x, other.y - target.y) < 65) {
                                other.hp -= crystalDmg;
                                spawnText(other.x, other.y, `-${crystalDmg} ОСКОЛКИ`, '#f97316');
                            }
                        });
                    }

                    // Boss defeat celebration
                    if (target.boss) {
                        g.bossDefeated = true;
                        g.screenShake = 22;
                        sound.playVictory();
                        spawnText(target.x, target.y - 25, '🏆 БОСС ПОВЕРЖЕН!', '#facc15');

                        // Guaranteed high-tier equipment drop (Rare, Epic, or Legendary with powerful affixes)
                        const possibleSlots: ItemSlot[] = ['weapon', 'head', 'chest', 'legs', 'boots', 'offhand', 'amulet', 'ring'];
                        const dropSlot = possibleSlots[Math.floor(Math.random() * possibleSlots.length)];
                        const bossItem = generateRPGItem(dropSlot, depth, Math.random() < 0.2 ? 'legendary' : Math.random() < 0.5 ? 'epic' : 'rare');
                        if (!g.accumulatedItems) g.accumulatedItems = [];
                        g.accumulatedItems.push(bossItem);
                        spawnText(target.x, target.y - 50, `👑 ТРОФЕЙ: ${bossItem.name}`, bossItem.rarity === 'epic' ? '#a855f7' : '#facc15');
                    }

                    // Drops on death
                    let dropCount = target.boss ? 22 : target.kind === 'crystal_crawler' ? 5 : 3;
                    for (let i = 0; i < dropCount; i++) {
                        const r = Math.random();
                        let type: 'ore' | 'metal' | 'shards' = 'ore';
                        if (target.kind === 'crystal_crawler') {
                            if (r > 0.6) type = 'metal';
                            if (r > 0.85) type = 'shards';
                        } else if (target.kind === 'shadow_stalker') {
                            if (r > 0.8) type = 'shards';
                            else if (r > 0.5) type = 'metal';
                        } else {
                            if (r > 0.94) type = 'shards';
                            else if (r > 0.72) type = 'metal';
                        }
                        g.loots.push({ 
                            id: Math.random().toString(), 
                            x: target.x, 
                            y: target.y, 
                            type, 
                            vx: (Math.random() - 0.5) * 240, 
                            vy: (Math.random() - 0.5) * 240, 
                            magnet: false 
                        });
                    }
                }
            });
        }
    }

    // CRUCIAL BUG FIX: Remove dead enemies from g.enemies so corpses don't stand forever
    g.enemies = g.enemies.filter(e => e.hp > 0);
}

export const moveWithCollisions = (entity: any, vx: number, vy: number, radius: number, dt: number, grid: number[][]) => {
  const isBlocked = (cx: number, cy: number) => {
    const TILE_SIZE = 80;
    const c = Math.floor(cx / TILE_SIZE);
    const r = Math.floor(cy / TILE_SIZE);
    return grid[r]?.[c] === 1; 
  };

  let testX = entity.x + vx * dt;
  let testY = entity.y + vy * dt;

  const hitX = isBlocked(testX + radius, entity.y) || isBlocked(testX - radius, entity.y);
  const hitY = isBlocked(entity.x, testY + radius) || isBlocked(entity.x, testY - radius);

  if (!hitX) entity.x = testX;
  if (!hitY) entity.y = testY;
};
