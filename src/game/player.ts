import { Item, Player, TownBuff } from '../types';
import { ITEM_SETS } from './affixes';

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
      maxHealth += item.stats?.health || 0;
      damage += item.stats?.damage || 0;
      armor += item.stats?.armor || 0;
    }
  });

  // Calculate set bonuses
  const setCounts: Record<string, number> = {};
  Object.values(equipment).forEach(item => {
    if (item && item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
    }
  });

  let bonusPercentHp = 0;
  let bonusPercentDamage = 0;
  let bonusPercentArmor = 0;

  Object.entries(setCounts).forEach(([setId, count]) => {
    const setInfo = ITEM_SETS[setId];
    if (setInfo) {
      setInfo.bonuses.forEach(b => {
        if (count >= b.count) {
          if (b.bonusHp) maxHealth += b.bonusHp;
          if (b.bonusDamage) damage += b.bonusDamage;
          if (b.bonusArmor) armor += b.bonusArmor;
          if (b.bonusPercentHp) bonusPercentHp += b.bonusPercentHp;
          if (b.bonusPercentDamage) bonusPercentDamage += b.bonusPercentDamage;
          if (b.bonusPercentArmor) bonusPercentArmor += b.bonusPercentArmor;
        }
      });
    }
  });

  if (bonusPercentHp > 0) maxHealth = Math.round(maxHealth * (1 + bonusPercentHp / 100));
  if (bonusPercentDamage > 0) damage = Math.round(damage * (1 + bonusPercentDamage / 100));
  if (bonusPercentArmor > 0) armor = Math.round(armor * (1 + bonusPercentArmor / 100));

  if (townBuff) {
    if (townBuff.bonusHp) maxHealth += townBuff.bonusHp;
    if (townBuff.bonusDmg) damage += townBuff.bonusDmg;
  }

  return { maxHealth, damage, armor };
};

