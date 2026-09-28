import React, { useState } from 'react';
import { GameAction } from '../store';
import { GameState, Item } from '../types';
import { 
  CRAFTING_COSTS, 
  craftItem,
  getMaxAffixes
} from '../game/craft';
import { 
  Hammer, 
  Sword, 
  Shield, 
  HardHat, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Zap,
  RefreshCw,
  Dices,
  Sliders,
  PlusCircle,
  Package
} from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../game/audio';

export function ForgeTab({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const [activeSubTab, setActiveSubTab] = useState<'blueprints' | 'workbench'>('blueprints');
  const [craftLevel, setCraftLevel] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // All available items in inventory + equipped items
  const allItems: { item: Item; isEquipped: boolean }[] = [
    ...Object.values(state.equipment).filter((it): it is Item => Boolean(it)).map(item => ({ item, isEquipped: true })),
    ...(state.inventory || []).map(item => ({ item, isEquipped: false }))
  ];

  const selectedItemData = allItems.find(entry => entry.item.id === selectedItemId);
  const selectedItem = selectedItemData?.item || null;
  
  const getCost = (slot: keyof typeof CRAFTING_COSTS) => {
    const scale = craftLevel + 1;
    const baseCost = CRAFTING_COSTS[slot];
    return {
      ore: baseCost.ore * scale,
      metal: baseCost.metal * scale,
      shards: baseCost.shards * scale + (scale > 2 ? 1 : 0)
    };
  };

  const canCraft = (slot: keyof typeof CRAFTING_COSTS) => {
    const cost = getCost(slot);
    return state.resources.ore >= cost.ore &&
           state.resources.metal >= cost.metal &&
           state.resources.shards >= cost.shards;
  };

  // RNG Crafting Costs
  const addAffixCost = { ore: 20, metal: 12, shards: 1 };
  const rerollAffixCost = { ore: 15, metal: 8, shards: 1 };
  const rerollValuesCost = { ore: 10, metal: 5, shards: 0 };

  const canAfford = (c: { ore: number; metal: number; shards: number }) => {
    return state.resources.ore >= c.ore &&
           state.resources.metal >= c.metal &&
           state.resources.shards >= c.shards;
  };

  const selectedMaxAffixes = selectedItem ? getMaxAffixes(selectedItem.rarity) : { maxPrefixes: 0, maxSuffixes: 0 };
  const selectedPrefixCount = selectedItem?.prefixes?.length || 0;
  const selectedSuffixCount = selectedItem?.suffixes?.length || 0;
  const hasFreeAffixSlot = selectedItem && (
    selectedPrefixCount < selectedMaxAffixes.maxPrefixes || 
    selectedSuffixCount < selectedMaxAffixes.maxSuffixes
  );
  const hasAnyAffixes = (selectedPrefixCount + selectedSuffixCount) > 0;

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto pb-6">
      
      {/* Resources Header */}
      <div className="p-6 bg-[#111827] border-b border-[#1f2937] shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#f59e0b] uppercase tracking-widest">
            <Hammer size={24} />
            Кузница
          </h2>

          {/* Sub-tabs switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => { sound.playClick(); setActiveSubTab('blueprints'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'blueprints' 
                  ? 'bg-amber-500 text-slate-950 shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ковка (Чертежи)
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveSubTab('workbench'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'workbench' 
                  ? 'bg-amber-500 text-slate-950 shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dices size={14} />
              RNG Верстак
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#1f2937] rounded-xl p-3 border border-[#374151] shadow-inner">
            <div className="text-[10px] text-[#9ca3af] uppercase font-bold tracking-widest mb-1">Руда</div>
            <div className="text-xl font-mono text-[#e5e7eb] font-black">{state.resources.ore}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-3 border border-[#374151] shadow-inner">
            <div className="text-[10px] text-[#9ca3af] uppercase font-bold tracking-widest mb-1">Металл</div>
            <div className="text-xl font-mono text-[#9ca3af] font-black">{state.resources.metal}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-3 border border-[#374151] shadow-inner">
            <div className="text-[10px] text-[#9ca3af] uppercase font-bold tracking-widest mb-1">Осколки</div>
            <div className="text-xl font-mono text-[#38bdf8] font-black">{state.resources.shards}</div>
          </div>
        </div>
      </div>

      {/* 1. BLUEPRINTS TAB */}
      {activeSubTab === 'blueprints' && (
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center mb-3 px-2">
              <h3 className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Чертежи ковки</h3>
              <div className="flex items-center gap-2 bg-[#1f2937] rounded-lg px-2 py-1">
                  <button 
                    onClick={() => setCraftLevel(Math.max(0, craftLevel - 1))}
                    disabled={craftLevel === 0}
                    className="p-1 disabled:opacity-30"
                  ><ChevronLeft size={16} /></button>
                  <span className="text-xs font-bold w-16 text-center">Уровень {craftLevel + 1}</span>
                  <button 
                    onClick={() => setCraftLevel(Math.min(state.unlockedDepth, craftLevel + 1))}
                    disabled={craftLevel >= state.unlockedDepth}
                    className="p-1 disabled:opacity-30"
                  ><ChevronRight size={16} /></button>
              </div>
          </div>
          
          {/* Weapon */}
          <div className="bg-[#111827] p-4 rounded-2xl border border-[#1f2937] flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1f2937] to-[#111827] rounded-xl flex items-center justify-center border border-[#374151]">
                <Sword className="text-[#9ca3af]" />
              </div>
              <div>
                <div className="font-bold text-lg text-[#e5e7eb]">Оружие</div>
                <div className="text-xs font-bold flex gap-3 mt-1">
                  <span className={state.resources.ore >= getCost('weapon').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').ore} Ore</span>
                  <span className={state.resources.metal >= getCost('weapon').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').metal} Mtl</span>
                  {getCost('weapon').shards > 0 && <span className={state.resources.shards >= getCost('weapon').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').shards} Shd</span>}
                </div>
              </div>
            </div>
            <motion.button 
              whileTap={canCraft('weapon') ? { scale: 0.95 } : {}}
              disabled={!canCraft('weapon')}
              onClick={() => {
                sound.playCraft();
                dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'weapon', level: craftLevel } });
              }}
              className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none cursor-pointer"
            >
              Ковать
            </motion.button>
          </div>

          {/* Head */}
          <div className="bg-[#111827] p-4 rounded-2xl border border-[#1f2937] flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1f2937] to-[#111827] rounded-xl flex items-center justify-center border border-[#374151]">
                <HardHat className="text-[#9ca3af]" />
              </div>
              <div>
                <div className="font-bold text-lg text-[#e5e7eb]">Шлем</div>
                <div className="text-xs font-bold flex gap-3 mt-1">
                  <span className={state.resources.ore >= getCost('head').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').ore} Ore</span>
                  <span className={state.resources.metal >= getCost('head').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').metal} Mtl</span>
                  {getCost('head').shards > 0 && <span className={state.resources.shards >= getCost('head').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').shards} Shd</span>}
                </div>
              </div>
            </div>
            <motion.button 
              whileTap={canCraft('head') ? { scale: 0.95 } : {}}
              disabled={!canCraft('head')}
              onClick={() => {
                sound.playCraft();
                dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'head', level: craftLevel } });
              }}
              className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none cursor-pointer"
            >
              Ковать
            </motion.button>
          </div>

          {/* Chest */}
          <div className="bg-[#111827] p-4 rounded-2xl border border-[#1f2937] flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1f2937] to-[#111827] rounded-xl flex items-center justify-center border border-[#374151]">
                <Shield className="text-[#9ca3af]" />
              </div>
              <div>
                <div className="font-bold text-lg text-[#e5e7eb]">Доспех</div>
                <div className="text-xs font-bold flex gap-3 mt-1">
                  <span className={state.resources.ore >= getCost('chest').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').ore} Ore</span>
                  <span className={state.resources.metal >= getCost('chest').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').metal} Mtl</span>
                  {getCost('chest').shards > 0 && <span className={state.resources.shards >= getCost('chest').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').shards} Shd</span>}
                </div>
              </div>
            </div>
            <motion.button 
              whileTap={canCraft('chest') ? { scale: 0.95 } : {}}
              disabled={!canCraft('chest')}
              onClick={() => {
                sound.playCraft();
                dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'chest', level: craftLevel } });
              }}
              className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none cursor-pointer"
            >
              Ковать
            </motion.button>
          </div>
        </div>
      )}

      {/* 2. RNG CRAFTING WORKBENCH TAB */}
      {activeSubTab === 'workbench' && (
        <div className="p-4 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Dices size={15} />
              RNG Верстак Зачарования
            </h3>
            <p className="text-[11px] text-slate-400">
              Модифицируйте свойства предметов случайным образом без риска уничтожения предмета.
            </p>
          </div>

          {/* Item Selector */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Выберите предмет для зачарования:
            </label>

            {allItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
                <Package size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                У вас нет предметов в рюкзаке или экипировке.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {allItems.map(({ item, isEquipped }) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedItemId(item.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg' 
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{item.name}</span>
                          {isEquipped && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-950 text-amber-300 border border-amber-500/30 rounded">
                              Надето
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          T{item.tier || 1} • {item.rarity}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 flex-shrink-0">
                        {item.prefixes?.length || 0}+{item.suffixes?.length || 0} св.
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Item Preview & Actions */}
          {selectedItem && (
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              {/* Item Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-amber-300">{selectedItem.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/30">
                      T{selectedItem.tier || 1}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-3">
                    <span className="text-emerald-400">+{selectedItem.stats.health} HP</span>
                    <span className="text-rose-400">+{selectedItem.stats.damage} DMG</span>
                    <span className="text-sky-400">+{selectedItem.stats.armor} ARM</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-slate-400">
                  Свойства: <b className="text-amber-300">{selectedPrefixCount + selectedSuffixCount}</b> / {selectedMaxAffixes.maxPrefixes + selectedMaxAffixes.maxSuffixes}
                </div>
              </div>

              {/* Current Affixes */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Текущие аффиксы:
                </span>
                {selectedPrefixCount === 0 && selectedSuffixCount === 0 ? (
                  <div className="text-xs text-slate-500 italic py-1">Нет магических свойств</div>
                ) : (
                  <div className="space-y-1">
                    {selectedItem.prefixes?.map((p, idx) => (
                      <div key={`pref-${idx}`} className="text-xs flex items-center justify-between bg-slate-950/80 p-2 rounded-lg border border-indigo-900/40">
                        <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                          <Zap size={12} className="text-indigo-400" />
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-300">{p.description}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                            T{p.tier}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedItem.suffixes?.map((s, idx) => (
                      <div key={`suff-${idx}`} className="text-xs flex items-center justify-between bg-slate-950/80 p-2 rounded-lg border border-amber-900/40">
                        <span className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-400" />
                          {s.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-300">{s.description}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                            T{s.tier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3 RNG Crafting Operations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                
                {/* 1. Add Affix */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-300 flex items-center gap-1 mb-1">
                      <PlusCircle size={14} className="text-indigo-400" />
                      Добавить аффикс
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">
                      Добавляет 1 случайный аффикс с тиром T1..T(max).
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 space-x-1.5 mb-3">
                      <span>{addAffixCost.ore}R</span>
                      <span>{addAffixCost.metal}M</span>
                      <span className="text-sky-400">{addAffixCost.shards}S</span>
                    </div>
                  </div>
                  <button
                    disabled={!hasFreeAffixSlot || !canAfford(addAffixCost)}
                    onClick={() => {
                      sound.playCraft();
                      dispatch({ type: 'CRAFT_ADD_AFFIX', item: selectedItem });
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    Добавить
                  </button>
                </div>

                {/* 2. Reroll Single Affix */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1 mb-1">
                      <RefreshCw size={14} className="text-amber-400" />
                      Переролл аффикса
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">
                      Заменяет 1 случайный аффикс на новый с новым тиром.
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 space-x-1.5 mb-3">
                      <span>{rerollAffixCost.ore}R</span>
                      <span>{rerollAffixCost.metal}M</span>
                      <span className="text-sky-400">{rerollAffixCost.shards}S</span>
                    </div>
                  </div>
                  <button
                    disabled={!hasAnyAffixes || !canAfford(rerollAffixCost)}
                    onClick={() => {
                      sound.playCraft();
                      dispatch({ type: 'CRAFT_REROLL_AFFIX', item: selectedItem });
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    Перероллить
                  </button>
                </div>

                {/* 3. Reroll Values */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mb-1">
                      <Sliders size={14} className="text-emerald-400" />
                      Переролл чисел
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">
                      Пересчитывает числовые значения всех свойств в их тире.
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 space-x-1.5 mb-3">
                      <span>{rerollValuesCost.ore}R</span>
                      <span>{rerollValuesCost.metal}M</span>
                    </div>
                  </div>
                  <button
                    disabled={!hasAnyAffixes || !canAfford(rerollValuesCost)}
                    onClick={() => {
                      sound.playCraft();
                      dispatch({ type: 'CRAFT_REROLL_VALUES', item: selectedItem });
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    Пересчитать
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
