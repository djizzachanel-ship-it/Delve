import React, { useState } from 'react';
import { GameAction } from '../store';
import { GameState, Item, ItemSlot, Rarity } from '../types';
import { calculatePlayerStats } from '../game/player';
import { Shield, Sword, Heart, User, Trash2, HardHat, Shirt, Sparkles, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../game/audio';

interface CharacterTabProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onGoToTown?: () => void;
}

export function CharacterTab({ state, dispatch, onGoToTown }: CharacterTabProps) {
  const [filterSlot, setFilterSlot] = useState<ItemSlot | 'all'>('all');
  const stats = calculatePlayerStats(state.player, state.equipment);

  const getRarityBadge = (rarity: Rarity) => {
    switch (rarity) {
      case 'common': return { label: 'Обычный', badgeBg: 'bg-slate-700 text-slate-300 border-slate-600', border: 'border-slate-600/60', text: 'text-slate-300', glow: 'shadow-none' };
      case 'magic': return { label: 'Магический', badgeBg: 'bg-blue-900/70 text-blue-300 border-blue-600', border: 'border-blue-500/70', text: 'text-blue-400', glow: 'shadow-blue-500/10 shadow-lg' };
      case 'rare': return { label: 'Редкий', badgeBg: 'bg-amber-900/70 text-amber-300 border-amber-600', border: 'border-amber-500/70', text: 'text-amber-400', glow: 'shadow-amber-500/10 shadow-lg' };
      case 'epic': return { label: 'Эпический', badgeBg: 'bg-purple-900/70 text-purple-300 border-purple-600', border: 'border-purple-500/80', text: 'text-purple-300', glow: 'shadow-purple-500/20 shadow-xl' };
      default: return { label: 'Обычный', badgeBg: 'bg-slate-700 text-slate-300 border-slate-600', border: 'border-slate-600', text: 'text-slate-300', glow: 'shadow-none' };
    }
  };

  const getSlotIcon = (slot: ItemSlot, size = 18) => {
    switch (slot) {
      case 'head': return <HardHat size={size} />;
      case 'chest': return <Shirt size={size} />;
      case 'weapon': return <Sword size={size} />;
    }
  };

  const getSlotName = (slot: ItemSlot) => {
    switch (slot) {
      case 'head': return 'Шлем';
      case 'chest': return 'Доспех';
      case 'weapon': return 'Оружие';
    }
  };

  const filteredInventory = state.inventory.filter(item => {
    if (filterSlot === 'all') return true;
    return item.slot === filterSlot;
  });

  // Calculate equipment stats contributions
  const equipHealth = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats.health || 0), 0);
  const equipDamage = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats.damage || 0), 0);
  const equipArmor = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats.armor || 0), 0);

  const renderPaperdollSlot = (slot: ItemSlot, title: string) => {
    const item = state.equipment[slot];
    const rConfig = item ? getRarityBadge(item.rarity) : null;

    return (
      <div className={`relative bg-[#131b2e] rounded-2xl border ${item ? rConfig?.border : 'border-dashed border-slate-700/60'} p-3 flex flex-col justify-between transition-all ${item ? rConfig?.glow : ''}`}>
        {/* Header slot tag */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            {getSlotIcon(slot, 14)}
            {title}
          </span>
          {item && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${rConfig?.badgeBg}`}>
              {rConfig?.label}
            </span>
          )}
        </div>

        {item ? (
          <div className="flex flex-col gap-1.5">
            <div className={`font-bold text-sm leading-tight ${rConfig?.text}`}>
              {item.name}
            </div>

            {/* Affix chips */}
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.prefix && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-medium">
                  <Zap size={9} className="text-indigo-400" />
                  {item.prefix.name}: {item.prefix.description}
                </span>
              )}
              {item.suffix && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-medium">
                  <Sparkles size={9} className="text-amber-400" />
                  {item.suffix.name}: {item.suffix.description}
                </span>
              )}
            </div>

            {/* Stat numbers */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200 mt-1 pt-1.5 border-t border-slate-800">
              {item.stats.health > 0 && <span className="text-emerald-400 flex items-center gap-0.5"><Heart size={11} />+{item.stats.health}</span>}
              {item.stats.damage > 0 && <span className="text-rose-400 flex items-center gap-0.5"><Sword size={11} />+{item.stats.damage}</span>}
              {item.stats.armor > 0 && <span className="text-sky-400 flex items-center gap-0.5"><Shield size={11} />+{item.stats.armor}</span>}
            </div>

            {/* Unequip button */}
            <button
              onClick={() => {
                sound.playEquip();
                dispatch({ type: 'UNEQUIP', slot });
              }}
              className="mt-2 w-full py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors"
            >
              Снять в рюкзак
            </button>
          </div>
        ) : (
          <div className="py-5 text-center flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-medium italic">Слот свободен</span>
            <span className="text-[10px] text-slate-600 mt-0.5">Выберите из инвентаря</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#080d19] text-slate-100 overflow-y-auto pb-10">
      
      {/* 1. STATS SUMMARY & HERO OVERVIEW */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 shadow-xl sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-400 tracking-wide">
            <User size={20} className="text-indigo-400" />
            <span>Герой Шахты</span>
          </h2>
          <div className="text-xs font-semibold px-2.5 py-1 bg-indigo-950/70 border border-indigo-800/60 rounded-lg text-indigo-300">
            Снаряжение: {Object.values(state.equipment).filter(Boolean).length} / 3 слотов
          </div>
        </div>

        {/* 3 Stat Cards with Base + Gear breakdown */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Health */}
          <div className="flex flex-col p-2.5 bg-[#172033] rounded-xl border border-slate-700/70 shadow-inner">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
              <Heart size={14} />
              <span>Здоровье</span>
            </div>
            <div className="text-lg font-black text-slate-100 mt-0.5">
              {Math.floor(state.player.health)} / {stats.maxHealth}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
              <span>База: {state.player.baseHealth}</span>
              {equipHealth > 0 && <span className="text-emerald-400 font-bold">+{equipHealth}</span>}
            </div>
          </div>

          {/* Damage */}
          <div className="flex flex-col p-2.5 bg-[#172033] rounded-xl border border-slate-700/70 shadow-inner">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Sword size={14} />
              <span>Урон</span>
            </div>
            <div className="text-lg font-black text-slate-100 mt-0.5">
              {stats.damage}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
              <span>База: {state.player.baseDamage}</span>
              {equipDamage > 0 && <span className="text-emerald-400 font-bold">+{equipDamage}</span>}
            </div>
          </div>

          {/* Armor */}
          <div className="flex flex-col p-2.5 bg-[#172033] rounded-xl border border-slate-700/70 shadow-inner">
            <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
              <Shield size={14} />
              <span>Броня</span>
            </div>
            <div className="text-lg font-black text-slate-100 mt-0.5 flex items-baseline justify-between">
              <span>{stats.armor}</span>
              <span className="text-[11px] font-semibold text-sky-400" title="Процент снижения входящего урона">
                -{Math.round(stats.armor / (stats.armor + 32) * 100)}% урона
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
              <span>База: {state.player.baseArmor}</span>
              {equipArmor > 0 && <span className="text-emerald-400 font-bold">+{equipArmor}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 2. EQUIPMENT PAPERDOLL LAYOUT */}
      <div className="p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Надетая экипировка</span>
          <span className="text-[11px] font-normal text-slate-500">Кукла снаряжения</span>
        </h3>

        {/* Paperdoll Grid: Head on top, Weapon left, Chest right */}
        <div className="flex flex-col gap-2.5">
          {/* Top Slot: Head */}
          <div>
            {renderPaperdollSlot('head', 'Голова (Шлем)')}
          </div>

          {/* Bottom Two Slots: Weapon & Chest side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {renderPaperdollSlot('weapon', 'Оружие (Меч / Кирка)')}
            {renderPaperdollSlot('chest', 'Тело (Доспех / Кираса)')}
          </div>
        </div>
      </div>

      {/* 3. INVENTORY WITH DETAILED STAT COMPARISONS */}
      <div className="p-4 pt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Рюкзак ({state.inventory.length})
          </h3>

          {/* Slot filter chips */}
          <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800">
            {(['all', 'weapon', 'head', 'chest'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSlot(s)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                  filterSlot === s
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'all' ? 'Все' : s === 'weapon' ? 'Оружие' : s === 'head' ? 'Шлемы' : 'Доспехи'}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Item List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredInventory.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8 px-4 bg-[#111827]/70 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
                <p className="italic text-xs text-slate-400">
                  {filterSlot === 'all' 
                    ? 'Рюкзак пуст. Создавайте оружие и доспехи в Кузнице городка!' 
                    : 'Нет предметов этого типа в рюкзаке.'}
                </p>
                {onGoToTown && (
                  <button
                    onClick={onGoToTown}
                    className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Sword size={14} /> В Кузницу городка
                  </button>
                )}
              </div>
            ) : (
              filteredInventory.map(item => {
                const rConfig = getRarityBadge(item.rarity);
                const currentEquipped = state.equipment[item.slot];

                // Calculate Stat Deltas vs. Current Equipped
                const deltaHp = item.stats.health - (currentEquipped?.stats.health || 0);
                const deltaDmg = item.stats.damage - (currentEquipped?.stats.damage || 0);
                const deltaArm = item.stats.armor - (currentEquipped?.stats.armor || 0);

                // Salvage materials preview
                const salvageOre = item.rarity === 'common' ? 4 : item.rarity === 'magic' ? 10 : item.rarity === 'rare' ? 24 : 55;
                const salvageMetal = item.rarity === 'common' ? 1 : item.rarity === 'magic' ? 3 : item.rarity === 'rare' ? 8 : 20;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-[#111928] p-3.5 rounded-2xl border ${rConfig.border} flex flex-col gap-2.5 shadow-md ${rConfig.glow}`}
                  >
                    {/* Item Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#172136] rounded-xl border border-slate-700/80 text-slate-300">
                          {getSlotIcon(item.slot, 16)}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${rConfig.text}`}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>Слот: {getSlotName(item.slot)}</span>
                            {item.level && <span>• Ур. {item.level}</span>}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold whitespace-nowrap ${rConfig.badgeBg}`}>
                        {rConfig.label}
                      </span>
                    </div>

                    {/* Affixes Tags */}
                    {(item.prefix || item.suffix) && (
                      <div className="flex flex-wrap gap-1.5 bg-[#0d1424] p-2 rounded-xl border border-slate-800">
                        {item.prefix && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-medium">
                            <Zap size={10} className="text-indigo-400" />
                            <strong className="font-semibold text-indigo-200">Префикс ({item.prefix.name}):</strong> {item.prefix.description}
                          </span>
                        )}
                        {item.suffix && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/60 font-medium">
                            <Sparkles size={10} className="text-amber-400" />
                            <strong className="font-semibold text-amber-200">Суффикс ({item.suffix.name}):</strong> {item.suffix.description}
                          </span>
                        )}
                      </div>
                    )}

                    {/* STAT COMPARISON MATRIX (Shows exact additions vs currently worn item) */}
                    <div className="bg-[#141e33] p-2.5 rounded-xl border border-slate-800/90 flex flex-col gap-1 text-xs">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5 flex justify-between items-center">
                        <span>Характеристики предмета</span>
                        <span className="text-[10px] text-indigo-400 font-normal">Сравнение с надетым</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Health Stat */}
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Heart size={11} className="text-rose-400" />
                            {item.stats.health > 0 ? `+${item.stats.health} HP` : '0 HP'}
                          </span>
                          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                            deltaHp > 0 ? 'text-emerald-400' : deltaHp < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            {deltaHp > 0 ? <ArrowUp size={10} /> : deltaHp < 0 ? <ArrowDown size={10} /> : null}
                            {deltaHp > 0 ? `+${deltaHp}` : deltaHp < 0 ? `${deltaHp}` : '= равно'}
                          </span>
                        </div>

                        {/* Damage Stat */}
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Sword size={11} className="text-amber-400" />
                            {item.stats.damage > 0 ? `+${item.stats.damage} DMG` : '0 DMG'}
                          </span>
                          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                            deltaDmg > 0 ? 'text-emerald-400' : deltaDmg < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            {deltaDmg > 0 ? <ArrowUp size={10} /> : deltaDmg < 0 ? <ArrowDown size={10} /> : null}
                            {deltaDmg > 0 ? `+${deltaDmg}` : deltaDmg < 0 ? `${deltaDmg}` : '= равно'}
                          </span>
                        </div>

                        {/* Armor Stat */}
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Shield size={11} className="text-sky-400" />
                            {item.stats.armor > 0 ? `+${item.stats.armor} ARM` : '0 ARM'}
                          </span>
                          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                            deltaArm > 0 ? 'text-emerald-400' : deltaArm < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            {deltaArm > 0 ? <ArrowUp size={10} /> : deltaArm < 0 ? <ArrowDown size={10} /> : null}
                            {deltaArm > 0 ? `+${deltaArm}` : deltaArm < 0 ? `${deltaArm}` : '= равно'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          sound.playEquip();
                          dispatch({ type: 'EQUIP', item });
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md border border-indigo-400/40 uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Shirt size={14} />
                        Надеть {getSlotName(item.slot)}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          sound.playHit();
                          dispatch({ type: 'SALVAGE', item });
                        }}
                        className="px-3 py-2.5 bg-[#172136] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-xl border border-slate-700 hover:border-rose-800/60 transition-colors flex items-center gap-1"
                        title={`Разобрать на ресурсы (+${salvageOre} руды, +${salvageMetal} металла)`}
                      >
                        <Trash2 size={14} />
                        <span className="text-[10px]">+{salvageOre}р</span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
