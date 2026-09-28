import React, { useState } from 'react';
import { Item, ItemSlot, Rarity } from '../types';
import { ITEM_SETS, ItemSetInfo } from '../game/affixes';
import { useTheme, ThemedButton, getThemedButtonClass } from '../theme';
import { 
  X, 
  Shield, 
  Sword, 
  Heart, 
  Zap, 
  Sparkles, 
  Trash2, 
  Check, 
  Crown, 
  HardHat, 
  Shirt, 
  Footprints, 
  Gem, 
  CircleDot, 
  Layers,
  ArrowRightLeft,
  ArrowLeft,
  Package,
  Scale
} from 'lucide-react';
import { sound } from '../game/audio';

export interface ItemTooltipModalProps {
  item: Item | null;
  emptySlot?: ItemSlot | null;
  isEquipped?: boolean;
  equippedItemInSlot?: Item | null;
  allEquippedItems?: Record<string, Item | null>;
  inventoryMatches?: Item[];
  initialReplaceMode?: boolean;
  onEquip?: (item: Item) => void;
  onUnequip?: (slot: ItemSlot) => void;
  onReplace?: (slot: ItemSlot) => void;
  onSalvage?: (item: Item) => void;
  onClose: () => void;
}

export const SLOT_INFO: Record<ItemSlot, { name: string; icon: React.ElementType }> = {
  head: { name: 'Шлем', icon: HardHat },
  chest: { name: 'Нагрудник', icon: Shirt },
  legs: { name: 'Поножи', icon: Layers },
  boots: { name: 'Сапоги', icon: Footprints },
  weapon: { name: 'Основное оружие', icon: Sword },
  offhand: { name: 'Щит / Фонарь', icon: Shield },
  amulet: { name: 'Амулет', icon: Gem },
  ring: { name: 'Кольцо', icon: CircleDot },
};

export const RARITY_CONFIG: Record<Rarity, {
  label: string;
  badgeBg: string;
  border: string;
  glow: string;
  text: string;
  bgGrad: string;
}> = {
  common: {
    label: 'Обычный',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    border: 'border-slate-700',
    glow: 'shadow-none',
    text: 'text-slate-200',
    bgGrad: 'from-slate-900 to-slate-950'
  },
  magic: {
    label: 'Магический',
    badgeBg: 'bg-sky-950 text-sky-300 border-sky-600',
    border: 'border-sky-500/70',
    glow: 'shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    text: 'text-sky-300',
    bgGrad: 'from-sky-950/60 via-slate-900 to-slate-950'
  },
  rare: {
    label: 'Редкий',
    badgeBg: 'bg-amber-950 text-amber-300 border-amber-600',
    border: 'border-amber-500/80',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]',
    text: 'text-amber-300',
    bgGrad: 'from-amber-950/60 via-slate-900 to-slate-950'
  },
  epic: {
    label: 'Эпический',
    badgeBg: 'bg-purple-950 text-purple-300 border-purple-600',
    border: 'border-purple-500/80',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.35)]',
    text: 'text-purple-300',
    bgGrad: 'from-purple-950/60 via-slate-900 to-slate-950'
  },
  legendary: {
    label: 'Легендарный',
    badgeBg: 'bg-rose-950 text-rose-300 border-rose-600',
    border: 'border-rose-500/90 ring-1 ring-amber-400/50',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.45)]',
    text: 'text-rose-300',
    bgGrad: 'from-rose-950/70 via-amber-950/50 to-slate-950'
  }
};

export const getSellValueText = (rarity: Rarity) => {
  switch (rarity) {
    case 'common': return '+5 руды, +2 мет.';
    case 'magic': return '+12 руды, +5 мет.';
    case 'rare': return '+28 руды, +12 мет.';
    case 'epic': return '+60 руды, +25 мет., +1 осколок';
    case 'legendary': return '+120 руды, +50 мет., +3 осколка';
    default: return '+5 руды';
  }
};

