import React from 'react';
import { GameAction } from '../store';
import { GameState } from '../types';
import { CRAFTING_COSTS, craftItem } from '../game/craft';
import { Hammer, Sword, Shield, HardHat, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export function ForgeTab({ state, dispatch }: { state: GameState, dispatch: React.Dispatch<GameAction> }) {
  const [craftLevel, setCraftLevel] = useState(0);
  
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

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto pb-6">
      
      {/* Resources Header */}
      <div className="p-6 bg-[#111827] border-b border-[#1f2937] shadow-lg sticky top-0 z-10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#f59e0b] uppercase tracking-widest">
          <Hammer size={24} />
          Кузница
        </h2>
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

      {/* Crafting Options */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Чертежи</h3>
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
            onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'weapon', level: craftLevel } })}
            className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none"
          >
            Craft
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
            onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'head', level: craftLevel } })}
            className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none"
          >
            Craft
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
            onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'chest', level: craftLevel } })}
            className="px-5 py-3 bg-gradient-to-b from-[#d97706] to-[#92400e] disabled:from-[#374151] disabled:to-[#1f2937] disabled:text-[#6b7280] disabled:border-[#374151] text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-sm border border-[#f59e0b] shadow-lg disabled:shadow-none"
          >
            Craft
          </motion.button>
        </div>
      </div>
    </div>
  );
}
