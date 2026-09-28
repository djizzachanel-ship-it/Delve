const fs = require('fs');
const code = fs.readFileSync('src/components/ForgeTab.tsx', 'utf-8');
const search = `import { CRAFTING_COSTS } from '../lib/gameLogic';
import { Hammer, Sword, Shield, HardHat } from 'lucide-react';
import { motion } from 'motion/react';

export function ForgeTab({ state, dispatch }: { state: GameState, dispatch: React.Dispatch<GameAction> }) {`;
const replace = `import { CRAFTING_COSTS } from '../lib/gameLogic';
import { Hammer, Sword, Shield, HardHat, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export function ForgeTab({ state, dispatch }: { state: GameState, dispatch: React.Dispatch<GameAction> }) {
  const [craftLevel, setCraftLevel] = useState(0);`;

const search2 = `  const canCraft = (slot: keyof typeof CRAFTING_COSTS) => {
    const cost = CRAFTING_COSTS[slot];
    return state.resources.ore >= cost.ore &&
           state.resources.metal >= cost.metal &&
           state.resources.shards >= cost.shards;
  };`;
const replace2 = `  const getCost = (slot: keyof typeof CRAFTING_COSTS) => {
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
  };`;

const search3 = `      {/* Crafting Options */}
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-3 pl-2">Чертежи</h3>`;
const replace3 = `      {/* Crafting Options */}
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
        </div>`;

const search4 = `<span className={state.resources.ore >= CRAFTING_COSTS.weapon.ore ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.weapon.ore} Ore</span>
                <span className={state.resources.metal >= CRAFTING_COSTS.weapon.metal ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.weapon.metal} Mtl</span>`;
const replace4 = `<span className={state.resources.ore >= getCost('weapon').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').ore} Ore</span>
                <span className={state.resources.metal >= getCost('weapon').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').metal} Mtl</span>
                {getCost('weapon').shards > 0 && <span className={state.resources.shards >= getCost('weapon').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('weapon').shards} Shd</span>}`;
                
const search5 = `onClick={() => dispatch({ type: 'CRAFT', slot: 'weapon' })}`;
const replace5 = `onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'weapon', level: craftLevel } })}`;

const search6 = `<span className={state.resources.ore >= CRAFTING_COSTS.head.ore ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.head.ore} Ore</span>
                <span className={state.resources.metal >= CRAFTING_COSTS.head.metal ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.head.metal} Mtl</span>`;
const replace6 = `<span className={state.resources.ore >= getCost('head').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').ore} Ore</span>
                <span className={state.resources.metal >= getCost('head').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').metal} Mtl</span>
                {getCost('head').shards > 0 && <span className={state.resources.shards >= getCost('head').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('head').shards} Shd</span>}`;

const search7 = `onClick={() => dispatch({ type: 'CRAFT', slot: 'head' })}`;
const replace7 = `onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'head', level: craftLevel } })}`;

const search8 = `<span className={state.resources.ore >= CRAFTING_COSTS.chest.ore ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.chest.ore} Ore</span>
                <span className={state.resources.metal >= CRAFTING_COSTS.chest.metal ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.chest.metal} Mtl</span>
                <span className={state.resources.shards >= CRAFTING_COSTS.chest.shards ? "text-[#34d399]" : "text-[#ef4444]"}>{CRAFTING_COSTS.chest.shards} Shd</span>`;
const replace8 = `<span className={state.resources.ore >= getCost('chest').ore ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').ore} Ore</span>
                <span className={state.resources.metal >= getCost('chest').metal ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').metal} Mtl</span>
                {getCost('chest').shards > 0 && <span className={state.resources.shards >= getCost('chest').shards ? "text-[#34d399]" : "text-[#ef4444]"}>{getCost('chest').shards} Shd</span>}`;

const search9 = `onClick={() => dispatch({ type: 'CRAFT', slot: 'chest' })}`;
const replace9 = `onClick={() => dispatch({ type: 'CRAFT_ADVANCED', payload: { slot: 'chest', level: craftLevel } })}`;

let newCode = code.replace(search, replace).replace(search2, replace2).replace(search3, replace3).replace(search4, replace4).replace(search5, replace5).replace(search6, replace6).replace(search7, replace7).replace(search8, replace8).replace(search9, replace9);
fs.writeFileSync('src/components/ForgeTab.tsx', newCode);