export const ItemTooltipModal: React.FC<ItemTooltipModalProps> = ({
  item,
  emptySlot,
  isEquipped,
  equippedItemInSlot,
  allEquippedItems,
  inventoryMatches = [],
  initialReplaceMode = false,
  onEquip,
  onUnequip,
  onReplace,
  onSalvage,
  onClose
}) => {
  const { theme } = useTheme();
  const [inReplaceMode, setInReplaceMode] = useState(initialReplaceMode);
  const [showCompare, setShowCompare] = useState(false);

  // 1. If an empty Paperdoll slot was clicked
  if (!item && emptySlot) {
    const slotData = SLOT_INFO[emptySlot] || { name: 'Слот', icon: Shield };
    const SlotIcon = slotData.icon;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-[#0e1424] border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <SlotIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  Слот: {slotData.name}
                </h3>
                <p className="text-[11px] text-slate-400">Слот пуст. Выберите предмет из рюкзака</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* List of matching items in inventory */}
          <div className="p-4 overflow-y-auto space-y-2.5 max-h-[50vh]">
            {inventoryMatches.length > 0 ? (
              inventoryMatches.map(matchItem => {
                const rConf = RARITY_CONFIG[matchItem.rarity] || RARITY_CONFIG.common;
                return (
                  <div
                    key={matchItem.id}
                    className={`p-3 rounded-2xl bg-gradient-to-r ${rConf.bgGrad} border ${rConf.border} flex items-center justify-between gap-3 shadow-md hover:border-slate-500 transition-all`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black truncate ${rConf.text}`}>
                          {matchItem.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${rConf.badgeBg}`}>
                          {rConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] font-semibold text-slate-300 font-mono">
                        {matchItem.stats.health > 0 && <span className="text-emerald-400">+{matchItem.stats.health} HP</span>}
                        {matchItem.stats.damage > 0 && <span className="text-rose-400">+{matchItem.stats.damage} Урон</span>}
                        {matchItem.stats.armor > 0 && <span className="text-sky-400">+{matchItem.stats.armor} Броня</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sound.playEquip();
                        onEquip?.(matchItem);
                        onClose();
                      }}
                      className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-transform active:scale-95 cursor-pointer flex-shrink-0"
                    >
                      Надеть
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                <SlotIcon size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
                В рюкзаке нет подходящих предметов типа «{slotData.name}».
                <div className="text-[11px] text-slate-400 mt-1">
                  Добудьте их в Шахте или скуйте в Кузнице городка!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const slotData = SLOT_INFO[item.slot] || { name: 'Снаряжение', icon: Shield };
  const SlotIcon = slotData.icon;
  const rarityConfig = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

  // Set calculations
  let setInfo: ItemSetInfo | null = null;
  let equippedSetCount = 0;
  if (item.setId && ITEM_SETS[item.setId]) {
    setInfo = ITEM_SETS[item.setId];
    if (allEquippedItems) {
      equippedSetCount = Object.values(allEquippedItems).filter(
        (it: unknown): it is Item => Boolean(it && (it as Item).setId === item.setId)
      ).length;
    }
  }

  // Stat comparisons with currently equipped item in this slot
  const compareHp = equippedItemInSlot && !isEquipped ? item.stats.health - equippedItemInSlot.stats.health : item.stats.health;
  const compareDmg = equippedItemInSlot && !isEquipped ? item.stats.damage - equippedItemInSlot.stats.damage : item.stats.damage;
  const compareArm = equippedItemInSlot && !isEquipped ? item.stats.armor - equippedItemInSlot.stats.armor : item.stats.armor;

  // 2. If in REPLACE MODE (switching out the currently equipped item)
  if (inReplaceMode && isEquipped) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-[#0e1424] border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInReplaceMode(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                title="Назад к предмету"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft size={14} className="text-amber-400" />
                  Замена: {slotData.name}
                </h3>
                <p className="text-[11px] text-slate-400">Выберите новый предмет из рюкзака</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Equipped Reference Card */}
          <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500">Сейчас надето:</span>
              <span className={`font-bold truncate ${rarityConfig.text}`}>{item.name}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 flex-shrink-0">
              {item.stats.health > 0 && <span className="text-emerald-400">+{item.stats.health}HP</span>}
              {item.stats.damage > 0 && <span className="text-rose-400">+{item.stats.damage}DMG</span>}
              {item.stats.armor > 0 && <span className="text-sky-400">+{item.stats.armor}ARM</span>}
            </div>
          </div>

          {/* List of matching inventory candidates for replacement */}
          <div className="p-4 overflow-y-auto space-y-2.5 max-h-[50vh]">
            {inventoryMatches.length > 0 ? (
              inventoryMatches.map(candidate => {
                const cRarity = RARITY_CONFIG[candidate.rarity] || RARITY_CONFIG.common;
                const dHp = candidate.stats.health - item.stats.health;
                const dDmg = candidate.stats.damage - item.stats.damage;
                const dArm = candidate.stats.armor - item.stats.armor;

                return (
                  <div
                    key={candidate.id}
                    className={`p-3 rounded-2xl bg-gradient-to-r ${cRarity.bgGrad} border ${cRarity.border} flex items-center justify-between gap-2 shadow-md hover:border-slate-500 transition-all`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-black truncate ${cRarity.text}`}>
                          {candidate.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${cRarity.badgeBg}`}>
                          {cRarity.label}
                        </span>
                        {candidate.setId && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold">
                            Сет
                          </span>
                        )}
                      </div>

                      {/* Stat comparisons */}
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] font-mono font-bold">
                        <span className={dHp > 0 ? 'text-emerald-400' : dHp < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {dHp > 0 ? `+${dHp} HP` : dHp < 0 ? `${dHp} HP` : `${candidate.stats.health} HP`}
                        </span>
                        <span className={dDmg > 0 ? 'text-emerald-400' : dDmg < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {dDmg > 0 ? `+${dDmg} Урон` : dDmg < 0 ? `${dDmg} Урон` : `${candidate.stats.damage} Урон`}
                        </span>
                        <span className={dArm > 0 ? 'text-emerald-400' : dArm < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {dArm > 0 ? `+${dArm} Броня` : dArm < 0 ? `${dArm} Броня` : `${candidate.stats.armor} Броня`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sound.playEquip();
                        onEquip?.(candidate);
                        onClose();
                      }}
                      className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-transform active:scale-95 cursor-pointer flex-shrink-0"
                    >
                      Надеть
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Package size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
                В рюкзаке нет других предметов для слота «{slotData.name}».
                <div className="text-[11px] text-slate-400 mt-1">
                  Скуйте снаряжение в Кузнице городка или найдите сундуки в Шахте!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Regular Item Tooltip Modal View
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md bg-gradient-to-b ${rarityConfig.bgGrad} border ${rarityConfig.border} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={e => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl bg-slate-900 border ${rarityConfig.border} flex items-center justify-center ${rarityConfig.text} shadow-inner flex-shrink-0`}>
              <SlotIcon size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${rarityConfig.badgeBg}`}>
                  {rarityConfig.label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {slotData.name}
                </span>
                {isEquipped && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50">
                    Надето
                  </span>
                )}
              </div>
              <h3 className={`text-base font-black truncate mt-0.5 ${rarityConfig.text}`}>
                {item.name}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= ITEM STATS & DETAILS ================= */}
        <div className="p-4 overflow-y-auto space-y-3 max-h-[60vh]">
          
          {/* Main Core Stats Box */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner grid grid-cols-3 gap-2 text-center">
            {/* Health */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Heart size={11} className="text-emerald-400" /> Здоровье
              </span>
              <span className="font-mono text-base font-black text-emerald-400 mt-0.5">
                +{item.stats.health}
              </span>
              {!isEquipped && equippedItemInSlot && (
                <span className={`text-[9.5px] font-mono font-bold ${item.stats.health - equippedItemInSlot.stats.health > 0 ? 'text-emerald-400' : item.stats.health - equippedItemInSlot.stats.health < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {item.stats.health - equippedItemInSlot.stats.health > 0 ? `+${item.stats.health - equippedItemInSlot.stats.health}` : `${item.stats.health - equippedItemInSlot.stats.health}`}
                </span>
              )}
            </div>

            {/* Damage */}
            <div className="flex flex-col items-center border-x border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Sword size={11} className="text-rose-400" /> Урон
              </span>
              <span className="font-mono text-base font-black text-rose-400 mt-0.5">
                +{item.stats.damage}
              </span>
              {!isEquipped && equippedItemInSlot && (
                <span className={`text-[9.5px] font-mono font-bold ${item.stats.damage - equippedItemInSlot.stats.damage > 0 ? 'text-emerald-400' : item.stats.damage - equippedItemInSlot.stats.damage < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {item.stats.damage - equippedItemInSlot.stats.damage > 0 ? `+${item.stats.damage - equippedItemInSlot.stats.damage}` : `${item.stats.damage - equippedItemInSlot.stats.damage}`}
                </span>
              )}
            </div>

            {/* Armor */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Shield size={11} className="text-sky-400" /> Броня
              </span>
              <span className="font-mono text-base font-black text-sky-400 mt-0.5">
                +{item.stats.armor}
              </span>
              {!isEquipped && equippedItemInSlot && (
                <span className={`text-[9.5px] font-mono font-bold ${item.stats.armor - equippedItemInSlot.stats.armor > 0 ? 'text-emerald-400' : item.stats.armor - equippedItemInSlot.stats.armor < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {item.stats.armor - equippedItemInSlot.stats.armor > 0 ? `+${item.stats.armor - equippedItemInSlot.stats.armor}` : `${item.stats.armor - equippedItemInSlot.stats.armor}`}
                </span>
              )}
            </div>
          </div>

          {/* ================= DEDICATED COMPARISON CARD (СРАВНИТЬ С НАДЕТЫМ) ================= */}
          {!isEquipped && (showCompare || equippedItemInSlot) && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Scale size={13} className="text-amber-400" />
                  Сравнение с надетым
                </span>
                {equippedItemInSlot ? (
                  <span className={`text-[10px] font-bold truncate max-w-[170px] ${RARITY_CONFIG[equippedItemInSlot.rarity]?.text || 'text-slate-300'}`}>
                    Сейчас: {equippedItemInSlot.name}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400">
                    Слот свободен (+100% прирост)
                  </span>
                )}
              </div>

              {equippedItemInSlot ? (
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">HP</span>
                    <span className={`font-black ${compareHp > 0 ? 'text-emerald-400' : compareHp < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {compareHp > 0 ? `+${compareHp}` : compareHp}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Урон</span>
                    <span className={`font-black ${compareDmg > 0 ? 'text-emerald-400' : compareDmg < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {compareDmg > 0 ? `+${compareDmg}` : compareDmg}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Броня</span>
                    <span className={`font-black ${compareArm > 0 ? 'text-emerald-400' : compareArm < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {compareArm > 0 ? `+${compareArm}` : compareArm}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  В этом слоте сейчас ничего не надето. Экипировка предмета прибавит все характеристики полностью!
                </p>
              )}
            </div>
          )}

          {/* Prefixes and Suffixes Affixes Section */}
          {((item.prefixes && item.prefixes.length > 0) || (item.suffixes && item.suffixes.length > 0)) && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Магические свойства
              </span>
              
              {item.prefixes && item.prefixes.map((pref, pIdx) => (
                <div key={`pref-${pIdx}`} className="flex items-start gap-2 text-xs">
                  <div className="p-1 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-400 mt-0.5 flex-shrink-0">
                    <Zap size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-indigo-300">{pref.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                        T{pref.tier}
                      </span>
                    </div>
                    <span className="text-slate-300 text-[11px] block">{pref.description}</span>
                  </div>
                </div>
              ))}

              {item.suffixes && item.suffixes.map((suff, sIdx) => (
                <div key={`suff-${sIdx}`} className="flex items-start gap-2 text-xs">
                  <div className="p-1 rounded bg-amber-950 border border-amber-700/60 text-amber-400 mt-0.5 flex-shrink-0">
                    <Sparkles size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-300">{suff.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                        T{suff.tier}
                      </span>
                    </div>
                    <span className="text-slate-300 text-[11px] block">{suff.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Set Bonus Card (if part of an equipment set) */}
          {setInfo && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-xs font-black text-amber-300">{setInfo.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300">
                  {isEquipped ? `${equippedSetCount}/4` : `${equippedSetCount}/4 (будет ${Math.min(4, equippedSetCount + 1)}/4)`}
                </span>
              </div>

              <div className="space-y-1">
                {setInfo.bonuses.map((bonus, idx) => {
                  const isActive = isEquipped 
                    ? equippedSetCount >= bonus.count 
                    : (equippedSetCount + 1) >= bonus.count;
                  return (
                    <div 
                      key={idx}
                      className={`text-[11px] flex items-center justify-between py-0.5 ${
                        isActive ? 'text-amber-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 ring-2 ring-amber-400/40' : 'bg-slate-700'}`} />
                        <span>({bonus.count}) комплекта:</span>
                        <span>{bonus.description}</span>
                      </span>
                      {isActive && <Check size={12} className="text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Item Tier and Level */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span>Тир предмета: <b className="text-amber-400 font-mono">T{item.tier || 1}</b></span>
            <span>Базовый образец: {item.baseName || item.name}</span>
          </div>
        </div>

        {/* ================= ACTION BUTTONS FOOTER ================= */}
        {/* Кнопки: «Надеть», «Продать» или «Сравнить с надетым» */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-2">
          {isEquipped ? (
            <>
              {/* Unequip to backpack */}
              <ThemedButton
                variant="secondary"
                size="md"
                onClick={() => {
                  sound.playClick();
                  onUnequip?.(item.slot);
                  onClose();
                }}
                className="flex-1"
              >
                <span>Снять в рюкзак</span>
              </ThemedButton>

              {/* Replace / Change item */}
              <ThemedButton
                variant="primary"
                size="md"
                icon={<ArrowRightLeft size={14} />}
                onClick={() => {
                  sound.playClick();
                  setInReplaceMode(true);
                  onReplace?.(item.slot);
                }}
                className="flex-1"
              >
                <span>Заменить</span>
              </ThemedButton>
            </>
          ) : (
            <>
              {/* Primary Equip button */}
              <ThemedButton
                variant="primary"
                size="md"
                icon={<Check size={15} />}
                onClick={() => {
                  sound.playEquip();
                  onEquip?.(item);
                  onClose();
                }}
                className="flex-[1.4]"
              >
                <span>Надеть</span>
              </ThemedButton>

              {/* Compare toggle button */}
              <ThemedButton
                variant={showCompare ? "accent" : "secondary"}
                size="md"
                icon={<Scale size={13} />}
                onClick={() => {
                  sound.playClick();
                  setShowCompare(prev => !prev);
                }}
                className="flex-1"
                title="Сравнить характеристики с надетым предметом"
              >
                <span>Сравнить</span>
              </ThemedButton>

              {/* Sell / Salvage button */}
              {onSalvage && (
                <ThemedButton
                  variant="danger"
                  size="md"
                  icon={<Trash2 size={13} />}
                  onClick={() => {
                    sound.playLoot();
                    onSalvage(item);
                    onClose();
                  }}
                  className="flex-1"
                  title={`Продать предмет (${getSellValueText(item.rarity)})`}
                >
                  <span>Продать</span>
                </ThemedButton>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default ItemTooltipModal;
