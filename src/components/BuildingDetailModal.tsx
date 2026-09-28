import React, { useState, useEffect } from 'react';
import { TownPlot, BuildingType, GameState, ItemSlot, Item } from '../types';
import { GameAction } from '../store';
import { BUILDINGS_CONFIG, TAVERN_MEALS, getForgeDwellerBonus, getWatchtowerBonus } from '../game/townConfig';
import { Dweller } from '../game/dwellers';
import { CRAFT_RECIPES, getEstimatedStats } from '../game/craft';
import { 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  X, 
  ArrowUpCircle, 
  Trash2, 
  Users, 
  Plus, 
  Sword, 
  HardHat, 
  Sparkles, 
  RotateCcw, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Smile,
  AlertCircle,
  Move
} from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../game/audio';

interface BuildingDetailModalProps {
  plot: TownPlot;
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onClose: () => void;
  onRelocatePlot?: (plot: TownPlot) => void;
}

export function BuildingDetailModal({ 
  plot, 
  state, 
  dispatch, 
  onClose,
  onRelocatePlot 
}: BuildingDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!plot.buildingType) return null;

  const bType = plot.buildingType;
  const bInfo = BUILDINGS_CONFIG[bType];
  const maxWorkers = bInfo.workerSlotCount(plot.level);

  // Tabs for Forge: 'craft' | 'reforge' | 'workers' | 'upgrade'
  // For others: 'action' | 'workers' | 'upgrade'
  const [activeTab, setActiveTab] = useState<'action' | 'reforge' | 'workers' | 'upgrade'>('action');

  // Forge state
  const [craftSlot, setCraftSlot] = useState<ItemSlot>('weapon');
  const [craftTier, setCraftTier] = useState<number>(0);
  const [reforgeTarget, setReforgeTarget] = useState<Item | null>(null);

  // Dwellers in this building
  const assignedWorkers = (state.dwellers || []).filter(d => (plot.assignedDwellerIds || []).includes(d.id));
  const unassignedDwellers = (state.dwellers || []).filter(d => d.assignedPlotId !== plot.id);

  // Cost for next upgrade
  const isMaxLevel = plot.level >= bInfo.maxLevel;
  const upgradeCost = !isMaxLevel ? bInfo.getCost(plot.level) : null;

  const canAfford = (cost: { ore: number; metal: number; shards: number } | null) => {
    if (!cost) return false;
    return state.resources.ore >= cost.ore &&
           state.resources.metal >= cost.metal &&
           state.resources.shards >= cost.shards;
  };

  const handleUpgrade = () => {
    if (!upgradeCost || !canAfford(upgradeCost)) return;
    sound.playLevelUp();
    dispatch({ type: 'UPGRADE_PLOT', plotId: plot.id });
  };

  const handleDemolish = () => {
    if (confirm(`Вы уверены, что хотите снести ${bInfo.name.split('«')[0]}? Часть ресурсов будет возвращена.`)) {
      dispatch({ type: 'DEMOLISH_PLOT', plotId: plot.id });
      onClose();
    }
  };

  const handleAssignWorker = (dwellerId: string) => {
    if (assignedWorkers.length >= maxWorkers) return;
    dispatch({ type: 'ASSIGN_DWELLER', dwellerId, plotId: plot.id });
    sound.playHit();
  };

  const handleUnassignWorker = (dwellerId: string) => {
    dispatch({ type: 'ASSIGN_DWELLER', dwellerId, plotId: null });
    sound.playHit();
  };

  // Dweller bonuses for Forge
  const forgeDwellerBonus = getForgeDwellerBonus(state.townPlots, state.dwellers);

  // Handle Crafting
  const handleCraft = () => {
    const recipe = CRAFT_RECIPES[craftTier];
    if (!canAfford(recipe.cost)) return;
    if (plot.level < recipe.requiredForgeLevel) return;

    sound.playCraft();
    dispatch({
      type: 'CRAFT_ADVANCED',
      payload: { slot: craftSlot, level: craftTier }
    });
  };

  // Handle Reforge
  const handleReforge = (item: Item) => {
    const cost = { ore: 10, metal: 5, shards: 0 };
    if (!canAfford(cost)) return;
    sound.playCraft();
    dispatch({ type: 'REFORGE_ITEM', item });
  };

  // Handle Smelt
  const handleSmelt = (oreAmount: number) => {
    sound.playHit();
    dispatch({ type: 'SMELT_ORE', oreAmount });
  };

  // Handle Meal
  const handleMeal = (mealId: string) => {
    sound.playLevelUp();
    dispatch({ type: 'SET_TOWN_BUFF', mealId });
  };

  // Handle Tavern Recruit
  const handleRecruit = () => {
    const recruitCost = { ore: 20, metal: 10, shards: 0 };
    if (!canAfford(recruitCost)) return;
    sound.playLevelUp();
    dispatch({ type: 'RECRUIT_DWELLER_IN_TAVERN' });
  };

  const currentRecipe = CRAFT_RECIPES[craftTier];
  const estStats = getEstimatedStats(craftSlot, craftTier);
  const scaledMinHp = Math.round(estStats.minHp * forgeDwellerBonus.statMultiplier);
  const scaledMaxHp = Math.round(estStats.maxHp * forgeDwellerBonus.statMultiplier);
  const scaledMinDmg = Math.round(estStats.minDmg * forgeDwellerBonus.statMultiplier);
  const scaledMaxDmg = Math.round(estStats.maxDmg * forgeDwellerBonus.statMultiplier);
  const scaledMinArm = Math.round(estStats.minArm * Math.min(1.15, forgeDwellerBonus.statMultiplier));
  const scaledMaxArm = Math.round(estStats.maxArm * Math.min(1.15, forgeDwellerBonus.statMultiplier));

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
      >
        {/* Top Header with Back to Town Button */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>В городок</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              {bType === 'forge' && <Hammer size={18} />}
              {bType === 'smelter' && <Flame size={18} />}
              {bType === 'tavern' && <Coffee size={18} />}
              {bType === 'guild' && <Warehouse size={18} />}
              {bType === 'barracks' && <Home size={18} />}
              {bType === 'watchtower' && <Shield size={18} />}
              {bType === 'workshop' && <Wrench size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-100 truncate max-w-[130px]">{bInfo.name.split('«')[0]}</h3>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                  Ур. {plot.level}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('action')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'action' 
                ? 'bg-amber-500 text-slate-950 shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {bType === 'forge' ? '⚒️ Ковка' : bType === 'smelter' ? '🔥 Плавка' : bType === 'tavern' ? '🍲 Трактир' : bType === 'guild' ? '⛏️ Забой' : '📋 Инфо'}
          </button>

          {bType === 'forge' && (
            <button
              onClick={() => setActiveTab('reforge')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'reforge' 
                  ? 'bg-amber-500 text-slate-950 shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✨ Перековка
            </button>
          )}

          {maxWorkers > 0 && (
            <button
              onClick={() => setActiveTab('workers')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'workers' 
                  ? 'bg-amber-500 text-slate-950 shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👥 Жители ({assignedWorkers.length}/{maxWorkers})
            </button>
          )}

          <button
            onClick={() => setActiveTab('upgrade')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'upgrade' 
                ? 'bg-amber-500 text-slate-950 shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⬆️ Улучшение
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* ================= FORGE: CRAFTING TAB ================= */}
          {activeTab === 'action' && bType === 'forge' && (
            <div className="space-y-4">
              {/* Blacksmith Dweller bonus indicator */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={14} /> Бонус кузнецов городка
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {forgeDwellerBonus.blacksmithNames.length > 0 ? (
                      <span>
                        Кузнецы <strong>{forgeDwellerBonus.blacksmithNames.join(', ')}</strong> дают:{' '}
                        <strong className="text-emerald-400">+{(forgeDwellerBonus.statMultiplier * 100 - 100).toFixed(1)}% к статам</strong> и{' '}
                        <strong className="text-sky-400">+{(forgeDwellerBonus.bonusRareLuck * 100).toFixed(1)}% к редким аффиксам</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Назначьте сильного кузнеца на вкладке «Жители» для усиления скованной брони!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Slot Selection (Weapon, Head, Chest) */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Тип снаряжения:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCraftSlot('weapon')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      craftSlot === 'weapon'
                        ? 'bg-red-950/60 border-red-500 text-red-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sword size={14} /> Оружие
                  </button>
                  <button
                    onClick={() => setCraftSlot('head')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      craftSlot === 'head'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HardHat size={14} /> Шлем
                  </button>
                  <button
                    onClick={() => setCraftSlot('chest')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      craftSlot === 'chest'
                        ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield size={14} /> Доспех
                  </button>
                </div>
              </div>

              {/* Tier Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Тир чертежа (Качество сплава):
                </label>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <button
                    onClick={() => setCraftTier(Math.max(0, craftTier - 1))}
                    disabled={craftTier === 0}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-xs font-black text-amber-400">{currentRecipe.tierName}</div>
                    <div className="text-[10px] text-slate-400">Требуется Кузница ур. {currentRecipe.requiredForgeLevel}</div>
                  </div>
                  <button
                    onClick={() => setCraftTier(Math.min(CRAFT_RECIPES.length - 1, craftTier + 1))}
                    disabled={craftTier === CRAFT_RECIPES.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Estimated Stats Card */}
              <div className="p-3.5 bg-black/40 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Базовый образец:</span>
                  <span className="font-bold text-slate-200">{estStats.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-red-400 font-bold">УРОН</div>
                    <div className="font-mono font-black text-slate-200">
                      {scaledMinDmg > 0 ? `${scaledMinDmg} - ${scaledMaxDmg}` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-emerald-400 font-bold">БРОНЯ</div>
                    <div className="font-mono font-black text-slate-200">
                      {scaledMinArm > 0 ? `${scaledMinArm} - ${scaledMaxArm}` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-blue-400 font-bold">ЗДОРОВЬЕ</div>
                    <div className="font-mono font-black text-slate-200">
                      {scaledMinHp > 0 ? `${scaledMinHp} - ${scaledMaxHp}` : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Шанс Эпика: <strong className="text-purple-400">{Math.round((currentRecipe.rarityChances.epic + forgeDwellerBonus.bonusRareLuck) * 100)}%</strong></span>
                  <span>Шанс Редкого: <strong className="text-blue-400">{Math.round((currentRecipe.rarityChances.rare + forgeDwellerBonus.bonusRareLuck) * 100)}%</strong></span>
                  <span>Магический: <strong className="text-emerald-400">{Math.round(currentRecipe.rarityChances.magic * 100)}%</strong></span>
                </div>
              </div>

              {/* Craft Cost & Action */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs font-mono font-bold">
                  <div className="text-[10px] text-slate-400 font-sans uppercase">Стоимость ковки:</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={state.resources.ore >= currentRecipe.cost.ore ? 'text-amber-300' : 'text-red-400'}>
                      ⛏️ {currentRecipe.cost.ore}
                    </span>
                    <span className={state.resources.metal >= currentRecipe.cost.metal ? 'text-slate-300' : 'text-red-400'}>
                      🔩 {currentRecipe.cost.metal}
                    </span>
                    {currentRecipe.cost.shards > 0 && (
                      <span className={state.resources.shards >= currentRecipe.cost.shards ? 'text-sky-400' : 'text-red-400'}>
                        💎 {currentRecipe.cost.shards}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCraft}
                  disabled={!canAfford(currentRecipe.cost) || plot.level < currentRecipe.requiredForgeLevel}
                  className={`py-2.5 px-5 rounded-xl text-xs font-black transition-all shadow ${
                    canAfford(currentRecipe.cost) && plot.level >= currentRecipe.requiredForgeLevel
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  {plot.level < currentRecipe.requiredForgeLevel ? `Нужен ур. ${currentRecipe.requiredForgeLevel}` : 'Выковать'}
                </button>
              </div>
            </div>
          )}

          {/* ================= FORGE: REFORGE TAB ================= */}
          {activeTab === 'reforge' && bType === 'forge' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-slate-800">
                Перековка позволяет перебросить случайные аффиксы (бонусы) на экипировке за <strong>10 руды</strong> и <strong>5 металла</strong>.
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Выберите предмет для перековки:
                </label>
                {state.inventory.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    Инвентарь пуст. Выкуйте экипировку или добудьте в шахте!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {state.inventory.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setReforgeTarget(item)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          reforgeTarget?.id === item.id
                            ? 'bg-amber-950/40 border-amber-500'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-200">{item.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Аффиксы: {[item.prefix?.name, item.suffix?.name].filter(Boolean).join(', ') || 'нет'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReforge(item);
                          }}
                          disabled={state.resources.ore < 10 || state.resources.metal < 5}
                          className="py-1 px-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-lg text-xs font-bold"
                        >
                          Перековать
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= SMELTER: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'smelter' && (
            <div className="space-y-4">
              <div className="p-3 bg-orange-950/30 border border-orange-500/30 rounded-xl text-xs text-orange-200">
                Переплавляйте сырую руду в металл. Чем выше уровень плавильни и мастерство рабочих, тем выгоднее курс!
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Быстрая переплавка:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSmelt(15)}
                    disabled={state.resources.ore < 15}
                    className="py-3 px-2 bg-slate-900 hover:bg-orange-950/40 disabled:opacity-40 border border-slate-800 hover:border-orange-500/50 rounded-xl text-xs font-bold text-slate-200 transition-all"
                  >
                    15 руды
                  </button>
                  <button
                    onClick={() => handleSmelt(30)}
                    disabled={state.resources.ore < 30}
                    className="py-3 px-2 bg-slate-900 hover:bg-orange-950/40 disabled:opacity-40 border border-slate-800 hover:border-orange-500/50 rounded-xl text-xs font-bold text-slate-200 transition-all"
                  >
                    30 руды
                  </button>
                  <button
                    onClick={() => handleSmelt(state.resources.ore)}
                    disabled={state.resources.ore < 5}
                    className="py-3 px-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-black transition-all shadow"
                  >
                    Вся руда ({state.resources.ore})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAVERN: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'tavern' && (
            <div className="space-y-4">
              {/* Hire dweller button */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-amber-300">📣 Позвать нового старателя</h4>
                  <p className="text-[11px] text-slate-300">Пустить слух в трактире и нанять жителя в городок</p>
                  <div className="text-[10px] font-mono text-amber-400 mt-1">
                    Стоимость: 20 руды, 10 металла
                  </div>
                </div>
                <button
                  onClick={handleRecruit}
                  disabled={state.resources.ore < 20 || state.resources.metal < 10}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-black shadow flex-shrink-0"
                >
                  Нанять
                </button>
              </div>

              {/* Meals & Buffs */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Сытные блюда для экспедиции:
                </label>
                <div className="space-y-2">
                  {TAVERN_MEALS.map(meal => {
                    const active = state.activeTownBuff?.id === meal.id;
                    const affordable = state.resources.ore >= meal.cost.ore && state.resources.metal >= meal.cost.metal;
                    return (
                      <div
                        key={meal.id}
                        className={`p-3 rounded-xl border ${
                          active ? 'bg-amber-950/50 border-amber-500' : 'bg-slate-900 border-slate-800'
                        } flex items-center justify-between gap-2`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-100">{meal.name}</div>
                          <div className="text-[10px] text-slate-400">{meal.desc}</div>
                          <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                            {meal.cost.ore} руды, {meal.cost.metal} металла
                          </div>
                        </div>

                        <button
                          onClick={() => handleMeal(meal.id)}
                          disabled={active || !affordable}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold shadow ${
                            active
                              ? 'bg-amber-500 text-slate-950 cursor-default'
                              : affordable
                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {active ? 'Активно' : 'Взять паёк'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= GUILD: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'guild' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-xl text-xs text-blue-200">
                Гильдия непрерывно добывает руду из старых штолен, пока вы находитесь на поверхности или в спуске. Назначайте сюда жителей с высоким навыком «Шахтёрство»!
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Добыча руды</div>
                  <div className="text-base font-black text-amber-300 font-mono mt-0.5">
                    +{3 * plot.level} / мин
                  </div>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Добыча металла</div>
                  <div className="text-base font-black text-slate-300 font-mono mt-0.5">
                    +{plot.level >= 2 ? plot.level - 1 : 0} / мин
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= BARRACKS: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'barracks' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs text-emerald-200">
                Бараки предоставляют тёплый кров для поселенцев городка. Каждый уровень бараков расширяет лимит жителей на <strong>+3 человека</strong>.
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Вместимость городка:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {state.dwellers?.length || 0} / {3 + plot.level * 3} жителей
                </span>
              </div>
            </div>
          )}

          {/* ================= WATCHTOWER: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'watchtower' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/40 rounded-xl text-xs text-cyan-200">
                Дозорные на вышке охраняют периметр городка и дают постоянную боевую поддержку герою в шахте!
              </div>
              {(() => {
                const towerBonus = getWatchtowerBonus(state.townPlots, state.dwellers);
                return (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-red-400 uppercase font-bold">Бонус урона</div>
                      <div className="text-lg font-black text-slate-100 font-mono mt-0.5">
                        +{towerBonus.damage} урона
                      </div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-emerald-400 uppercase font-bold">Бонус брони</div>
                      <div className="text-lg font-black text-slate-100 font-mono mt-0.5">
                        +{towerBonus.armor} брони
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ================= WORKSHOP: ACTION TAB ================= */}
          {activeTab === 'action' && bType === 'workshop' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/40 rounded-xl text-xs text-indigo-200">
                Мастерская вагонетки позволяет устанавливать оборонительные модули для рельсовых путей в шахте.
              </div>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span>💡 Мощный прожектор</span>
                  <span className={state.cartModules.searchlight ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {state.cartModules.searchlight ? 'Установлен' : '15 руды, 5 металла'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span>🎯 Авто-турель</span>
                  <span className={state.cartModules.turret ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {state.cartModules.turret ? 'Установлена' : '25 руды, 15 мет., 1 оск.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= WORKERS TAB (Fallout Shelter style) ================= */}
          {activeTab === 'workers' && (
            <div className="space-y-4">
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-amber-300 mb-1">
                  ⭐ Профильный навык: {bInfo.primaryStatDesc}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Назначьте жителя с наивысшим показателем этого параметра для максимальной отдачи.
                </div>
              </div>

              {/* Current assigned workers */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Работают в здании ({assignedWorkers.length}/{maxWorkers}):
                </label>
                {assignedWorkers.length === 0 ? (
                  <div className="p-3 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    Рабочих нет. Выберите жителя ниже для назначения!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedWorkers.map(w => (
                      <div key={w.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{w.avatar}</span>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{w.name}</div>
                            <div className="text-[10px] text-amber-400">{w.title}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnassignWorker(w.id)}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 rounded-lg text-xs transition-colors"
                        >
                          Снять
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available unassigned dwellers */}
              {assignedWorkers.length < maxWorkers && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Доступные жители городка:
                  </label>
                  {unassignedDwellers.length === 0 ? (
                    <div className="p-3 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                      Нет свободных жителей. Пригласите новых в таверне!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {unassignedDwellers.map(d => (
                        <div key={d.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{d.avatar}</span>
                            <div>
                              <div className="text-xs font-bold text-slate-200">{d.name}</div>
                              <div className="text-[10px] text-slate-400">
                                СИЛ {d.stats.strength} • ШАХ {d.stats.mining} • РЕМ {d.stats.craft}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignWorker(d.id)}
                            className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                          >
                            Назначить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= UPGRADE TAB ================= */}
          {activeTab === 'upgrade' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-black/40 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">Текущий уровень:</div>
                <div className="text-xs text-slate-200 font-medium">
                  {bInfo.getLevelDesc(plot.level)}
                </div>
              </div>

              {!isMaxLevel && upgradeCost && (
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      Следующий уровень (Ур. {plot.level + 1}):
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {bInfo.getNextUpgradeDesc(plot.level)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="text-xs font-mono font-bold">
                      <div className="text-[10px] text-slate-400 font-sans uppercase">Стоимость:</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={state.resources.ore >= upgradeCost.ore ? 'text-amber-300' : 'text-red-400'}>
                          ⛏️ {upgradeCost.ore}
                        </span>
                        <span className={state.resources.metal >= upgradeCost.metal ? 'text-slate-300' : 'text-red-400'}>
                          🔩 {upgradeCost.metal}
                        </span>
                        {upgradeCost.shards > 0 && (
                          <span className={state.resources.shards >= upgradeCost.shards ? 'text-sky-400' : 'text-red-400'}>
                            💎 {upgradeCost.shards}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleUpgrade}
                      disabled={!canAfford(upgradeCost)}
                      className={`py-2 px-4 rounded-xl text-xs font-black shadow transition-all ${
                        canAfford(upgradeCost)
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      Улучшить здание
                    </button>
                  </div>
                </div>
              )}

              {/* Relocate & Demolish Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {onRelocatePlot && (
                  <button
                    onClick={() => {
                      onRelocatePlot(plot);
                      onClose();
                    }}
                    className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Move size={14} /> Переместить здание
                  </button>
                )}
                <button
                  onClick={handleDemolish}
                  className="py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Снести (вернёт 40%)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer Back to Town Button */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-center z-10">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
          >
            <ChevronLeft size={16} />
            <span>Вернуться к карте городка</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
