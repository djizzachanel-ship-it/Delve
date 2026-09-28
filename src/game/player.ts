import { Item, Player, TownBuff } from '../types';

export const calculatePlayerStats = (
  player: Player, 
  equipment: Record<string, Item | null>,
  townBuff?: TownBuff | null
) => {
  let maxHealth = player.baseHealth;
  let damage = player.baseDamage;
  let armor = player.baseArmor;

  Object.values(equipment).forEach((item) => {
    if (item) {
      maxHealth += item.stats.health || 0;
      damage += item.stats.damage || 0;
      armor += item.stats.armor || 0;
    }
  });

  if (townBuff) {
    if (townBuff.bonusHp) maxHealth += townBuff.bonusHp;
    if (townBuff.bonusDmg) damage += townBuff.bonusDmg;
  }

  return { maxHealth, damage, armor };
};
